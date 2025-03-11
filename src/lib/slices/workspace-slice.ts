import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, NodeAddChange } from '@xyflow/react';
import type { FlowData, NodeData, NodeMeta, NodeMetaRef } from '@/data/data-type';
import type { AFNode, AFEdge } from '@/data/flow-type';
import { createAFNodeFromData, createNodeData, createNodeDataFromAFNode, getNodeMeta } from '@/data/utils';
import { globalNodeMetas } from '@/data/nodes';

export type FlowState = {
  nodes: AFNode[];
  edges: AFEdge[];
  data: FlowData;
};

function getNodeData(state: FlowState, id: string) {
  return state.data.nodes.find(node => node.id === id);
}

function getEntryData(node: NodeData, name: string, type: 'input' | 'output') {
  const entries = type === 'input' ? node.inputs : node.outputs;
  return entries.find(entry => entry.name === name);
}

function applyNodeDataChange(state: FlowState, nodeId: string) {
  const node = getNodeData(state, nodeId);
  if (!node) {
    return;
  }
  const index = state.nodes.findIndex(node => node.id === nodeId);
  if (index === -1) {
    state.nodes[index].data = node;
  }
}

export type WorkspaceState = {
  id: string;
  nextNodeId: number;
  title: string;
  filePath: string;
  main: FlowState;
  sub: {
    [key: string]: FlowState;
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

function createEmptyFlow() {
  return {
    nodes: [],
    edges: [],
    data: {
      nodes: [],
      edges: [],
      nodeMetas: [],
      subFlows: {},
    },
  };
}

export const initialState: WorkspacesState = {
  nextWSId: 1,
  current: 'ws-0',
  workspaces: [{
    id: 'ws-0',
    nextNodeId: 0,
    title: 'Untitled-1',
    filePath: '',
    main: createEmptyFlow(),
    sub: {},
    path: [],
    dirty: false,
  }],
  nodeMetas: globalNodeMetas,
};

function currentWorkspace(state: WorkspacesState) {
  return state.workspaces.find(ws => ws.id === state.current)!;
}

function currentFlow(state: WorkspaceState): FlowState {
  if (state.path.length === 0) {
    return state.main;
  }
  const name = state.path[state.path.length - 1];
  return state.sub[name];
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
    title,
    filePath: '',
    main: createEmptyFlow(),
    sub: {},
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
  const nodeMeta = getNodeMeta(flow.data, state.nodeMetas, action.payload.meta);
  if (!nodeMeta) {
    return;
  }
  const nodeData = createNodeData(nodeMeta, action.payload.x, action.payload.y, () => {
    return `node-${workspace.nextNodeId++}`;
  });
  const node = createAFNodeFromData(nodeData);
  flow.data.nodes.push(nodeData);
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
  const nodeDataIndex = flow.data.nodes.findIndex(node => node.id === action.payload);
  if (nodeDataIndex !== -1) {
    flow.data.nodes.splice(nodeDataIndex, 1);
  }
  markDirty(state, true);
}

function _setNodeEntryData(state: WorkspacesState, action: PayloadAction<PayloadSetNodeEntryData>) {
  const flow = currentFlowFromWS(state);
  const node = getNodeData(flow, action.payload.nodeId);
  if (!node) {
    return;
  }
  const entry = getEntryData(node, action.payload.entryId, action.payload.type);
  if (entry && entry.mode === 'input') {
    entry.data = action.payload.data;
    applyNodeDataChange(flow, action.payload.nodeId);
  }
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



function syncNodeChanges(flow: FlowState, changes: NodeChange<AFNode>[]): void {
  const updatedNodesData: NodeData[] = [];
  const addItemChanges: NodeAddChange<AFNode>[] = [];
  const changesMap = new Map<string, Exclude<NodeChange<AFNode>, NodeAddChange<AFNode>>[]>();
  for (const change of changes) {
    if (change.type === 'add') {
      addItemChanges.push(change);
      continue;
    } else if (change.type === 'select') {
      continue;
    } else if (change.type === 'dimensions') {
      if (typeof change.dimensions === 'undefined' || !change.setAttributes) {
        continue;
      }
    } else if (change.type === 'position') {
      if (typeof change.position === 'undefined') {
        continue;
      }
    } else if (change.type === 'remove' || change.type === 'replace') {
      /*
      * For a 'remove' change we can safely ignore any other changes queued for
      * the same element, it's going to be removed anyway!
      * */
      changesMap.set(change.id, [change]);
      continue;
    }
    const existing = changesMap.get(change.id);
    if (existing) {
      existing.push(change);
    } else {
      changesMap.set(change.id, [change]);
    }
  }
  if (addItemChanges.length === 0 && changesMap.size === 0) {
    return;
  }
  for (const nodeDate of flow.data.nodes) {
    const changes = changesMap.get(nodeDate.id);
    if (!changes) {
      updatedNodesData.push(nodeDate);
      continue;
    }
    if (changes[0].type === 'remove') {
      continue;
    }
    if (changes[0].type === 'replace') {
      // maybe wrong. need to check
      updatedNodesData.push(createNodeDataFromAFNode(changes[0].item));
      continue;
    }
    let c = false;
    for (const change of changes) {
      switch (change.type) {
        case 'position': {
          if (typeof change.position !== 'undefined') {
            nodeDate.position = change.position;
            c = true;
          }
          break;
        }
        case 'dimensions': {
          if (typeof change.dimensions !== 'undefined' && change.setAttributes) {
            nodeDate.size = change.dimensions;
            c = true;
          }
          break;
        }
      }
    }
    if (c) {
      applyNodeDataChange(flow, nodeDate.id);
    }
  }
  if (addItemChanges.length > 0) {
    for (const change of addItemChanges) {
      const nodeData = createNodeDataFromAFNode(change.item);
      if (change.index !== undefined) {
        updatedNodesData.splice(change.index, 0, nodeData);
      } else {
        updatedNodesData.push(nodeData);
      }
    }
  }
  flow.data.nodes = updatedNodesData;
}

function _applyNodesChange(state: WorkspacesState, action: PayloadAction<NodeChange<AFNode>[]>) {
  const flow = currentFlowFromWS(state);
  flow.nodes = applyNodeChanges(action.payload, flow.nodes);
  syncNodeChanges(flow, action.payload);
  markDirty(state, true);
}

function syncEdgeChanges(flow: FlowState, changes: EdgeChange<AFEdge>[]): void {

}

function _applyEdgesChange(state: WorkspacesState, action: PayloadAction<EdgeChange<AFEdge>[]>) {
  const flow = currentFlowFromWS(state);
  flow.edges = applyEdgeChanges(action.payload, flow.edges);
  markDirty(state, true);
}

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

export const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: (create) => ({
    newWorkspace: create.reducer(_newWorkspace),
    closeWorkspace: create.reducer(_closeWorkspace),
    setCurrentWorkspace: create.reducer(_setCurrentWorkspace),
    addNode: create.reducer(_addNode),
    removeNode: create.reducer(_removeNode),
    setNodeEntryData: create.reducer(_setNodeEntryData),
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
    selectEmbeddedNodeMetas: (state) => currentFlowFromWS(state).data.nodeMetas,
  },
});

export const {
  newWorkspace,
  closeWorkspace,
  setCurrentWorkspace,
  addNode,
  removeNode,
  setNodeEntryData,
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
  selectEmbeddedNodeMetas,
} = flowSlice.selectors;