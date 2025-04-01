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
