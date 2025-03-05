'use client';
import { Background, ColorMode, Controls, MiniMap, ReactFlow } from '@xyflow/react'

import '@xyflow/react/dist/style.css';
import { useTheme } from 'next-themes';

export const Flow = () => {
  const { theme } = useTheme(); 
  return (
    <ReactFlow nodes={[]} edges={[]} colorMode={theme as ColorMode}>
      <Controls />
      <MiniMap />
      <Background />
    </ReactFlow>
  );
}