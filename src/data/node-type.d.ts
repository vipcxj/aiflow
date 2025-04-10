import type { Code, CodeRef, NormalizedNodeEntryType } from './data-type'
import type { SubFlowConfigState, FlowRuntimeData } from './flow-type';
import type { RecommandLevel } from './enum';

export type NodeEntry = {
  name: string;
  type: NormalizedNodeEntryType | Code;
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

export type CompoundNodeMeta = SubFlowConfigState;

export type NodeMeta = BaseNodeMeta | CompoundNodeMeta;

export type NodeMetaRef = {
  id: string;
  version?: string;
};

export type InputNodeEntryConfig = {
  name: string;
  mode: 'handle' | 'input';
  modeIndex: number;
};

export type OutputNodeEntryConfig = {
  name: string;
};

export type NodeEntryRuntime = {
  state: 'init' | 'unavailable';
  data: undefined;
  type: undefined;
} | {
  state: 'data-ready';
  data: unknown;
  type: NormalizedNodeEntryType;
} | {
  state: 'type-ready';
  data: undefined;
  type: NormalizedNodeEntryType;
} | {
  state: 'validate-failed';
  data: unknown;
  type: undefined;
};

export type InputNodeEntryConfigData = {
  config: InputNodeEntryConfig;
};

export type InputNodeEntryRuntimeData = {
  runtime: NodeEntryRuntime;
}

export type InputNodeEntryData = InputNodeEntryConfigData & InputNodeEntryRuntimeData;

export type OutputNodeEntryConfigData = {
  config: OutputNodeEntryConfig;
};

export type OutputNodeEntryRuntimeData = {
  runtime: NodeEntryRuntime;
};

export type OutputNodeEntryData = OutputNodeEntryConfigData & OutputNodeEntryRuntimeData;

export type NodeMetaExtend = {
  inputs: NodeEntry[];
  outputs: NodeEntry[];
};

export type ValidateError = {
  level: 'info' | 'warning' | 'error';
  entries: string[];
  message: string;
};

export type ExceptionError = {
  message: string;
};

type NodeDataError = {
  validates: ValidateError[];
  exception?: ExceptionError;
}

type NodeDataBase = {
  id: string;
}

export type NodeData = NodeDataBase & {
  meta: NodeMetaRef;
  metaExtend?: NodeMetaExtend;
  collapsed: boolean;
  inputs: InputNodeEntryData[];
  outputs: OutputNodeEntryData[];
  inputError?: NodeDataError,
  outputError?: NodeDataError,
  template?: FlowRuntimeData,
  flow?: FlowRuntimeData,
};

export type NodeConfigData = NodeDataBase & {
  meta: NodeMetaRef;
  metaExtend?: NodeMetaExtend;
  collapsed: boolean;
  inputs: InputNodeEntryConfigData[];
  outputs: OutputNodeEntryConfigData[];
}

export type NodeRuntimeData = NodeDataBase & {
  inputs: InputNodeEntryRuntimeData[];
  outputs: OutputNodeEntryRuntimeData[];
  inputError?: NodeDataError,
  outputError?: NodeDataError,
  template?: FlowRuntimeData;
  flow?: FlowRuntimeData;
};

export type EdgeData = {
  id: string;
  sourceNode: string;
  sourceEntry: string;
  targetNode: string;
  targetEntry: string;
}

export type EdgeConfigData = EdgeData;
export type EdgeRuntimeData = EdgeData;