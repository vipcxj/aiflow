import { NeverType, NormalizedArrayType, NormalizedBoolType, NormalizedDictType, NormalizedDictTypeKeys, NormalizedNDArrayType, NormalizedNodeEntryType, NormalizedNumberType, NormalizedPythonObjectType, NormalizedSimpleType, NormalizedStringType, NormalizedTorchTensorType, StringConstraint } from "./data-type";
import { isAnyNodeEntryType, isNeverNodeEntryType, isNormalizedUnionNodeEntryType, isSimpleArrayShape } from "./guard";
import { calcNodeEntryNumberTypeEnum, calcNodeEntryStringTypeEnum, isArrayShallowEquals, isValidNumberInNumberType, isValidStringByConstraint, isRangeInclude, isRangeIntersect, calcRangeIntersection } from "./utils";
import { normalizeNodeEntryArrayType, normalizeNodeEntryNumberType, normalizeNodeEntryStringType, normalizeNodeEntryUnionType } from "./normalize";
import { combineNodeEntryType } from "./combine";

export function mayNumberTypeAssignToNumber(left: NormalizedNumberType, right: NormalizedNumberType): boolean {
  if (right.enum) {
    const rEnum = calcNodeEntryNumberTypeEnum(right) || [];
    return rEnum.some(v => isValidNumberInNumberType(left, v) && (!left.enum || v in left.enum));
  }
  if (left.enum) {
    const lEnum = calcNodeEntryNumberTypeEnum(left) || [];
    return lEnum.some(v => isValidNumberInNumberType(right, v));
  }
  return isRangeIntersect([left.min, left.max], [right.min, right.max]);
}

export function adaptNumberType(fromType: NormalizedNumberType, toType: NormalizedNumberType): NormalizedNumberType | NeverType {
  if (toType.enum) {
    const toEnum = calcNodeEntryNumberTypeEnum(toType) || [];
    const newEnum = toEnum.filter(v => isValidNumberInNumberType(fromType, v) && (!fromType.enum || v in fromType.enum));
    if (newEnum.length === 0) {
      return { name: 'never' };
    } else {
      return normalizeNodeEntryNumberType({ name: 'number', enum: newEnum });
    }
  }
  if (fromType.enum) {
    const fromEnum = calcNodeEntryNumberTypeEnum(fromType) || [];
    const newEnum = fromEnum.filter(v => isValidNumberInNumberType(toType, v));
    if (newEnum.length === 0) {
      return { name: 'never' };
    } else {
      return normalizeNodeEntryNumberType({ name: 'number', enum: newEnum });
    }
  }
  const intersection = calcRangeIntersection([fromType.min, fromType.max], [toType.min, toType.max]);
  if (intersection) {
    return normalizeNodeEntryNumberType({ name: 'number', min: intersection[0], max: intersection[1] });
  } else {
    return { name: 'never' };
  }
}

export function mustNumberTypeAssignToNumber(left: NormalizedNumberType, right: NormalizedNumberType): boolean {
  if (right.enum) {
    const rEnum = calcNodeEntryNumberTypeEnum(right) || [];
    return rEnum.length > 0 ? right.enum.every(v => isValidNumberInNumberType(left, v) && (!left.enum || v in left.enum)) : false;
  }
  if (left.enum) {
    return false;
  }
  if (!!left.integer !== !!right.integer) {
    return false;
  }
  return !left.integer && isRangeInclude([left.min, left.max], [right.min, right.max]);
}

