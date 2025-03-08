'use client';
import { Background, ColorMode, Controls, EdgeChange, MiniMap, NodeChange, ReactFlow } from '@xyflow/react'
import { selectNodes, selectEdges, applyNodesChange, applyEdgesChange } from '@/lib/slices/workspace-slice';

import '@xyflow/react/dist/style.css';
import { useTheme } from 'next-themes';
import { useGroundContextMenu } from './context-menu';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { AFEdge, AFNode } from '@/data/flow-type';
import { useCallback } from 'react';

const AFReactFlow = ReactFlow<AFNode, AFEdge>;

export const Flow = () => {
  const { onContextMenu } = useGroundContextMenu();
  const nodes = useAppSelector(selectNodes);
  const edges = useAppSelector(selectEdges);
  const dispatch = useAppDispatch();
  const onNodesChange = useCallback((changes: NodeChange<AFNode>[]) => {
    dispatch(applyNodesChange(changes));
  }, [dispatch, applyNodesChange]);
  const onEdgesChange = useCallback((changes: EdgeChange<AFEdge>[]) => {
    dispatch(applyEdgesChange(changes));
  }, [dispatch, applyEdgesChange]);

  const { theme } = useTheme(); 
  return (
    <AFReactFlow
      onContextMenu={onContextMenu} 
      nodes={nodes}
      onNodesChange={onNodesChange}
      edges={edges}
      onEdgesChange={onEdgesChange}
      colorMode={theme as ColorMode}
    >
      <Controls />
      <MiniMap />
      <Background />
    </AFReactFlow>
  );
}