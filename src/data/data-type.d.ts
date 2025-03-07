export type NodeRuntime = 'frontend' | 'backend' | 'prefer-frontend' | 'prefer-backend' | 'not-care';
export type NodeType = 'base';
export type NodeNativeMode = 'prefer' | 'disable' | 'force';

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
  'string' 
  | 'int' 
  | 'float' 
  | 'bool' 
  | ArrayType
  | DictType
  | NDArrayType
  | TorchTensorType
  | PythonObjectType;

export const enum RecommandLevel {
  BROKEN = -2, // show error message when user use this node
  DEPRECATED = -1, // show warning message when user use this node
  NORMAL = 0, // show nothing when user use or not use this node
  RECOMMAND = 1, // show info message when user not use this node
  SHOULD = 2, // show warning message when user not use this node
  MUST = 3, // show error message when user not use this node
};

export type NodeEntry = {
  name: string;
  type: NodeEntryType;
  recommandLevel: RecommandLevel;
  description: string;
};

export type NodeMeta = {
  id: string;
  version: string;
  type: NodeType;
  native: boolean;
  impl?: string;
  runtime: NodeRuntime
  verificationCode?: {
    js?: string;
    py?: string;
  },
  inputs: NodeEntry[];
  outputs: NodeEntry[];
  defaultRenderer?: string;
};

export type NodeMetaRef = {
  id: string;
  version: string;
};

export type Node = {
  id: string;
  meta: NodeMetaRef;
  position: {
    x: number;
    y: number;
  },
  size: {
    width: number;
    height: number;
  },
  collapsed: boolean;
  nativeMode: NodeNativeMode;
  renderer: string;
};