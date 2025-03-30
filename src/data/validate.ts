import { evaluate } from "@/lib/eval";
import type { BaseNodeData, NodeEntry, NodeEntryData, NodeMeta, NormalizedArrayType, NormalizedBoolType, NormalizedDictType, NormalizedNDArrayType, NormalizedNodeEntryType, NormalizedNumberType, NormalizedPythonObjectType, NormalizedSimpleType, NormalizedStringType, NormalizedTorchTensorType } from "./data-type";
import { isAnyNodeEntryType, isBaseNodeData, isCode, isNativeNode, isNeverNodeEntryType, isNormalizedUnionNodeEntryType, isSimpleArrayShape } from "./data-guard";
import NDArray from "./ndarray";
import PythonObject from "./python-object";
import TorchTensor from "./torch-tensor";
import { isArrayShallowEquals } from "./utils";
import { entryValidateApis, nodeValidateApis } from "./validate-apis";

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

export class ValError extends Error {
  entries: string[];
  constructor(msg: string, entries: string[]) {
    super(msg);
    this.name = 'ValError';
    Object.setPrototypeOf(this, ValError.prototype);
    this.entries = entries;
  }
}

export type EntryValidateContext = {
  api: {
    assert: (condition: boolean, msg: string) => void;
  };
  entry: NodeEntry;
  data: unknown;
}

export function createEntryValidateContext(data: unknown, entry: NodeEntry): EntryValidateContext {
  return {
    api: {
      assert: (condition: boolean, msg: string) => {
        if (!condition) {
          throw new ValError(msg, [entry.name]);
        }
      },
    },
    entry,
    data,
  };
}

export type EntryValidateFunc = (ctx: EntryValidateContext) => void;

export type NodeValidateContext = {
  api: {
    assert: (condition: boolean, msg: string) => void;
  };
  entries: Record<string, NodeEntry>;
  data: Record<string, NodeEntryData>;
}

export function createNodeValidateContext(data: BaseNodeData, meta: NodeMeta): NodeValidateContext {
  const entries = isNativeNode(meta) ? meta.inputs : meta.flow.inputs;
  return {
    api: {
      assert: (condition: boolean, msg: string) => {
        if (!condition) {
          throw new ValError(msg, entries.map(entry => entry.name));
        }
      },
    },
    entries: Object.fromEntries(entries.map(entry => [entry.name, entry])),
    data: Object.fromEntries(data.inputs.map(entry => [entry.config.name, entry.runtime.data])),
  };
}

export type NodeValidateFunc = (ctx: NodeValidateContext) => void;

export function validateNodeEntryData(data: unknown, entry: NodeEntry, entryData: NodeEntryData): boolean {
  if (!validateNodeEntryDataByType(data, entry.type)) {
    entryData.runtime.state = 'error';
    entryData.runtime.error = {
      reason: 'validate-failed',
      error: new ValError('Type mismatch', [entry.name]),
    };
    entryData.runtime.data = undefined;
    entryData.runtime.type = undefined;
    return false;
  }
  if (entry.checkCode) {
    const ctx = createEntryValidateContext(data, entry);
    try {
      if (isCode(entry.checkCode)) {
        evaluate(entry.checkCode.code, ctx);
      } else {
        const api = (entryValidateApis as Record<string, EntryValidateFunc>)[entry.checkCode.ref];
        api(ctx);
      }
    } catch (e) {
      if (e instanceof ValError) {
        entryData.runtime.state = 'error';
        entryData.runtime.error = {
          reason: 'validate-failed',
          error: e,
        };
        entryData.runtime.data = undefined;
        entryData.runtime.type = undefined;
        return false;
      } else {
        throw e;
      }
    }
  }
  return true;
}

export function validateNodeData(data: BaseNodeData, meta: NodeMeta, validateEntries: boolean): boolean {
  if (isBaseNodeData(data)) {
    if (!meta) {
      throw new Error('Meta is required for validating entries');
    }
    if (validateEntries) {
      const inputs = isNativeNode(meta) ? meta.inputs : meta.flow.inputs;
      let result = true;
      for (let i = 0; i < inputs.length; i++) {
        const entry = inputs[i];
        result = result && validateNodeEntryData(data.inputs[i].runtime.data, entry, data.inputs[i]);
      }
      if (!result) {
        return false;
      }
    }
    if (isNativeNode(meta)) {
      if (meta.checkCode) {
        try {
          const ctx = createNodeValidateContext(data, meta);
          if (isCode(meta.checkCode)) {
            evaluate(meta.checkCode.code, ctx);
          } else {
            const api = (nodeValidateApis as Record<string, NodeValidateFunc>)[meta.checkCode.ref];
            api(ctx);
          }
        } catch (e) {
          if (e instanceof ValError) {
            for (const entryName of e.entries) {
              const entry = data.inputs.find(entry => entry.config.name === entryName);
              if (entry) {
                entry.runtime.state = 'error';
                entry.runtime.error = {
                  reason: 'validate-failed',
                  error: e,
                };
                entry.runtime.data = undefined;
                entry.runtime.type = undefined;
              }
            }
            return false;
          } else {
            throw e;
          }
        }
      }
    }
  }
  return true;
}