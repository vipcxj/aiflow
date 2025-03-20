import type { NormalizedAnyType, NormalizedNumberType, NormalizedStringType, NormalizedBoolType, NormalizedArrayType, NormalizedArrayComplexType, NormalizedDictType, NormalizedNDArrayType, NormalizedTorchTensorType, NormalizedPythonObjectType, NormalizedUnionType, NormalizedNodeEntryType } from "./data-type";
import { isSimpleArrayShape, isNormalizedUnionNodeEntryType } from "./guard";
import { calcNodeEntryNumberTypeEnum, calcNodeEntryStringTypeEnum } from "./utils";

function compareNodeEntryAnyType(a: NormalizedAnyType, b: NormalizedAnyType): number {
  return 0;
}

function compareNodeEntryNumberType(a: NormalizedNumberType, b: NormalizedNumberType): number {
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

function compareNodeEntryStringType(a: NormalizedStringType, b: NormalizedStringType): number {
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

function compareNodeEntryBoolType(a: NormalizedBoolType, b: NormalizedBoolType): number {
  return 0;
}

function compareNodeEntryArrayType(a: NormalizedArrayType, b: NormalizedArrayType): number {
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
      const c = compareNodeEntryType(eType, (b as NormalizedArrayComplexType).shape[i]);
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

function compareNodeEntryDictType(a: NormalizedDictType, b: NormalizedDictType): number {
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

function compareNodeEntryNDArrayType(a: NormalizedNDArrayType, b: NormalizedNDArrayType): number {
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

function compareNodeEntryTorchTensorType(a: NormalizedTorchTensorType, b: NormalizedTorchTensorType): number {
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

function compareNodeEntryPythonObjectType(a: NormalizedPythonObjectType, b: NormalizedPythonObjectType): number {
  return a.type.localeCompare(b.type);
}

/**
 * compare two union types
 * @param a the first union type
 * @param b the second union type
 * @note should normalize before compare
 */
function compareNodeEntryUnionType(a: NormalizedUnionType, b: NormalizedUnionType): number {
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
      return compareNodeEntryPythonObjectType(a as NormalizedPythonObjectType, b as NormalizedPythonObjectType);
    case 'union':
      return compareNodeEntryUnionType(a as NormalizedUnionType, b as NormalizedUnionType);
    default:
      throw new Error(`Unknown node entry type: ${aName}`);
  }
}