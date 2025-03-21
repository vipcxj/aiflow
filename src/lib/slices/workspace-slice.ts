/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createHistoryAdapter } from 'history-adapter/redux';
import type {
  NodeChange,
  EdgeChange,
  Connection, 
} from '@xyflow/react';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as addAFEdge,
} from '@xyflow/react';
import type { NodeData, NodeMeta, NodeMetaRef } from '@/data/data-type';
import type { AFNode, AFEdge } from '@/data/flow-type';
import { createNode } from '@/data/utils';
import { globalNodeMetas } from '@/data/nodes';
import { useAppDispatch } from '../hooks';
import { useEffect } from 'react';
import { 
  isNormalizedUnionNodeEntryType, 
  isNodeEntrySimpleTypeSupportInput 
} from '@/data/guard';

export type FlowState = {
  nodes: AFNode[];
  edges: AFEdge[];
};

export type EmbeddedNodeImpl = {
  meta: NodeMeta;
  impl: FlowState;
}

function getNode(state: FlowState, id: string) {
  return state.nodes.find(node => node.id === id);
}

function getNodeData(state: FlowState, id: string) {
  return getNode(state, id)?.data;
}

function getNodeEntryData(node: NodeData, name: string, type: 'input' | 'output') {
  const entries = type === 'input' ? node.inputs : node.outputs;
  return entries.find(entry => entry.config.name === name);
}

function getNodeEntryMetaAndData(nodeMeta: NodeMeta, nodeData: NodeData, name: string, type: 'input' | 'output') {
  const entryMeta = type === 'input' ? nodeMeta.inputs.find(entry => entry.name === name) : nodeMeta.outputs.find(entry => entry.name === name);
  const entryData = type === 'input' ? nodeData.inputs.find(entry => entry.config.name === name) : nodeData.outputs.find(entry => entry.config.name === name);
  return entryMeta && entryData && { entryMeta, entryData };
}

export type WorkspaceState = {
  id: string;
  nextNodeId: number;
  nextEdgeId: number;
  title: string;
  filePath: string;
  main: FlowState;
  embeddedNodeImpls: EmbeddedNodeImpl[];
  path: string[];
  dirty: boolean;
};

export type WorkspacesState = {
  nextWSId: number;
  current: string;
  workspaces: WorkspaceState[];
  nodeMetas: NodeMeta[];
};

function createEmptyFlow(): FlowState {
  return {
    nodes: [],
    edges: [],
  };
}

export function getNodeMeta(workspace: WorkspaceState, globalNodeMetas: NodeMeta[], ref: NodeMetaRef): NodeMeta | undefined {
  const nodeMeta = workspace.embeddedNodeImpls.find(impl => impl.meta.id === ref.id && impl.meta.version === ref.version)?.meta;
  if (nodeMeta && nodeMeta.version === ref.version) {
    return nodeMeta;
  }
  return globalNodeMetas.find(meta => meta.id === ref.id && meta.version === ref.version);
}

const workspacesAdapter = createHistoryAdapter<WorkspacesState>({ limit: 20 });
const { selectPresent, ...historySelectors } = workspacesAdapter.getSelectors();

const rawInitialState: WorkspacesState = {
  nextWSId: 1,
  current: 'ws-0',
  workspaces: [{
    id: 'ws-0',
    nextNodeId: 0,
    nextEdgeId: 0,
    title: 'Untitled-1',
    filePath: '',
    main: createEmptyFlow(),
    embeddedNodeImpls: [],
    path: [],
    dirty: false,
  }],
  nodeMetas: globalNodeMetas,
};

export const initialState = workspacesAdapter.getInitialState(rawInitialState);

type PayloadSetNodeEntryData = {
  nodeId: string;
  entryId: string;
  type: 'input' | 'output';
  data: any;
};

type PayloadAddNewNode = {
  meta: NodeMetaRef;
  x: number;
  y: number;
};

function currentWorkspace(state: WorkspacesState) {
  return state.workspaces.find(ws => ws.id === state.current)!;
}

