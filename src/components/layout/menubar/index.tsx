"use client";

import { Bars3BottomLeft } from "@/components/icons/bars-3-bottom-left";
import { ThemeButton } from "@/components/theme";
import { HTMLProps, MouseEvent, useCallback } from "react";
import cs from 'classnames';
import { ArrowScrollbar } from '@/components/scrollable/arraw-scrollbar';
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { closeWorkspace, newWorkspace, setCurrentWorkspace, selectCurrentWorkspaceId, selectWorkspaces } from "@/lib/slices/workspace-slice";
import { Plus } from "@/components/icons/plus";
import { XMark } from "@/components/icons/x-mark";

export const MenuBar = ({ className, ...props }: HTMLProps<HTMLDivElement>) => {
  const dispatch = useAppDispatch();
  const currentWorkspaceId = useAppSelector(selectCurrentWorkspaceId);
  const workspaces = useAppSelector(selectWorkspaces);
  const onNewWorkspace = useCallback(() => {
    dispatch(newWorkspace());
  }, [dispatch]);
  const createOnCloseWorkspace = (id: string) => (e: MouseEvent) => {
    e.stopPropagation();
    dispatch(closeWorkspace(id));
  };
  return (
    <div
      {...props}
      className={cs(
        'navbar',
        className,
      )}
    >
      <div className="navbar-start flex-none w-auto">
        <button className="btn btn-square btn-ghost">
          <Bars3BottomLeft />
        </button>
        <a className="btn btn-ghost text-xl">AIFlow</a>
      </div>
      <div className="navbar-center flex-1 overflow-hidden pl-1 pr-1">
        <ArrowScrollbar
          direction="horizontal"
          className="w-full"
          contentClassName="flex"
        >
          <div className="tabs tabs-box tabs-sm flex-nowrap">
            {workspaces.map(ws => (
              <label key={ws.id} className="tab flex-nowrap">
                <input
                  type="radio"
                  name={ws.id}
                  checked={ws.id === currentWorkspaceId}
                  onChange={() => dispatch(setCurrentWorkspace(ws.id))}
                />
                <span className="whitespace-nowrap pointer-events-auto">{ws.title}</span>
                <span className="relative z-10 pointer-events-auto">
                  <button
                    className="btn btn-ghost btn-sm ml-1 p-0"
                    onClick={createOnCloseWorkspace(ws.id)}
                  >
                    <XMark className="w-4 h-4 text-base-content/50 hover:text-base-content" />
                  </button>
                </span>
              </label>
            ))}
            <button className="btn btn-sm" onClick={onNewWorkspace}>
              <Plus />
            </button>
          </div>
        </ArrowScrollbar>
      </div>
      <div className="navbar-end flex-none w-auto">
        <ThemeButton />
      </div>
    </div>
  );
}