export function mayStringTypeAssignToString(left: NormalizedStringType, right: NormalizedStringType): boolean {
  if (right.enum) {
    const rEnum = calcNodeEntryStringTypeEnum(right) || [];
    return rEnum.some(v => {
      if (left.enum && !left.enum.includes(v)) {
        return false;
      }
      return !left.constraints || left.constraints.some(c => isValidStringByConstraint(c, v));
    });
  }
  if (left.enum) {
    const lEnum = calcNodeEntryStringTypeEnum(left) || [];
    return lEnum.some(v => {
      return !right.constraints || right.constraints.some(c => isValidStringByConstraint(c, v));
    });
  }
  if (!left.constraints || !right.constraints) {
    return true;
  }
  for (const cl of left.constraints) {
    for (const cr of right.constraints) {
      if (cl.pattern && cr.pattern && cl.pattern !== cr.pattern) {
        continue;
      }
      if (isRangeIntersect([cl.lenMin, cl.lenMax], [cr.lenMin, cr.lenMax])) {
        return true;
      }
    }
  }
  return false;
}

export function adaptStringType(fromType: NormalizedStringType, toType: NormalizedStringType): NormalizedStringType | NeverType {
  if (toType.enum) {
    const toEnum = calcNodeEntryStringTypeEnum(toType) || [];
    const newEnum = toEnum.filter(v => {
      if (fromType.enum && !fromType.enum.includes(v)) {
        return false;
      }
      return !fromType.constraints || fromType.constraints.some(c => isValidStringByConstraint(c, v));
    });
    if (newEnum.length === 0) {
      return { name: 'never' };
    } else {
      return { name: 'string', enum: newEnum };
    }
  }
  if (fromType.enum) {
    const fromEnum = calcNodeEntryStringTypeEnum(fromType) || [];
    const newEnum = fromEnum.filter(v => {
      return !toType.constraints || toType.constraints.some(c => isValidStringByConstraint(c, v));
    });
    if (newEnum.length === 0) {
      return { name: 'never' };
    } else {
      return { name: 'string', enum: newEnum };
    }
  }
  if (!fromType.constraints) {
    return { name: 'string', constraints: toType.constraints };
  }
  if (!toType.constraints) {
    return { name: 'string', constraints: fromType.constraints };
  }
  const newConstraints: StringConstraint[] = [];
  for (const cTo of toType.constraints) {
    for (const cFrom of fromType.constraints) {
      if (cFrom.pattern && cTo.pattern && cFrom.pattern !== cTo.pattern) {
        continue;
      }
      const c: StringConstraint = {};
      c.pattern = cFrom.pattern || cTo.pattern;
      const intersection = calcRangeIntersection([cFrom.lenMin, cFrom.lenMax], [cTo.lenMin, cTo.lenMax]);
      if (intersection) {
        c.lenMin = intersection[0];
        c.lenMax = intersection[1];
        newConstraints.push(c);
      }
    }
  }
  if (newConstraints.length === 0) {
    return { name: 'never' };
  } else {
    return normalizeNodeEntryStringType({ name: 'string', constraints: newConstraints });
  }
}

export function mustStringTypeAssignToString(left: NormalizedStringType, right: NormalizedStringType): boolean {
  if (right.enum) {
    const rEnum = calcNodeEntryStringTypeEnum(right) || [];
    return rEnum.length > 0 ? right.enum.every(v => {
      if (left.enum && !left.enum.includes(v)) {
        return false;
      }
      return !left.constraints || left.constraints.some(c => isValidStringByConstraint(c, v));
    }) : false;
  }
  if (left.enum) {
    return false;
  }
  if (!left.constraints || left.constraints.length === 0) {
    return true;
  }
  if (!right.constraints || right.constraints.length === 0) {
    return !left.constraints.some(c => c.pattern || typeof c.lenMin === 'number' || typeof c.lenMax === 'number');
  }
  for (const cl of left.constraints) {
    for (const cr of right.constraints) {
      if (cl.pattern && cr.pattern && cl.pattern !== cr.pattern) {
        continue;
      }
      if (!cr.pattern) {
        if (cl.pattern) {
          continue;
        }
      }
      if (isRangeInclude([cl.lenMin, cl.lenMax], [cr.lenMin, cr.lenMax])) {
        return true;
      }
    }
  }
  return false;
}

