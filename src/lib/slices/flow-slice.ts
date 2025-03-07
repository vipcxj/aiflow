import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';
import type { AFNode, AFEdge } from '@/data/flow-type';

export type FlowState = {
  nodes: AFNode[];
  edges: AFEdge[];
};

export const initialState: FlowState = {
  nodes: [],
  edges: [],
};

export const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    setNodes: (state, action: PayloadAction<AFNode[]>) => {
      state.nodes = action.payload;
    },
    setEdges: (state, action: PayloadAction<AFEdge[]>) => {
      state.edges = action.payload;
    },
    applyNodesChange: (state, action: PayloadAction<NodeChange<AFNode>[]>) => {
      state.nodes = applyNodeChanges(action.payload, state.nodes);
    },
    applyEdgesChange: (state, action: PayloadAction<EdgeChange<AFEdge>[]>) => {
      state.edges = applyEdgeChanges(action.payload, state.edges);
    },
  },
  selectors: {
    selectNodes: (state) => state.nodes,
    selectEdges: (state) => state.edges,
  },
});

export const { setNodes, setEdges, applyNodesChange, applyEdgesChange } = flowSlice.actions;
export const { selectNodes, selectEdges } = flowSlice.selectors;