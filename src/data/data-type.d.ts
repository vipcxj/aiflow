import type { RecommandLevel } from './enum';
import type { SubFlowState, TemplateRef } from './flow-type';

export type NodeRuntime = 'frontend' | 'backend' | 'prefer-frontend' | 'prefer-backend' | 'not-care';
export type NodeType = 'base';
export type NodeNativeMode = 'prefer' | 'disable' | 'force';

export type AnyType = {
  name: 'any';
};

export type NormalizedAnyType = AnyType;

export type NeverType = {
  name: 'never';
}

export type NormalizedNeverType = NeverType;

export type NumberType = {
  name: 'number';
  enum?: number[];
  min?: number;
  max?: number;
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
  literal?: boolean;
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

export type DictTypeKeys = {
  [key: string]: {
    type: NodeEntryType;
    optional?: boolean;
  };
};

export type DictType = {
  name: 'dict';
  keys?: DictTypeKeys;
};

export type NormalizedDictTypeKeys = {
  [key: string]: {
    type: NormalizedNodeEntryType;
    optional: boolean;
  };
};

export type NormalizedDictType = {
  name: 'dict';
  keys?: NormalizedDictTypeKeys;
};

export type NDArrayDType = 'int32' | 'float32' | 'float64';

export type NDArrayType = {
  name: 'ndarray';
  shape?: number[];
  dtype?: NDArrayDType;
};

export type NormalizedNDArrayType = NDArrayType;

export type TorchTensorDType = 'int32' | 'float32' | 'float64';

export type TorchTensorType = {
  name: 'torch-tensor';
  shape?: number[];
  dtype?: TorchTensorDType;
};

export type NormalizedTorchTensorType = TorchTensorType;

export type PythonObjectType = {
  name: 'python-object';
  type: string;
};

export type NormalizedPythonObjectType = PythonObjectType;

export type UnionType = NodeEntryType[];

export type NodeEntryType =
  AnyType
  | NeverType
  | StringType
  | NumberType
  | BoolType
  | ArrayType
  | DictType
  | NDArrayType
  | TorchTensorType
  | PythonObjectType
  | UnionType;

export type SimpleType = Exclude<NodeEntryType, AnyType | NeverType | UnionType>;
export type FlattenUnionType = SimpleType[];
export type NormalizedSimpleType =
  NormalizedStringType
  | NormalizedNumberType
  | NormalizedBoolType
  | NormalizedArrayType
  | NormalizedDictType
  | NormalizedNDArrayType
  | NormalizedTorchTensorType
  | NormalizedPythonObjectType;
/**
 * length > 1
 */
export type NormalizedUnionType = NormalizedSimpleType[];
export type NormalizedNodeEntryType = NormalizedAnyType | NormalizedNeverType | NormalizedSimpleType | NormalizedUnionType;
export type NormalizedNodeEntrySimpleTypeSupportInput =
  NormalizedStringType
  | NormalizedNumberType
  | NormalizedBoolType;
export type NormalizedNodeEntryComplexTypeSupportInput = NormalizedNodeEntrySimpleTypeSupportInput[];
export type NormalizedNodeEntryTypeSupportInput =
  NormalizedNodeEntrySimpleTypeSupportInput
  | NormalizedNodeEntryComplexTypeSupportInput;

export type NodeEntry = {
  name: string;
  type: NormalizedNodeEntryType;
  disableHandle?: boolean;
  recommandLevel: RecommandLevel;
  description: string;
  verificationCode?: {
    js?: string;
    py?: string;
  };
};

type NodeMetaBase = {
  id: string;
  version?: string;
  title: string;
};

export type Code = {
  code: string;
}

export type CodeRef = {
  ref: string;
}

export type NativeNodeMeta = NodeMetaBase & {
  type: 'native';
  impls: {
    [language: string]: Code | CodeRef;
  }
  checks?: Code | CodeRef;
  types?: Code | CodeRef;
  inputs: NodeEntry[];
  outputs: NodeEntry[];
};

export type CompoundNodeMeta = NodeMetaBase & {
  type: 'compound';
  flow: SubFlowState;
  template?: TemplateRef;
};

export type NodeMeta = NativeNodeMeta | CompoundNodeMeta;

export type NodeMetaRef = {
  id: string;
  version?: string;
};

export type NodeEntryConfig = {
  name: string;
  mode: 'handle' | 'input';
  modeIndex: number;
}

export type NodeEntryRuntime = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  ready: boolean;
  type?: NormalizedNodeEntryType;
};

export type NodeEntryData = {
  runtime: NodeEntryRuntime;
  config: NodeEntryConfig;
}

export type NodeDataBase = {
  id: string;
  inputs: NodeEntryData[];
  outputs: NodeEntryData[];
}

export type StartNodeData = NodeDataBase & {
  type: 'start';
}

export type EndNodeData = NodeDataBase & {
  type: 'end';
}

export type InputNodeData = NodeDataBase & {
  type: 'input';
};

export type OutputNodeData = NodeDataBase & {
  type: 'output';
};

export type LiteralNodeData = NodeDataBase & {
  type: 'literal';
};

export type PreviewNodeData = NodeDataBase & {
  type: 'preview';
};

export type IfNodeData = NodeDataBase & {
  type: 'if';
};

export type SwitchNodeData = NodeDataBase & {
  type: 'switch';
};

export type VariableNodeData = NodeDataBase & {
  type: 'variable';
};

export type AssignNodeData = NodeDataBase & {
  type: 'assign';
};

export type PlaceholderNodeData = NodeDataBase & {
  type: 'placeholder';
};

export type TemplateData = {
  nodes: (GeneralNodeData | TemplateNodeData)[];
  edges: EdgeData[];
};

export type SubFlowData = {
  nodes: (GeneralNodeData | SubFlowNodeData)[];
  edges: EdgeData[];
};

export type BaseNodeData = NodeDataBase & {
  type: 'base';
  meta: NodeMetaRef;
  collapsed: boolean;
  template?: TemplateData,
  flow?: SubFlowData,
};

export type GeneralNodeData = StartNodeData
  | EndNodeData
  | LiteralNodeData
  | PreviewNodeData
  | IfNodeData
  | SwitchNodeData
  | VariableNodeData
  | AssignNodeData
  | BaseNodeData;

export type SubFlowNodeData = InputNodeData | OutputNodeData;

export type TemplateNodeData = PlaceholderNodeData;

export type NodeData = GeneralNodeData | SubFlowNodeData | TemplateNodeData;

export type EdgeData = {
  id: string;
  sourceNode: string;
  sourceEntry: string;
  targetNode: string;
  targetEntry: string;
}