export function mayBoolTypeAssignToBool(left: NormalizedBoolType, right: NormalizedBoolType): boolean {
  if (typeof right.literal !== 'boolean') {
    // 右侧非字面量，可能赋值成功
    return true;
  } else {
    // 如果右侧是字面量，那么左侧要么不是字面量，要么字面量相等
    return typeof left.literal !== 'boolean' || left.literal === right.literal;
  }
}

export function adaptBoolType(fromType: NormalizedBoolType, toType: NormalizedBoolType): NormalizedBoolType | NeverType {
  if (typeof fromType.literal !== 'boolean') {
    return {
      name: 'bool',
      literal: toType.literal,
    };
  }
  if (typeof toType.literal !== 'boolean') {
    return {
      name: 'bool',
      literal: fromType.literal,
    }
  }
  if (fromType.literal === toType.literal) {
    return {
      name: 'bool',
      literal: fromType.literal,
    };
  } else {
    return { name: 'never' };
  }
}

export function mustBoolTypeAssignToBool(left: NormalizedBoolType, right: NormalizedBoolType): boolean {
  if (typeof left.literal !== 'boolean') {
    // 左侧非字面量，必定赋值成功
    return true;
  } else {
    // 如果左侧是字面量，那么右侧必须也是字面量，并且字面量相等，这样才能保证赋值成功
    return right.literal === right.literal;
  }
}

export function mayArrayTypeAssignToArray(left: NormalizedArrayType, right: NormalizedArrayType): boolean {
  const leftLen = isSimpleArrayShape(left.shape) ? left.shape[1] : left.shape.length;
  const rightLen = isSimpleArrayShape(right.shape) ? right.shape[1] : right.shape.length;
  const leftFirstType = left.shape[0];
  const rightFirstType = right.shape[0];
  if (leftLen === -1 && rightLen === -1) {
    return mayNodeEntryTypeAssignTo(leftFirstType, rightFirstType);
  }
  if (leftLen !== -1 && rightLen !== -1 && leftLen !== rightLen) {
    return false;
  }
  for (let i = 0; i < (leftLen === -1 ? rightLen : leftLen); i++) {
    const leftType = isSimpleArrayShape(left.shape) ? leftFirstType : left.shape[i];
    const rightType = isSimpleArrayShape(right.shape) ? rightFirstType : right.shape[i];
    if (!mayNodeEntryTypeAssignTo(leftType, rightType)) {
      return false;
    }
  }
  return true;
}

export function adaptArrayType(fromType: NormalizedArrayType, toType: NormalizedArrayType): NormalizedArrayType | NeverType {
  const fromLen = isSimpleArrayShape(fromType.shape) ? fromType.shape[1] : fromType.shape.length;
  const toLen = isSimpleArrayShape(toType.shape) ? toType.shape[1] : toType.shape.length;
  const fromFirstType = fromType.shape[0];
  const toFirstType = toType.shape[0];
  if ((fromLen === -1 && toLen === -1) || (isSimpleArrayShape(fromType.shape) && isSimpleArrayShape(toType.shape) && fromLen === toLen)) {
    const newType = adaptNodeEntryType(fromFirstType, toFirstType);
    if (isNeverNodeEntryType(newType)) {
      return { name: 'never' };
    } else {
      return { name: 'array', shape: [newType, fromLen] };
    }
  }
  if (fromLen !== -1 && toLen !== -1 && fromLen !== toLen) {
    return { name: 'never' };
  }
  const shape: NormalizedNodeEntryType[] = [];
  for (let i = 0; i < (fromLen === -1 ? toLen : fromLen); i++) {
    const _fromType = isSimpleArrayShape(fromType.shape) ? fromFirstType : fromType.shape[i];
    const _toType = isSimpleArrayShape(toType.shape) ? toFirstType : toType.shape[i];
    const newType = adaptNodeEntryType(_fromType, _toType);
    if (isNeverNodeEntryType(newType)) {
      return { name: 'never' };
    }
    shape.push(newType);
  }
  return normalizeNodeEntryArrayType({ name: 'array', shape });
}

