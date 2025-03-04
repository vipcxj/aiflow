import { Moon } from "../icons/moon";
import { Sun } from "../icons/sun";

export const ThemeButton = () => {
  return (
    <label className="btn btn-circle btn-ghost swap swap-rotate">
      {/* this hidden checkbox controls the state */}
      <input type="checkbox" className="theme-controller" value="synthwave" />
      <Sun className="swap-off h-8 w-8" />
      <Moon className="swap-on h-8 w-8" />
    </label>
  );
}