import type { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react';
import type { NormalizedNodeEntryType } from './data-type';
import type {
  NodeMetaBase, 
  NodeEntry, 
  NodeData, EdgeData, 
  NodeConfigData, EdgeConfigData,
  NodeRuntimeData,
} from './node-type';

export type AFNodeType = string;
export type AFNodeData = NodeData;
export type AFNode = FlowNode<AFNodeData, AFNodeType>;
export type AFConfigNodeData = NodeConfigData;
export type AFConfigNode = FlowNode<AFConfigNodeData, AFNodeType>;
export type AFEdgeType = undefined;
export type AFEdgeData = EdgeData;
export type AFEdge = FlowEdge<AFEdgeData, AFEdgeType>;
export type AFConfigEdgeData = EdgeConfigData;
export type AFConfigEdge = FlowEdge<AFConfigEdgeData, AFEdgeType>;

export type VariableRuntime = {
  data?: unknown;
  ready: boolean;
  type: NormalizedNodeEntryType;
}

export type Variable = {
  type: NormalizedNodeEntryType;
  description?: string;
  runtime: VariableRuntime;
}

export type VariableConfig = {
  type: NormalizedNodeEntryType;
  description?: string;
}

export type FlowType = 'main' | 'subflow' | 'template';

type FlowStateBase = {
  edges: AFEdge[];
  variables: Record<string, Variable>;
}

export type MainFlowState = FlowStateBase & {
  type: 'main';
  nodes: AFNode[];
};

export type SubFlowState = FlowStateBase & NodeMetaBase & {
  type: 'subflow';
  category: 'subflow';
  nodes: AFNode[];
};

export type SubFlowConfigState = NodeMetaBase & {
  type: 'subflow';
  category: 'subflow';
  nodes: AFConfigNode[];
  edges: AFConfigEdge[];
  variables: Record<string, VariableConfig>;
}

export type TemplateFlowState = FlowStateBase & {
  id: string;
  version?: string;
  type: 'template';
  nodes: AFNode[];
  inputs: NodeEntry[];
  outputs: NodeEntry[];
};

export type TemplateFlowConfigState = {
  id: string;
  version?: string;
  type: 'template';
  nodes: AFConfigNode[];
  edges: AFConfigEdge[];
  inputs: NodeEntry[];
  outputs: NodeEntry[];
  variables: Record<string, VariableConfig>;
};

export type FlowState = MainFlowState | SubFlowState | TemplateFlowState;
export type FlowConfigState = SubFlowConfigState | TemplateFlowConfigState;

export type TemplateRef = {
  id: string;
  version?: string;
};

export type FlowData = {
  nodes: NodeData[];
  edges: EdgeData[];
};

export type FlowConfigData = {
  nodes: NodeConfigData[];
  edges: EdgeConfigData[];
};

export type FlowRuntimeData = {
  nodes: NodeRuntimeData[];
};

type WorkspaceStateBase = {
  id: string;
  nextFlowId: number;
  nextNodeId: number;
  nextEdgeId: number;
  title: string;
  filePath: string;
  routeStack: string[];
  dirty: boolean;
}

export type AppWorkspaceState = WorkspaceStateBase & {
  type: 'app';
  main: MainFlowState;
  subFlows: SubFlowState[];
  templates: TemplateFlowState[];
};

export type LibWorkspaceState = WorkspaceStateBase & {
  type: 'lib';
  namespace: string;
  version: string;
  exportNodes: string[];
  exportTemplates: string[];
  subFlows: SubFlowState[];
  templates: TemplateFlowState[];
};

export type WorkspaceState = AppWorkspaceState | LibWorkspaceState;