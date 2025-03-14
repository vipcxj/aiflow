import { evaluate } from "@/lib/eval";
import { AnyType, ArrayType, BoolType, DictType, NumberType, NDArrayType, NodeEntry, NodeEntryRuntime, NodeEntryType, NodeMeta, PythonObjectType, StringType, TorchTensorType, FlattenUnionType, SimpleType } from "./data-type";
import { AFEdge, AFNode } from "./flow-type";
import { assert } from "console";

export function isAnyNodeEntryType(type: NodeEntryType): type is AnyType {
  return !Array.isArray(type) && type.name === 'any';
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

export function isUnionNodeEntryType(type: NodeEntryType): type is NodeEntryType[] {
  return Array.isArray(type);
}

export function isNodeEntrySupportInput(type: NodeEntryType) {
  return isStringNodeEntryType(type)
    || isNumberNodeEntryType(type)
    || isBoolNodeEntryType(type)
    || (isUnionNodeEntryType(type) && type.every(isNodeEntrySupportInput));
}

export function isNodeEntryDefaultInput(type: NodeEntryType) {
  return isStringNodeEntryType(type)
    || isNumberNodeEntryType(type)
    || isBoolNodeEntryType(type);
}

function flattenUnionNodeEntryType(type: NodeEntryType[]): FlattenUnionType {
  return type.reduce<FlattenUnionType>((acc, t) => {
    if (isUnionNodeEntryType(t)) {
      for (const tt of flattenUnionNodeEntryType(t)) {
        acc.push(tt);
      }
      return acc;
    } else {
      acc.push(t);
      return acc;
    }
  }, []);
}

export function calcNodeEntryNumberTypeEnum(t: NumberType): number[] | undefined {
  if (!t.enum) {
    return undefined;
  }
  if (t.range || t.integer) {
    return t.enum.filter(v => {
      if (t.range && (v < t.range[0] || v > t.range[1])) {
        return false;
      }
      if (t.integer && !Number.isInteger(v)) {
        return false;
      }
      return true;
    });
  } else {
    return t.enum;
  }
}

function rangeInclude(a?: [number, number], b?: [number, number]): boolean {
  if (!a) {
    return true;
  }
  if (!b) {
    return false;
  }
  return a[0] <= b[0] && a[1] >= b[1];
}

function combineNodeEntryNumberType(a: NumberType, b: NumberType): NumberType | undefined {
  if (a.enum && b.enum) {
    const aEnum = calcNodeEntryNumberTypeEnum(a) || [];
    const bEnum = calcNodeEntryNumberTypeEnum(b) || [];
    const combinedEnum = [...new Set([...aEnum, ...bEnum])].sort((x, y) => x - y);
    return {
      name: 'number',
      enum: combinedEnum,
    };
  } else if (a.enum) {
    const aEnum = calcNodeEntryNumberTypeEnum(a) || [];
    if (aEnum.every(v => {
      if (b.range && (v < b.range[0] || v > b.range[1])) {
        return false;
      }
      if (b.integer && !Number.isInteger(v)) {
        return false;
      }
      return true;
    })) {
      return b;
    } else {
      return undefined;
    }
  } else if (b.enum) {
    return combineNodeEntryNumberType(b, a);
  } else {
    if (!!a.integer === !!b.integer) {
      if (a.range && b.range) {
        return {
          name: 'number',
          range: [Math.min(a.range[0], b.range[0]), Math.max(a.range[1], b.range[1])],
          integer: !!a.integer,
        };
      } else {
        return {
          name: 'number',
          integer: !!a.integer,
        }
      }
    } else if (a.integer) {
      if (rangeInclude(b.range, a.range)) {
        return b;
      } else {
        return undefined;
      }
    } else {
      return combineNodeEntryNumberType(b, a);
    }
  }
}

export function validateNodeEntryStringData(t: StringType, data: string): boolean {
  if (t.enum && !t.enum.includes(data)) {
    return false;
  }
  if (t.constraints && t.constraints.length > 0) {
    return t.constraints.some(c => {
      if (c.pattern && !new RegExp(c.pattern).test(data)) {
        return false;
      }
      if (typeof c.lenMin !== 'undefined' && data.length < c.lenMin) {
        return false;
      }
      if (typeof c.lenMax !== 'undefined' && data.length > c.lenMax) {
        return false;
      }
      return true;
    });
  } else {
    return true;
  }
}

export function calcNodeEntryStringTypeEnum(t: StringType): string[] | undefined {
  if (!t.enum) {
    return undefined;
  }
  if (t.constraints && t.constraints.length > 0) {
    return t.enum.filter(v => {
      return t.constraints!.some(c => {
        if (c.pattern && !new RegExp(c.pattern).test(v)) {
          return false;
        }
        if (typeof c.lenMin !== 'undefined' && v.length < c.lenMin) {
          return false;
        }
        if (typeof c.lenMax !== 'undefined' && v.length > c.lenMax) {
          return false;
        }
        return true
      });
    });
  } else {
    return t.enum;
  }
}

function combineNodeEntryStringType(a: StringType, b: StringType): StringType | undefined {
  if (a.enum && b.enum) {
    const aEnum = calcNodeEntryStringTypeEnum(a) || [];
    const bEnum = calcNodeEntryStringTypeEnum(b) || [];
    const combinedEnum = [...new Set([...aEnum, ...bEnum])];
    return {
      name: 'string',
      enum: combinedEnum,
    };
  } else if (a.enum) {
    const aEnum = calcNodeEntryStringTypeEnum(a) || [];
    if (!b.constraints || b.constraints.length === 0 || aEnum.every(v => {
      return b.constraints!.some(c => {
        if (c.pattern && !new RegExp(c.pattern).test(v)) {
          return false;
        }
        if (typeof c.lenMin !== 'undefined' && v.length < c.lenMin) {
          return false;
        }
        if (typeof c.lenMax !== 'undefined' && v.length > c.lenMax) {
          return false;
        }
        return true
      });
    })) {
      return b;
    } else {
      return undefined;
    }
  } else if (b.enum) {
    return combineNodeEntryStringType(b, a);
  } else {
    return {
      name: 'string',
      constraints: [...(a.constraints || []), ...(b.constraints || [])],
    }
  }
}

function combineNodeEntryType(a: SimpleType, b: SimpleType): SimpleType | undefined {
  if (a.name !== b.name) {
    return undefined;
  }
  switch (a.name) {
    case 'string':
      return combineNodeEntryStringType(a, b as StringType);
    case 'number':
      return combineNodeEntryNumberType(a, b as NumberType);
    case 'bool':
      return a;
    case 'array': {

    }
    case 'dict': {

    }
    case 'ndarray': {
    }
    case 'torch-tensor': {
    }
    case 'python-object': {
    }
  }
  return undefined;
}

export function getNodeEntryAvailableTypes(entry: NodeEntry): NodeEntryType[] {
  if (isUnionNodeEntryType(entry.type)) {
    return flattenUnionNodeEntryType(entry.type).reduce<SimpleType[]>((acc, type) => {
      for (let i = 0; i < acc.length; i++) {
        const t = acc[i];
        const combined = combineNodeEntryType(t, type);
        if (combined) {
          acc[i] = combined;
          return acc;
        }
      }
      acc.push(type);
      return acc;
    }, []);
  } else {
    return [entry.type];
  }
}


class ValError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ValError';
  }
}

export function isNodeEntryDataValid(entry: NodeEntry, data: any, optional: boolean = true): boolean {
  if (data === undefined || data === null) {
    return optional;
  }
  if (isNumberNodeEntryType(entry.type)) {
    if (typeof data !== 'number') {
      return false;
    }
    if (entry.type.integer && !Number.isInteger(data)) {
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
    if (!validateNodeEntryStringData(entry.type, data)) {
      return false;
    }
  }
  if (entry.verificationCode && entry.verificationCode.js) {
    function assert(condition: boolean, msg: string) {
      if (!condition) {
        throw new ValError(msg);
      }
    }
    try {
      evaluate(entry.verificationCode.js, { assert, meta: entry, data });
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
    if (entryType.integer) {
      defaultValue = Math.ceil(defaultValue);
    }
  } else if (isNumberNodeEntryType(entryType)) {
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
  if (input && isNodeEntrySupportInput(entry.type) && (!!entry.disableHandle || isNodeEntryDefaultInput(entry.type))) {
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
