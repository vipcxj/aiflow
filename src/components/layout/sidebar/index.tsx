import { CpuChip } from "@/components/icons/cpu-chip";
import { HTMLProps } from "react";

export const SideBar = (props: HTMLProps<HTMLDivElement>) => {
  return (
    <div {...props}>
      <ul
        className={`
          menu
          flex-none
          h-full
          bg-base-100
          shadow-lg
          pt-4
        `}
      >
        <li>
          <a>
            <CpuChip className="h-6 w-6" />
          </a>
        </li>
      </ul>
      <div
        className={`
          flex-1
          h-full
          min-w-[250px]
          transition-all duration-300
          lg:static lg:translate-x-0
          -translate-x-full
        `}
      >

      </div>
    </div>
  )
};