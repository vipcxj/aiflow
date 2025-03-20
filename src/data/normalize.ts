import { combineNodeEntryUnionType } from "./combine";
import type { StringType, ArrayType, NormalizedArrayType, DictType, NormalizedDictType, NormalizedNodeEntryType, UnionType, NormalizedAnyType, NormalizedNeverType, NormalizedSimpleType, NodeEntryType, NormalizedUnionType } from "./data-type";
import { isSimpleArrayShape, isAnyNodeEntryType, isNeverNodeEntryType, isNormalizedUnionNodeEntryType, isStringNodeEntryType, isNumberNodeEntryType, isBoolNodeEntryType, isArrayNodeEntryType, isDictNodeEntryType, isNDArrayNodeEntryType, isTorchTensorNodeEntryType, isPythonObjectNodeEntryType, isUnionNodeEntryType } from "./guard";

function normalizeNodeEntryStringType(type: StringType): StringType {
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

function normalizeNodeEntryDictType(type: DictType): NormalizedDictType {
  if (type.keys) {
    const keys: Record<string, NormalizedNodeEntryType> = {};
    for (const key in type.keys) {
      keys[key] = normalizeNodeEntryType(type.keys[key]);
    }
    return {
      name: 'dict',
      keys,
    };
  } else {
    return { name: 'dict' };
  }
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
    return type;
  } else if (isBoolNodeEntryType(type)) {
    return type;
  } else if (isArrayNodeEntryType(type)) {
    return normalizeNodeEntryArrayType(type);
  } else if (isDictNodeEntryType(type)) {
    return normalizeNodeEntryDictType(type);
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