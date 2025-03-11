import { evaluate } from "@/lib/eval";
import { AnyType, ArrayType, BoolType, DictType, FloatType, IntType, NDArrayType, NodeEntry, NodeEntryRuntime, NodeEntryType, NodeMeta, PythonObjectType, StringType, TorchTensorType } from "./data-type";
import { AFEdge, AFNode } from "./flow-type";

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

export function isNodeEntryDataValid(entry: NodeEntry, data: any, optional: boolean = true): boolean {
  if (data === undefined || data === null) {
    return optional;
  }
  if (isIntNodeEntryType(entry.type) || isFloatNodeEntryType(entry.type)) {
    if (typeof data !== 'number') {
      return false;
    }
    if (isIntNodeEntryType(entry.type) && !Number.isInteger(data)) {
      return false;
    }
    if (entry.type.range && (data < entry.type.range[0] || data > entry.type.range[1])) {
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
    if (entry.type.lenMin && data.length < entry.type.lenMin) {
      return false;
    }
    if (entry.type.lenMax && data.length > entry.type.lenMax) {
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
 * get the default value of the entry type. maybe not valid.
 * @param type entry type
 * @returns default value of the entry type
 */
export function getNodeEntryDefaultData(entry: NodeEntry, entryType: NodeEntryType): any {
  let defaultValue: any;
  if ("default" in entryType && entryType.default !== undefined && entryType.default !== null) {
    defaultValue = entryType.default;
  } else if ("enum" in entryType && entryType.enum && entryType.enum.length > 0) {
    defaultValue = entryType.enum[0];
  } else if ("range" in entryType && entryType.range) {
    defaultValue = entryType.range[0];
    if (isIntNodeEntryType(entryType)) {
      defaultValue = Math.ceil(defaultValue);
    }
  } else if (isIntNodeEntryType(entryType) || isFloatNodeEntryType(entryType)) {
    defaultValue = 0;
  } else if (isStringNodeEntryType(entryType)) {
    defaultValue = '';
  } else if (isBoolNodeEntryType(entryType)) {
    defaultValue = false;
  } else if (isDictNodeEntryType(entryType)) {
    defaultValue = {};
  } else if (isArrayNodeEntryType(entryType)) {
    defaultValue = [];
  } else if (isUnionNodeEntryType(entryType) && entryType.length > 0) {
    return getNodeEntryDefaultData(entry, entryType[0]);
  }
  return defaultValue;
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

function createEntryRuntime(entry: NodeEntry, input: boolean): NodeEntryRuntime {
  if (input && isNodeEntrySupportInput(entry)) {
    return {
      name: entry.name,
      mode: 'input',
      data: getNodeEntryDefaultData(entry, entry.type),
    };
  } else {
    return {
      name: entry.name,
      mode: 'handle',
    };
  }
}

export function createNode(id: string, meta: NodeMeta, x: number, y: number): AFNode {
  return {
    id,
    position: { x, y },
    data: {
      meta: {
        id: meta.id,
        version: meta.version,
      },
      title: meta.title,
      collapsed: false,
      nativeMode: 'prefer',
      renderer: meta.defaultRenderer,
      inputs: meta.inputs.map(entry => createEntryRuntime(entry, true)),
      outputs: meta.outputs.map(entry => createEntryRuntime(entry, false)),
    },
  };
}
