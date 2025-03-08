import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';
import type { AFNode, AFEdge } from '@/data/flow-type';

export type FlowState = {
  nodes: AFNode[];
  edges: AFEdge[];
};

export type WorkspaceState = {
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
  current: string;
  workspaces: {
    [key: string]: WorkspaceState;
  },
};

export const initialState: WorkspacesState = {
  current: 'Untitled-1',
  workspaces: {
    'Untitled-1': {
      title: 'Untitled-1',
      filePath: '',
      main: {
        nodes: [],
        edges: [],
      },
      sub: {},
      path: [],
      dirty: false,
    },
  },
};

function currentWorkspace(state: WorkspacesState) {
  return state.workspaces[state.current];
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

export const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    setNodes: (state, action: PayloadAction<AFNode[]>) => {
      const flow = currentFlowFromWS(state);
      flow.nodes = action.payload;
      markDirty(state, true);
    },
    setEdges: (state, action: PayloadAction<AFEdge[]>) => {
      const flow = currentFlowFromWS(state);
      flow.edges = action.payload;
      markDirty(state, true);
    },
    applyNodesChange: (state, action: PayloadAction<NodeChange<AFNode>[]>) => {
      const flow = currentFlowFromWS(state);
      flow.nodes = applyNodeChanges(action.payload, flow.nodes);
      markDirty(state, true);
    },
    applyEdgesChange: (state, action: PayloadAction<EdgeChange<AFEdge>[]>) => {
      const flow = currentFlowFromWS(state);
      flow.edges = applyEdgeChanges(action.payload, flow.edges);
      markDirty(state, true);
    },
  },
  selectors: {
    selectCurrentWorkspace: (state) => currentWorkspace(state),
    selectCurrentFlow: (state) => currentFlowFromWS(state),
    selectNodes: (state) => currentFlowFromWS(state).nodes,
    selectEdges: (state) => currentFlowFromWS(state).edges,
  },
});

export const { setNodes, setEdges, applyNodesChange, applyEdgesChange } = flowSlice.actions;
export const { selectCurrentWorkspace, selectCurrentFlow, selectNodes, selectEdges } = flowSlice.selectors;