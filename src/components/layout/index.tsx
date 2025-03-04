import { PropsWithChildren } from "react";
import { MenuBar } from "./menubar";
import { SideBar } from "./sidebar";
import { Workspace } from "./workspace";

const MainLayout = ({ children }: PropsWithChildren) => {
  return (
    <div
      className={`
        flex flex-col h-screen w-screen overflow-hidden
      `}
    >
      <MenuBar
        className={`
          menubar
          flex w-full
          border-b border-gray-200 bg-white px-5
          dark:border-gray-800 dark:bg-black
        `}
      />
      <div className="flex h-full">
        <SideBar
          className={`
            sidebar 
            fixed top-0 left-0 z-9999 
            flex h-full w-[290px] 
            flex-col overflow-y-auto 
            border-r border-gray-200 bg-white px-5
            transition-all duration-300
            lg:static lg:translate-x-0
            dark:border-gray-800 dark:bg-black
            -translate-x-full
          `}
        />
        <Workspace>
          {children}
        </Workspace>
      </div>
    </div>
  )
};

export default MainLayout;