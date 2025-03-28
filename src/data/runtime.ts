import { isAssignNodeData, isBaseNodeData, isCode, isIfNodeData, isNativeNode, isStartNodeData, isSwitchNodeData, isVariableNodeData } from "./data-guard";
import type { BaseNodeData, NativeNodeMeta, NodeData, NodeMeta, NodeMetaRef, SubFlowData, TemplateData } from "./data-type";
import type { AFNodeData, FlowState, SubFlowState, TemplateFlowState, TemplateRef, Variable, WorkspaceState } from "./flow-type";
import { getTypeFromData, isNodeDataReady } from "./utils";
import { evaluate } from '../lib/eval';
import { validateNodeEntryData } from "./validate";
import apis from './apis';
import { getGlobalNodeMetas } from "./nodes";
import { getGlobalTemplates } from "./templates";

export type RuntimeContext = {
  getFlowMeta: () => FlowState;
  getFlowData: () => SubFlowData | undefined;
  getNodeMeta: (ref: NodeMetaRef) => NodeMeta | undefined;
  getTemplate: (ref: TemplateRef) => TemplateFlowState | undefined;
  getVariable: (name: string) => Variable | undefined;
};

export function createRuntimeContext(ws: WorkspaceState, flow: FlowState, flowData?: SubFlowData): RuntimeContext {
  const globalNodeMetas = getGlobalNodeMetas();
  const globalTempaltes = getGlobalTemplates();
  return {
    getFlowMeta: () => flow,
    getFlowData: () => flowData,
    getNodeMeta: (ref: NodeMetaRef) => {
      const nodeMeta = ws.nodes.find(n => n.id === ref.id);
      if (nodeMeta && (!ref.version || nodeMeta.version === ref.version)) {
        return nodeMeta;
      }
      return globalNodeMetas.find(meta => meta.id === ref.id && (!ref.version || meta.version === ref.version));
    },
    getTemplate: (ref: TemplateRef) => {
      const template = ws.templates.find(t => t.id === ref.id);
      if (template && (!ref.version || template.version === ref.version)) {
        return template;
      }
      return globalTempaltes.find(t => t.id === ref.id && (!ref.version || t.version === ref.version));
    },
    getVariable: (name: string) => {
      return flow.variables[name];
    },
  };
}

export type ExecResult = {
  success: false;
  reason: 'not-implemented' | 'not-ready';
} | {
  success: false;
  reason: 'exception';
  error: unknown;
} | {
  success: true;
  infuences: Record<string, unknown>;
};

export type ExecRuntime = {
  meta: NodeMeta;
  args: Record<string, unknown>;
};

export type ExecFunc = (context: ExecRuntime) => Record<string, unknown>;

export function getNodeEntryData(nodeData: AFNodeData, entryId: string, entryType: 'input' | 'output') {
  const entries = entryType === 'input' ? nodeData.inputs : nodeData.outputs;
  return entries.find(e => e.config.name === entryId);
}

function dealWithExecResult(result: Record<string, unknown>, meta: NativeNodeMeta, data: BaseNodeData): ExecResult {
  if (typeof result !== 'object') {
    return { success: false, reason: 'exception', error: 'Result is not an object.' };
  }
  const infuences: Record<string, unknown> = {};
  for (let i = 0; i < meta.outputs.length; i++) {
    const outputMeta = meta.outputs[i];
    if (!(outputMeta.name in result)) {
      return { success: false, reason: 'exception', error: `Output "${outputMeta.name}" is missing.` };
    }
    const value = result[outputMeta.name];
    try {
      validateNodeEntryData(value, outputMeta);
    } catch (error) {
      return { success: false, reason: 'exception', error };
    }
    const outputData = data.outputs[i];
    if (outputData.runtime.data !== value) {
      outputData.runtime.data = value;
      outputData.runtime.ready = true;
      outputData.runtime.type = getTypeFromData(value);
      infuences[outputMeta.name] = value;
    }
  }
  return { success: true, infuences };
}

