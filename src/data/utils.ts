import { evaluate } from "@/lib/eval";
import { AnyType, ArrayType, BoolType, DictType, FloatType, FlowData, IntType, NDArrayType, NodeData, NodeEntry, NodeEntryRuntime, NodeEntryType, NodeMeta, NodeMetaRef, PythonObjectType, StringType, TorchTensorType } from "./data-type";

export function getNodeMeta(flow: FlowData, globalNodeMetas: NodeMeta[], ref: NodeMetaRef): NodeMeta | undefined {
  const nodeMeta = flow.nodeMetas.find(meta => meta.id === ref.id && meta.version === ref.version);
  if (nodeMeta) {
    return nodeMeta;
  }
  return globalNodeMetas.find(meta => meta.id === ref.id && meta.version === ref.version);
}

export function isAnyNodeEntryType(type: NodeEntryType): type is AnyType {
  return !Array.isArray(type) && type.name === 'any';
}

export function isStringNodeEntryType(type: NodeEntryType): type is StringType {
  return !Array.isArray(type) && type.name === 'string';
}

export function isIntNodeEntryType(type: NodeEntryType): type is IntType {
  return !Array.isArray(type) && type.name === 'int';
}

export function isFloatNodeEntryType(type: NodeEntryType): type is FloatType {
  return !Array.isArray(type) && type.name === 'float';
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

export function isUnionNodeEntryType(type: NodeEntryType): type is NodeEntryType[] {
  return Array.isArray(type);
}

export function isNodeEntrySupportInput(entry: NodeEntry) {
  return isStringNodeEntryType(entry.type) || isIntNodeEntryType(entry.type) || isFloatNodeEntryType(entry.type) || isBoolNodeEntryType(entry.type);
}

class ValError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ValError';
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new ValError(msg);
  }
}

export function isNodeEntryDataValid(entry: NodeEntry, data: any): boolean {
  if (isIntNodeEntryType(entry.type) || isFloatNodeEntryType(entry.type)) {
    if (typeof data !== 'number') {
      return false;
    }
    if (isIntNodeEntryType(entry.type) && !Number.isInteger(data)) {
      return false;
    }
    if (entry.type.range && (data < entry.type.range[0] || data >= entry.type.range[1])) {
      return false;
    }
    if (entry.type.enum && !entry.type.enum.includes(data)) {
      return false;
    }
  } else if (isBoolNodeEntryType(entry.type)) {
    if (typeof data !== 'boolean') {
      return false;
    }
  } else if (isStringNodeEntryType(entry.type)) {
    if (typeof data !== 'string') {
      return false;
    }
    if (entry.type.pattern && !new RegExp(entry.type.pattern).test(data)) {
      return false;
    }
    if (entry.type.enum && !entry.type.enum.includes(data)) {
      return false;
    }
  }
  if (entry.verificationCode && entry.verificationCode.js) {
    try {
      evaluate(entry.verificationCode.js, { meta: entry, data });
    } catch (e) {
      if (!(e instanceof ValError)) {
        console.error(e);
      }
      return false;
    }
  }
  return true;
}

/**
 * get the default value of the entry type. if undefined returned, it means no valid value for this type.
 * @param type entry type
 * @returns default value of the entry type
 */
export function getIntNodeEntryDefaultData(type: IntType): number | undefined {
  if (type.default !== undefined) {
    return type.default;
  } else if (type.enum && type.enum.length > 0) {
    if (type.range) {
      for (const e of type.enum) {
        if (Number.isInteger(e) && e >= type.range[0] && e < type.range[1]) {
          return e;
        }
      }
      return undefined;
    } else {
      for (const e of type.enum) {
        if (Number.isInteger(e)) {
          return e;
        }
      }
      return undefined;
    }
  } else if (type.range) {
    const v = Math.ceil(type.range[0]);
    if (v < type.range[1]) {
      return type.range[0];
    } else {
      return undefined;
    }
  } else {
    return 0;
  }
}

export function getFloatNodeEntryDefaultData(type: FloatType): number | undefined {

}


export type NodeEntryData = {
  meta: NodeEntry;
  runtime: NodeEntryRuntime;
};

export function sortInputNodeEntries(entries: NodeEntry[], runtimeEntries: NodeEntryRuntime[]): NodeEntryData[] {
  return entries.map((entry, i) => ({
    meta: entry,
    runtime: runtimeEntries[i],
    i,
  })).sort((a, b) => {
    if (a.runtime.mode === 'handle' && b.runtime.mode !== 'handle') {
      return -1;
    } else if (a.runtime.mode !== 'handle' && b.runtime.mode === 'handle') {
      return 1;
    } else {
      return a.i - b.i;
    }
  }).map(({ meta, runtime }) => ({ meta, runtime }));
}

function createEntryRuntime(entry: NodeEntry): NodeEntryRuntime {
  if (isNodeEntrySupportInput(entry)) {
    return {
      mode: 'input',
      data: undefined,
    };
  }
}

export function createNodeData(meta: NodeMeta, x: number, y: number, idGenerator: () => string): NodeData {
  const id = idGenerator();
  return {
    id,
    meta: {
      id: meta.id,
      version: meta.version,
    },
    title: meta.title,
    position: { x, y },
    inputs: meta.inputs.map(entry => ({
      name: entry.name,
      type: entry.type,
      data: entry.type.default,
    })),
    outputs: meta.outputs.map(entry => ({
      name: entry.name,
      type: entry.type,
      data: entry.type.default,
    })),
  };
}