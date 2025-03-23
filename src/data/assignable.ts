import { NormalizedArrayType, NormalizedBoolType, NormalizedNodeEntryType, NormalizedNumberType, NormalizedStringType } from "./data-type";
import { isAnyNodeEntryType, isNeverNodeEntryType, isSimpleArrayShape } from "./guard";
import { calcNodeEntryNumberTypeEnum, calcNodeEntryStringTypeEnum, isValidNumberInNumberType, isValidStringByConstraint, rangeInclude, rangeIntersect } from "./utils";

export function mayNumberTypeAssignToNumber(left: NormalizedNumberType, right: NormalizedNumberType): boolean {
  if (right.enum) {
    const rEnum = calcNodeEntryNumberTypeEnum(right) || [];
    return rEnum.some(v => isValidNumberInNumberType(left, v) && (!left.enum || v in left.enum));
  }
  if (left.enum) {
    const lEnum = calcNodeEntryNumberTypeEnum(left) || [];
    return lEnum.some(v => isValidNumberInNumberType(right, v));
  }
  return rangeIntersect([left.min, left.max], [right.min, right.max]);
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
  return !left.integer && rangeInclude([left.min, left.max], [right.min, right.max]);
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
      if (rangeIntersect([cl.lenMin, cl.lenMax], [cr.lenMin, cr.lenMax])) {
        return true;
      }
    }
  }
  return false;
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
      if (rangeInclude([cl.lenMin, cl.lenMax], [cr.lenMin, cr.lenMax])) {
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

export function mayNodeEntryTypeAssignTo(left: NormalizedNodeEntryType, right: NormalizedNodeEntryType): boolean {
  if (isNeverNodeEntryType(right) || isNeverNodeEntryType(left)) {
    return false;
  }
  if (isAnyNodeEntryType(right) || isAnyNodeEntryType(left)) {
    return true;
  }

  throw new Error('Not implemented');
}

export function mustNodeEntryTypeAssignTo(left: NormalizedNodeEntryType, right: NormalizedNodeEntryType): boolean {
  if (isNeverNodeEntryType(right) || isNeverNodeEntryType(left)) {
    return false;
  }
  if (isAnyNodeEntryType(left)) {
    return true;
  }
  if (isAnyNodeEntryType(right)) {
    return false;
  }
  throw new Error('Not implemented');
}