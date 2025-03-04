import { Bars3BottomLeft } from "@/components/icons/bars-3-bottom-left";
import { ThemeButton } from "@/components/theme-button";
import { HTMLProps } from "react";

export const MenuBar = (props: HTMLProps<HTMLDivElement>) => {
  return (
    <div {...props}>
      <div className="navbar bg-base-100 shadow-primary">
        <div className="navbar-start">
          <button className="btn btn-square btn-ghost">
            <Bars3BottomLeft />
          </button>
          <a className="btn btn-ghost text-xl">AIFlow</a>
        </div>
        <div className="navbar-end">
          <ThemeButton />
        </div>
      </div>
    </div>
  );
}