function parsePathName(name: string): { id: string, version: string } {
  const lastPipeIndex = name.lastIndexOf('|');
  
  // 如果没有找到 '|' 字符，返回默认值
  if (lastPipeIndex === -1) {
    return { id: name, version: '' };
  }
  
  // 根据最后一个 '|' 分割字符串
  const id = name.substring(0, lastPipeIndex);
  const version = name.substring(lastPipeIndex + 1);
  
  return { id, version };
}

function currentFlow(state: WorkspaceState): FlowState {
  if (state.path.length === 0) {
    return state.main;
  }
  const name = state.path[state.path.length - 1];
  const { id, version } = parsePathName(name);
  const flow = state.embeddedNodeImpls.find(impl => impl.meta.id === id && impl.meta.version === version)?.impl;
  if (!flow) {
    console.error(`Flow ${name} not found, return main flow instead.`);
    return state.main;
  } else {
    return flow;
  }
}

function currentFlowFromWS(state: WorkspacesState): FlowState {
  return currentFlow(currentWorkspace(state));
}

function markDirty(state: WorkspacesState, dirty: boolean) {
  currentWorkspace(state).dirty = dirty;
}

// 生成唯一的标题
function generateUniqueTitle(workspaces: WorkspaceState[]): string {
  let counter = 1;
  let title = `Untitled-${counter}`;

  while (workspaces.some(ws => ws.title === title)) {
    counter++;
    title = `Untitled-${counter}`;
  }

  return title;
}

const __newWorkspace = (state: WorkspacesState): void => {
  const title = generateUniqueTitle(state.workspaces);
  const id = `ws-${state.nextWSId++}`;
  state.workspaces.push({
    id,
    nextNodeId: 0,
    nextEdgeId: 0,
    title,
    filePath: '',
    main: createEmptyFlow(),
    embeddedNodeImpls: [],
    path: [],
    dirty: false,
  });
  state.current = id;
};

const _newWorkspace = workspacesAdapter.undoableReducer(__newWorkspace);

const __closeWorkspace = (state: WorkspacesState, action: PayloadAction<string>): void => {
  const index = state.workspaces.findIndex(ws => ws.id === action.payload);
  if (index === -1) {
    return;
  }
  state.workspaces.splice(index, 1);
  if (state.workspaces.length === 0) {
    __newWorkspace(state);
  }
  if (state.current === action.payload) {
    state.current = state.workspaces[0].id;
  }
};

const _closeWorkspace = workspacesAdapter.undoableReducer(__closeWorkspace);

const __setCurrentWorkspace = (state: WorkspacesState, action: PayloadAction<string>): void => {
  if (state.workspaces.some(ws => ws.id === action.payload)) {
    state.current = action.payload;
  }
};

const _setCurrentWorkspace = workspacesAdapter.undoableReducer(__setCurrentWorkspace);

const _addNode = workspacesAdapter.undoableReducer((state: WorkspacesState, action: PayloadAction<PayloadAddNewNode>): void => {
  const workspace = currentWorkspace(state);
  const flow = currentFlow(workspace);
  const nodeMeta = getNodeMeta(workspace, state.nodeMetas, action.payload.meta);
  if (!nodeMeta) {
    return;
  }
  const id = `node-${workspace.nextNodeId++}`;
  const node = createNode(id, nodeMeta, action.payload.x, action.payload.y);
  flow.nodes.push(node);
  markDirty(state, true);
});

const _removeNode = workspacesAdapter.undoableReducer((state: WorkspacesState, action: PayloadAction<string>) => {
  const flow = currentFlowFromWS(state);
  const index = flow.nodes.findIndex(node => node.id === action.payload);
  if (index === -1) {
    return;
  }
  flow.nodes.splice(index, 1);
  flow.edges = flow.edges.filter(edge => {
    return edge.source !== action.payload && edge.target !== action.payload;
  });
  markDirty(state, true);
});

const _setNodeEntryData = workspacesAdapter.undoableReducer((state: WorkspacesState, action: PayloadAction<PayloadSetNodeEntryData>) => {
  const flow = currentFlowFromWS(state);
  const node = getNodeData(flow, action.payload.nodeId);
  if (!node) {
    return;
  }
  const entry = getNodeEntryData(node, action.payload.entryId, action.payload.type);
  if (entry && entry.config.mode === 'input') {
    entry.runtime.data = action.payload.data;
  }
  markDirty(state, true);
});

