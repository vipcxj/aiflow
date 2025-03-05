export type ContextMenuItemType = 'menu' | 'separator';

export interface ContextMenuItemSeparator {
    type: 'separator';
};

export interface ContextMenuItemMenu {
    type: 'menu';
    label: string;
    icon?: string;
    subMenu?: ContextMenuState;
    data?: unknown;
    onClick?: (data: unknown) => void;
};

export type ContextMenuItem = ContextMenuItemSeparator | ContextMenuItemMenu;

export type ContextMenuState = {
    title: string;
    items: ContextMenuItem[];
    visible?: boolean;
    position?: { x: number, y: number };
};

export const isSeparator = (item: ContextMenuItem): item is ContextMenuItemSeparator => {
    return item.type === 'separator';
};

export const isMenu = (item: ContextMenuItem): item is ContextMenuItemMenu => {
    return item.type === 'menu';
};