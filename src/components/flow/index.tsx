'use client';
import { Background, ColorMode, Controls, EdgeChange, MiniMap, NodeChange, OnConnect, ReactFlow } from '@xyflow/react'
import { selectNodes, selectEdges, applyNodesChange, applyEdgesChange, removeNode, addEdge } from '@/lib/slices/workspace-slice';

import '@xyflow/react/dist/base.css';
import './index.css';
import { useTheme } from 'next-themes';
import { useGroundContextMenu } from './context-menu';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { AFEdge, AFNode } from '@/data/flow-type';
import { MouseEvent, useCallback } from 'react';
import { BaseNode } from './node';
import { useContextMenuItemsEnchancer, useOpenContextMenu } from '../context-menu/hook';
import { ContextMenuItemMenu } from '../context-menu/type';

const AFReactFlow = ReactFlow<AFNode, AFEdge>;

const nodeTypes = {
  default: BaseNode,
};

export const Flow = () => {
  const nodes = useAppSelector(selectNodes);
  const edges = useAppSelector(selectEdges);
  const dispatch = useAppDispatch();
  const { onContextMenu } = useGroundContextMenu();
  const enchancer = useContextMenuItemsEnchancer<AFNode>((_items, node) => {
    const removeNodeMenu: ContextMenuItemMenu<AFNode> = {
      type: 'menu',
      label: 'Delete',
      data: node,
      onClick: (node) => {
        if (!node) return;
        dispatch(removeNode(node.id));
      },
    };
    return [removeNodeMenu as ContextMenuItemMenu<unknown>];
  }, [dispatch, removeNode]);
  const { onContextMenu: _onNodeContextMenu } = useOpenContextMenu('', [], enchancer);
  const onNodeContextMenu = useCallback((e: MouseEvent, node: AFNode) => {
    enchancer.context = node;
    _onNodeContextMenu(e);
  }, [_onNodeContextMenu, enchancer]);
  const onNodesChange = useCallback((changes: NodeChange<AFNode>[]) => {
    dispatch(applyNodesChange(changes));
  }, [dispatch, applyNodesChange]);
  const onEdgesChange = useCallback((changes: EdgeChange<AFEdge>[]) => {
    dispatch(applyEdgesChange(changes));
  }, [dispatch, applyEdgesChange]);
  const onConnect: OnConnect = useCallback((params) => {
    dispatch(addEdge(params));
  }, []);

  const { theme } = useTheme();
  return (
    <AFReactFlow
      onContextMenu={onContextMenu}
      onNodeContextMenu={onNodeContextMenu}
      nodes={nodes}
      onNodesChange={onNodesChange}
      edges={edges}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      colorMode={theme as ColorMode}
    >
      <Controls />
      <MiniMap />
      <Background />
    </AFReactFlow>
  );
}