export function execNode(runtimeContext: RuntimeContext, data: NodeData, execDependencies: boolean = true, language: string = 'js'): ExecResult {
  if (!isNodeDataReady(data)) {
    if (execDependencies) {
      const flowMeta = runtimeContext.getFlowMeta();
      const flowData = runtimeContext.getFlowData();
      const dependencies = getFlowDependencyNodes(flowMeta, data, flowData, true);
      for (const entry of Object.keys(dependencies)) {
        const dependency = dependencies[entry];
        const entryData = getNodeEntryData(dependency.data, dependency.entry, 'output');
        if (!entryData) {
          throw new Error('Entry data not found.');
        }
        const dependentEntryData = getNodeEntryData(data, entry, 'input');
        if (!dependentEntryData) {
          throw new Error('Dependent entry data not found.');
        }
        if (entryData.runtime.ready) {
          dependentEntryData.runtime.data = entryData.runtime.data;
          dependentEntryData.runtime.ready = true;
          dependentEntryData.runtime.type = entryData.runtime.type;
        } else {
          const result = execNode(runtimeContext, dependency.data, true, language);
          if (result.success && entryData.config.name in result.infuences) {
            dependentEntryData.runtime.data = result.infuences[entryData.config.name];
            dependentEntryData.runtime.ready = true;
            dependentEntryData.runtime.type = getTypeFromData(result.infuences[entryData.config.name]);
          } else {
            return { success: false, reason: 'not-ready' };
          }
        }
      }
      if (!isNodeDataReady(data)) {
        return { success: false, reason: 'not-ready' };
      }
    } else {
      return { success: false, reason: 'not-ready' };
    }
  }
  if (isBaseNodeData(data)) {
    const meta = runtimeContext.getNodeMeta(data.meta);
    if (!meta) {
      throw new Error('Node meta is required.');
    }
    if (isNativeNode(meta)) {
      const jsImpl = meta.impls[language];
      if (!jsImpl) {
        return { success: false, reason: 'not-implemented' };
      }
      const context: ExecRuntime = {
        meta,
        args: data.inputs.reduce<Record<string, unknown>>((acc, input) => {
          acc[input.config.name] = input.runtime.data;
          return acc;
        }, {}),
      };
      if (isCode(jsImpl)) {
        try {
          const result = evaluate(jsImpl.code, context) as Record<string, unknown>;
          return dealWithExecResult(result, meta, data);
        } catch (error) {
          return { success: false, reason: 'exception', error };
        }
      } else {
        if (!(jsImpl.ref in apis)) {
          return { success: false, reason: 'not-implemented' };
        }
        const api = (apis as Record<string, ExecFunc>)[jsImpl.ref];
        const result = api(context);
        return dealWithExecResult(result, meta, data);
      }
    } else {
      let templateMeta: TemplateFlowState | undefined;
      if (meta.template) {
        templateMeta = runtimeContext.getTemplate(meta.template);
        if (!templateMeta) {
          throw new Error('Template not found.');
        }
      }
      return execSubFlow(runtimeContext, meta.flow, data.flow, templateMeta, data.template);
    }
  } else if (isIfNodeData(data)) {
    const cond = getNodeEntryData(data, 'condition', 'input');
    const ifTrue = getNodeEntryData(data, 'ifTrue', 'input');
    const ifFalse = getNodeEntryData(data, 'ifFalse', 'input');
    if (!cond || !ifTrue || !ifFalse) {
      throw new Error('Entry condition, ifTrue or ifFalse not found.');
    }
    const output = getNodeEntryData(data, 'output', 'output');
    if (!output) {
      throw new Error('Entry output not found.');
    }
    let result: unknown;
    if (cond.runtime.data) {
      result = ifTrue.runtime.data;
    } else {
      result = ifFalse.runtime.data;
    }
    if (output.runtime.data !== result) {
      output.runtime.data = result;
      output.runtime.ready = true;
      output.runtime.type = getTypeFromData(result);
      return { success: true, infuences: { output: result } };
    } else {
      return { success: true, infuences: {} };
    }
  } else if (isSwitchNodeData(data)) {
    const selector = getNodeEntryData(data, 'selector', 'input');
    if (!selector) {
      throw new Error('Entry selector not found.');
    }
    if (typeof selector.runtime.data !== 'string' && typeof selector.runtime.data !== 'number') {
      throw new Error('Selector must be a string or a number.');
    }
    const isNumber = typeof selector.runtime.data === 'number';
    const defaultCase = getNodeEntryData(data, 'default', 'input');
    if (!defaultCase) {
      throw new Error('Entry default not found.');
    }
    const output = getNodeEntryData(data, 'output', 'output');
    if (!output) {
      throw new Error('Entry output not found.');
    }
    for (const entry of data.inputs) {
      if (entry.config.name.startsWith("case:")) {
        const caseValue = isNumber ? Number(entry.config.name.slice(5)) : entry.config.name.slice(5);
        if (selector?.runtime.data === caseValue) {
          if (output.runtime.data !== entry.runtime.data) {
            output.runtime.data = entry.runtime.data;
            output.runtime.ready = true;
            output.runtime.type = getTypeFromData(entry.runtime.data);
            return { success: true, infuences: { output: entry.runtime.data } };
          } else {
            return { success: true, infuences: {} };
          }
        }
      }
    }
    if (output.runtime.data !== defaultCase.runtime.data) {
      output.runtime.data = defaultCase.runtime.data;
      output.runtime.ready = true;
      output.runtime.type = getTypeFromData(defaultCase.runtime.data);
      return { success: true, infuences: { output: defaultCase.runtime.data } };
    } else {
      return { success: true, infuences: {} };
    }
  } else if (isVariableNodeData(data)) {
    const varName = getNodeEntryData(data, 'variable name', 'input');
    if (!varName) {
      throw new Error('Entry variable name not found.');
    }
    if (typeof varName.runtime.data !== 'string') {
      throw new Error('Variable name must be a string.');
    }
    const variable = runtimeContext.getVariable(varName.runtime.data);
    if (!variable) {
      throw new Error('Variable not found.');
    }
    const output = getNodeEntryData(data, 'output', 'output');
    if (!output) {
      throw new Error('Entry output not found.');
    }
    if (output.runtime.data !== variable.runtime.data) {
      output.runtime.data = variable.runtime.data;
      output.runtime.ready = true;
      output.runtime.type = variable.runtime.type;
      return { success: true, infuences: { output: variable.runtime.data } };
    } else {
      return { success: true, infuences: {} };
    }
  } else if (isAssignNodeData(data)) {
    const varName = getNodeEntryData(data, 'variable name', 'input');
    if (!varName) {
      throw new Error('Entry variable name not found.');
    }
    if (typeof varName.runtime.data !== 'string') {
      throw new Error('Variable name must be a string.');
    }
    const value = getNodeEntryData(data, 'value', 'input');
    if (!value) {
      throw new Error('Entry value not found.');
    }
    const variable = runtimeContext.getVariable(varName.runtime.data);
    if (!variable) {
      throw new Error('Variable not found.');
    }
    const output = getNodeEntryData(data, 'output', 'output');
    if (!output) {
      throw new Error('Entry output not found.');
    }
    if (variable.runtime.data !== value.runtime.data || output.runtime.data !== value.runtime.data) {
      variable.runtime.data = value.runtime.data;
      variable.runtime.ready = true;
      variable.runtime.type = getTypeFromData(value.runtime.data);
      output.runtime.data = value.runtime.data;
      output.runtime.ready = true;
      output.runtime.type = getTypeFromData(value.runtime.data);
      return { success: true, infuences: { output: value.runtime.data } };
    } else {
      return { success: true, infuences: {} };
    }
  } else {
    return { success: false, reason: 'not-implemented' };
  }
}

