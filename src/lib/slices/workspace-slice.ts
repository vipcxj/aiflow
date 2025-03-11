import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  NodeChange,
  EdgeChange,
  Connection, 
} from '@xyflow/react';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as addAFEdge,
} from '@xyflow/react';
import type { NodeData, NodeMeta, NodeMetaRef } from '@/data/data-type';
import type { AFNode, AFEdge } from '@/data/flow-type';
import { createNode } from '@/data/utils';
import { globalNodeMetas } from '@/data/nodes';

export type FlowState = {
  nodes: AFNode[];
  edges: AFEdge[];
};

export type EmbeddedNodeImpl = {
  meta: NodeMeta;
  impl: FlowState;
}

function getNode(state: FlowState, id: string) {
  return state.nodes.find(node => node.id === id);
}

function getNodeData(state: FlowState, id: string) {
  return getNode(state, id)?.data;
}

function getNodeEntry(node: NodeData, name: string, type: 'input' | 'output') {
  const entries = type === 'input' ? node.inputs : node.outputs;
  return entries.find(entry => entry.name === name);
}

export type WorkspaceState = {
  id: string;
  nextNodeId: number;
  nextEdgeId: number;
  title: string;
  filePath: string;
  main: FlowState;
  embeddedNodeImpls: {
    [key: string]: EmbeddedNodeImpl;
  };
  path: string[];
  dirty: boolean;
};

export type WorkspacesState = {
  nextWSId: number;
  current: string;
  workspaces: WorkspaceState[];
  nodeMetas: NodeMeta[];
};

function createEmptyFlow(): FlowState {
  return {
    nodes: [],
    edges: [],
  };
}

export function getNodeMeta(workspace: WorkspaceState, globalNodeMetas: NodeMeta[], ref: NodeMetaRef): NodeMeta | undefined {
  const nodeMeta = workspace.embeddedNodeImpls[ref.id]?.meta;
  if (nodeMeta && nodeMeta.version === ref.version) {
    return nodeMeta;
  }
  return globalNodeMetas.find(meta => meta.id === ref.id && meta.version === ref.version);
}

export const initialState: WorkspacesState = {
  nextWSId: 1,
  current: 'ws-0',
  workspaces: [{
    id: 'ws-0',
    nextNodeId: 0,
    nextEdgeId: 0,
    title: 'Untitled-1',
    filePath: '',
    main: createEmptyFlow(),
    embeddedNodeImpls: {},
    path: [],
    dirty: false,
  }],
  nodeMetas: globalNodeMetas,
};

type PayloadSetNodeEntryData = {
  nodeId: string;
  entryId: string;
  type: 'input' | 'output';
  data: any;
};

type PayloadAddNewNode = {
  meta: NodeMetaRef;
  x: number;
  y: number;
};

function currentWorkspace(state: WorkspacesState) {
  return state.workspaces.find(ws => ws.id === state.current)!;
}

function currentFlow(state: WorkspaceState): FlowState {
  if (state.path.length === 0) {
    return state.main;
  }
  const name = state.path[state.path.length - 1];
  return state.embeddedNodeImpls[name].impl;
}

function currentFlowFromWS(state: WorkspacesState): FlowState {
  return currentFlow(currentWorkspace(state));
}

function markDirty(state: WorkspacesState, dirty: boolean) {
  currentWorkspace(state).dirty = dirty;
}

// 生成唯一的标题
function generateUniqueTitle(workspaces: WorkspaceState[]): string {
  let counter = 1;
  let title = `Untitled-${counter}`;

  while (workspaces.some(ws => ws.title === title)) {
    counter++;
    title = `Untitled-${counter}`;
  }

  return title;
}

function _newWorkspace(state: WorkspacesState): void {
  const title = generateUniqueTitle(state.workspaces);
  const id = `ws-${state.nextWSId++}`;
  state.workspaces.push({
    id,
    nextNodeId: 0,
    nextEdgeId: 0,
    title,
    filePath: '',
    main: createEmptyFlow(),
    embeddedNodeImpls: {},
    path: [],
    dirty: false,
  });
  state.current = id;
}

function _closeWorkspace(state: WorkspacesState, action: PayloadAction<string>): void {
  const index = state.workspaces.findIndex(ws => ws.id === action.payload);
  if (index === -1) {
    return;
  }
  state.workspaces.splice(index, 1);
  if (state.workspaces.length === 0) {
    _newWorkspace(state);
  }
  if (state.current === action.payload) {
    state.current = state.workspaces[0].id;
  }
}

