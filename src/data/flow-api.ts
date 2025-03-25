import { NodeMeta, NodeMetaRef } from "./data-type";
import { AFNode, FlowState, WorkspaceState } from "./flow-type";
import { getGlobalNodeMetas } from "./nodes";
import { getTypeFromData } from "./utils";
import { validateNodeEntryData } from "./validate";

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

export function currentFlow(state: WorkspaceState): FlowState {
  if (state.path.length === 0) {
    return state.main;
  }
  const name = state.path[state.path.length - 1];
  const { id, version } = parsePathName(name);
  const flow = state.embeddedFlows.find(impl => impl.meta.id === id && impl.meta.version === version)?.impl;
  if (!flow) {
    console.error(`Flow ${name} not found, return main flow instead.`);
    return state.main;
  } else {
    return flow;
  }
}

export function getNode(state: FlowState, id: string) {
  return state.nodes.find(node => node.id === id);
}

export function getNodeData(state: FlowState, id: string) {
  return getNode(state, id)?.data;
}

export function getNodeMeta(workspace: WorkspaceState, ref: NodeMetaRef): NodeMeta | undefined {
  const globalNodeMetas = getGlobalNodeMetas();
  const nodeMeta = workspace.embeddedFlows.find(impl => impl.meta.id === ref.id && impl.meta.version === ref.version)?.meta;
  if (nodeMeta && nodeMeta.version === ref.version) {
    return nodeMeta;
  }
  return globalNodeMetas.find(meta => meta.id === ref.id && meta.version === ref.version);
}

function getNodeAndMeta(workspace: WorkspaceState, nodeId: string) {
  const flow = currentFlow(workspace);
  const node = getNode(flow, nodeId);
  if (!node) {
    return {};
  }
  const meta = getNodeMeta(workspace, node.data.meta);
  if (!meta) {
    return {};
  }
  return { node, meta };
}

function getNodeEntryMetaAndData(node: AFNode, meta: NodeMeta, entryName: string, entryType: 'input' | 'output') {
  const entryMetas = entryType === 'input' ? meta.inputs : meta.outputs;
  const entryDatas = entryType === 'input' ? node.data.inputs : node.data.outputs;
  const entryMeta = entryMetas.find(entry => entry.name === entryName);
  const entryData = entryDatas.find(entry => entry.config.name === entryName);
  if (!entryMeta || !entryData) {
    return {};
  }
  return { meta: entryMeta, config: entryData.config, runtime: entryData.runtime };
}

export function setNodeEntryData(workspace: WorkspaceState, nodeId: string, entryId: string, data: unknown) {
  const { node, meta } =  getNodeAndMeta(workspace, nodeId);
  if (!node || !meta) {
    return;
  }
  const { meta: entryMeta, config: entryConfig, runtime: entryRuntime } = getNodeEntryMetaAndData(node, meta, entryId, 'input');
  if (!entryMeta || !entryConfig || !entryRuntime) {
    return;
  }
  if (entryRuntime.data === data) {
    return;
  }
  validateNodeEntryData(data, entryMeta);
  entryRuntime.data = data;
  entryRuntime.ready = true;
  entryRuntime.type = getTypeFromData(data);
}