import { evaluate } from "@/lib/eval";
import {
  NumberType,
  NodeEntry,
  NodeEntryRuntime,
  NodeEntryType,
  NodeMeta,
  StringType,
  NormalizedAnyType,
  NormalizedNodeEntryType,
  NormalizedSimpleType,
  NodeEntryConfig,
  NodeEntryData,
  NormalizedDictType,
  NormalizedNumberType,
  StringConstraint,
} from "./data-type";
import { AFNode } from "./flow-type";
import {
  isNodeEntrySimpleTypeSupportInput,
  isUnionNodeEntryType,
  isNormalizedUnionNodeEntryType,
  isAnyNodeEntryType,
  isNeverNodeEntryType,
  isStringNodeEntryType,
  isNumberNodeEntryType,
  isBoolNodeEntryType,
  isArrayNodeEntryType,
  isDictNodeEntryType,
  isNodeEntryTypeSupportInput
} from "./guard";
import NDArray from "./ndarray";
import TorchTensor from "./torch-tensor";
import PythonObject from "./python-object";

export function isArrayShallowEquals<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export function isNodeEntryTypePartialSupportInput(type: NormalizedNodeEntryType): boolean {
  return isNodeEntrySimpleTypeSupportInput(type) || (isUnionNodeEntryType(type) && type.some(isNodeEntrySimpleTypeSupportInput));
}

export function isNodeEntryTypeSupportInputs(type: NormalizedNodeEntryType): boolean {
  return isUnionNodeEntryType(type) && type.filter(isNodeEntrySimpleTypeSupportInput).length >= 2;
}

export function isNodeEntryDefaultInput(type: NormalizedNodeEntryType): boolean {
  return isNodeEntrySimpleTypeSupportInput(type);
}

export function getNodeEntryNthType(type: NormalizedNodeEntryType, n: number): NormalizedNodeEntryType {
  if (isNormalizedUnionNodeEntryType(type)) {
    if (n < 0 || n >= type.length) {
      throw new Error(`Index out of range: ${n}`);
    }
    return type[n];
  } else {
    if (n === 0) {
      return type;
    } else {
      throw new Error(`Index out of range: ${n}`);
    }
  }
}

export function isValidNumberInNumberType(t: NormalizedNumberType, v: number): boolean {
  if (typeof t.min === 'number' && v < t.min) {
    return false;
  }
  if (typeof t.max === 'number' && v > t.max) {
    return false;
  }
  if (t.integer && !Number.isInteger(v)) {
    return false;
  }
  return true;
}

export function calcNodeEntryNumberTypeEnum(t: NumberType): number[] | undefined {
  if (!t.enum) {
    return undefined;
  }
  if (typeof t.min === 'number' || typeof t.max === 'number' || t.integer) {
    return t.enum.filter(v => isValidNumberInNumberType(t, v));
  } else {
    return t.enum;
  }
}

export function isValidStringByConstraint(c: StringConstraint, v: string): boolean {
  if (c.pattern && !new RegExp(c.pattern).test(v)) {
    return false;
  }
  if (typeof c.lenMin !== 'undefined' && v.length < c.lenMin) {
    return false;
  }
  if (typeof c.lenMax !== 'undefined' && v.length > c.lenMax) {
    return false;
  }
  return true;
}

export function calcNodeEntryStringTypeEnum(t: StringType): string[] | undefined {
  if (!t.enum) {
    return undefined;
  }
  if (t.constraints && t.constraints.length > 0) {
    return t.enum.filter(v => {
      return t.constraints!.some(c => isValidStringByConstraint(c, v));
    });
  } else {
    return t.enum;
  }
}

/**
 * whether a include b
 * @param a 
 * @param b 
 * @returns whether a include b
 */
export function rangeInclude(a: [number | undefined, number | undefined], b: [number | undefined, number | undefined]): boolean {
  if (typeof b[0] !== 'number') {
    return false;
  }
  if (typeof b[1] !== 'number') {
    return false;
  }
  const leftInclude = typeof a[0] !== 'number' || a[0] <= b[0];
  const rightInclude = typeof a[1] !== 'number' || a[1] >= b[1];
  return leftInclude && rightInclude;
}

