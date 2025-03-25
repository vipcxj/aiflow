import type { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react';
import { NodeData } from './data-type';

export type AFNodeType = string;
export type AFNodeData = NodeData;
export type AFNode = FlowNode<AFNodeData, AFNodeType>;
export type AFEdgeType = undefined;
export type AFEdgeData = undefined;
export type AFEdge = FlowEdge<AFEdgeData, AFEdgeType>;
export type FlowState = {
  nodes: AFNode[];
  edges: AFEdge[];
};
export type EmbeddedNodeImpl = {
  meta: NodeMeta;
  impl: FlowState;
}
export type WorkspaceState = {
  id: string;
  nextNodeId: number;
  nextEdgeId: number;
  title: string;
  filePath: string;
  main: FlowState;
  embeddedFlows: EmbeddedNodeImpl[];
  path: string[];
  dirty: boolean;
};
