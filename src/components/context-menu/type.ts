export type ContextMenuItemType = 'menu' | 'separator';

export interface ContextMenuItemSeparator {
    type: 'separator';
};

export interface ContextMenuItemMenu {
    type: 'menu';
    label: string;
    icon?: string;
    subMenu?: ContextMenuItem[];
    data?: any;
    onClick?: (data: any) => void;
};

export type ContextMenuItem = ContextMenuItemSeparator | ContextMenuItemMenu;

export const isSeparator = (item: ContextMenuItem): item is ContextMenuItemSeparator => {
    return item.type === 'separator';
};

export const isMenu = (item: ContextMenuItem): item is ContextMenuItemMenu => {
    return item.type === 'menu';
};