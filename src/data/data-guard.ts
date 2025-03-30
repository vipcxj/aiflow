import type {
  AnyType,
  ArrayComplexShape,
  ArraySimpleShape,
  ArrayType, 
  AssignNodeData, 
  BaseNodeData, 
  BoolType, 
  Code, 
  CodeRef, 
  CompoundNodeMeta, 
  DictType, 
  EndNodeData, 
  IfNodeData, 
  InputNodeData, 
  LiteralNodeData, 
  NativeNodeMeta, 
  NDArrayType, 
  NeverType, 
  NodeData, 
  NodeEntryType, 
  NodeMeta, 
  NormalizedNodeEntryComplexTypeSupportInput, 
  NormalizedNodeEntrySimpleTypeSupportInput, 
  NormalizedNodeEntryType, 
  NormalizedNodeEntryTypeSupportInput, 
  NormalizedUnionType, 
  NumberType, 
  OutputNodeData, 
  PlaceholderNodeData, 
  PreviewNodeData, 
  PythonObjectType, 
  StartNodeData, 
  StringType, 
  SwitchNodeData, 
  TorchTensorType, 
  UnionType, 
  VariableNodeData
} from "./data-type";

export function isAnyNodeEntryType(type: NodeEntryType): type is AnyType {
  return !Array.isArray(type) && type.name === 'any';
}

export function isNeverNodeEntryType(type: NodeEntryType): type is NeverType {
  return !Array.isArray(type) && type.name === 'never';
}

export function isStringNodeEntryType(type: NodeEntryType): type is StringType {
  return !Array.isArray(type) && type.name === 'string';
}

export function isNumberNodeEntryType(type: NodeEntryType): type is NumberType {
  return !Array.isArray(type) && type.name === 'number';
}

export function isBoolNodeEntryType(type: NodeEntryType): type is BoolType {
  return !Array.isArray(type) && type.name === 'bool';
}

export function isArrayNodeEntryType(type: NodeEntryType): type is ArrayType {
  return !Array.isArray(type) && type.name === 'array';
}

export function isDictNodeEntryType(type: NodeEntryType): type is DictType {
  return !Array.isArray(type) && type.name === 'dict';
}

export function isNDArrayNodeEntryType(type: NodeEntryType): type is NDArrayType {
  return !Array.isArray(type) && type.name === 'ndarray';
}

export function isTorchTensorNodeEntryType(type: NodeEntryType): type is TorchTensorType {
  return !Array.isArray(type) && type.name === 'torch-tensor';
}

export function isPythonObjectNodeEntryType(type: NodeEntryType): type is PythonObjectType {
  return !Array.isArray(type) && type.name === 'python-object';
}

export function isUnionNodeEntryType(type: NodeEntryType): type is UnionType {
  return Array.isArray(type);
}

export function isNormalizedUnionNodeEntryType(type: NormalizedNodeEntryType, strict: boolean = false): type is NormalizedUnionType {
  return Array.isArray(type) && (!strict || type.length > 1);
}

export function isNodeEntrySimpleTypeSupportInput(type: NormalizedNodeEntryType): type is NormalizedNodeEntrySimpleTypeSupportInput {
  return isStringNodeEntryType(type)
    || isNumberNodeEntryType(type)
    || isBoolNodeEntryType(type);
}

export function isNodeEntryComplexTypeSupportInput(type: NormalizedNodeEntryType): type is NormalizedNodeEntryComplexTypeSupportInput {
  return isUnionNodeEntryType(type)
    && type.every(isNodeEntrySimpleTypeSupportInput);
}

export function isNodeEntryTypeSupportInput(type: NormalizedNodeEntryType): type is NormalizedNodeEntryTypeSupportInput {
  return isNodeEntrySimpleTypeSupportInput(type) || isNodeEntryComplexTypeSupportInput(type);
}

export function isSimpleArrayShape(shape: ArrayType['shape']): shape is ArraySimpleShape {
  return Array.isArray(shape) && shape.length === 2 && typeof shape[1] === 'number';
}

export function isComplexArrayShape(shape: ArrayType['shape']): shape is ArrayComplexShape {
  return Array.isArray(shape) && shape.length > 0 && !isSimpleArrayShape(shape);
}

export function isNativeNode(meta: NodeMeta): meta is NativeNodeMeta {
  return meta.type === 'native';
}

export function isCompoundNode(meta: NodeMeta): meta is CompoundNodeMeta {
  return meta.type === 'compound';
}

export function isStartNodeData(data: NodeData): data is StartNodeData {
  return data.type === 'start';
}

export function isEndNodeData(data: NodeData): data is EndNodeData {
  return data.type === 'end';
}

export function isLiteralNodeData(data: NodeData): data is LiteralNodeData {
  return data.type === 'literal';
}

export function isPreviewNodeData(data: NodeData): data is PreviewNodeData {
  return data.type === 'preview';
}

export function isIfNodeData(data: NodeData): data is IfNodeData {
  return data.type === 'if';
}

export function isSwitchNodeData(data: NodeData): data is SwitchNodeData {
  return data.type === 'switch';
}

export function isVariableNodeData(data: NodeData): data is VariableNodeData {
  return data.type === 'variable';
}

export function isAssignNodeData(data: NodeData): data is AssignNodeData {
  return data.type === 'assign';
}

export function isBaseNodeData(data: NodeData): data is BaseNodeData {
  return data.type === 'base';
}

export function isInputsNodeData(data: NodeData): data is InputNodeData {
  return data.type === 'input';
}

export function isOutputsNodeData(data: NodeData): data is OutputNodeData {
  return data.type === 'output';
}

export function isPlaceholderNodeData(data: NodeData): data is PlaceholderNodeData {
  return data.type === 'placeholder';
}

export function isCode(value: Code | CodeRef): value is Code {
  return 'code' in value;
}

export function isCodeRef(value: Code | CodeRef): value is CodeRef {
  return 'ref' in value;
}