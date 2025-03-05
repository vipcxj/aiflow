import { ContextMenuItem, ContextMenuState, isMenu } from "@/components/context-menu/type";
import { createAppSlice } from "@/lib/createAppSlice"
import { PayloadAction } from "@reduxjs/toolkit";

export const SLICE_NAME = "contextMenu";

export const initialState: ContextMenuState = {
  title: "",
  items: [],
  visible: false,
  position: { x: 0, y: 0 },
};

export type PayloadOpenContextMenu = {
  title: string;
  items: ContextMenuItem[];
  position: { x: number, y: number };
};

export type PayloadOpenContextSubMenu = {
  path: number[];
  position: { x: number, y: number };
};

const closeMenu = (state: ContextMenuState) => {
  state.visible = false;
  state.position = { x: 0, y: 0 };
  if (state.items) {
    state.items.forEach(item => {
      if (isMenu(item) && item.subMenu) {
        closeMenu(item.subMenu);
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
    }),
    openContextSubMenu: create.reducer((state, action: PayloadAction<PayloadOpenContextSubMenu>) => {
      let items = state.items;
      const path = action.payload.path;
      let item: ContextMenuItem | undefined = undefined;
      for (let i = 0; i < path.length; i++) {
        item = items[path[i]];
        if (isMenu(item) && item.subMenu) {
          items = item.subMenu.items;
        }
      }
      if (item && isMenu(item) && item.subMenu) {
        item.subMenu.visible = true;
        item.subMenu.position = action.payload.position;
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