export function mustArrayTypeAssignToArray(left: NormalizedArrayType, right: NormalizedArrayType): boolean {
  const leftLen = isSimpleArrayShape(left.shape) ? left.shape[1] : left.shape.length;
  const rightLen = isSimpleArrayShape(right.shape) ? right.shape[1] : right.shape.length;
  const leftFirstType = left.shape[0];
  const rightFirstType = right.shape[0];
  if (leftLen === -1 && rightLen === -1) {
    return mustNodeEntryTypeAssignTo(leftFirstType, rightFirstType);
  }
  if (leftLen === -1 || rightLen === -1) {
    return false;
  }
  if (leftLen !== rightLen) {
    return false;
  }
  for (let i = 0; i < leftLen; i++) {
    const leftType = isSimpleArrayShape(left.shape) ? leftFirstType : left.shape[i];
    const rightType = isSimpleArrayShape(right.shape) ? rightFirstType : right.shape[i];
    if (!mustNodeEntryTypeAssignTo(leftType, rightType)) {
      return false;
    }
  }
  return true;
}

export function mayDictTypeAssignToDict(left: NormalizedDictType, right: NormalizedDictType, fullAsign: boolean = true): boolean {
  if (left.keys && right.keys) {
    for (const key in left.keys) {
      if (fullAsign) {
        if (!right.keys[key]) {
          if (!left.keys[key].optional) {
            return false;
          } else {
            continue;
          }
        }
      } else {
        if (!right.keys[key]) {
          continue;
        }
      }
      if (!mayNodeEntryTypeAssignTo(left.keys[key].type, right.keys[key].type)) {
        return false;
      }
    }
  }
  return true;
}

export function adaptDictType(fromType: NormalizedDictType, toType: NormalizedDictType): NormalizedDictType | NeverType {
  if (fromType.keys && toType.keys) {
    const keys: NormalizedDictTypeKeys = {};
    for (const key in toType.keys) {
      if (!fromType.keys[key]) {
        if (!toType.keys[key].optional) {
          return { name: 'never' };
        } else {
          continue;
        }
      }
      const newType = adaptNodeEntryType(fromType.keys[key].type, toType.keys[key].type);
      if (isNeverNodeEntryType(newType)) {
        return { name: 'never' };
      }
      keys[key] = {
        type: newType,
        optional: !toType.keys[key].optional ? false : fromType.keys[key].optional,
      };
    }
    if (Object.keys(keys).length === 0) {
      return { name: 'never' };
    } else {
      return { name: 'dict', keys };
    }
  } else if (fromType.keys) {
    return { name: 'dict', keys: fromType.keys };
  } else if (toType.keys) {
    return { name: 'dict', keys: toType.keys };
  } else {
    return { name: 'dict' };
  }
}

export function mustDictTypeAssignToDict(left: NormalizedDictType, right: NormalizedDictType, fullAsign: boolean = true): boolean {
  if (left.keys && right.keys) {
    for (const key in left.keys) {
      if (fullAsign) {
        if (!right.keys[key]) {
          if (!left.keys[key].optional) {
            return false;
          } else {
            continue;
          }
        }
        if (!left.keys[key].optional && right.keys[key].optional) {
          return false;
        }
      } else {
        if (!right.keys[key]) {
          continue;
        }
      }
      if (!mustNodeEntryTypeAssignTo(left.keys[key].type, right.keys[key].type)) {
        return false;
      }
    }
    return true;
  } else if (!left.keys) {
    return true;
  } else {
    return false;
  }
}

export function mayNDArrayTypeAssignToNDArray(left: NormalizedNDArrayType, right: NormalizedNDArrayType): boolean {
  if (left.dtype && right.dtype && left.dtype !== right.dtype) {
    return false;
  }
  if (left.shape && right.shape) {
    return isArrayShallowEquals(left.shape, right.shape);
  }
  return true;
}

