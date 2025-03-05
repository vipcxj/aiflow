'use client';

import { Icon, IconName } from "../icons";
import { ContextMenuItem, isMenu, isSeparator } from "./type";
import { ChevronRight } from "../icons/chevron-right";
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { 
  selectItems, 
  selectPosition, 
  selectTitle, 
  selectVisible,
  closeContextMenu,
} from "@/lib/slices/context-menu-slice";

const createMenuItem = (id: number | string, item: ContextMenuItem, closeFun: () => void) => {
  if (isSeparator(item)) {
    return <li key={id} className="divider" />;
  } else if (isMenu(item)) {
    const onClick = () => {
      closeFun();
      if (item.onClick) {
        item.onClick(item.data);
      }
    };
    return (
      <li key={id} onClick={onClick}>
        <a>
          {item.icon && <Icon key="icon" name={item.icon as IconName} className="h-5 w-5" />}
          {item.label}
          {item.subMenu && <ChevronRight className="h-3 w-3" />}
        </a>
      </li>
    );
  } else {
    return null;
  }
};

export const ContextMenu = () => {
  const visible = useAppSelector(selectVisible);
  const title = useAppSelector(selectTitle);
  const items = useAppSelector(selectItems);
  const position = useAppSelector(selectPosition);
  const dispatch = useAppDispatch();
  const closeMenu = useCallback(() => dispatch(closeContextMenu()), [dispatch]);
  if (!visible)
    return null;
  return (
    <div id="context-menu" className="absolute card min-w-60 bg-base-100 shadow-sm" style={{ top: position.y, left: position.x }}>
      <ul className="menu">
        { title && <li className="menu-title">{title}</li> }
        { items.map((item, i) => createMenuItem(i, item, closeMenu)) }
      </ul>
    </div>
  );
}