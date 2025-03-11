import { useAppDispatch } from "@/lib/hooks";
import { addNode } from '@/lib/slices/workspace-slice';
import { useOpenContextMenu } from "../context-menu/hook";
import { useCallback } from "react";
import { ContextMenuState } from "../context-menu/type";
import { useReactFlow } from "@xyflow/react";

export const useGroundContextMenu = () => {
  const dispatch = useAppDispatch();
  const reactFlow = useReactFlow();
  const onAddNode = useCallback((_data: any, menuState: ContextMenuState) => {
    const position = menuState.position || { x: 0, y: 0 };
    const { x, y } = reactFlow.screenToFlowPosition(position);
    dispatch(addNode({
      meta: {
        id: 'math/plus',
        version: '0.0.1',
      },
      x,
      y,
    }));
  }, [dispatch, reactFlow.screenToFlowPosition]);
  return useOpenContextMenu('', [
    {
      type: 'menu',
      label: 'Add Node',
      onClick: onAddNode,
    },
  ]);
};