const _switchNodeEntryMode = workspacesAdapter.undoableReducer((state: WorkspacesState, action: PayloadAction<{ nodeId: string, entryId: string }>) => {
  const workspace = currentWorkspace(state);
  const flow = currentFlow(workspace);
  const nodeData = getNodeData(flow, action.payload.nodeId);
  if (!nodeData) {
    console.error(`Node ${action.payload.nodeId} not found`);
    return;
  }
  const nodeMeta = getNodeMeta(workspace, state.nodeMetas, nodeData.meta);
  if (!nodeMeta) {
    console.error(`NodeMeta of node ${nodeData.meta.id}-${nodeData.meta.version} not found`);
    return;
  }
  const entryMetaAndData = getNodeEntryMetaAndData(nodeMeta, nodeData, action.payload.entryId, 'input');
  if (!entryMetaAndData) {
    console.error(`Entry ${action.payload.nodeId}.${action.payload.entryId} not found`);
    return;
  }
  const { entryMeta, entryData } = entryMetaAndData;
  let changed = false;
  if (entryData.config.mode === 'handle') {
    if (isNormalizedUnionNodeEntryType(entryMeta.type)) {
      for (let i = 0; i < entryMeta.type.length; i++) {
        const type = entryMeta.type[i];
        if (isNodeEntrySimpleTypeSupportInput(type)) {
          changed = true;
          entryData.config.mode = 'input';
          entryData.config.modeIndex = i;
          break;
        }
      }
    } else if (isNodeEntrySimpleTypeSupportInput(entryMeta.type)) {
      changed = true;
      entryData.config.mode = 'input';
      entryData.config.modeIndex = 0;
    }
    if (changed) {
      flow.edges = flow.edges.filter(edge => {
        return (edge.source !== action.payload.nodeId && edge.target !== action.payload.nodeId)
         || (edge.source === action.payload.nodeId && edge.sourceHandle !== action.payload.entryId)
         || (edge.target === action.payload.nodeId && edge.targetHandle !== action.payload.entryId);
      });
    }
  } else {
    if (isNormalizedUnionNodeEntryType(entryMeta.type)) {
      const modeIndex = entryData.config.modeIndex;
      let firstIndex = -1;
      let foundPrev = modeIndex < 0;
      let foundCur = false;
      for (let i = 0; i < entryMeta.type.length; i++) {
        const type = entryMeta.type[i];
        if (isNodeEntrySimpleTypeSupportInput(type)) {
          if (firstIndex === -1) {
            firstIndex = i;
          }
          if (foundPrev) {
            foundCur = true;
            changed = true;
            entryData.config.mode = 'input';
            entryData.config.modeIndex = i;
            break;
          } else if (modeIndex === i) {
            foundPrev = true;
          }
        }
      }
      if (!foundCur) {
        if (entryMeta.disableHandle) {
          changed = true;
          entryData.config.mode = 'input';
          entryData.config.modeIndex = firstIndex;
        } else {
          changed = true;
          entryData.config.mode = 'handle';
          entryData.config.modeIndex = -1;
        }
      }
    } else if (!entryMeta.disableHandle) {
      changed = true;
      entryData.config.mode = 'handle';
      entryData.config.modeIndex = -1;
    } else {
      changed = true;
      entryData.config.mode = 'input';
      entryData.config.modeIndex = 0;
    }
  }
  if  (changed) {
    markDirty(state, true);
  }
});

const _addEdge = workspacesAdapter.undoableReducer((state: WorkspacesState, action: PayloadAction<Connection>) => {
  const workspace = currentWorkspace(state);
  const flow = currentFlow(workspace);
  const id = `edge-${workspace.nextEdgeId++}`;
  flow.edges = addAFEdge({
    id,
    ...action.payload,
  }, flow.edges);
  markDirty(state, true);
});

const _setNodes = workspacesAdapter.undoableReducer((state: WorkspacesState, action: PayloadAction<AFNode[]>) => {
  const flow = currentFlowFromWS(state);
  flow.nodes = action.payload;
  markDirty(state, true);
});

const _setEdges = workspacesAdapter.undoableReducer((state: WorkspacesState, action: PayloadAction<AFEdge[]>) => {
  const flow = currentFlowFromWS(state);
  flow.edges = action.payload;
  markDirty(state, true);
});

