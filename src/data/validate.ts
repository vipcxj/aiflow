import { evaluate } from "@/lib/eval";
import type { NodeData, NodeEntry, NodeEntryConfig, NodeEntryRuntime, NodeMeta, NormalizedArrayType, NormalizedBoolType, NormalizedDictType, NormalizedNDArrayType, NormalizedNodeEntryType, NormalizedNumberType, NormalizedPythonObjectType, NormalizedSimpleType, NormalizedStringType, NormalizedTorchTensorType } from "./data-type";
import { isAnyNodeEntryType, isNeverNodeEntryType, isNormalizedUnionNodeEntryType, isSimpleArrayShape } from "./guard";
import NDArray from "./ndarray";
import PythonObject from "./python-object";
import TorchTensor from "./torch-tensor";
import { isArrayShallowEquals } from "./utils";

export function validateNodeEntryNumberData(data: number, type: NormalizedNumberType): boolean {
  if (type.enum && !type.enum.includes(data)) {
    return false;
  }
  if (type.integer && !Number.isInteger(data)) {
    return false;
  }
  if (type.min && data < type.min) {
    return false;
  }
  if (type.max && data > type.max) {
    return false;
  }
  return true;
}

export function validateNodeEntryStringData(data: string, type: NormalizedStringType): boolean {
  if (type.enum && !type.enum.includes(data)) {
    return false;
  }
  if (type.constraints) {
    for (const c of type.constraints) {
      if (c.pattern && !new RegExp(c.pattern).test(data)) {
        return false;
      }
      if (c.lenMin && data.length < c.lenMin) {
        return false;
      }
      if (c.lenMax && data.length > c.lenMax) {
        return false;
      }
    }
  }
  return true;
}

export function validateNodeEntryBoolData(data: boolean, type: NormalizedBoolType): boolean {
  if (typeof type.literal === 'boolean' && data !== type.literal) {
    return false;
  }
  return true;
}

export function validateNodeEntryArrayData(data: unknown[], type: NormalizedArrayType): boolean {
  const len = isSimpleArrayShape(type.shape) ? type.shape[1] : type.shape.length;
  if (len !== -1 && data.length !== len) {
    return false;
  }
  const firstType = type.shape[0];
  if (len === -1) {
    for (let i = 0; i < data.length; i++) {
      if (!validateNodeEntryDataByType(data[i], firstType)) {
        return false;
      }
    }
    return true;
  }
  for (let i = 0; i < len; i++) {
    const t = isSimpleArrayShape(type.shape) ? firstType : type.shape[i];
    if (!validateNodeEntryDataByType(data[i], t)) {
      return false;
    }
  }
  return true;
}

export function validateNodeEntryDictData(data: Record<string, unknown>, type: NormalizedDictType): boolean {
  if (!type.keys) {
    return true;
  }
  for (const k of Object.keys(type.keys)) {
    const { optional = false, type: t } = type.keys[k];
    if (typeof data[k] === 'undefined' || data[k] === null) {
      if (!optional && !isNeverNodeEntryType(t)) {
        return false;
      }
    } else {
      if (!validateNodeEntryDataByType(data[k], t)) {
        return false;
      }
    }
  }
  return true;
}

export function validateNodeEntryNDArrayData(data: NDArray, type: NormalizedNDArrayType): boolean {
  if (type.dtype && data.dtype !== type.dtype) {
    return false;
  }
  if (type.shape && !isArrayShallowEquals(data.shape, type.shape)) {
    return false;
  }
  return true;
}

export function validateNodeEntryTorchTensorData(data: TorchTensor, type: NormalizedTorchTensorType): boolean {
  if (type.dtype && data.dtype !== type.dtype) {
    return false;
  }
  if (type.shape && !isArrayShallowEquals(data.shape, type.shape)) {
    return false;
  }
  return true;
}

export function validateNodeEntryPythonObjectData(data: PythonObject, type: NormalizedPythonObjectType, mustPthonTypeAssignable?: (left: string, right: string) => boolean): boolean {
  return mustPthonTypeAssignable ? mustPthonTypeAssignable(type.type, data.type) : type.type === data.type;
}

export function validateNodeEntryUnionData(data: unknown, type: NormalizedSimpleType[]): boolean {
  if (type.length === 0) {
    return false;
  }
  for (const t of type) {
    if (validateNodeEntryDataByType(data, t)) {
      return true;
    }
  }
  return false;
}

export function validateNodeEntryDataByType(data: unknown, type: NormalizedNodeEntryType): boolean {
  if (isAnyNodeEntryType(type)) {
    return true;
  }
  if (isNeverNodeEntryType(type)) {
    return false;
  }
  if (isNormalizedUnionNodeEntryType(type)) {
    return validateNodeEntryUnionData(data, type);
  }
  switch (type.name) {
    case 'number':
      return typeof data === 'number' && validateNodeEntryNumberData(data, type);
    case 'string':
      return typeof data === 'string' && validateNodeEntryStringData(data, type);
    case 'bool':
      return typeof data === 'boolean' && validateNodeEntryBoolData(data, type);
    case 'array':
      return Array.isArray(data) && validateNodeEntryArrayData(data, type);
    case 'dict':
      return typeof data === 'object' && validateNodeEntryDictData(data as Record<string, unknown>, type);
    case 'ndarray':
      return data instanceof NDArray && validateNodeEntryNDArrayData(data, type);
    case 'torch-tensor':
      return data instanceof TorchTensor && validateNodeEntryTorchTensorData(data, type);
    case 'python-object':
      return data instanceof PythonObject && validateNodeEntryPythonObjectData(data, type);
    default:
      throw new Error(`Unknown node entry type: ${(type as NormalizedSimpleType).name}`);
  }
}

class ValError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ValError';
  }
}

const validateApi = {
  assert: (condition: boolean, msg: string) => {
    if (!condition) {
      throw new ValError(msg);
    }
  },
};

export function validateNodeEntryData(data: unknown, entry: NodeEntry) {
  if (!validateNodeEntryDataByType(data, entry.type)) {
    throw new ValError(`Invalid node entry data: ${data} for type: ${entry.type}`);
  }
  if (entry.verificationCode && entry.verificationCode.js) {
    evaluate(entry.verificationCode.js, { api: validateApi, meta: entry, data });
  }
}

type Input = {
  meta: NodeEntry;
  config: NodeEntryConfig;
  runtime: NodeEntryRuntime;
};

export function validateNodeData(data: NodeData, meta: NodeMeta) {
  for (let i = 0; i < meta.inputs.length; i++) {
    validateNodeEntryData(data.inputs[i].runtime.data, meta.inputs[i]);
  }
  if (meta.verificationCode && meta.verificationCode.js) {
    const inputs = meta.inputs.map((input, i) => ({ meta: input, config: data.inputs[i].config, runtime: data.inputs[i].runtime }))
      .reduce<Record<string, Input>>((acc, { meta, config, runtime }) => {
        acc[meta.name] = { meta, config, runtime };
        return acc;
      }, {});
    evaluate(meta.verificationCode.js, { api: validateApi, inputs });
  }
}