function getStartNodes(flowMeta: SubFlowState, flowData?: SubFlowData): AFNodeData[] {
  const startIds: string[] = [];
  for (let i = 0; i < flowMeta.nodes.length; i++) {
    const node = flowMeta.nodes[i];
    const data = flowData?.nodes[i] || node.data;
    if (isStartNodeData(data)) {
      startIds.push(node.id);
    }
  }
  if (startIds.length === 0) {
    return [];
  }
  const nodeIds: string[] = [];
  for (const edge of flowMeta.edges) {
    if (startIds.indexOf(edge.source) !== -1) {
      nodeIds.push(edge.target);
    }
  }
  return nodeIds.map(id => getFlowNodeById(flowMeta, id, flowData)).filter(v => !!v);
}

type InfluncedNodeData = {
  entry: string;
  data: AFNodeData;
}

function getFlowDependencyNodes(meta: FlowState, nodeData: AFNodeData, data?: SubFlowData, onlyNotReady: boolean = true): Record<string, InfluncedNodeData> {
  const inputs = nodeData.inputs.filter(entry => (!onlyNotReady || !entry.runtime.ready)).map(entry => entry.config.name);
  if (inputs.length === 0) {
    return {};
  }
  const result: Record<string, InfluncedNodeData> = {};
  for (const edge of meta.edges) {
    if (edge.target === nodeData.id && edge.targetHandle && inputs.indexOf(edge.targetHandle) !== -1) {
      const node = getFlowNodeById(meta, edge.source, data);
      if (node) {
        result[edge.targetHandle] = {
          entry: edge.sourceHandle!,
          data: node,
        };
      }
    }
  }
  return result;
}