export function adaptNDArrayType(fromType: NormalizedNDArrayType, toType: NormalizedNDArrayType): NormalizedNDArrayType | NeverType {
  if (fromType.dtype && toType.dtype && fromType.dtype !== toType.dtype) {
    return { name: 'never' };
  }
  if (fromType.shape && toType.shape) {
    if (isArrayShallowEquals(fromType.shape, toType.shape)) {
      return { name: 'ndarray', shape: fromType.shape, dtype: fromType.dtype || toType.dtype };
    } else {
      return { name: 'never' };
    }
  } else if (fromType.shape) {
    return { name: 'ndarray', shape: fromType.shape, dtype: fromType.dtype || toType.dtype };
  } else if (toType.shape) {
    return { name: 'ndarray', shape: toType.shape, dtype: fromType.dtype || toType.dtype };
  } else {
    return { name: 'ndarray', dtype: fromType.dtype || toType.dtype };
  }
}

export function mustNDArrayTypeAssignToNDArray(left: NormalizedNDArrayType, right: NormalizedNDArrayType): boolean {
  if (left.dtype && left.dtype !== right.dtype) {
    return false;
  }
  if (left.shape) {
    return right.shape ? isArrayShallowEquals(left.shape, right.shape) : false;
  }
  return true;
}

export function mayTorchTensorTypeAssignToTorchTensor(left: NormalizedTorchTensorType, right: NormalizedTorchTensorType): boolean {
  if (left.dtype && right.dtype && left.dtype !== right.dtype) {
    return false;
  }
  if (left.shape && right.shape) {
    return isArrayShallowEquals(left.shape, right.shape);
  }
  return true;
}

export function adaptTorchTensorType(fromType: NormalizedTorchTensorType, toType: NormalizedTorchTensorType): NormalizedTorchTensorType | NeverType {
  if (fromType.dtype && toType.dtype && fromType.dtype !== toType.dtype) {
    return { name: 'never' };
  }
  if (fromType.shape && toType.shape) {
    if (isArrayShallowEquals(fromType.shape, toType.shape)) {
      return { name: 'torch-tensor', shape: fromType.shape, dtype: fromType.dtype || toType.dtype };
    } else {
      return { name: 'never' };
    }
  } else if (fromType.shape) {
    return { name: 'torch-tensor', shape: fromType.shape, dtype: fromType.dtype || toType.dtype };
  } else if (toType.shape) {
    return { name: 'torch-tensor', shape: toType.shape, dtype: fromType.dtype || toType.dtype };
  } else {
    return { name: 'torch-tensor', dtype: fromType.dtype || toType.dtype };
  }
}

export function mustTorchTensorTypeAssignToTorchTensor(left: NormalizedTorchTensorType, right: NormalizedTorchTensorType): boolean {
  if (left.dtype && left.dtype !== right.dtype) {
    return false;
  }
  if (left.shape) {
    return right.shape ? isArrayShallowEquals(left.shape, right.shape) : false;
  }
  return true;
}

export function mayPythonObjectTypeAssignToPythonObject(left: NormalizedPythonObjectType, right: NormalizedPythonObjectType, mayPthonTypeAssignable?: (left: string, right: string) => boolean): boolean {
  if (mayPthonTypeAssignable) {
    return mayPthonTypeAssignable(left.type, right.type);
  }
  return left.type === right.type;
}

export function adaptPythonObjectType(fromType: NormalizedPythonObjectType, toType: NormalizedPythonObjectType, mayPthonTypeAssignable?: (left: string, right: string) => boolean): NormalizedPythonObjectType | NeverType {
  if (mayPthonTypeAssignable) {
    if (mayPthonTypeAssignable(toType.type, fromType.type)) {
      return fromType;
    } else {
      return { name: 'never' };
    }
  }
  if (fromType.type === toType.type) {
    return fromType;
  } else {
    return { name: 'never' };
  }
}

export function mustPythonObjectTypeAssignToPythonObject(left: NormalizedPythonObjectType, right: NormalizedPythonObjectType, mustPthonTypeAssignable?: (left: string, right: string) => boolean): boolean {
  if (mustPthonTypeAssignable) {
    return mustPthonTypeAssignable(left.type, right.type);
  }
  return left.type === right.type;
}

