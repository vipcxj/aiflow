// 此文件由脚本自动生成，请勿直接修改
import { Bars3BottomLeft } from "./bars-3-bottom-left";
import { ChevronDown } from "./chevron-down";
import { ChevronLeft } from "./chevron-left";
import { ChevronRight } from "./chevron-right";
import { ChevronUp } from "./chevron-up";
import { CpuChip } from "./cpu-chip";
import { Moon } from "./moon";
import { Play } from "./play";
import { Sun } from "./sun";

export type IconName =
  'bars-3-bottom-left'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'cpu-chip'
  | 'moon'
  | 'play'
  | 'sun';

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
    case 'cpu-chip':
      return <CpuChip className={className} />;
    case 'moon':
      return <Moon className={className} />;
    case 'play':
      return <Play className={className} />;
    case 'sun':
      return <Sun className={className} />;
    default:
      return null;
  }
};