function getFlowNodeById(meta: FlowState, id: string, data?: SubFlowData): AFNodeData | undefined {
  for (let i = 0; i < meta.nodes.length; i++) {
    const node = meta.nodes[i];
    if (node.id === id) {
      return data?.nodes[i] || node.data;
    }
  }
  return undefined;
}

function getFlowNodeByInflunce(meta: SubFlowState, nodeId: string, influnces: string[], data?: SubFlowData): Record<string, InfluncedNodeData> {
  const result: Record<string, InfluncedNodeData> = {};
  for (const edge of meta.edges) {
    if (edge.source === nodeId && edge.sourceHandle && influnces.indexOf(edge.sourceHandle) !== -1) {
      const nodeData = getFlowNodeById(meta, edge.target, data);
      if (nodeData) {
        result[edge.sourceHandle] = {
          entry: edge.targetHandle!,
          data: nodeData,
        }
      }
    }
  }
  return result;
}

export function execSubFlow(runtimeContext: RuntimeContext, meta: SubFlowState, data?: SubFlowData, templateMeta?: TemplateFlowState, templateData?: TemplateData): ExecResult {
  if (templateMeta) {

  } else {
    const startNodeDatas = getStartNodes(meta, data);
    if (startNodeDatas.length === 0) {
      return { success: true, infuences: {} };
    }
    let currentNodes: AFNodeData[] = startNodeDatas;
    let nextNodes: AFNodeData[];
    do {
      nextNodes = [];
      for (const nodeData of currentNodes) {
        const result = execNode(runtimeContext, nodeData);
        if (!result.success) {
          return result;
        }
        const influncedEntries = Object.keys(result.infuences);
        const influnceds = getFlowNodeByInflunce(meta, nodeData.id, influncedEntries, data);
        for (const influnce of influncedEntries) {
          const influnced = influnceds[influnce];
          if (influnced) {
            const entryData = getNodeEntryData(influnced.data, influnced.entry, 'input');
            if (!entryData) {
              return { success: false, reason: 'exception', error: 'Entry data not found.' };
            }
            if (entryData.runtime.data !== result.infuences[influnce]) {
              entryData.runtime.data = result.infuences[influnce];
              entryData.runtime.ready = true;
              entryData.runtime.type = getTypeFromData(result.infuences[influnce]);
              nextNodes.push(influnced.data);
            }
          }
        }
      }
      currentNodes = nextNodes;
    } while (nextNodes.length > 0);
  }
}