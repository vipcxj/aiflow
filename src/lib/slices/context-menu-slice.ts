import { ContextMenuItem } from "@/components/context-menu/type";
import { createAppSlice } from "@/lib/createAppSlice"
import { PayloadAction } from "@reduxjs/toolkit";

export const SLICE_NAME = "contextMenu";

export interface ContextMenuState {
  title: string;
  items: ContextMenuItem[];
  visible: boolean;
  position: { x: number, y: number };
};

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
}

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
    closeContextMenu: create.reducer((state) => {
      state.visible = false;
    }),
  }),
  selectors: {
    selectTitle: (state) => state.title,
    selectVisible: (state) => state.visible,
    selectItems: (state) => state.items,
    selectPosition: (state) => state.position,
  },
});

export const { openContextMenu, closeContextMenu } = contextMenuSlice.actions;
export const { selectTitle, selectVisible, selectItems, selectPosition } = contextMenuSlice.selectors;