export function rangeIntersect(a: [number | undefined, number | undefined], b: [number | undefined, number | undefined]): boolean {
  // 获取a的左边界（如果未定义则为负无穷）
  const aMin = a[0] === undefined ? Number.NEGATIVE_INFINITY : a[0];
  // 获取a的右边界（如果未定义则为正无穷）
  const aMax = a[1] === undefined ? Number.POSITIVE_INFINITY : a[1];
  // 获取b的左边界（如果未定义则为负无穷）
  const bMin = b[0] === undefined ? Number.NEGATIVE_INFINITY : b[0];
  // 获取b的右边界（如果未定义则为正无穷） 
  const bMax = b[1] === undefined ? Number.POSITIVE_INFINITY : b[1];

  // 两个范围相交的条件是：a的最小值 <= b的最大值 且 b的最小值 <= a的最大值
  return aMin <= bMax && bMin <= aMax;
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

/**
 * SimpleType -> [SimpleType];
 * NeverType -> [];
 * UnionType -> UnionType;
 * AnyType -> AnyType;
 * @param entry 
 * @returns available types
 */
export function getNodeEntryAvailableTypes(entry: NodeEntry): NormalizedAnyType | NormalizedSimpleType[] {
  if (isNormalizedUnionNodeEntryType(entry.type)) {
    return entry.type;
  } else if (isAnyNodeEntryType(entry.type)) {
    return entry.type;
  } else if (isNeverNodeEntryType(entry.type)) {
    return [];
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getNodeEntryDefaultData(entry: NodeEntry, entryType: NodeEntryType): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTypeFromData(data: any): NormalizedNodeEntryType {
  if (typeof data === 'undefined' || data === null) {
    return {
      name: 'never',
    };
  } else if (typeof data === 'number') {
    return {
      name: 'number',
      enum: [data],
    };
  } else if (typeof data === 'string') {
    return {
      name: 'string',
      enum: [data],
    };
  } else if (typeof data === 'boolean') {
    return {
      name: 'bool',
      literal: data,
    };
  } else if (Array.isArray(data)) {
    return {
      name: 'array',
      shape: data.map(getTypeFromData),
    };
  } else if (data instanceof NDArray) {
    return {
      name: 'ndarray',
      dtype: data.dtype,
      shape: data.shape,
    };
  } else if (data instanceof TorchTensor) {
    return {
      name: 'torch-tensor',
      dtype: data.dtype,
      shape: data.shape,
    };
  } else if (data instanceof PythonObject) {
    return {
      name: 'python-object',
      type: data.type,
    };
  } else if (typeof data === 'object') {
    return {
      name: 'dict',
      keys: Object.keys(data).reduce<NonNullable<NormalizedDictType['keys']>>((acc, key) => {
        acc[key] = getTypeFromData(data[key]);
        return acc;
      }, {}),
    };
  } else {
    return {
      name: 'any',
    };
  }
}

export type NodeEntryDataWithMeta = {
  meta: NodeEntry;
  runtime: NodeEntryRuntime;
  config: NodeEntryConfig;
};

function createEntryData(entry: NodeEntry, input: boolean): NodeEntryData {
  if (input && isNodeEntryTypeSupportInput(entry.type) && (!!entry.disableHandle || isNodeEntryDefaultInput(entry.type))) {
    return {
      config: {
        name: entry.name,
        mode: 'input',
        modeIndex: 0,
      },
      runtime: {
        data: getNodeEntryDefaultData(entry, entry.type),
      },
    };
  } else {
    return {
      config: {
        name: entry.name,
        mode: 'handle',
        modeIndex: -1,
      },
      runtime: {
        data: undefined,
      },
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
      inputs: meta.inputs.map(entry => createEntryData(entry, true)),
      outputs: meta.outputs.map(entry => createEntryData(entry, false)),
    },
  };
}
