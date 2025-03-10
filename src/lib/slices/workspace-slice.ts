import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';
import type { FlowData, NodeData, NodeMeta, NodeMetaRef } from '@/data/data-type';
import type { AFNode, AFEdge } from '@/data/flow-type';
import { get } from 'http';
import { getNodeMeta } from '@/data/utils';

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
  nextId: number;
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
  nextId: 1,
  current: 'ws-0',
  workspaces: [{
    id: 'ws-0',
    title: 'Untitled-1',
    filePath: '',
    main: createEmptyFlow(),
    sub: {},
    path: [],
    dirty: false,
  }],
  nodeMetas: [],
};

function currentWorkspace(state: WorkspacesState) {
  return state.workspaces.find(ws => ws.id === state.current)!;
}

function currentFlow(state: WorkspaceState) {
  if (state.path.length === 0) {
    return state.main;
  }
  const name = state.path[state.path.length - 1];
  return state.sub[name];
}

function currentFlowFromWS(state: WorkspacesState) {
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
  const id = `ws-${state.nextId++}`;
  state.workspaces.push({
    id,
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

export const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    newWorkspace: (state) => {
      createNewWorkspace(state as WorkspacesState);
    },
    closeWorkspace: (state, action: PayloadAction<string>) => {
      const index = state.workspaces.findIndex(ws => ws.id === action.payload);
      if (index === -1) {
        return;
      }
      state.workspaces.splice(index, 1);
      if (state.workspaces.length === 0) {
        createNewWorkspace(state as WorkspacesState);
      }
      if (state.current === action.payload) {
        state.current = state.workspaces[0].id;
      }
    },
    setCurrentWorkspace: (state, action: PayloadAction<string>) => {
      if (state.workspaces.some(ws => ws.id === action.payload)) {
        state.current = action.payload;
      }
    },
    addNode: (state: WorkspacesState, action: PayloadAction<NodeMetaRef>) => {
      const flow = currentFlowFromWS(state);
      const nodeMeta = getNodeMeta(flow.data, state.nodeMetas, action.payload);
      if (!nodeMeta) {
        return;
      }
      markDirty(state, true);
    },
    setNodeEntryData: (state, action: PayloadAction<PayloadSetNodeEntryData>) => {
      const flow = currentFlowFromWS(state as WorkspacesState);
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
    setNodes: (state, action: PayloadAction<AFNode[]>) => {
      const flow = currentFlowFromWS(state as WorkspacesState);
      flow.nodes = action.payload;
      markDirty(state, true);
    },
    setEdges: (state, action: PayloadAction<AFEdge[]>) => {
      const flow = currentFlowFromWS(state as WorkspacesState);
      flow.edges = action.payload;
      markDirty(state, true);
    },
    applyNodesChange: (state, action: PayloadAction<NodeChange<AFNode>[]>) => {
      const flow = currentFlowFromWS(state as WorkspacesState);
      flow.nodes = applyNodeChanges(action.payload, flow.nodes);
      markDirty(state, true);
    },
    applyEdgesChange: (state, action: PayloadAction<EdgeChange<AFEdge>[]>) => {
      const flow = currentFlowFromWS(state as WorkspacesState);
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