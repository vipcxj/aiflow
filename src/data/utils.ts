import { evaluate } from "@/lib/eval";
import { 
  AnyType,
  ArrayType, 
  BoolType, 
  DictType, 
  NumberType, 
  NDArrayType, 
  NodeEntry, 
  NodeEntryRuntime, 
  NodeEntryType, 
  NodeMeta, 
  PythonObjectType, 
  StringType, 
  TorchTensorType, 
  FlattenUnionType, 
  SimpleType, 
  UnionType,
  NormalizedAnyType,
  NormalizedNumberType,
  NormalizedStringType,
  NormalizedBoolType,
  NormalizedArrayType,
  NormalizedDictType,
  NormalizedNDArrayType,
  NormalizedTorchTensorType,
  NormalizedUnionType,
  NormalizedNodeEntryType,
  NormalizedPythonObjectType,
  NormalizedArrayComplexShape,
  NormalizedArrayComplexType,
  ArrayComplexShape,
  ArraySimpleShape,
} from "./data-type";
import { AFNode } from "./flow-type";
import { Exo } from "next/font/google";

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

export function isUnionNodeEntryType(type: NodeEntryType): type is UnionType {
  return Array.isArray(type);
}

export function isNormalizedUnionNodeEntryType(type: NormalizedNodeEntryType): type is NormalizedUnionType {
  return Array.isArray(type);
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

export function compareNodeEntryAnyType(a: NormalizedAnyType, b: NormalizedAnyType): number {
  return 0;
}

export function compareNodeEntryNumberType(a: NormalizedNumberType, b: NormalizedNumberType): number {
  if (a.enum && b.enum) {
    const aEnum = calcNodeEntryNumberTypeEnum(a) || [];
    const bEnum = calcNodeEntryNumberTypeEnum(b) || [];
    if (aEnum.length !== bEnum.length) {
      return aEnum.length - bEnum.length;
    }
    aEnum.sort();
    bEnum.sort();
    for (let i = 0; i < aEnum.length; i++) {
      if (aEnum[i] !== bEnum[i]) {
        return aEnum[i] - bEnum[i];
      }
    }
    return 0;
  } else if (a.enum || b.enum) {
    return a.enum ? -1 : 1;
  } else {
    if (a.integer !== b.integer) {
      return a.integer ? -1 : 1;
    } else if (a.range && b.range) {
      return a.range[0] - b.range[0] || a.range[1] - b.range[1];
    } else if (a.range || b.range) {
      return a.range ? -1 : 1;
    } else {
      return 0;
    }
  }
}

export function normalizeNodeEntryStringType(type: StringType): StringType {
  if (type.constraints) {
    type.constraints.sort((c1, c2) => {
      if (c1.pattern && c2.pattern) {
        return c1.pattern.localeCompare(c2.pattern);
      } else if (c1.pattern) {
        return -1;
      } else if (c2.pattern) {
        return 1;
      }
      if (c1.lenMin && c2.lenMin) {
        return c1.lenMin - c2.lenMin;
      } else if (c1.lenMin) {
        return -1;
      } else if (c2.lenMin) {
        return 1;
      }
      if (c1.lenMax && c2.lenMax) {
        return c1.lenMax - c2.lenMax;
      } else if (c1.lenMax) {
        return -1;
      } else if (c2.lenMax) {
        return 1;
      }
      return 0;
    });
  }
  return type;
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

export function compareNodeEntryStringType(a: NormalizedStringType, b: NormalizedStringType): number {
  if (a.enum && b.enum) {
    const aEnum = calcNodeEntryStringTypeEnum(a) || [];
    const bEnum = calcNodeEntryStringTypeEnum(b) || [];
    if (aEnum.length !== bEnum.length) {
      return aEnum.length - bEnum.length;
    }
    aEnum.sort();
    bEnum.sort();
    for (let i = 0; i < aEnum.length; i++) {
      if (aEnum[i] !== bEnum[i]) {
        return aEnum[i].localeCompare(bEnum[i]);
      }
    }
    return 0;
  } else if (a.enum || b.enum) {
    return a.enum ? -1 : 1;
  } else {
    if (a.constraints && b.constraints) {
      if (a.constraints.length !== b.constraints.length) {
        return a.constraints.length - b.constraints.length;
      }
      for (let i = 0; i < a.constraints.length; i++) {
        const ac = a.constraints[i];
        const bc = b.constraints[i];
        if (ac.pattern && bc.pattern) {
          if (ac.pattern !== bc.pattern) {
            return ac.pattern.localeCompare(bc.pattern);
          }
        } else if (ac.pattern) {
          return -1;
        } else if (bc.pattern) {
          return 1;
        }
        if (ac.lenMin && bc.lenMin) {
          if (ac.lenMin !== bc.lenMin) {
            return ac.lenMin - bc.lenMin;
          }
        } else if (ac.lenMin || bc.lenMin) {
          return ac.lenMin ? -1 : 1;
        }
        if (ac.lenMax && bc.lenMax) {
          if (ac.lenMax !== bc.lenMax) {
            return ac.lenMax - bc.lenMax;
          }
        } else if (ac.lenMax || bc.lenMax) {
          return ac.lenMax ? -1 : 1;
        }
      }
      return 0;
    } else if (a.constraints || b.constraints) {
      return a.constraints ? -1 : 1;
    } else {
      return 0;
    }
  }
}

export function compareNodeEntryBoolType(a: NormalizedBoolType, b: NormalizedBoolType): number {
  return 0;
}

export function isSimpleArrayShape(shape: ArrayType['shape']): shape is ArraySimpleShape {
  return Array.isArray(shape) && shape.length === 2 && typeof shape[1] === 'number';
}

export function isComplexArrayShape(shape: ArrayType['shape']): shape is ArrayComplexShape {
  return Array.isArray(shape) && shape.length > 0 && !isSimpleArrayShape(shape);
}

export function normalizeNodeEntryArrayType(type: ArrayType): NormalizedArrayType {
  if (isSimpleArrayShape(type.shape)) {
    return {
      name: 'array',
      shape: [normalizeNodeEntryType(type.shape[0]), type.shape[1]],
    };
  } else {
    return {
      name: 'array',
      shape: type.shape.map(normalizeNodeEntryType),
    };
  }
}

export function compareNodeEntryArrayType(a: NormalizedArrayType, b: NormalizedArrayType): number {
  if (isSimpleArrayShape(a.shape) && isSimpleArrayShape(b.shape)) {
    if (a.shape[1] !== b.shape[1]) {
      return a.shape[1] - b.shape[1];
    }
    return compareNodeEntryType(a.shape[0], b.shape[0]);
  } else if (isSimpleArrayShape(a.shape)) {
    const eType = a.shape[0];
    if (a.shape[1] !== b.shape.length) {
      return a.shape[1] - b.shape.length;
    }
    for (let i = 0; i < b.shape.length; i++) {
      const c = compareNodeEntryType(eType, b.shape[i] as NodeEntryType);
      if (c !== 0) {
        return c;
      }
    }
    return 0;
  } else if (isSimpleArrayShape(b.shape)) {
    return - compareNodeEntryArrayType(b, a);
  } else {
    if (a.shape.length !== b.shape.length) {
      return a.shape.length - b.shape.length;
    }
    for (let i = 0; i < a.shape.length; i++) {
      const c = compareNodeEntryType((a as NormalizedArrayComplexType).shape[i], (b as NormalizedArrayComplexType).shape[i]);
      if (c !== 0) {
        return c;
      }
    }
    return 0;
  }
}

export function compareNodeEntryDictType(a: NormalizedDictType, b: NormalizedDictType): number {
  if (a.keys && b.keys) {
    const aKeys = Object.keys(a.keys);
    const bKeys = Object.keys(b.keys);
    if (aKeys.length !== bKeys.length) {
      return aKeys.length - bKeys.length;
    }
    aKeys.sort();
    bKeys.sort();
    for (let i = 0; i < aKeys.length; i++) {
      const ak = aKeys[i];
      const bk = bKeys[i];
      if (ak !== bk) {
        return ak.localeCompare(bk);
      }
      const c = compareNodeEntryType(a.keys[ak], b.keys[bk]);
      if (c !== 0) {
        return c;
      }
    }
    return 0;
  } else if (a.keys || b.keys) {
    return a.keys ? -1 : 1;
  } else {
    return 0;
  }
}

export function compareNodeEntryNDArrayType(a: NormalizedNDArrayType, b: NormalizedNDArrayType): number {
  if (a.dtype !== b.dtype) {
    if (a.dtype && b.dtype) {
      return a.dtype.localeCompare(b.dtype);
    } else {
      return a.dtype ? -1 : 1;
    }
  }
  if (a.shape && b.shape) {
    if (a.shape.length !== b.shape.length) {
      return a.shape.length - b.shape.length;
    }
    for (let i = 0; i < a.shape.length; i++) {
      if (a.shape[i] !== b.shape[i]) {
        return a.shape[i] - b.shape[i];
      }
    }
    return 0;
  } else if (a.shape || b.shape) {
    return a.shape ? -1 : 1;
  } else {
    return 0;
  }
}

export function compareNodeEntryTorchTensorType(a: NormalizedTorchTensorType, b: NormalizedTorchTensorType): number {
  if (a.dtype !== b.dtype) {
    if (a.dtype && b.dtype) {
      return a.dtype.localeCompare(b.dtype);
    } else {
      return a.dtype ? -1 : 1;
    }
  }
  if (a.shape && b.shape) {
    if (a.shape.length !== b.shape.length) {
      return a.shape.length - b.shape.length;
    }
    for (let i = 0; i < a.shape.length; i++) {
      if (a.shape[i] !== b.shape[i]) {
        return a.shape[i] - b.shape[i];
      }
    }
    return 0;
  } else if (a.shape || b.shape) {
    return a.shape ? -1 : 1;
  } else {
    return 0;
  }
}

export function compareNodeEntryPythonObjectType(a: NormalizedPythonObjectType, b: NormalizedPythonObjectType): number {
  return a.type.localeCompare(b.type);
}

function flattenUnionNodeEntryType(type: UnionType): FlattenUnionType {
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

export function normalizeNodeEntryUnionType(type: UnionType): NormalizedUnionType {
  return flattenUnionNodeEntryType(type).map(normalizeNodeEntryType).sort(compareNodeEntryType);
}

/**
 * compare two union types
 * @param a the first union type
 * @param b the second union type
 * @note should normalize before compare
 */
export function compareNodeEntryUnionType(a: NormalizedUnionType, b: NormalizedUnionType): number {
  if (a.length !== b.length) {
    return a.length - b.length;
  }
  for (let i = 0; i < a.length; i++) {
    const c = compareNodeEntryType(a[i], b[i]);
    if (c !== 0) {
      return c;
    }
  }
  return 0;
}

export function normalizeNodeEntryType(type: NodeEntryType): NormalizedNodeEntryType {
  if (isAnyNodeEntryType(type)) {
    return type;
  } else if (isStringNodeEntryType(type)) {
    return normalizeNodeEntryStringType(type);
  } else if (isNumberNodeEntryType(type)) {
    return type;
  } else if (isBoolNodeEntryType(type)) {
    return type;
  } else if (isArrayNodeEntryType(type)) {
    return normalizeNodeEntryArrayType(type);
  } else if (isDictNodeEntryType(type)) {
    return type;
  } else if (isNDArrayNodeEntryType(type)) {
    return type;
  } else if (isTorchTensorNodeEntryType(type)) {
    return type;
  } else if (isPythonObjectNodeEntryType(type)) {
    return type;
  } else if (isUnionNodeEntryType(type)) {
    return normalizeNodeEntryUnionType(type);
  } else {
    throw new Error(`Unknown node entry type: ${type}`);
  }
}

export function compareNodeEntryType(a: NormalizedNodeEntryType, b: NormalizedNodeEntryType): number {
  const aName = isNormalizedUnionNodeEntryType(a) ? 'union' : a.name;
  const bName = isNormalizedUnionNodeEntryType(b) ? 'union' : b.name;
  if (aName !== bName) {
    return aName.localeCompare(bName);
  }
  switch (aName) {
    case 'any':
      return compareNodeEntryAnyType(a as NormalizedAnyType, b as NormalizedAnyType);
    case 'string':
      return compareNodeEntryStringType(a as NormalizedStringType, b as NormalizedStringType);
    case 'number':
      return compareNodeEntryNumberType(a as NormalizedNumberType, b as NormalizedNumberType);
    case 'bool':
      return compareNodeEntryBoolType(a as NormalizedBoolType, b as NormalizedBoolType);
    case 'array':
      return compareNodeEntryArrayType(a as NormalizedArrayType, b as NormalizedArrayType);
    case 'dict':
      return compareNodeEntryDictType(a as NormalizedDictType, b as NormalizedDictType);
    case 'ndarray':
      return compareNodeEntryNDArrayType(a as NormalizedNDArrayType, b as NormalizedNDArrayType);
    case 'torch-tensor':
      return compareNodeEntryTorchTensorType(a as NormalizedTorchTensorType, b as NormalizedTorchTensorType);
    case 'python-object':
      return (a as PythonObjectType).type.localeCompare((b as PythonObjectType).type);
    case 'union':
      return compareNodeEntryUnionType(a as UnionType, b as UnionType);
    default:
      throw new Error(`Unknown node entry type: ${aName}`);
  }
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

function combineNodeEntryArrayType(a: NormalizedArrayType, b: NormalizedArrayType): NormalizedArrayType | undefined {
  const c = compareNodeEntryArrayType(a, b);
  if (c !== 0) {
    return undefined;
  } else {
    return a;
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
      return combineNodeEntryArrayType(a, b as NormalizedArrayType);
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
