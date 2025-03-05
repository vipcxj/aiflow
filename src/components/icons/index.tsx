import { Bars3BottomLeft } from "./bars-3-bottom-left";
import { CpuChip } from "./cpu-chip";
import { Moon } from "./moon";
import { Sun } from "./sun";

export type IconName =
  'bars-3-bottom-left'
  | 'chevron-left'
  | 'chevron-right'
  | 'cpu-chip'
  | 'moon'
  | 'sun';

export type IconProps = {
  name: IconName;
  className?: string;
};

export const Icon = ({ name, className }: IconProps) => {
  switch (name) {
    case 'bars-3-bottom-left':
      return <Bars3BottomLeft className={className} />;
    case 'cpu-chip':
      return <CpuChip className={className} />;
    case 'moon':
      return <Moon className={className} />;
    case 'sun':
      return <Sun className={className} />;
    default:
      return null;
  }
};