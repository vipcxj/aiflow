'use client';

import { useOpenContextMenu } from "@/components/context-menu/hook";
import { HTMLProps } from "react";

export const Workspace = ({ children, ...props }: HTMLProps<HTMLDivElement>) => {
  const { onContextMenu } = useOpenContextMenu('test', [
    { type: 'menu', label: 'item1', onClick: () => console.log('item1') },
    { type: 'menu', label: 'item2', onClick: () => console.log('item2') },
    { type: 'menu', label: 'item3', onClick: () => console.log('item3') },
  ]);
  return (
    <div onContextMenu={onContextMenu} {...props}>
      { children }
    </div>
  );
};