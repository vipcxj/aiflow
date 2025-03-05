'use client';

import { useOpenContextMenu } from "@/components/context-menu/hook";
import { HTMLProps } from "react";

export const Workspace = ({ children, ...props }: HTMLProps<HTMLDivElement>) => {
  const { onContextMenu } = useOpenContextMenu('test', [
    { type: 'menu', label: 'item1', onClick: () => console.log('item1') },
    { type: 'menu', label: 'item2', onClick: () => console.log('item2') },
    { type: 'menu', label: 'item3', onClick: () => console.log('item3') },
    { type: 'separator' },
    {
      type: 'menu', 
      label: 'item4', 
      onClick: () => console.log('item4'),
      subMenu: {
        title: 'sub-menu',
        items: [
          { type: 'menu', label: 'sub-item1', onClick: () => console.log('sub-item1') },
          { type: 'menu', label: 'sub-item2', onClick: () => console.log('sub-item2') },
          { type: 'menu', label: 'sub-item3', onClick: () => console.log('sub-item3') },
          { type: 'separator' },
          { type: 'menu', label: 'sub-item4', onClick: () => console.log('sub-item4') },
          { 
            type: 'menu', 
            label: 'sub-item5',
            subMenu: {
              title: 'sub-sub-menu',
              items: [
                { type: 'menu', label: 'sub-sub-item1', onClick: () => console.log('sub-sub-item1') },
                { type: 'menu', label: 'sub-sub-item2', onClick: () => console.log('sub-sub-item2') },
                { type: 'menu', label: 'sub-sub-item3', onClick: () => console.log('sub-sub-item3') },
              ],
            }
          },
        ],
      }
    },
  ]);
  return (
    <div onContextMenu={onContextMenu} {...props}>
      { children }
    </div>
  );
};