export function mayUnionTypeAssignToUnion(left: NormalizedSimpleType[], right: NormalizedSimpleType[], partialAssign?: boolean, mayPthonTypeAssignable?: (left: string, right: string) => boolean): boolean {
  for (const l of left) {
    if (right.some(r => mayNodeEntryTypeAssignTo(l, r, partialAssign, mayPthonTypeAssignable))) {
      return true;
    }
  }
  return false;
}

export function adaptUnionType(fromType: NormalizedSimpleType[], toType: NormalizedSimpleType[], mayPthonTypeAssignable?: (left: string, right: string) => boolean): NormalizedNodeEntryType {
  const newType: NormalizedSimpleType[] = [];
  for (const t of toType) {
    const newTs = fromType.filter(f => mayNodeEntryTypeAssignTo(f, t, false, mayPthonTypeAssignable));
    const newT = newTs.reduce<NormalizedNodeEntryType>((acc, t) => {
      return combineNodeEntryType(acc, t);
    }, { name: 'never' });
    if (isNeverNodeEntryType(newT)) {
      continue;
    }
    if (isAnyNodeEntryType(newT)) {
      return { name: 'any' };
    }
    if (isNormalizedUnionNodeEntryType(newT)) {
      newType.push(...newT);
    } else {
      newType.push(newT);
    }
  }
  return normalizeNodeEntryUnionType(newType);
}

export function mustUnionTypeAssignToUnion(left: NormalizedSimpleType[], right: NormalizedSimpleType[], partialAssign?: boolean, mustPthonTypeAssignable?: (left: string, right: string) => boolean): boolean {
  for (const l of left) {
    if (right.some(r => mustNodeEntryTypeAssignTo(l, r, partialAssign, mustPthonTypeAssignable))) {
      return true;
    }
  }
  return false;
}

export function mayNodeEntryTypeAssignTo(left: NormalizedNodeEntryType, right: NormalizedNodeEntryType, partialAssign?: boolean, mayPthonTypeAssignable?: (left: string, right: string) => boolean): boolean {
  if (isNeverNodeEntryType(right) || isNeverNodeEntryType(left)) {
    return false;
  }
  if (isAnyNodeEntryType(right) || isAnyNodeEntryType(left)) {
    return true;
  }
  if (isNormalizedUnionNodeEntryType(left) || isNormalizedUnionNodeEntryType(right)) {
    const nLeft = isNormalizedUnionNodeEntryType(left) ? left : [left];
    const nRight = isNormalizedUnionNodeEntryType(right) ? right : [right];
    return mayUnionTypeAssignToUnion(nLeft, nRight, partialAssign, mayPthonTypeAssignable);
  }
  if (left.name !== right.name) {
    return false;
  }
  switch (left.name) {
    case 'string':
      return mayStringTypeAssignToString(left, right as NormalizedStringType);
    case 'number':
      return mayNumberTypeAssignToNumber(left, right as NormalizedNumberType);
    case 'bool':
      return mayBoolTypeAssignToBool(left, right as NormalizedBoolType);
    case 'array':
      return mayArrayTypeAssignToArray(left, right as NormalizedArrayType);
    case 'dict':
      return mayDictTypeAssignToDict(left, right as NormalizedDictType, !partialAssign);
    case 'ndarray':
      return mayNDArrayTypeAssignToNDArray(left, right as NormalizedNDArrayType);
    case 'torch-tensor':
      return mayTorchTensorTypeAssignToTorchTensor(left, right as NormalizedTorchTensorType);
    case 'python-object':
      return mayPythonObjectTypeAssignToPythonObject(left, right as NormalizedPythonObjectType, mayPthonTypeAssignable);
    default:
      throw new Error(`unknown node entry type ${(left as NormalizedSimpleType).name}`);
  }
}

