import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';
import type { FlowData, NodeData, NodeMeta, NodeMetaRef } from '@/data/data-type';
import type { AFNode, AFEdge } from '@/data/flow-type';
import { createAFNodeFromData, createNodeData, getNodeMeta } from '@/data/utils';
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

function createNewWorkspace(state: WorkspacesState): void {
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
  reducers: {
    newWorkspace: (state: WorkspacesState) => {
      createNewWorkspace(state);
    },
    closeWorkspace: (state: WorkspacesState, action: PayloadAction<string>) => {
      const index = state.workspaces.findIndex(ws => ws.id === action.payload);
      if (index === -1) {
        return;
      }
      state.workspaces.splice(index, 1);
      if (state.workspaces.length === 0) {
        createNewWorkspace(state);
      }
      if (state.current === action.payload) {
        state.current = state.workspaces[0].id;
      }
    },
    setCurrentWorkspace: (state: WorkspacesState, action: PayloadAction<string>) => {
      if (state.workspaces.some(ws => ws.id === action.payload)) {
        state.current = action.payload;
      }
    },
    addNode: (state: WorkspacesState, action: PayloadAction<PayloadAddNewNode>) => {
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
    },
    setNodeEntryData: (state: WorkspacesState, action: PayloadAction<PayloadSetNodeEntryData>) => {
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
    },
    setNodes: (state: WorkspacesState, action: PayloadAction<AFNode[]>) => {
      const flow = currentFlowFromWS(state);
      flow.nodes = action.payload;
      markDirty(state, true);
    },
    setEdges: (state: WorkspacesState, action: PayloadAction<AFEdge[]>) => {
      const flow = currentFlowFromWS(state);
      flow.edges = action.payload;
      markDirty(state, true);
    },
    applyNodesChange: (state: WorkspacesState, action: PayloadAction<NodeChange<AFNode>[]>) => {
      const flow = currentFlowFromWS(state);
      flow.nodes = applyNodeChanges(action.payload, flow.nodes);
      markDirty(state, true);
    },
    applyEdgesChange: (state: WorkspacesState, action: PayloadAction<EdgeChange<AFEdge>[]>) => {
      const flow = currentFlowFromWS(state);
      flow.edges = applyEdgeChanges(action.payload, flow.edges);
      markDirty(state, true);
    },
  },
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