import { useOpenContextMenu } from "../context-menu/hook";

export const useGroundContextMenu = () => {
  return useOpenContextMenu('', [
    {
      type: 'menu',
      label: 'Add Node',
    },
  ]);
};