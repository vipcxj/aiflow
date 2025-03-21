import { compareNodeEntryType } from "./compare";
import type { NumberType, StringType, NormalizedArrayType, NormalizedDictType, NormalizedNodeEntryType, NormalizedNDArrayType, NormalizedTorchTensorType, PythonObjectType, NormalizedSimpleType, NormalizedUnionType, NormalizedNeverType, NormalizedStringType, NormalizedNumberType, NormalizedPythonObjectType, SimpleType, NormalizedBoolType } from "./data-type";
import { isAnyNodeEntryType, isNeverNodeEntryType, isNormalizedUnionNodeEntryType } from "./guard";
import { calcNodeEntryNumberTypeEnum, calcNodeEntryStringTypeEnum, rangeInclude } from "./utils";

export function combineNodeEntryNumberType(a: NumberType, b: NumberType): NumberType | undefined {
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
      if (typeof b.min === 'number' && v < b.min) {
        return false;
      }
      if (typeof b.max === 'number' && v > b.max) {
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
      return {
        name: 'number',
        min: typeof a.min === 'number' && typeof b.min === 'number' ? Math.min(a.min, b.min) : undefined,
        max: typeof a.max === 'number' && typeof b.max === 'number' ? Math.max(a.max, b.max) : undefined,
        integer: !!a.integer,
      }
    } else if (a.integer) {
      if (rangeInclude([b.min, b.max], [a.min, a.max])) {
        return b;
      } else {
        return undefined;
      }
    } else {
      return combineNodeEntryNumberType(b, a);
    }
  }
}