export function adaptNodeEntryType(fromType: NormalizedNodeEntryType, toType: NormalizedNodeEntryType): NormalizedNodeEntryType {
  if (isNeverNodeEntryType(toType) || isNeverNodeEntryType(fromType)) {
    return { name: 'never' };
  }
  if (isAnyNodeEntryType(toType)) {
    return fromType;
  }
  if (isAnyNodeEntryType(fromType)) {
    return toType;
  }
  if (isNormalizedUnionNodeEntryType(fromType) || isNormalizedUnionNodeEntryType(toType)) {
    const nFrom = isNormalizedUnionNodeEntryType(fromType) ? fromType : [fromType];
    const nTo = isNormalizedUnionNodeEntryType(toType) ? toType : [toType];
    return adaptUnionType(nFrom, nTo);
  }
  if (fromType.name !== toType.name) {
    return { name: 'never' };
  }
  switch (fromType.name) {
    case 'string':
      return adaptStringType(fromType as NormalizedStringType, toType as NormalizedStringType);
    case 'number':
      return adaptNumberType(fromType as NormalizedNumberType, toType as NormalizedNumberType);
    case 'bool':
      return adaptBoolType(fromType as NormalizedBoolType, toType as NormalizedBoolType);
    case 'array':
      return adaptArrayType(fromType as NormalizedArrayType, toType as NormalizedArrayType);
    case 'dict':
      return adaptDictType(fromType as NormalizedDictType, toType as NormalizedDictType);
    case 'ndarray':
      return adaptNDArrayType(fromType as NormalizedNDArrayType, toType as NormalizedNDArrayType);
    case 'torch-tensor':
      return adaptTorchTensorType(fromType as NormalizedTorchTensorType, toType as NormalizedTorchTensorType);
    case 'python-object':
      return adaptPythonObjectType(fromType as NormalizedPythonObjectType, toType as NormalizedPythonObjectType);
    default:
      throw new Error(`unknown node entry type ${(fromType as NormalizedSimpleType).name}`);
  }
}

export function mustNodeEntryTypeAssignTo(left: NormalizedNodeEntryType, right: NormalizedNodeEntryType, partialAssign?: boolean, mustPthonTypeAssignable?: (left: string, right: string) => boolean): boolean {
  if (isNeverNodeEntryType(right) || isNeverNodeEntryType(left)) {
    return false;
  }
  if (isAnyNodeEntryType(left)) {
    return true;
  }
  if (isAnyNodeEntryType(right)) {
    return false;
  }
  if (isNormalizedUnionNodeEntryType(left) || isNormalizedUnionNodeEntryType(right)) {
    const nLeft = isNormalizedUnionNodeEntryType(left) ? left : [left];
    const nRight = isNormalizedUnionNodeEntryType(right) ? right : [right];
    return mustUnionTypeAssignToUnion(nLeft, nRight, partialAssign, mustPthonTypeAssignable);
  }
  if (left.name !== right.name) {
    return false;
  }
  switch (left.name) {
    case 'string':
      return mustStringTypeAssignToString(left, right as NormalizedStringType);
    case 'number':
      return mustNumberTypeAssignToNumber(left, right as NormalizedNumberType);
    case 'bool':
      return mustBoolTypeAssignToBool(left, right as NormalizedBoolType);
    case 'array':
      return mustArrayTypeAssignToArray(left, right as NormalizedArrayType);
    case 'dict':
      return mustDictTypeAssignToDict(left, right as NormalizedDictType, !partialAssign);
    case 'ndarray':
      return mustNDArrayTypeAssignToNDArray(left, right as NormalizedNDArrayType);
    case 'torch-tensor':
      return mustTorchTensorTypeAssignToTorchTensor(left, right as NormalizedTorchTensorType);
    case 'python-object':
      return mustPythonObjectTypeAssignToPythonObject(left, right as NormalizedPythonObjectType, mustPthonTypeAssignable);
    default:
      throw new Error(`unknown node entry type ${(left as NormalizedSimpleType).name}`);
  }
}