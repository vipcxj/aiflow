// 此文件由脚本自动生成，请勿直接修改
import { Bars3BottomLeft } from "./bars-3-bottom-left";
import { ChevronDown } from "./chevron-down";
import { ChevronLeft } from "./chevron-left";
import { ChevronRight } from "./chevron-right";
import { ChevronUp } from "./chevron-up";
import { Circle } from "./circle";
import { CpuChip } from "./cpu-chip";
import { LockClosed } from "./lock-closed";
import { LockOpen } from "./lock-open";
import { Moon } from "./moon";
import { Play } from "./play";
import { Plus } from "./plus";
import { Sun } from "./sun";
import { XMark } from "./x-mark";

export type IconName =
  'bars-3-bottom-left'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'circle'
  | 'cpu-chip'
  | 'lock-closed'
  | 'lock-open'
  | 'moon'
  | 'play'
  | 'plus'
  | 'sun'
  | 'x-mark';

export type IconProps = {
  name: IconName;
  className?: string;
};

export const Icon = ({ name, className }: IconProps) => {
  switch (name) {
    case 'bars-3-bottom-left':
      return <Bars3BottomLeft className={className} />;
    case 'chevron-down':
      return <ChevronDown className={className} />;
    case 'chevron-left':
      return <ChevronLeft className={className} />;
    case 'chevron-right':
      return <ChevronRight className={className} />;
    case 'chevron-up':
      return <ChevronUp className={className} />;
    case 'circle':
      return <Circle className={className} />;
    case 'cpu-chip':
      return <CpuChip className={className} />;
    case 'lock-closed':
      return <LockClosed className={className} />;
    case 'lock-open':
      return <LockOpen className={className} />;
    case 'moon':
      return <Moon className={className} />;
    case 'play':
      return <Play className={className} />;
    case 'plus':
      return <Plus className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'x-mark':
      return <XMark className={className} />;
    default:
      return null;
  }
};
