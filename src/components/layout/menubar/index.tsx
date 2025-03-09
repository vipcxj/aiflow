"use client";

import { Bars3BottomLeft } from "@/components/icons/bars-3-bottom-left";
import { ThemeButton } from "@/components/theme";
import { HTMLProps, useCallback } from "react";
import cs from 'classnames';
import { ArrowScrollbar } from '@/components/scrollable/arraw-scrollbar';
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { closeWorkspace, newWorkspace, selectCurrentWorkspaceId, selectWorkspaces } from "@/lib/slices/workspace-slice";
import { Plus } from "@/components/icons/plus";
import { XMark } from "@/components/icons/x-mark";

export const MenuBar = ({ className, ...props }: HTMLProps<HTMLDivElement>) => {
  const dispatch = useAppDispatch();
  const currentWorkspaceId = useAppSelector(selectCurrentWorkspaceId);
  const workspaces = useAppSelector(selectWorkspaces);
  const onNewWorkspace = useCallback(() => {
    dispatch(newWorkspace());
  }, [dispatch]);
  const createOnCloseWorkspace = (id: string) => () => {
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
          <div className="tabs tabs-box flex-nowrap">
            {workspaces.map(ws => (
              <label key={ws.id} className="tab flex-nowrap">
                <input
                  type="radio"
                  name={ws.id}
                  checked={ws.id === currentWorkspaceId}
                />
                <span className="whitespace-nowrap">{ws.title}</span>
                <button
                  className="btn btn-ghost btn-sm pl-0 pr-0"
                  onClick={createOnCloseWorkspace(ws.id)}
                >
                  <XMark />
                </button>
              </label>
            ))}
            <button className="btn" onClick={onNewWorkspace}>
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
