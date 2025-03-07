import type { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react';

export type AFNodeType = string;
export type AFNodeData = {};
export type AFNode = FlowNode<AFNodeData, AFNodeType>;
export type AFEdgeType = undefined;
export type AFEdgeData = {};
export type AFEdge = FlowEdge<AFEdgeData, AFEdgeType>;