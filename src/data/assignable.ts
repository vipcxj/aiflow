import { NormalizedBoolType, NormalizedNumberType } from "./data-type";
import { calcNodeEntryNumberTypeEnum, isValidNumberInNumberType, rangeInclude, rangeIntersect } from "./utils";

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