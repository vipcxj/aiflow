import { ContextMenuItem, ContextMenuState, isMenu } from "@/components/context-menu/type";
import { createAppSlice } from "@/lib/createAppSlice"
import { PayloadAction } from "@reduxjs/toolkit";

export const SLICE_NAME = "contextMenu";

export const initialState: ContextMenuState = {
  title: "",
  items: [],
  visible: false,
  position: { x: 0, y: 0 },
  ready: false,
};

export type PayloadOpenContextMenu = {
  title: string;
  items: ContextMenuItem[];
  position: { x: number, y: number };
  ready: boolean;
};

export type PayloadOpenContextSubMenu = {
  path: number[];
  position: { x: number, y: number };
  sideOfParent?: 'left' | 'right';
  ready: boolean;
};

const closeMenu = (state: ContextMenuState, excludeRoot: boolean = false, excludePath: number[] = []) => {
  let id: number | undefined = undefined;
  let otherPath: number[] = [];
  if (excludePath.length > 0) {
    [id, ... otherPath] = excludePath;
  }
  if (!excludeRoot) {
    state.visible = false;
    state.position = { x: 0, y: 0 };
    state.sideOfParent = undefined;
    state.ready = false;
  }
  if (state.items) {
    state.items.forEach((item, i) => {
      if (isMenu(item) && item.subMenu) {
        if (id !== i) {
          item.selected = false;
        }
        closeMenu(item.subMenu, id === i, otherPath);
      }
    });
  }
};

export const contextMenuSlice = createAppSlice({
  name: SLICE_NAME,
  initialState,
  reducers: (create) => ({
    openContextMenu: create.reducer((state, action: PayloadAction<PayloadOpenContextMenu>) => {
      state.title = action.payload.title;
      state.items = action.payload.items;
      state.position = action.payload.position;
      state.visible = true;
      state.ready = action.payload.ready;
    }),
    openContextSubMenu: create.reducer((state, action: PayloadAction<PayloadOpenContextSubMenu>) => {
      let items = state.items;
      const path = action.payload.path;
      closeMenu(state, true, path);
      let item: ContextMenuItem | undefined = undefined;
      for (let i = 0; i < path.length; i++) {
        item = items[path[i]];
        if (isMenu(item) && item.subMenu) {
          items = item.subMenu.items;
        }
      }
      if (item && isMenu(item) && item.subMenu) {
        item.selected = true;
        item.subMenu.visible = true;
        item.subMenu.position = action.payload.position;
        item.subMenu.sideOfParent = action.payload.sideOfParent;
        item.subMenu.ready = action.payload.ready;
      }
    }),
    closeContextMenu: create.reducer((state) => {
      closeMenu(state);
    }),
  }),
  selectors: {
    selectTitle: (state) => state.title,
    selectVisible: (state) => state.visible,
    selectItems: (state) => state.items,
    selectPosition: (state) => state.position,
  },
});

export const { openContextMenu, openContextSubMenu, closeContextMenu } = contextMenuSlice.actions;
export const { selectTitle, selectVisible, selectItems, selectPosition } = contextMenuSlice.selectors;