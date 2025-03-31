import type { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react';
import type { GeneralNodeData, SubFlowNodeData, TemplateNodeData, NodeMeta, NodeEntry, EdgeData, NormalizedNodeEntryType } from './data-type';
import { NodeMetaBase } from './node-type';

export type AFNodeType = string;
export type AFGeneralNodeData = GeneralNodeData;
export type AFSubFlowNodeData = GeneralNodeData | SubFlowNodeData;
export type AFTemplateNodeData = GeneralNodeData | TemplateNodeData;
export type AFNodeData = AFGeneralNodeData | AFSubFlowNodeData | AFTemplateNodeData;
export type AFGeneralNode = FlowNode<AFGeneralNodeData, AFNodeType>;
export type AFSubFlowNode = FlowNode<AFSubFlowNodeData, AFNodeType>;
export type AFTemplateNode = FlowNode<AFTemplateNodeData, AFNodeType>;
export type AFNode = AFGeneralNode | AFSubFlowNode | AFTemplateNode;
export type AFEdgeType = undefined;
export type AFEdgeData = EdgeData;
export type AFEdge = FlowEdge<AFEdgeData, AFEdgeType>;

export type VariableRuntime = {
  data?: unknown;
  ready: boolean;
  type: NormalizedNodeEntryType;
}

export type Variable = {
  type: NormalizedNodeEntryType;
  runtime: VariableRuntime;
}

export type FlowType = 'main' | 'subflow' | 'template';

type FlowStateBase = {
  edges: AFEdge[];
  variables: Record<string, Variable>;
}

export type MainFlowState = FlowStateBase & {
  type: 'main';
  nodes: AFGeneralNode[];
};

export type SubFlowState = FlowStateBase & NodeMetaBase & {
  type: 'subflow';
  nodes: AFSubFlowNode[];
};

export type TemplateFlowState = FlowStateBase & {
  id: string;
  version?: string;
  type: 'template';
  nodes: AFTemplateNode[];
  inputs: NodeEntry[];
  outputs: NodeEntry[];
};

export type FlowState = MainFlowState | SubFlowState | TemplateFlowState;

export type TemplateRef = {
  id: string;
  version?: string;
};

type WorkspaceStateBase = {
  id: string;
  nextFlowId: number;
  nextNodeId: number;
  nextEdgeId: number;
  title: string;
  filePath: string;
  path: string[];
  dirty: boolean;
}

export type AppWorkspaceState = WorkspaceStateBase & {
  type: 'app';
  main: MainFlowState;
  nodes: NodeMeta[];
  templates: TemplateFlowState[];
};

export type LibWorkspaceState = WorkspaceStateBase & {
  type: 'lib';
  namespace: string;
  version: string;
  exportNodes: string[];
  exportTemplates: string[];
  nodes: NodeMeta[];
  templates: TemplateFlowState[];
};

export type WorkspaceState = AppWorkspaceState | LibWorkspaceState;