function _setCurrentWorkspace(state: WorkspacesState, action: PayloadAction<string>) {
  if (state.workspaces.some(ws => ws.id === action.payload)) {
    state.current = action.payload;
  }
}

function _addNode(state: WorkspacesState, action: PayloadAction<PayloadAddNewNode>) {
  const workspace = currentWorkspace(state);
  const flow = currentFlow(workspace);
  const nodeMeta = getNodeMeta(workspace, state.nodeMetas, action.payload.meta);
  if (!nodeMeta) {
    return;
  }
  const id = `node-${workspace.nextNodeId++}`;
  const node = createNode(id, nodeMeta, action.payload.x, action.payload.y);
  flow.nodes.push(node);
  markDirty(state, true);
}

function _removeNode(state: WorkspacesState, action: PayloadAction<string>) {
  const flow = currentFlowFromWS(state);
  const index = flow.nodes.findIndex(node => node.id === action.payload);
  if (index === -1) {
    return;
  }
  flow.nodes.splice(index, 1);
  flow.edges = flow.edges.filter(edge => {
    return edge.source !== action.payload && edge.target !== action.payload;
  });
  markDirty(state, true);
}

function _setNodeEntryData(state: WorkspacesState, action: PayloadAction<PayloadSetNodeEntryData>) {
  const flow = currentFlowFromWS(state);
  const node = getNodeData(flow, action.payload.nodeId);
  if (!node) {
    return;
  }
  const entry = getNodeEntry(node, action.payload.entryId, action.payload.type);
  if (entry && entry.mode === 'input') {
    entry.data = action.payload.data;
  }
}

function _addEdge(state: WorkspacesState, action: PayloadAction<Connection>) {
  const workspace = currentWorkspace(state);
  const flow = currentFlow(workspace);
  const id = `edge-${workspace.nextEdgeId++}`;
  flow.edges = addAFEdge({
    id,
    ...action.payload,
  }, flow.edges);
  markDirty(state, true);
}

function _setNodes(state: WorkspacesState, action: PayloadAction<AFNode[]>) {
  const flow = currentFlowFromWS(state);
  flow.nodes = action.payload;
  markDirty(state, true);
}

function _setEdges(state: WorkspacesState, action: PayloadAction<AFEdge[]>) {
  const flow = currentFlowFromWS(state);
  flow.edges = action.payload;
  markDirty(state, true);
}

function _applyNodesChange(state: WorkspacesState, action: PayloadAction<NodeChange<AFNode>[]>) {
  const flow = currentFlowFromWS(state);
  flow.nodes = applyNodeChanges(action.payload, flow.nodes);
  markDirty(state, true);
}

function _applyEdgesChange(state: WorkspacesState, action: PayloadAction<EdgeChange<AFEdge>[]>) {
  const flow = currentFlowFromWS(state);
  flow.edges = applyEdgeChanges(action.payload, flow.edges);
  markDirty(state, true);
}

export const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: (create) => ({
    // @ts-expect-error - TS2589: Type instantiation is excessively deep
    newWorkspace: create.reducer(_newWorkspace),
    closeWorkspace: create.reducer(_closeWorkspace),
    setCurrentWorkspace: create.reducer(_setCurrentWorkspace),
    addNode: create.reducer(_addNode),
    removeNode: create.reducer(_removeNode),
    setNodeEntryData: create.reducer(_setNodeEntryData),
    addEdge: create.reducer(_addEdge),
    setNodes: create.reducer(_setNodes),
    setEdges: create.reducer(_setEdges),
    applyNodesChange: create.reducer(_applyNodesChange),
    applyEdgesChange: create.reducer(_applyEdgesChange),
  }),
  selectors: {
    selectWorkspaces: (state) => state.workspaces,
    selectCurrentWorkspaceId: (state) => state.current,
    selectCurrentWorkspace: (state) => currentWorkspace(state),
    selectCurrentFlow: (state) => currentFlowFromWS(state),
    selectNodes: (state) => currentFlowFromWS(state).nodes,
    selectEdges: (state) => currentFlowFromWS(state).edges,
    selectGlobalNodeMetas: (state) => state.nodeMetas,
  },
});

export const {
  newWorkspace,
  closeWorkspace,
  setCurrentWorkspace,
  addNode,
  removeNode,
  setNodeEntryData,
  addEdge,
  setNodes,
  setEdges,
  applyNodesChange,
  applyEdgesChange
} = flowSlice.actions;
export const {
  selectWorkspaces,
  selectCurrentWorkspaceId,
  selectCurrentWorkspace,
  selectCurrentFlow,
  selectNodes,
  selectEdges,
  selectGlobalNodeMetas,
} = flowSlice.selectors;