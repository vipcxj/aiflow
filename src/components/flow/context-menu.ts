import { useAppDispatch } from "@/lib/hooks";
import { addNode } from '@/lib/slices/workspace-slice';
import { useOpenContextMenu } from "../context-menu/hook";
import { useCallback } from "react";
import { ContextMenuItemMenu, ContextMenuState } from "../context-menu/type";
import { useReactFlow } from "@xyflow/react";
import { NodeMetaTree, useNodeMetaTree, VersionedNodeMetas } from "./hooks";
import { compareVersions } from "@/data/version";
import { NodeMeta } from "@/data/data-type";

function createAddNodeMenu(nodeMetaTree: NodeMetaTree, onClick: (data: unknown, menu: ContextMenuState) => void): ContextMenuState {
  const items: ContextMenuState['items'] = [];
  for (const key in nodeMetaTree) {
    if (key.startsWith('[d]')) {
      const realKey = key.slice(3);
      const subTree = nodeMetaTree[key] as NodeMetaTree;
      items.push({
        type: 'menu',
        label: realKey,
        subMenu: createAddNodeMenu(subTree, onClick),
      });
    } else { // key.startsWith('[m]')
      const realKey = key.slice(3);
      const versionedNodeMetas = nodeMetaTree[key] as VersionedNodeMetas;
      const versions = Object.keys(versionedNodeMetas);
      if (versions.length > 0) {
        if (versions.length === 1) {
          items.push({
            type: 'menu',
            label: realKey,
            data: versionedNodeMetas[versions[0]],
            onClick,
          } as ContextMenuItemMenu);
        } else {
          items.push({
            type: 'menu',
            label: realKey,
            subMenu: {
              items: versions.map(version => {
                const nodeMeta = versionedNodeMetas[version];
                return {
                  type: 'menu',
                  label: version,
                  data: nodeMeta,
                  onClick,
                } as ContextMenuItemMenu;
              }).sort((a, b) => compareVersions(a.label, b.label)),
            },
          });
        }
      }
    }
  }
  return {
    items,
  };
}

const useAddNodeMenu = () => {
  const nodeMetaTree = useNodeMetaTree();
  const dispatch = useAppDispatch();
  const reactFlow = useReactFlow();
  const onMenuClick = useCallback((data: unknown, menuState: ContextMenuState) => {
    const nodeMeta = data as NodeMeta;
    const position = menuState.position || { x: 0, y: 0 };
    const { x, y } = reactFlow.screenToFlowPosition(position);
    dispatch(addNode({
      meta: {
        id: nodeMeta.id,
        version: nodeMeta.version,
      },
      x,
      y,
    }));
  }, [dispatch, reactFlow.screenToFlowPosition]);
  return createAddNodeMenu(nodeMetaTree, onMenuClick);
};

export const useGroundContextMenu = () => {
  const addNodeMenu = useAddNodeMenu();
  return useOpenContextMenu('', [
    {
      type: 'menu',
      label: 'Add Node',
      subMenu: addNodeMenu,
    },
  ]);
};