import { combineNodeEntryUnionType } from "./combine";
import { compareNodeEntryType } from "./compare";
import type { StringType, ArrayType, NormalizedArrayType, DictType, NormalizedDictType, NormalizedNodeEntryType, UnionType, NormalizedAnyType, NormalizedNeverType, NormalizedSimpleType, NodeEntryType, NormalizedUnionType, NormalizedDictTypeKeys, NumberType, NormalizedNumberType, NormalizedStringType, BoolType, NormalizedBoolType, NormalizedNDArrayType, NDArrayType, TorchTensorType, NormalizedTorchTensorType, PythonObjectType, NormalizedPythonObjectType } from "./data-type";
import { isSimpleArrayShape, isAnyNodeEntryType, isNeverNodeEntryType, isNormalizedUnionNodeEntryType, isStringNodeEntryType, isNumberNodeEntryType, isBoolNodeEntryType, isArrayNodeEntryType, isDictNodeEntryType, isNDArrayNodeEntryType, isTorchTensorNodeEntryType, isPythonObjectNodeEntryType, isUnionNodeEntryType, isComplexArrayShape } from "./guard";

export function normalizeNodeEntryNumberType(type: NumberType): NormalizedNumberType {
  return type;
}

export function normalizeNodeEntryStringType(type: StringType): NormalizedStringType {
  if (type.constraints) {
    for (const c of type.constraints) {
      if (c.pattern) {
        c.pattern = c.pattern.trim();
        if (c.pattern.length === 0) {
          delete c.pattern;
        }
      }
    }
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

export function normalizeNodeEntryBoolType(type: BoolType): NormalizedBoolType {
  return type;
}

/**
 * normalize array type. All shape [t, t, ...] will be normalized to [t, n]
 * @param type 
 * @returns normalized array type
 */
export function normalizeNodeEntryArrayType(type: ArrayType): NormalizedArrayType {
  if (isSimpleArrayShape(type.shape)) {
    return {
      name: 'array',
      shape: [normalizeNodeEntryType(type.shape[0]), type.shape[1]],
    };
  } else if (isComplexArrayShape(type.shape)) {
    const shape = type.shape.map(normalizeNodeEntryType);
    if (shape.length === 1) {
      return {
        name: 'array',
        shape: [shape[0], 1],
      };
    } else {
      const t = shape[0];
      for (let i = 1; i < shape.length; i++) {
        const c = compareNodeEntryType(t, shape[i]);
        if (c !== 0) {
          return {
            name: 'array',
            shape: shape,
          };
        }
      }
      return {
        name: 'array',
        shape: [t, shape.length],
      };
    }
  } else {
    throw new Error(`Unknown array shape: ${type.shape}`);
  }
}

export function normalizeNodeEntryDictType(type: DictType): NormalizedDictType {
  if (type.keys) {
    const keys: NormalizedDictTypeKeys = {};
    for (const key in type.keys) {
      const t = normalizeNodeEntryType(type.keys[key].type);
      if (isNeverNodeEntryType(t)) {
        continue;
      }
      keys[key] = {
        type: t,
        optional: type.keys[key].optional || false,
      };
    }
    return {
      name: 'dict',
      keys,
    };
  } else {
    return { name: 'dict' };
  }
}

export function normalizeNodeEntryNDArrayType(type: NDArrayType): NormalizedNDArrayType {
  return type;
}

export function normalizeNodeEntryTorchTensorType(type: TorchTensorType): NormalizedTorchTensorType {
  return type;
}

export function normalizeNodeEntryPythonObjectType(type: PythonObjectType): NormalizedPythonObjectType {
  return type;
}

export function normalizeNodeEntryUnionType(type: UnionType): NormalizedNodeEntryType {
  type U = NormalizedAnyType | NormalizedNeverType | NormalizedSimpleType[];
  const result = type.reduce<U>((acc: U, t: NodeEntryType): U => {
    if (isAnyNodeEntryType(acc)) {
      return acc;
    }
    const nt = normalizeNodeEntryType(t);
    if (isAnyNodeEntryType(nt)) {
      return nt;
    }
    if (isNeverNodeEntryType(nt)) {
      return acc;
    }
    if (isNeverNodeEntryType(acc)) {
      if (!isNormalizedUnionNodeEntryType(nt)) {
        return [nt];
      } else {
        return nt;
      }
    }
    let bt: NormalizedUnionType | NormalizedSimpleType | NormalizedNeverType = [];
    if (isNormalizedUnionNodeEntryType(nt)) {
      bt = combineNodeEntryUnionType(acc, nt);
    } else if (isAnyNodeEntryType(nt)) {
      return nt;
    } else if (isNeverNodeEntryType(nt)) {
      return acc;
    } else {
      bt = combineNodeEntryUnionType(acc, [nt]);
    }
    if (!isNormalizedUnionNodeEntryType(bt) && !isNeverNodeEntryType(bt)) {
      return [bt];
    } else {
      return bt;
    }
  }, [] as U);
  if (isAnyNodeEntryType(result) || isNeverNodeEntryType(result)) {
    return result;
  } else if (result.length === 0) {
    return { name: 'never' };
  } else if (result.length === 1) {
    return result[0];
  } else {
    return result;
  }
}

export function normalizeNodeEntryType(type: NodeEntryType): NormalizedNodeEntryType {
  if (isAnyNodeEntryType(type)) {
    return type;
  } else if (isStringNodeEntryType(type)) {
    return normalizeNodeEntryStringType(type);
  } else if (isNumberNodeEntryType(type)) {
    return normalizeNodeEntryNumberType(type);
  } else if (isBoolNodeEntryType(type)) {
    return normalizeNodeEntryBoolType(type);
  } else if (isArrayNodeEntryType(type)) {
    return normalizeNodeEntryArrayType(type);
  } else if (isDictNodeEntryType(type)) {
    return normalizeNodeEntryDictType(type);
  } else if (isNDArrayNodeEntryType(type)) {
    return normalizeNodeEntryNDArrayType(type);
  } else if (isTorchTensorNodeEntryType(type)) {
    return normalizeNodeEntryTorchTensorType(type);
  } else if (isPythonObjectNodeEntryType(type)) {
    return normalizeNodeEntryPythonObjectType(type);
  } else if (isUnionNodeEntryType(type)) {
    return normalizeNodeEntryUnionType(type);
  } else {
    throw new Error(`Unknown node entry type: ${type}`);
  }
}