const _applyNodesChange = workspacesAdapter.undoableReducer((state: WorkspacesState, action: PayloadAction<NodeChange<AFNode>[]>) => {
  const flow = currentFlowFromWS(state);
  flow.nodes = applyNodeChanges(action.payload, flow.nodes);
  markDirty(state, true);
});

const _applyEdgesChange = workspacesAdapter.undoableReducer((state: WorkspacesState, action: PayloadAction<EdgeChange<AFEdge>[]>) => {
  const flow = currentFlowFromWS(state);
  flow.edges = applyEdgeChanges(action.payload, flow.edges);
  markDirty(state, true);
});

export const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: (create) => ({
    newWorkspace: create.reducer(_newWorkspace),
    closeWorkspace: create.reducer<string>(_closeWorkspace),
    setCurrentWorkspace: create.reducer<string>(_setCurrentWorkspace),
    addNode: create.reducer<PayloadAddNewNode>(_addNode),
    removeNode: create.reducer<string>(_removeNode),
    setNodeEntryData: create.reducer<PayloadSetNodeEntryData>(_setNodeEntryData),
    switchNodeEntryMode: create.reducer<{ nodeId: string, entryId: string }>(_switchNodeEntryMode),
    addEdge: create.reducer<Connection>(_addEdge),
    setNodes: create.reducer<AFNode[]>(_setNodes),
    setEdges: create.reducer<AFEdge[]>(_setEdges),
    applyNodesChange: create.preparedReducer(
      (changes: NodeChange<AFNode>[]) => {
        if (changes.length === 1) {
          const change = changes[0];
          if (change.type === 'position') {
            return { payload: changes, meta: { undoable: !change.dragging } };
          } else if (change.type === 'dimensions') {
            return { payload: changes, meta: { undoable: !change.resizing } };
          } else {
            return { payload: changes };
          }
        } else {
          return { payload: changes };
        }
      },
      _applyNodesChange,
    ),
    applyEdgesChange: create.reducer<EdgeChange<AFEdge>[]>(_applyEdgesChange),
    undo: workspacesAdapter.undo,
    redo: workspacesAdapter.redo,
    clearHistory: workspacesAdapter.clearHistory,
    reset: create.reducer(() => initialState),
  }),
  selectors: {
    ...historySelectors,
    selectWorkspaces: (state) => selectPresent(state).workspaces,
    selectCurrentWorkspaceId: (state) => selectPresent(state).current,
    selectCurrentWorkspace: (state) => currentWorkspace(selectPresent(state)),
    selectCurrentFlow: (state) => currentFlowFromWS(selectPresent(state)),
    selectNodes: (state) => currentFlowFromWS(selectPresent(state)).nodes,
    selectEdges: (state) => currentFlowFromWS(selectPresent(state)).edges,
    selectGlobalNodeMetas: (state) => selectPresent(state).nodeMetas,
  },
});

export const {
  newWorkspace,
  closeWorkspace,
  setCurrentWorkspace,
  addNode,
  removeNode,
  setNodeEntryData,
  switchNodeEntryMode,
  addEdge,
  setNodes,
  setEdges,
  applyNodesChange,
  applyEdgesChange,
  undo,
  redo,
  clearHistory,
  reset,
} = flowSlice.actions;
export const {
  selectWorkspaces,
  selectCurrentWorkspaceId,
  selectCurrentWorkspace,
  selectCurrentFlow,
  selectNodes,
  selectEdges,
  selectGlobalNodeMetas,
} = flowSlice.selectors;

export const useUndo = () => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const handleUndo = (e: KeyboardEvent) => {
      if (e.key === 'z' && e.ctrlKey) {
        dispatch(undo());
      }
    };
    window.addEventListener('keydown', handleUndo);
    return () => {
      window.removeEventListener('keydown', handleUndo);
    };
  }, [dispatch]);
} 

export const useRedo = () => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const handleRedo = (e: KeyboardEvent) => {
      if (e.key === 'y' && e.ctrlKey) {
        dispatch(redo());
      }
    };
    window.addEventListener('keydown', handleRedo);
    return () => {
      window.removeEventListener('keydown', handleRedo);
    };
  }, [dispatch]);
}