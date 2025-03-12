'use client';

import { Icon, IconName } from "../icons";
import { ContextMenuItem, ContextMenuState, isMenu, isSeparator } from "./type";
import { adjustContextMenu } from './hook';
import { ChevronRight } from "../icons/chevron-right";
import { JSX, useCallback, MouseEvent } from "react";
import cs from 'classnames';
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { closeContextMenu, openContextSubMenu } from "@/lib/slices/context-menu-slice";
import { ChevronDown } from "../icons/chevron-down";
import { TruncateText } from "../text";
import { ArrowScrollbar } from "../scrollable";

type Position = { x: number, y: number };
type OpenSubMenuFun = (path: number[], position: Position, side: 'left' | 'right' | undefined, ready: boolean) => void;
type CloseMenuFun = () => void;
const doNothing = () => { };

const genMenuId = (path: number[]) => {
  if (path.length === 0) {
    return 'context-menu';
  }
  return `context-menu.${path.join('.')}`;
};

const genMenuItemId = (path: number[]) => {
  return `context-menu-item.${path.join('.')}`;
};

const createMenuItem = (path: number[], item: ContextMenuItem, menuState: ContextMenuState, openSubMenu: OpenSubMenuFun, closeMenu: CloseMenuFun, menus: JSX.Element[]) => {
  const id = genMenuItemId(path);
  if (isSeparator(item)) {
    return <div key={id} className="divider mt-0 mb-0" />;
  } else if (isMenu(item)) {
    if (item.subMenu) {
      createMenu(menus, path, item.subMenu, openSubMenu, closeMenu);
      const onClick = (e: MouseEvent<HTMLLIElement>) => {
        openSubMenu(path, { x: e.pageX, y: e.pageY }, undefined, false);
        setTimeout(() => {
          adjustContextMenu(genMenuId(path.slice(0, -1)), genMenuId(path), e.pageX, e.pageY, (position, side, ready) => {
            openSubMenu(path, position, side, ready || false);
          });
        }, 0);
      };
      return (
        <li key={id} onClick={onClick} className={cs({ 'menu-selected': item.selected })}>
          <a>
            {item.icon && <Icon key="icon" name={item.icon as IconName} className="h-5 w-5 shrink-0" />}
            <TruncateText text={item.label} className="truncate flex-1" />
            <label className="swap swap-rotate justify-self-end shrink-0">
              <input type="checkbox" readOnly checked={!!item.selected} onChange={doNothing} />
              <ChevronRight className="h-3 w-3 swap-off" />
              <ChevronDown className="h-3 w-3 swap-on" />
            </label>
          </a>
        </li>
      );
    } else {
      const onClick = () => {
        closeMenu();
        if (item.onClick) {
          item.onClick(item.data, menuState);
        }
      };
      return (
        <li key={id} onClick={onClick}>
          <a>
            {item.icon && <Icon key="icon" name={item.icon as IconName} className="h-5 w-5 shrink-0" />}
            <TruncateText text={item.label} className="truncate flex-1" />
          </a>
        </li>
      );
    }
  } else {
    return null;
  }
};

/**
 * 将 level 映射到 0.3 到 1 的范围
 * @param level 层级，从 0 开始
 * @returns 映射后的值，介于 0.3 和 1 之间
 */
function mapLevelToOpacity(level: number): number {
  // 确保 level 为非负数
  const safeLevel = Math.max(0, level);
  
  // 使用指数衰减函数：0.3 + 0.7 * (0.3)^level
  // 当 level = 0 时，结果为 1
  // 当 level 增大时，结果渐近接近 0.5
  return 0.3 + 0.7 * Math.pow(0.3, safeLevel);
}

const createMenu = (result: JSX.Element[], path: number[], menuState: ContextMenuState, openSubMenu: OpenSubMenuFun, closeMenu: CloseMenuFun) => {
  const { visible, level = 0, title, items, position, sideOfParent, ready } = menuState;
  if (!visible)
    return;
  const id = genMenuId(path);
  
  result.push(
    <div
      id={id} key={id}
      className={cs(
        "absolute card bg-base-100 shadow-sm",
        "min-w-24 max-w-64 max-h-96",
        "border-1 border-primary-content/30",
        "overflow-x-hidden",
        "overflow-y-hidden",
        {
          'left-side': sideOfParent === 'left',
          'right-side': sideOfParent === 'right',
          'invisible': !ready,
        },
      )}
      style={{
        top: position?.y || 0, 
        left: position?.x || 0, 
        zIndex: 10000 + path.length,
        opacity: mapLevelToOpacity(level),
      }}
    >
      {/* 固定的标题部分 */}
      {title && (
        <div className="sticky top-0 z-[1] bg-base-100 pb-0"> {/* 使用sticky定位保持在顶部 */}
          <ul className="menu menu-sm w-full mb-0 pb-0">
            <li className="menu-title text-xs w-full !pt-1 !pb-1">
              <TruncateText text={title} className="truncate w-full" />
            </li>
            <div className="divider mt-0 mb-0" />
          </ul>
        </div>
      )}

      {/* 可滚动的菜单项部分 */}
      <ArrowScrollbar direction="vertical" className="max-h-[calc(24rem-36px)]"> {/* 设置最大高度并允许滚动 */}
        <ul className={cs("menu menu-sm w-full", { 'pt-0': title, 'mt-0': title })}>
          {items.map((item, i) => createMenuItem([...path, i], item, menuState, openSubMenu, closeMenu, result))}
        </ul>
      </ArrowScrollbar>
    </div>
  );
}

export const ContextMenu = () => {
  const menuState = useAppSelector(state => state.contextMenu);
  const dispatch = useAppDispatch();
  const openSubMenu = (path: number[], position: { x: number, y: number }, side: 'left' | 'right' | undefined, ready: boolean) => {
    dispatch(openContextSubMenu({ path, position, sideOfParent: side, ready }));
  };
  const closeMenu = useCallback(() => dispatch(closeContextMenu()), [dispatch]);
  const menus: JSX.Element[] = [];
  createMenu(menus, [], menuState, openSubMenu, closeMenu);
  return (
    <div id="context-menu-root">
      {menus}
    </div>
  );
}