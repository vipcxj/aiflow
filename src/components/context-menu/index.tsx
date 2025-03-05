'use client';

import { Icon, IconName } from "../icons";
import { ContextMenuItem, ContextMenuState, isMenu, isSeparator } from "./type";
import { adjustContextMenu } from './hook';
import { ChevronRight } from "../icons/chevron-right";
import { JSX, useCallback, MouseEvent } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { closeContextMenu, openContextSubMenu } from "@/lib/slices/context-menu-slice";

type Position = { x: number, y: number };
type OpenSubMenuFun = (path: number[], position: Position) => void;
type CloseMenuFun = () => void;

const genMenuId = (path: number[]) => {
  if (path.length === 0) {
    return 'context-menu';
  }
  return `context-menu.${path.join('.')}`;
};

const genMenuItemId = (path: number[]) => {
  return `context-menu-item.${path.join('.')}`;
};

const createMenuItem = (path: number[], item: ContextMenuItem, openSubMenu: OpenSubMenuFun, closeMenu: CloseMenuFun, menus: JSX.Element[]) => {
  const id = genMenuItemId(path);
  if (isSeparator(item)) {
    return <div key={id} className="divider mt-0 mb-0" />;
  } else if (isMenu(item)) {
    if (item.subMenu) {
      createMenu(menus, path, item.subMenu, openSubMenu, closeMenu);
      const onClick = (e: MouseEvent<HTMLLIElement>) => {
        openSubMenu(path, { x: e.pageX, y: e.pageY });
        setTimeout(() => {
          adjustContextMenu(genMenuId(path.slice(0, -1)), genMenuId(path), e.pageX, e.pageY, (position) => {
            openSubMenu(path, position);
          });
        }, 0);
      };
      return (
        <li key={id} onClick={onClick}>
          <a>
            {item.icon && <Icon key="icon" name={item.icon as IconName} className="h-5 w-5" />}
            {item.label}
            <ChevronRight className="h-3 w-3 justify-self-end" />
          </a>
        </li>
      );
    } else {
      const onClick = () => {
        closeMenu();
        if (item.onClick) {
          item.onClick(item.data);
        }
      };
      return (
        <li key={id} onClick={onClick}>
          <a>
            {item.icon && <Icon key="icon" name={item.icon as IconName} className="h-5 w-5" />}
            {item.label}
          </a>
        </li>
      );
    }
  } else {
    return null;
  }
};

const createMenu = (result: JSX.Element[], path: number[], { visible, title, items, position }: ContextMenuState, openSubMenu: OpenSubMenuFun, closeMenu: CloseMenuFun) => {
  if (!visible)
    return;
  const id = genMenuId(path);
  result.push(
    <div 
      id={id} key={id} 
      className="absolute card min-w-48 max-w-64 bg-base-100 shadow-sm" 
      style={{ top: position?.y || 0, left: position?.x || 0, zIndex: 10000 + path.length }}
    >
      <ul className="menu menu-sm w-full">
        {title && <li className="menu-title text-xs !pt-1 !pb-1">{title}</li>}
        {title && <div className="divider divider-vertical mt-0 mb-0" />}
        {items.map((item, i) => createMenuItem([...path, i], item, openSubMenu, closeMenu, result))}
      </ul>
    </div>
  );
}

export const ContextMenu = () => {
  const menuState = useAppSelector(state => state.contextMenu);
  const dispatch = useAppDispatch();
  const openSubMenu = (path: number[], position: { x: number, y: number }) => {
    dispatch(openContextSubMenu({ path, position }));
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