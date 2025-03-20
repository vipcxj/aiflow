import type {
  AnyType,
  ArrayComplexShape,
  ArraySimpleShape,
  ArrayType, 
  BoolType, 
  DictType, 
  NDArrayType, 
  NeverType, 
  NodeEntryType, 
  NormalizedNodeEntryComplexTypeSupportInput, 
  NormalizedNodeEntrySimpleTypeSupportInput, 
  NormalizedNodeEntryType, 
  NormalizedNodeEntryTypeSupportInput, 
  NormalizedUnionType, 
  NumberType, 
  PythonObjectType, 
  StringType, 
  TorchTensorType, 
  UnionType 
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