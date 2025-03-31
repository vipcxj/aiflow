import type { Code, CodeRef, NormalizedNodeEntryType } from './data-type'
import type { SubFlowState } from './flow-type';
import type { RecommandLevel } from './enum';

export type NodeEntry = {
  name: string;
  type: NormalizedNodeEntryType;
  disableHandle?: boolean;
  recommandLevel: RecommandLevel;
  description: string;
  checkCode?: Code | CodeRef;
};

type NodeMetaBase = {
  id: string;
  version?: string;
  type: string;
  title: string;
  inputs: NodeEntry[];
  outputs: NodeEntry[];
  renderer: string;
};

export type BaseNodeMeta = NodeMetaBase & {
  type: 'base';
  frontendImpls?: Code | CodeRef;
  checkCode?: Code | CodeRef;
  typeCode?: Code | CodeRef;
};

export type CompoundNodeMeta = SubFlowState;

export type NodeMeta = BaseNodeMeta | CompoundNodeMeta;

export type NodeMetaRef = {
  id: string;
  version?: string;
};

export type NodeEntryConfig = {
  name: string;
  mode: 'handle' | 'input';
  modeIndex: number;
};

export type RuntimeState = 'init' | 'data-ready' | 'type-ready' | 'unavailable' | 'error';

export type NodeEntryRuntime = {
  state: 'init' | 'unavailable';
  data: undefined;
  type: undefined;
  error: undefined;
} | {
  state: 'data-ready';
  data: unknown;
  type: undefined;
  error: undefined;
} | {
  state: 'type-ready';
  data: undefined;
  type: NormalizedNodeEntryType;
  error: undefined;
} | {
  state: 'error';
  data: undefined;
  type: undefined;
  error?: {
    reason: 'exception';
    error: unknown;
  } | {
    reason: 'validate-failed';
    error: ValError
  };
};

export type NodeEntryData = {
  runtime: NodeEntryRuntime;
  config: NodeEntryConfig;
};

export type FlowData = {
  nodes: NodeData[];
  edges: EdgeData[];
};

export type NodeData = {
  id: string;
  meta: NodeMetaRef | NodeMeta;
  collapsed: boolean;
  inputs: NodeEntryData[];
  outputs: NodeEntryData[];
  template?: FlowData,
  flow?: FlowData,
}