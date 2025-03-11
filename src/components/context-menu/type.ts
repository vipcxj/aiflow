export type ContextMenuItemType = 'menu' | 'separator';

export interface ContextMenuItemSeparator {
    type: 'separator';
};

export interface ContextMenuItemMenu<T = unknown> {
    type: 'menu';
    label: string;
    icon?: string;
    subMenu?: ContextMenuState;
    data?: T;
    selected?: boolean;
    onClick?: (data: T, menuState: ContextMenuState) => void;
};

export type ContextMenuItem = ContextMenuItemSeparator | ContextMenuItemMenu;

export type ContextMenuState = {
    title?: string;
    items: ContextMenuItem[];
    visible?: boolean;
    position?: { x: number, y: number };
    sideOfParent?: 'left' | 'right';
    ready?: boolean; // 菜单需要渲染2次，第一次渲染时不显示，用于为第二次渲染定位，第二次渲染时显示
};

export const isSeparator = (item: ContextMenuItem): item is ContextMenuItemSeparator => {
    return item.type === 'separator';
};

export const isMenu = (item: ContextMenuItem): item is ContextMenuItemMenu => {
    return item.type === 'menu';
};