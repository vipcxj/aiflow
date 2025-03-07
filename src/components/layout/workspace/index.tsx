'use client';

import { useOpenContextMenu } from "@/components/context-menu/hook";
import { HTMLProps } from "react";

export const Workspace = ({ children, ...props }: HTMLProps<HTMLDivElement>) => {
  // const { onContextMenu } = useOpenContextMenu('long test aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', [
  //   { type: 'menu', label: 'item1', onClick: () => console.log('item1') },
  //   { type: 'menu', label: 'item2', onClick: () => console.log('item2') },
  //   { type: 'menu', label: 'item3', onClick: () => console.log('item3') },
  //   { type: 'separator' },
  //   {
  //     type: 'menu', 
  //     label: 'item4', 
  //     onClick: () => console.log('item4'),
  //     subMenu: {
  //       title: 'sub-menu',
  //       items: [
  //         { type: 'menu', label: 'sub-item1', onClick: () => console.log('sub-item1') },
  //         { type: 'menu', label: 'sub-item2', onClick: () => console.log('sub-item2') },
  //         { 
  //           type: 'menu', 
  //           label: 'sub-item3',
  //           subMenu: {
  //             title: 'sub-sub-menu',
  //             items: [
  //               { type: 'menu', label: 'sub-sub-item1', onClick: () => console.log('sub-sub-item1') },
  //               { type: 'menu', label: 'long-sub-sub-item2-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', onClick: () => console.log('sub-sub-item2') },
  //               { type: 'menu', label: 'sub-sub-item3', onClick: () => console.log('sub-sub-item3') },
  //             ],
  //           }
  //         },
  //         { type: 'separator' },
  //         { type: 'menu', label: 'sub-item4', onClick: () => console.log('sub-item4') },
  //         { 
  //           type: 'menu', 
  //           label: 'long-sub-item5-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  //           subMenu: {
  //             items: [
  //               { type: 'menu', label: 'sub-sub-item1', onClick: () => console.log('sub-sub-item1') },
  //               { type: 'menu', label: 'sub-sub-item2', onClick: () => console.log('sub-sub-item2') },
  //               { type: 'menu', label: 'sub-sub-item3', onClick: () => console.log('sub-sub-item3') },
  //               { type: 'menu', label: 'sub-sub-item4', onClick: () => console.log('sub-sub-item4') },
  //               { type: 'menu', label: 'sub-sub-item5', onClick: () => console.log('sub-sub-item5') },
  //               { type: 'menu', label: 'sub-sub-item6', onClick: () => console.log('sub-sub-item6') },
  //               { type: 'menu', label: 'sub-sub-item7', onClick: () => console.log('sub-sub-item7') },
  //               { type: 'menu', label: 'sub-sub-item8', onClick: () => console.log('sub-sub-item8') },
  //               { type: 'menu', label: 'sub-sub-item9', onClick: () => console.log('sub-sub-item9') },
  //               { type: 'menu', label: 'sub-sub-item10', onClick: () => console.log('sub-sub-item10') },
  //               { type: 'menu', label: 'sub-sub-item11', onClick: () => console.log('sub-sub-item11') },
  //               { type: 'menu', label: 'sub-sub-item12', onClick: () => console.log('sub-sub-item12') },
  //               { type: 'menu', label: 'sub-sub-item13', onClick: () => console.log('sub-sub-item13') },
  //               { type: 'menu', label: 'sub-sub-item14', onClick: () => console.log('sub-sub-item14') },
  //               { type: 'menu', label: 'sub-sub-item15', onClick: () => console.log('sub-sub-item15') },
  //               { type: 'menu', label: 'sub-sub-item16', onClick: () => console.log('sub-sub-item16') },
  //               { type: 'menu', label: 'sub-sub-item17', onClick: () => console.log('sub-sub-item17') },
  //               { type: 'menu', label: 'sub-sub-item18', onClick: () => console.log('sub-sub-item18') },
  //               { type: 'menu', label: 'sub-sub-item1', onClick: () => console.log('sub-sub-item1') },
  //               { type: 'menu', label: 'sub-sub-item2', onClick: () => console.log('sub-sub-item2') },
  //               { type: 'menu', label: 'sub-sub-item3', onClick: () => console.log('sub-sub-item3') },
  //               { type: 'menu', label: 'sub-sub-item4', onClick: () => console.log('sub-sub-item4') },
  //               { type: 'menu', label: 'sub-sub-item5', onClick: () => console.log('sub-sub-item5') },
  //               { type: 'menu', label: 'sub-sub-item6', onClick: () => console.log('sub-sub-item6') },
  //               { type: 'menu', label: 'sub-sub-item7', onClick: () => console.log('sub-sub-item7') },
  //               { type: 'menu', label: 'sub-sub-item8', onClick: () => console.log('sub-sub-item8') },
  //               { type: 'menu', label: 'sub-sub-item9', onClick: () => console.log('sub-sub-item9') },
  //               { type: 'menu', label: 'sub-sub-item10', onClick: () => console.log('sub-sub-item10') },
  //               { type: 'menu', label: 'sub-sub-item11', onClick: () => console.log('sub-sub-item11') },
  //               { type: 'menu', label: 'sub-sub-item12', onClick: () => console.log('sub-sub-item12') },
  //               { type: 'menu', label: 'sub-sub-item13', onClick: () => console.log('sub-sub-item13') },
  //               { type: 'menu', label: 'sub-sub-item14', onClick: () => console.log('sub-sub-item14') },
  //               { type: 'menu', label: 'sub-sub-item15', onClick: () => console.log('sub-sub-item15') },
  //               { type: 'menu', label: 'sub-sub-item16', onClick: () => console.log('sub-sub-item16') },
  //               { type: 'menu', label: 'sub-sub-item17', onClick: () => console.log('sub-sub-item17') },
  //               { type: 'menu', label: 'sub-sub-item18', onClick: () => console.log('sub-sub-item18') },
  //               { type: 'menu', label: 'sub-sub-item1', onClick: () => console.log('sub-sub-item1') },
  //               { type: 'menu', label: 'sub-sub-item2', onClick: () => console.log('sub-sub-item2') },
  //               { type: 'menu', label: 'sub-sub-item3', onClick: () => console.log('sub-sub-item3') },
  //               { type: 'menu', label: 'sub-sub-item4', onClick: () => console.log('sub-sub-item4') },
  //               { type: 'menu', label: 'sub-sub-item5', onClick: () => console.log('sub-sub-item5') },
  //               { type: 'menu', label: 'sub-sub-item6', onClick: () => console.log('sub-sub-item6') },
  //               { type: 'menu', label: 'sub-sub-item7', onClick: () => console.log('sub-sub-item7') },
  //               { type: 'menu', label: 'sub-sub-item8', onClick: () => console.log('sub-sub-item8') },
  //               { type: 'menu', label: 'sub-sub-item9', onClick: () => console.log('sub-sub-item9') },
  //               { type: 'menu', label: 'sub-sub-item10', onClick: () => console.log('sub-sub-item10') },
  //               { type: 'menu', label: 'sub-sub-item11', onClick: () => console.log('sub-sub-item11') },
  //               { type: 'menu', label: 'sub-sub-item12', onClick: () => console.log('sub-sub-item12') },
  //               { type: 'menu', label: 'sub-sub-item13', onClick: () => console.log('sub-sub-item13') },
  //               { type: 'menu', label: 'sub-sub-item14', onClick: () => console.log('sub-sub-item14') },
  //               { type: 'menu', label: 'sub-sub-item15', onClick: () => console.log('sub-sub-item15') },
  //               { type: 'menu', label: 'sub-sub-item16', onClick: () => console.log('sub-sub-item16') },
  //               { type: 'menu', label: 'sub-sub-item17', onClick: () => console.log('sub-sub-item17') },
  //               { type: 'menu', label: 'sub-sub-item18', onClick: () => console.log('sub-sub-item18') },
  //             ],
  //           }
  //         },
  //       ],
  //     }
  //   },
  // ]);
  return (
    <div {...props}>
      { children }
    </div>
  );
};