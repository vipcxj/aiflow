"use client";

import { PropsWithChildren } from "react";
import { MenuBar } from "./menubar";
import { SideBar } from "./sidebar";
import { Workspace } from "./workspace";
import { useRedo, useUndo } from "@/lib/slices/workspace-slice";

const MainLayout = ({ children }: PropsWithChildren) => {
  useUndo();
  useRedo();
  return (
    <div
      className={`
        flex flex-col h-screen w-screen overflow-hidden
      `}
    >
      <MenuBar
        className={`
          bg-base shadow-sm
        `}
      />
      <div className="flex h-full">
        <SideBar
          className={`
            flex flex-col h-full
            overflow-y-auto
            shadow-lg
            bg-base-200
            border-r border-base-100
          `}
        />
        <Workspace
          className={`
            relative flex flex-col flex-1
            overflow-x-hidden overflow-y-hidden
            bg-base-300
          `}
        >
          {children}
        </Workspace>
      </div>
    </div>
  )
};

export default MainLayout;