export function combineNodeEntryStringType(a: StringType, b: StringType): StringType | undefined {
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

export function combineNodeEntryBoolType(a: NormalizedBoolType, b: NormalizedBoolType): NormalizedBoolType {
  if (a.literal === b.literal) {
    return a;
  } else {
    if (typeof a.literal === 'boolean') {
      if (typeof b.literal === 'boolean') {
        return { name: 'bool' };
      } else {
        return b;
      }
    } else {
      return a;
    }
  }
}

export function combineNodeEntryArrayType(a: NormalizedArrayType, b: NormalizedArrayType): NormalizedArrayType | undefined {
  const c = compareNodeEntryType(a, b);
  if (c !== 0) {
    return undefined;
  } else {
    return a;
  }
}

export function combineNodeEntryDictType(a: NormalizedDictType, b: NormalizedDictType): NormalizedDictType {
  if (a.keys && b.keys) {
    // 合并两个字典的所有键
    const allKeys = new Set([...Object.keys(a.keys), ...Object.keys(b.keys)]);
    const combinedKeys: Record<string, NormalizedNodeEntryType> = {};

    // 尝试为每个键找到合适的类型
    for (const key of allKeys) {
      const aType = a.keys[key];
      const bType = b.keys[key];

      if (!aType) {
        combinedKeys[key] = bType;
      } else if (!bType) {
        combinedKeys[key] = aType;
      } else {
        // 两者都有这个键，需要计算它们值类型的并集
        combinedKeys[key] = combineNodeEntryType(aType, bType);
      }
    }

    return {
      name: 'dict',
      keys: combinedKeys
    };
  } else if (a.keys) {
    return a;
  } else if (b.keys) {
    return b;
  } else {
    // 两者都没有指定键
    return { name: 'dict' };
  }
}

export function combineNodeEntryNDArrayType(a: NormalizedNDArrayType, b: NormalizedNDArrayType): NormalizedNDArrayType | undefined {
  // 检查数据类型
  if (a.dtype !== b.dtype) {
    return undefined; // 不兼容的数据类型
  }

  // 处理形状
  if (a.shape && b.shape) {
    if (a.shape.length !== b.shape.length) return undefined; // 维度不匹配

    const combinedShape: number[] = [];
    for (let i = 0; i < a.shape.length; i++) {
      // -1 表示动态维度，合并时保留
      if (a.shape[i] === -1 || b.shape[i] === -1) {
        combinedShape.push(-1);
      } else if (a.shape[i] !== b.shape[i]) {
        return undefined; // 静态维度不匹配
      } else {
        combinedShape.push(a.shape[i]);
      }
    }
    return {
      name: 'ndarray',
      dtype: a.dtype,
      shape: combinedShape
    };
  } else if (a.shape) {
    return a;
  } else if (b.shape) {
    return b;
  } else {
    // 两者都没有指定形状
    return {
      name: 'ndarray',
      dtype: a.dtype
    };
  }
}

export function combineTorchTensorType(a: NormalizedTorchTensorType, b: NormalizedTorchTensorType): NormalizedTorchTensorType | undefined {
  // 检查数据类型
  if (a.dtype !== b.dtype) {
    return undefined; // 不兼容的数据类型
  }

  // 处理形状
  if (a.shape && b.shape) {
    if (a.shape.length !== b.shape.length) return undefined; // 维度不匹配

    const combinedShape: number[] = [];
    for (let i = 0; i < a.shape.length; i++) {
      // -1 表示动态维度，合并时保留
      if (a.shape[i] === -1 || b.shape[i] === -1) {
        combinedShape.push(-1);
      } else if (a.shape[i] !== b.shape[i]) {
        return undefined; // 静态维度不匹配
      } else {
        combinedShape.push(a.shape[i]);
      }
    }
    return {
      name: 'torch-tensor',
      dtype: a.dtype,
      shape: combinedShape
    };
  } else if (a.shape) {
    return a;
  } else if (b.shape) {
    return b;
  } else {
    // 两者都没有指定形状
    return {
      name: 'torch-tensor',
      dtype: a.dtype
    };
  }
}

export function combinePythonObjectType(a: PythonObjectType, b: PythonObjectType): PythonObjectType | undefined {
  // Python 对象类型只能在完全相同时合并
  if (a.type === b.type) {
    return a;
  }
  return undefined;
}

/**
 * 合并两个 Union 类型，这里的Union类型条件更宽松，允许空数组和只有一个元素。
 * @param a 第一个Union类型
 * @param b 第二个Union类型
 * @returns 合并后的类型，这里是严格Union类型（length > 1），或者是单一类型（length === 1），或者是Never类型（length === 0）
 */
export function combineNodeEntryUnionType(a: NormalizedSimpleType[], b: NormalizedSimpleType[]): NormalizedUnionType | NormalizedSimpleType | NormalizedNeverType {
  const combined: NormalizedSimpleType[] = [];
  for (const ta of a) {
    let found = false;
    for (let j = 0; j < b.length; j++) {
      const tb = b[j];
      const combinedType = combineNodeEntryType(ta, tb);
      if (!combinedType) {
        continue;
      } else {
        // 因为ta和tb都是NormalizedSimpleType，
        // 合并后要么undefined，说明不兼容，
        // 要么是有效类型，说明兼容，
        // 不可能是AnyType, NeverType和UnionType
        combined.push(combinedType as NormalizedSimpleType);
        b = b.filter(v => v !== tb);
        found = true;
        break;
      }
    }
    if (!found) {
      combined.push(ta);
    }
  }
  combined.push(...b);
  combined.sort(compareNodeEntryType);
  if (combined.length === 1) {
    return combined[0];
  } else if (combined.length === 0) {
    return { name: 'never' };
  } else {
    return combined;
  }
}

export function combineNodeEntryType(a: NormalizedNodeEntryType, b: NormalizedNodeEntryType): NormalizedNodeEntryType {
  // 如果其中一个是 any，则结果为另一个类型
  if (isAnyNodeEntryType(a)) return a;
  if (isAnyNodeEntryType(b)) return b;
  if (isNeverNodeEntryType(a)) return b;
  if (isNeverNodeEntryType(b)) return a;

  if (!isNormalizedUnionNodeEntryType(a) && !isNormalizedUnionNodeEntryType(b)) {
    if (a.name !== b.name) {
      return [a, b].sort(compareNodeEntryType);
    }
    let ab: NormalizedNodeEntryType | undefined;
    switch (a.name) {
      case 'string':
        ab = combineNodeEntryStringType(a, b as NormalizedStringType);
        break;
      case 'number':
        ab = combineNodeEntryNumberType(a, b as NormalizedNumberType);
        break;
      case 'bool':
        return combineNodeEntryBoolType(a, b as NormalizedBoolType);
      case 'array':
        ab = combineNodeEntryArrayType(a, b as NormalizedArrayType);
        break;
      case 'dict':
        return combineNodeEntryDictType(a, b as NormalizedDictType);
      case 'ndarray':
        ab = combineNodeEntryNDArrayType(a, b as NormalizedNDArrayType);
        break;
      case 'torch-tensor':
        ab = combineTorchTensorType(a, b as NormalizedTorchTensorType);
        break;
      case 'python-object':
        ab = combinePythonObjectType(a, b as NormalizedPythonObjectType);
        break
      default:
        throw new Error(`Unknown node entry type: ${(a as SimpleType).name}`);
    }
    if (ab) {
      return ab;
    } else {
      return [a, b].sort(compareNodeEntryType);
    }
  } else {
    if (isNormalizedUnionNodeEntryType(a)) {
      if (isNormalizedUnionNodeEntryType(b)) {
        return combineNodeEntryUnionType(a, b);
      } else {
        return combineNodeEntryUnionType(a, [b]);
      }
    } else if (isNormalizedUnionNodeEntryType(b)) {
      return combineNodeEntryUnionType([a], b);
    } else {
      throw new Error(`Unknown node entry type: ${a}`);
    }
  }
}