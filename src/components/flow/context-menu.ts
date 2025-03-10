import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { addNode } from '@/lib/slices/workspace-slice';
import { selectPosition as selectContextMenuPosition } from '@/lib/slices/context-menu-slice';
import { useOpenContextMenu } from "../context-menu/hook";
import { useCallback } from "react";

export const useGroundContextMenu = () => {
  const dispatch = useAppDispatch();
  const position = useAppSelector(selectContextMenuPosition);
  const onAddNode = useCallback(() => {
    dispatch(addNode({
      meta: {
        id: 'math/plus',
        version: '0.0.1',
      },
      x: position?.x || 0,
      y: position?.y || 0,
    }));
  }, [dispatch, position]);
  return useOpenContextMenu('', [
    {
      type: 'menu',
      label: 'Add Node',
      onClick: onAddNode,
    },
  ]);
};