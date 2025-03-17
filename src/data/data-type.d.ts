import exp from 'constants';
import type { RecommandLevel } from './enum';

export type NodeRuntime = 'frontend' | 'backend' | 'prefer-frontend' | 'prefer-backend' | 'not-care';
export type NodeType = 'base';
export type NodeNativeMode = 'prefer' | 'disable' | 'force';

export type AnyType = {
  name: 'any';
};

export type NormalizedAnyType = AnyType;

export type NumberType = {
  name: 'number';
  enum?: number[];
  range?: [number, number];
  default?: number;
  integer?: boolean;
};

export type NormalizedNumberType = NumberType;

export type StringConstraint = {
  pattern?: string;
  lenMin?: number;
  lenMax?: number;
};

export type StringType = {
  name: 'string';
  enum?: string[];
  // or relationship
  constraints?: StringConstraint[];
  default?: string;
};

export type NormalizedStringType = StringType;

export type BoolType = {
  name: 'bool';
  default?: boolean;
};

export type NormalizedBoolType = BoolType;

export type ArraySimpleShape = [NodeEntryType, number];
export type ArrayComplexShape = Array<NodeEntryType>;

export type ArrayType = {
  name: 'array';
  shape: ArraySimpleShape | ArrayComplexShape;
};

export type ArraySimpleType = {
  name: 'array';
  shape: ArraySimpleShape;
}

export type ArrayComplexType = {
  name: 'array';
  shape: ArrayComplexShape;
}

export type NormalizedArraySimpleShape = [NormalizedNodeEntryType, number];
export type NormalizedArrayComplexShape = NormalizedNodeEntryType[];

export type NormalizedArrayType = {
  name: 'array';
  shape: NormalizedArraySimpleShape | NormalizedArrayComplexShape;
};

export type NormalizedArraySimpleType = {
  name: 'array';
  shape: NormalizedArraySimpleShape;
}

export type NormalizedArrayComplexType = {
  name: 'array';
  shape: NormalizedArrayComplexShape;
}

export type DictType = {
  name: 'dict';
  keys?: {
    [key: string]: NodeEntryType;
  }
};

export type NormalizedDictType = {
  name: 'dict';
  keys?: {
    [key: string]: NormalizedNodeEntryType;
  }
};

export type NDArrayType = {
  name: 'ndarray';
  shape?: number[];
  dtype?: 'int32' | 'float32' | 'float64';
};

export type NormalizedNDArrayType = NDArrayType;

export type TorchTensorType = {
  name: 'torch-tensor';
  shape?: number[];
  dtype?: 'int32' | 'float32' | 'float64';
};

export type NormalizedTorchTensorType = TorchTensorType;

export type PythonObjectType = {
  name: 'python-object';
  type: string;
};

export type NormalizedPythonObjectType = PythonObjectType;

export type UnionType = NodeEntryType[];

export type NodeEntryType = 
  StringType
  | AnyType
  | NumberType 
  | BoolType
  | ArrayType
  | DictType
  | NDArrayType
  | TorchTensorType
  | PythonObjectType
  | UnionType;

export type SimpleType = Exclude<NodeEntryType, NodeEntryType[]>;
export type FlattenUnionType = SimpleType[];
export type NormalizedUnionType = NormalizedSimpleType[];
export type NormalizedNodeEntryType =
  NormalizedStringType
  | NormalizedAnyType
  | NormalizedNumberType 
  | NormalizedBoolType
  | NormalizedArrayType
  | NormalizedDictType
  | NormalizedNDArrayType
  | NormalizedTorchTensorType
  | NormalizedPythonObjectType
  | NormalizedUnionType;
export type NormalizedSimpleType = Exclude<NormalizedNodeEntryType, NormalizedNodeEntryType[]>;

export type NodeEntry = {
  name: string;
  type: NodeEntryType;
  disableHandle?: boolean;
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
