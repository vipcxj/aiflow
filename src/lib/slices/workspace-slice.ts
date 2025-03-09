import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';
import type { AFNode, AFEdge } from '@/data/flow-type';

export type FlowState = {
  nodes: AFNode[];
  edges: AFEdge[];
};

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
};

export const initialState: WorkspacesState = {
  nextId: 0,
  current: 'ws-0',
  workspaces: [{
    id: 'ws-0',
    title: 'Untitled-1',
    filePath: '',
    main: {
      nodes: [],
      edges: [],
    },
    sub: {},
    path: [],
    dirty: false,
  }],
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

export const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    newWorkspace: (state) => {
      const title = generateUniqueTitle(state.workspaces);
      const id = `ws-${state.nextId++}`;
      state.workspaces.push({
        id,
        title,
        filePath: '',
        main: {
          nodes: [],
          edges: [],
        },
        sub: {},
        path: [],
        dirty: false,
      });
      state.current = id;
    },
    closeWorkspace: (state, action: PayloadAction<string>) => {
      const index = state.workspaces.findIndex(ws => ws.id === action.payload);
      if (index === -1) {
        return;
      }
      state.workspaces.splice(index, 1);
      if (state.current === action.payload) {
        state.current = state.workspaces[0].id;
      }
    },
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
    selectWorkspaces: (state) => state.workspaces,
    selectCurrentWorkspaceId: (state) => state.current,
    selectCurrentWorkspace: (state) => currentWorkspace(state),
    selectCurrentFlow: (state) => currentFlowFromWS(state),
    selectNodes: (state) => currentFlowFromWS(state).nodes,
    selectEdges: (state) => currentFlowFromWS(state).edges,
  },
});

export const {
  newWorkspace,
  closeWorkspace,
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
  selectEdges
} = flowSlice.selectors;