import type { RecommandLevel } from './enum';

export type NodeRuntime = 'frontend' | 'backend' | 'prefer-frontend' | 'prefer-backend' | 'not-care';
export type NodeType = 'base';
export type NodeNativeMode = 'prefer' | 'disable' | 'force';

export type AnyType = {
  name: 'any';
};

export type IntType = {
  name: 'int';
  enum?: number[];
  range?: [number, number];
  default?: number;
};

export type FloatType = {
  name: 'float';
  enum?: number[];
  range?: [number, number];
  default?: number;
};

export type StringType = {
  name: 'string';
  enum?: string[];
  pattern?: string;
  lenMin?: number;
  lenMax?: number;
  default?: string;
};

export type BoolType = {
  name: 'bool';
  default?: boolean;
};

export type ArrayType = {
  name: 'array';
  shape: number[];
};

export type DictType = {
  name: 'dict';
  keys: {
    [key: string]: NodeEntryType;
  }
};

export type NDArrayType = {
  name: 'ndarray';
  shape: number[];
};

export type TorchTensorType = {
  name: 'torch-tensor';
  shape: number[];
};

export type PythonObjectType = {
  name: 'python-object';
  type: string;
};

export type NodeEntryType = 
  StringType
  | AnyType
  | IntType
  | FloatType 
  | BoolType
  | ArrayType
  | DictType
  | NDArrayType
  | TorchTensorType
  | PythonObjectType
  | NodeEntryType[];

export type NodeEntry = {
  name: string;
  type: NodeEntryType;
  recommandLevel: RecommandLevel;
  description: string;
  verificationCode?: {
    js?: string;
    py?: string;
  };
};

export type NodeMeta = {
  id: string;
  version: string;
  title: string;
  type: NodeType;
  native: boolean;
  impl?: string;
  runtime: NodeRuntime
  verificationCode?: {
    js?: string;
    py?: string;
  };
  inputs: NodeEntry[];
  outputs: NodeEntry[];
  defaultRenderer: string;
};

export type NodeMetaRef = {
  id: string;
  version: string;
};

export type NodeEntryRuntime = {
  name: string;
  mode: 'handle';
} | {
  name: string;
  mode: 'input';
  data: any;
};

export type NodeData = {
  meta: NodeMetaRef;
  title?: string;
  collapsed: boolean;
  nativeMode: NodeNativeMode;
  renderer: string;
  inputs: NodeEntryRuntime[];
  outputs: NodeEntryRuntime[];
};

export type EdgeData = {
  id: string;
  sourceNode: string;
  sourceEntry: string;
  targetNode: string;
  targetEntry: string;
}
