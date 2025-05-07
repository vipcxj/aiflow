import { isCode } from "./data-guard";
import type { NormalizedNodeEntryType } from "./data-type";
import type {
  FlowState,
  FlowData, FlowConfigData, FlowRuntimeData,
  TemplateFlowState,
  TemplateRef,
  Variable,
  WorkspaceState,
} from "./flow-type";
import { getTypeFromData } from "./utils";
import { evaluate } from '../lib/eval';
import { ValError, validateNodeEntryData } from "./validate";
import apis from './apis';
import typeApis from './type-apis';
import { getGlobalNodeMetas } from "./nodes";
import { getGlobalTemplates } from "./templates";
import { mustNodeEntryTypeAssignTo } from "./assignable";
import type {
  CompoundNodeMeta,
  EdgeData,
  ExceptionError,
  InputNodeEntryConfig,
  InputNodeEntryConfigData,
  InputNodeEntryData,
  InputNodeEntryRuntimeData,
  NodeConfigData,
  NodeData,
  NodeEntry,
  NodeEntryRuntime,
  NodeMeta,
  NodeMetaRef,
  NodeRuntimeData,
  OutputNodeEntryConfig,
  OutputNodeEntryConfigData,
  OutputNodeEntryData,
  OutputNodeEntryRuntimeData,
  ValidateError
} from "./node-type";
import { compareNodeEntryType } from "./compare";
import { RecommandLevel } from "./enum";

type NodeDataPair = {
  config: NodeConfigData;
  runtime: NodeRuntimeData;
};
type GeneralNodeData = NodeData | NodeDataPair;

type GeneralNodePair = {
  meta: NodeMeta;
  data: GeneralNodeData;
};

type InputNodeEntryDataPair = {
  config: InputNodeEntryConfigData;
  runtime: InputNodeEntryRuntimeData;
};
type OutputNodeEntryDataPair = {
  config: OutputNodeEntryConfigData;
  runtime: OutputNodeEntryRuntimeData;
};

type FlowDataPair = {
  config: FlowConfigData,
  runtime: FlowRuntimeData,
};
type GeneralFlowData = FlowData | FlowDataPair;

export type RuntimeContext = {
  getFlowMeta: () => FlowState;
  getFlowData: () => GeneralFlowData;
  getNodeMeta: (ref: NodeMetaRef) => NodeMeta | undefined;
  getTemplate: (ref: TemplateRef) => TemplateFlowState | undefined;
  variables: Record<string, Variable>;
};

export class NotImplemented extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplemented';
    Object.setPrototypeOf(this, NotImplemented.prototype);
  }
}

function _currentFlowMeta(ws: WorkspaceState): FlowState {
  const route = ws.routeStack[ws.routeStack.length - 1];
  let flow: FlowState | undefined = ws.subFlows.find(f => f.id === route);
  if (flow) {
    return flow;
  } else {
    flow = ws.templates.find(t => t.id === route);
    if (flow) {
      return flow;
    } else {
      throw new Error(`Flow ${route} not found.`);
    }
  }
}

export function currentFlowMeta(ws: WorkspaceState): FlowState {
  if (ws.type === 'app') {
    if (ws.routeStack.length === 0) {
      return ws.main;
    } else {
      return _currentFlowMeta(ws);
    }
  } else {
    if (ws.routeStack.length === 0) {
      throw new Error('No route stack.');
    }
    return _currentFlowMeta(ws);
  }
}

export function createRuntimeContext(ws: WorkspaceState, flowMeta: FlowState, flowData?: FlowData): RuntimeContext {
  const globalNodeMetas = getGlobalNodeMetas();
  const globalTempaltes = getGlobalTemplates();
  return {
    getFlowMeta: () => flowMeta,
    getFlowData: () => flowData,
    getNodeMeta: (ref: NodeMetaRef) => {
      const nodeMeta = ws.subFlows.find(n => n.id === ref.id);
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
    variables: flowMeta.variables,
  };
}

export type TypeRuntime = {
  meta: NodeMeta;
  args: Record<string, NormalizedNodeEntryType>;
  vars: Record<string, Variable>;
  makeNotReady: () => NotReady;
  makeNotImplemented: () => NotImplemented;
}

export type TypeFunc = (context: TypeRuntime) => Record<string, NormalizedNodeEntryType>;

export function createTypeRuntime(runtime: RuntimeContext, meta: NodeMeta, data: GeneralNodeData): TypeRuntime {
  const args: TypeRuntime['args'] = {};
  for (const { meta: entryMeta, data: entryData } of nodeInputs(meta, data)) {
    const entryRuntime = getEntryDataRuntime(entryData);
    if (entryRuntime.state === 'data-ready' || entryRuntime.state === 'type-ready') {
      args[entryMeta.name] = entryRuntime.type;
    }
  }
  return {
    meta,
    args,
    vars: runtime.variables,
    makeNotReady: () => new NotReady(),
    makeNotImplemented: () => new NotImplemented('Not implemented.'),
  };
}

function do_assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export type ExecResult = {
  success: false;
  reason: 'unavailable';
} | {
  success: false;
  reason: 'validate-failed';
  error: ValidateError[];
} | {
  success: false;
  reason: 'exception';
  error: ExceptionError;
} | {
  success: 'data-ready';
  infuences: Record<string, unknown>;
} | {
  success: 'type-ready';
  infuences: Record<string, NormalizedNodeEntryType>;
};

export class NotReady {
  constructor() {
    Object.setPrototypeOf(this, NotReady.prototype);
  }
}

export type ExecRuntime = {
  meta: NodeMeta;
  args: Record<string, unknown>;
  vars: Record<string, Variable>;
  makeNotReady: () => NotReady;
  makeNotImplemented: () => NotImplemented;
};

export function createExecRuntime(runtime: RuntimeContext, meta: NodeMeta, data: GeneralNodeData): ExecRuntime {
  const args: ExecRuntime['args'] = {};
  for (const { meta: entryMeta, data: entryData } of nodeInputs(meta, data)) {
    const entryRuntime = getEntryDataRuntime(entryData);
    if (entryRuntime.state === 'data-ready') {
      args[entryMeta.name] = entryRuntime.data;
    }
  }
  return {
    meta,
    args,
    vars: runtime.variables,
    makeNotReady: () => new NotReady(),
    makeNotImplemented: () => new NotImplemented('Not implemented.'),
  };
}

export type ExecFunc = (context: ExecRuntime) => Record<string, unknown>;

function getNodeDataId(data: GeneralNodeData) {
  if ('config' in data) {
    return data.config.id;
  } else {
    return data.id;
  }
}

function getNodeDataFlow(data: GeneralNodeData) {
  if ('config' in data) {
    return data.runtime.flow;
  } else {
    return data.flow;
  }
}

function getNodeDataTemplate(data: GeneralNodeData) {
  if ('config' in data) {
    return data.runtime.template;
  } else {
    return data.template;
  }
}

function getNodeDataAttributes(data: GeneralNodeData) {
  if ('config' in data) {
    return data.config.attributes;
  } else {
    return data.attributes;
  }
}

function getNodeDataInputState(data: GeneralNodeData) {
  if ('config' in data) {
    return data.runtime.inputState;
  } else {
    return data.inputState;
  }
}

function getNodeDataOutputState(data: GeneralNodeData) {
  if ('config' in data) {
    return data.runtime.outputState;
  } else {
    return data.outputState;
  }
}

function getNodeDataMeta(data: GeneralNodeData) {
  if ('config' in data) {
    return data.config.meta;
  } else {
    return data.meta;
  }
}

function getNodeDataMetaExtend(data: GeneralNodeData) {
  if ('config' in data) {
    return data.config.metaExtend;
  } else {
    return data.metaExtend;
  }
}

function getNodeDataInputs(data: NodeData): InputNodeEntryData[];
function getNodeDataInputs(data: NodeDataPair): InputNodeEntryDataPair[];
function getNodeDataInputs(data: GeneralNodeData): InputNodeEntryDataPair[] | InputNodeEntryData[];
function getNodeDataInputs(data: GeneralNodeData): InputNodeEntryDataPair[] | InputNodeEntryData[] {
  if ('config' in data) {
    const result: InputNodeEntryDataPair[] = [];
    for (let i = 0; i < data.config.inputs.length; i++) {
      const entryConfigData = data.config.inputs[i];
      const entryRuntimeData = data.runtime.inputs[i];
      result.push({
        config: entryConfigData,
        runtime: entryRuntimeData,
      });
    }
    return result;
  } else {
    return data.inputs;
  }
}

function getNodeDataOutputs(data: NodeData): OutputNodeEntryData[];
function getNodeDataOutputs(data: NodeDataPair): OutputNodeEntryDataPair[];
function getNodeDataOutputs(data: GeneralNodeData): OutputNodeEntryDataPair[] | OutputNodeEntryData[];
function getNodeDataOutputs(data: GeneralNodeData): OutputNodeEntryDataPair[] | OutputNodeEntryData[] {
  if ('config' in data) {
    const result: OutputNodeEntryDataPair[] = [];
    for (let i = 0; i < data.config.outputs.length; i++) {
      const entryConfigData = data.config.outputs[i];
      const entryRuntimeData = data.runtime.outputs[i];
      result.push({
        config: entryConfigData,
        runtime: entryRuntimeData,
      });
    }
    return result;
  } else {
    return data.outputs;
  }
}

function getEntryDataConfig(data: InputNodeEntryData | InputNodeEntryDataPair): InputNodeEntryConfig;
function getEntryDataConfig(data: OutputNodeEntryData | OutputNodeEntryDataPair): OutputNodeEntryConfig;
function getEntryDataConfig(data: InputNodeEntryData | InputNodeEntryDataPair | OutputNodeEntryData | OutputNodeEntryDataPair): InputNodeEntryConfig | OutputNodeEntryConfig;
function getEntryDataConfig(data: InputNodeEntryData | InputNodeEntryDataPair | OutputNodeEntryData | OutputNodeEntryDataPair): InputNodeEntryConfig | OutputNodeEntryConfig {
  if ('config' in data.config) {
    return (data as (InputNodeEntryDataPair | OutputNodeEntryDataPair)).config.config;
  } else {
    return (data as InputNodeEntryData | OutputNodeEntryData).config;
  }
}

function getEntryDataRuntime(data: InputNodeEntryData | InputNodeEntryDataPair | OutputNodeEntryData | OutputNodeEntryDataPair) {
  if ('config' in data.config) {
    return (data as (InputNodeEntryDataPair | OutputNodeEntryDataPair)).runtime.runtime;
  } else {
    return (data as InputNodeEntryData | OutputNodeEntryData).runtime;
  }
}

export function getInputNodeEntryData(nodeData: NodeData, entryId: string): InputNodeEntryData | undefined;
export function getInputNodeEntryData(nodeData: NodeDataPair, entryId: string): InputNodeEntryDataPair | undefined;
export function getInputNodeEntryData(nodeData: GeneralNodeData, entryId: string): InputNodeEntryDataPair | InputNodeEntryData | undefined;
export function getInputNodeEntryData(nodeData: GeneralNodeData, entryId: string): InputNodeEntryDataPair | InputNodeEntryData | undefined {
  if ('config' in nodeData) {
    for (let i = 0; i < nodeData.config.inputs.length; i++) {
      const entryConfigData = nodeData.config.inputs[i];
      const entryRuntimeData = nodeData.runtime?.inputs[i];
      if (entryConfigData.config.name === entryId) {
        return {
          config: entryConfigData,
          runtime: entryRuntimeData,
        };
      }
    }
    return undefined;
  } else {
    return nodeData.inputs.find(e => e.config.name === entryId);
  }
}

export function getOutputNodeEntryData(nodeData: NodeData, entryId: string): OutputNodeEntryData | undefined;
export function getOutputNodeEntryData(nodeData: NodeDataPair, entryId: string): OutputNodeEntryDataPair | undefined;
export function getOutputNodeEntryData(nodeData: GeneralNodeData, entryId: string): OutputNodeEntryData | OutputNodeEntryDataPair | undefined;
export function getOutputNodeEntryData(nodeData: GeneralNodeData, entryId: string): OutputNodeEntryData | OutputNodeEntryDataPair | undefined {
  if ('config' in nodeData) {
    for (let i = 0; i < nodeData.config.outputs.length; i++) {
      const entryConfigData = nodeData.config.outputs[i];
      const entryRuntimeData = nodeData.runtime?.outputs[i];
      if (entryConfigData.config.name === entryId) {
        return {
          config: entryConfigData,
          runtime: entryRuntimeData,
        };
      }
    }
    return undefined;
  } else {
    return nodeData.outputs.find(e => e.config.name === entryId);
  }
}

function nodeInputs(nodeMeta: NodeMeta, nodeData: GeneralNodeData) {
  let i = 0;
  const baseInputLen = nodeMeta.inputs.length;
  const nodeMetaExtend = getNodeDataMetaExtend(nodeData);
  const inputLen = baseInputLen + (nodeMetaExtend ? nodeMetaExtend.inputs.length : 0);
  return {
    *[Symbol.iterator]() {
      const dataInputs = getNodeDataInputs(nodeData);
      while (i < inputLen) {
        if (i < nodeMeta.inputs.length) {
          yield {
            meta: nodeMeta.inputs[i],
            data: dataInputs[i],
          };
        } else {
          yield {
            meta: nodeMetaExtend!.inputs![i - baseInputLen],
            data: dataInputs[i],
          };
        }
        i++;
      }
    }
  }
}

function nodeOutputs(nodeMeta: NodeMeta, nodeData: GeneralNodeData) {
  let i = 0;
  const baseOutputLen = nodeMeta.outputs.length;
  const nodeMetaExtend = getNodeDataMetaExtend(nodeData);
  const outputLen = baseOutputLen + (nodeMetaExtend ? nodeMetaExtend.outputs.length : 0);
  return {
    *[Symbol.iterator]() {
      const dataOutputs = getNodeDataOutputs(nodeData);
      while (i < outputLen) {
        if (i < nodeMeta.outputs.length) {
          yield {
            meta: nodeMeta.outputs[i],
            data: dataOutputs[i],
          };
        } else {
          yield {
            meta: nodeMetaExtend!.outputs![i - baseOutputLen],
            data: dataOutputs[i],
          };
        }
        i++;
      }
    }
  }
}

type ValueResult = {
  success: boolean | undefined;
  infuences: Record<string, unknown>;
};

function dealWithExecResult(result: Record<string, unknown>, meta: NodeMeta, data: GeneralNodeData): ValueResult {
  if (typeof result !== 'object') {
    throw new Error('Result is not an object.');
  }
  const validateErrors: ValidateError[] = [];
  const ret: ValueResult = {
    success: true,
    infuences: {},
  };
  for (const { meta: entryMeta, data: entryData } of nodeOutputs(meta, data)) {
    const entryRuntime = getEntryDataRuntime(entryData);
    if (entryMeta.name in result && !(result[entryMeta.name] instanceof NotReady)) {
      const value = result[entryMeta.name];
      if (entryRuntime.state === 'data-ready' && entryRuntime.data === value) {
        continue;
      }
      entryRuntime.data = value;
      try {
        validateNodeEntryData(value, entryMeta, entryData);
      } catch (error) {
        if (error instanceof ValError) {
          entryRuntime.state = 'validate-failed';
          entryRuntime.type = undefined;
          validateErrors.push({
            level: 'error',
            entries: error.entries,
            message: error.message,
          });
          ret.success = false;
          continue;
        }
        throw error;
      }
      entryRuntime.state = 'data-ready';
      entryRuntime.type = getTypeFromData(value);
      ret.infuences[entryMeta.name] = value;
    } else {
      entryRuntime.state = 'unavailable';
      entryRuntime.data = undefined;
      entryRuntime.type = undefined;
      if (ret.success) {
        ret.success = undefined;
      }
    }
  }
  if (validateErrors.length > 0) {
    setNodeDataOutputError(data, {
      validates: validateErrors,
    });
  }
  if (ret.success) {
    setNodeDataOutputState(data, 'data-ready');
  } else if (ret.success === false) {
    setNodeDataOutputState(data, 'validate-failed');
  } else {
    setNodeDataOutputState(data, 'unavailable');
  }
  return ret;
}

type TypeResult = {
  success: boolean | undefined;
  infuences: Record<string, NormalizedNodeEntryType>;
};

function dealWithTypeResult(result: Record<string, NormalizedNodeEntryType>, meta: NodeMeta, data: GeneralNodeData): TypeResult {
  if (typeof result !== 'object') {
    throw new Error('Result is not an object.');
  }
  const validateErrors: ValidateError[] = [];
  const ret: TypeResult = {
    success: true,
    infuences: {},
  };
  let typeReady: boolean = false;
  for (const { meta: entryMeta, data: entryData } of nodeOutputs(meta, data)) {
    const entryRuntime = getEntryDataRuntime(entryData);
    if (entryRuntime.state === 'data-ready') {
      continue;
    }
    entryRuntime.data = undefined;
    if (entryMeta.name in result && !(result[entryMeta.name] instanceof NotReady)) {
      const type = result[entryMeta.name];
      if (entryRuntime.state === 'type-ready' && compareNodeEntryType(entryRuntime.type, type) === 0) {
        typeReady = true;
        continue;
      }
      if (!mustNodeEntryTypeAssignTo(entryMeta.type, type)) {
        entryRuntime.state = 'validate-failed';
        entryRuntime.type = type;
        validateErrors.push({
          level: 'error',
          entries: [entryMeta.name],
          message: `Type mismatch. Expected ${entryMeta.type}, but got ${type}.`,
        });
        ret.success = false;
        continue;
      }
      entryRuntime.state = 'type-ready'
      entryRuntime.type = type;
      typeReady = true;
      ret.infuences[entryMeta.name] = type;
    } else {
      entryRuntime.state = 'unavailable';
      entryRuntime.data = undefined;
      entryRuntime.type = undefined;
      if (ret.success) {
        ret.success = undefined;
      }
    }
  }
  if (validateErrors.length > 0) {
    setNodeDataOutputError(data, {
      validates: validateErrors,
    });
  }
  if (ret.success) {
    if (typeReady) {
      setNodeDataOutputState(data, 'type-ready');
    }
  } else if (ret.success === false) {
    setNodeDataOutputState(data, 'validate-failed');
  } else {
    setNodeDataOutputState(data, 'unavailable');
  }
  return ret;
}

function setEntryDataRuntimeData(runtime: NodeEntryRuntime, data: unknown): void {
  runtime.data = data;
  runtime.state = 'data-ready';
  runtime.type = getTypeFromData(data);
}

function setEntryDataRuntimeType(runtime: NodeEntryRuntime, type: NormalizedNodeEntryType): void {
  runtime.data = undefined;
  runtime.state = 'type-ready';
  runtime.type = type;
}

function setEntryDataRuntimeInitOrUnavailable(runtime: NodeEntryRuntime, init: boolean): void {
  runtime.data = undefined;
  runtime.state = init ? 'init' : 'unavailable';
  runtime.type = undefined;
}

function setNodeDataInputState(data: GeneralNodeData, state: NodeData['inputState']): void {
  if ('config' in data) {
    data.runtime.inputState = state;
  } else {
    data.inputState = state;
  }
}

function setNodeDataOutputState(data: GeneralNodeData, state: NodeData['outputState']): void {
  if ('config' in data) {
    data.runtime.outputState = state;
  } else {
    data.outputState = state;
  }
}

function setNodeDataOutputError(data: GeneralNodeData, error: unknown): void {
  if ('config' in data) {
    data.runtime.outputState = 'exception';
    data.runtime.outputError = {
      validates: [],
      exception: {
        message: errorToString(error),
      }
    };
  } else {
    data.outputState = 'exception';
    data.outputError = {
      validates: [],
      exception: {
        message: errorToString(error),
      }
    };
  }
  const outputs = getNodeDataOutputs(data);
  for (const entry of outputs) {
    const entryRuntime = getEntryDataRuntime(entry);
    entryRuntime.state = 'unavailable';
    entryRuntime.data = undefined;
    entryRuntime.type = undefined;
  }
}

function calcNodeDataInputState(meta: NodeMeta, data: GeneralNodeData): void {
  let state: NodeData['inputState'] = 'data-ready';
  for (const { meta: entryMeta, data: entryData } of nodeInputs(meta, data)) {
    const runtime = getEntryDataRuntime(entryData);
    if (runtime.state === 'data-ready') {
      continue;
    } else if (runtime.state === 'type-ready') {
      if (state === 'data-ready') {
        state = 'type-ready';
      }
    } else if (runtime.state === 'validate-failed') {
      state = 'not-ready';
    } else {
      if (entryMeta.recommandLevel === RecommandLevel.MUST) {
        state = 'not-ready';
      }
    }
  }
}

function prepareDependencies(runtimeContext: RuntimeContext, data: GeneralNodeData, meta: NodeMeta, force: boolean = false): void {
  const flowData = runtimeContext.getFlowData();
  const dependencies = getFlowDependencyNodes(data, flowData);
  const dependencyEntries = Object.keys(dependencies);
  for (const entry of getNodeDataInputs(data)) {
    const entryConfig = getEntryDataConfig(entry);
    const entryRuntime = getEntryDataRuntime(entry);
    if (entryConfig.mode === 'input') {
      if (entryConfig.dataReady) {
        setEntryDataRuntimeData(entryRuntime, entryConfig.data);
      } else {
        setEntryDataRuntimeInitOrUnavailable(entryRuntime, true);
      }
    } else {
      if (entryConfig.name in dependencyEntries) {
        const dependency = dependencies[entryConfig.name];
        const dependencyEntryData = getOutputNodeEntryData(dependency.data, dependency.entry);
        if (!dependencyEntryData) {
          throw new Error('Entry data not found.');
        }
        const dependencyEntryRuntime = getEntryDataRuntime(dependencyEntryData);
        if (dependencyEntryRuntime.state === 'data-ready') {
          setEntryDataRuntimeData(entryRuntime, dependencyEntryRuntime.data);
        } else if (dependencyEntryRuntime.state === 'type-ready') {
          setEntryDataRuntimeType(entryRuntime, dependencyEntryRuntime.type!);
        } else if (dependencyEntryRuntime.state === 'init' || force) {
          prepareNode(runtimeContext, dependency.data, undefined, true);
          // 重新检查状态，不依赖 TypeScript 的类型缩小
          const currentState = dependencyEntryRuntime.state as NodeEntryRuntime['state'];
          if (currentState === 'data-ready') {
            setEntryDataRuntimeData(entryRuntime, dependencyEntryRuntime.data);
          } else if (currentState === 'type-ready') {
            setEntryDataRuntimeType(entryRuntime, dependencyEntryRuntime.type!);
          } else {
            setEntryDataRuntimeInitOrUnavailable(entryRuntime, false);
          }
        }
      }
    }
  }
  calcNodeDataInputState(meta, data);
}

function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

type PrepareResult = {
  success: boolean | undefined;
  dataInfluences: Record<string, unknown>;
  typeInfluences: Record<string, NormalizedNodeEntryType>;
}

function extractFlowData(nodeMeta: CompoundNodeMeta, nodeData: GeneralNodeData): GeneralFlowData {
  const flow = getNodeDataFlow(nodeData);
  do_assert(!!flow, 'Flow data is required.');
  return {
    config: {
      nodes: nodeMeta.nodes.map(n => n.data),
      edges: nodeMeta.edges.map(e => e.data!),
    },
    runtime: flow,
  }
}

function extractTemplateData(nodeMeta: CompoundNodeMeta, nodeData: GeneralNodeData): GeneralFlowData | undefined {
  const template = getNodeDataTemplate(nodeData);
  if (template) {
    return {
      config: {
        nodes: nodeMeta.nodes.map(n => n.data),
        edges: nodeMeta.edges.map(e => e.data!),
      },
      runtime: template,
    }
  } else {
    return undefined;
  }
}

export function prepareNode(runtimeContext: RuntimeContext, data: GeneralNodeData, meta: NodeMeta | undefined = undefined, useDependencies: boolean = true): PrepareResult {
  if (!meta) {
    meta = runtimeContext.getNodeMeta(getNodeDataMeta(data));
  }
  if (!meta) {
    throw new Error('Node meta is required.');
  }
  if (useDependencies) {
    prepareDependencies(runtimeContext, data, meta);
  }
  const inputsState = getNodeDataInputState(data);
  if (inputsState !== 'data-ready' && inputsState !== 'type-ready') {
    return {
      success: false,
      dataInfluences: {},
      typeInfluences: {},
    };
  }
  if (meta.type === 'base') {
    let dataRet: ValueResult = {
      success: false,
      infuences: {},
    };
    if (meta.frontendImpls) {
      const runtime = createExecRuntime(runtimeContext, meta, data);
      if (isCode(meta.frontendImpls)) {
        try {
          const result = evaluate(meta.frontendImpls.code, runtime) as Record<string, unknown>;
          dataRet = dealWithExecResult(result, meta, data);
          if (typeof dataRet.success === 'boolean') {
            return {
              success: dataRet.success,
              dataInfluences: dataRet.infuences,
              typeInfluences: {},
            };
          }
        } catch (error) {
          if (!(error instanceof NotImplemented)) {
            setNodeDataOutputError(data, error);
            return {
              success: false,
              dataInfluences: {},
              typeInfluences: {},
            };
          }
        }
      } else {
        if (!(meta.frontendImpls.ref in apis)) {
          throw new Error(`API ${meta.frontendImpls.ref} not found.`);
        }
        const api = (apis as Record<string, ExecFunc>)[meta.frontendImpls.ref];
        try {
          const result = api(runtime);
          dataRet = dealWithExecResult(result, meta, data);
          if (typeof dataRet.success === 'boolean') {
            return {
              success: dataRet.success,
              dataInfluences: dataRet.infuences,
              typeInfluences: {},
            };
          }
        } catch (error) {
          if (!(error instanceof NotImplemented)) {
            setNodeDataOutputError(data, error);
            return {
              success: false,
              dataInfluences: {},
              typeInfluences: {},
            };
          }
        }
      }
    }
    if (meta.typeCode) {
      const runtime = createTypeRuntime(runtimeContext, meta, data);
      if (isCode(meta.typeCode)) {
        try {
          const result = evaluate(meta.typeCode.code, runtime) as Record<string, NormalizedNodeEntryType>;
          const typeRet = dealWithTypeResult(result, meta, data);
          if (typeof typeRet.success === 'boolean') {
            return {
              success: typeRet.success,
              dataInfluences: dataRet.infuences,
              typeInfluences: typeRet.infuences,
            };
          }
        } catch (error) {
          if (!(error instanceof NotImplemented)) {
            setNodeDataOutputError(data, error);
            return {
              success: false,
              dataInfluences: dataRet.infuences,
              typeInfluences: {},
            };
          }
        }
      } else {
        if (!(meta.typeCode.ref in typeApis)) {
          throw new Error(`Type API ${meta.typeCode.ref} not found.`);
        }
        const api = (typeApis as Record<string, TypeFunc>)[meta.typeCode.ref];
        try {
          const result = api(runtime);
          const typeRet = dealWithTypeResult(result, meta, data);
          if (typeof typeRet.success === 'boolean') {
            return {
              success: typeRet.success,
              dataInfluences: dataRet.infuences,
              typeInfluences: typeRet.infuences,
            };
          }
        } catch (error) {
          if (!(error instanceof NotImplemented)) {
            setNodeDataOutputError(data, error);
            return {
              success: false,
              dataInfluences: dataRet.infuences,
              typeInfluences: {},
            };
          }
        }
      }
    }
    return {
      success: undefined,
      dataInfluences: {},
      typeInfluences: {},
    };
  } else {
    const flowData = extractFlowData(meta, data);
    const templateData = extractTemplateData(meta, data);
    return execSubFlow(runtimeContext, flowData, templateData);
  }
}

function getFlowEdges(flowData: GeneralFlowData): EdgeData[] {
  if ('config' in flowData) {
    return flowData.config.edges;
  } else {
    return flowData.edges;
  }
}

interface Iterator<T, TReturn = void, TNext = unknown> {
  [Symbol.iterator](): Generator<T, TReturn, TNext>;
}

function flowNodes(flowData: FlowData): Iterator<NodeData>;
function flowNodes(flowData: FlowDataPair): Iterator<NodeDataPair>;
function flowNodes(flowData: GeneralFlowData): Iterator<GeneralNodeData>;
function flowNodes(flowData: GeneralFlowData): Iterator<GeneralNodeData> {
  if ('config' in flowData) {
    const { config, runtime } = flowData;
    return {
      *[Symbol.iterator]() {
        for (let i = 0; i < config.nodes.length; i++) {
          yield {
            config: config.nodes[i],
            runtime: runtime.nodes[i],
          };
        }
      }
    }
  } else {
    return {
      *[Symbol.iterator]() {
        for (const nodeData of flowData.nodes) {
          yield nodeData;
        }
      }
    }
  }
}

function getStartNodes(flowData: FlowData): Array<NodeData>;
function getStartNodes(flowData: FlowDataPair): Array<NodeDataPair>;
function getStartNodes(flowData: GeneralFlowData): Array<GeneralNodeData>;
function getStartNodes(flowData: GeneralFlowData): Array<GeneralNodeData> {
  const result: GeneralNodeData[] = [];
  const targets: Set<string> = new Set();
  for (const edge of getFlowEdges(flowData)) {
    targets.add(edge.targetNode);
  }
  for (const info of flowNodes(flowData)) {
    const nodeId = getNodeDataId(info);
    if (!(nodeId in targets)) {
      result.push(info);
    }
  }
  return result;
}

function getNodeByCategory(runtimeContext: RuntimeContext, flowData: GeneralFlowData, category: string): GeneralNodePair[] {
  const result: GeneralNodePair[] = [];
  for (const nodeData of flowNodes(flowData)) {
    const meta = runtimeContext.getNodeMeta(getNodeDataMeta(nodeData));
    if (!meta) {
      throw new Error('Node meta is required.');
    }
    if (meta.category === category) {
      result.push({
        meta,
        data: nodeData,
      });
    }
  }
  return result;
}

function getOutputNodes(runtimeContext: RuntimeContext, flowData: GeneralFlowData): GeneralNodePair[] {
  return getNodeByCategory(runtimeContext, flowData, 'output');
}

function getEntryNode(runtimeContext: RuntimeContext, flowData: GeneralFlowData): GeneralNodePair {
  const nodes = getNodeByCategory(runtimeContext, flowData, 'entry');
  if (nodes.length === 0) {
    throw new Error('No entry nodes found.');
  }
  if (nodes.length > 1) {
    throw new Error('Multiple entry nodes found.');
  }
  return nodes[0];
}

type InfluncedNodeInfo = {
  /**
   * entry of the node
   */
  entry: string;
  /**
   * node data
   */
  data: GeneralNodeData;
}

function entryName(value: NodeEntry
  | InputNodeEntryData 
  | InputNodeEntryConfigData 
  | InputNodeEntryConfig
  | InputNodeEntryDataPair
  | OutputNodeEntryData 
  | OutputNodeEntryConfigData 
  | OutputNodeEntryConfig
  | OutputNodeEntryDataPair
): string {
  if ("config" in value) {
    if ("config" in value.config) {
      return value.config.config.name;
    } else {
      return value.config.name;
    }
  } else {
    return value.name;
  }
}

function getFlowDependencyNodes(nodeData: GeneralNodeData, flowData: GeneralFlowData): Record<string, InfluncedNodeInfo> {
  const inputs = getNodeDataInputs(nodeData).map(entryName);
  if (inputs.length === 0) {
    return {};
  }
  const id = getNodeDataId(nodeData);
  const result: Record<string, InfluncedNodeInfo> = {};
  for (const edge of getFlowEdges(flowData)) {
    if (edge.targetNode === id && inputs.indexOf(edge.targetEntry) !== -1) {
      const node = getFlowNodeById(flowData, edge.sourceNode);
      if (node) {
        result[edge.targetEntry] = {
          entry: edge.sourceEntry,
          data: node,
        };
      }
    }
  }
  return result;
}

function getFlowNodeById(data: GeneralFlowData, id: string): GeneralNodeData | undefined {
  for (const node of flowNodes(data)) {
    if (getNodeDataId(node) === id) {
      return node;
    }
  }
  return undefined;
}

function getFlowNodeByInflunce(flowData: GeneralFlowData, nodeId: string, influnces: string[]): Record<string, InfluncedNodeInfo> {
  const result: Record<string, InfluncedNodeInfo> = {};
  for (const edge of getFlowEdges(flowData)) {
    if (edge.sourceNode === nodeId && influnces.indexOf(edge.sourceEntry) !== -1) {
      const nodeData = getFlowNodeById(flowData, edge.targetNode);
      if (nodeData) {
        result[edge.sourceEntry] = {
          entry: edge.targetEntry,
          data: nodeData,
        }
      }
    }
  }
  return result;
}

export function execSubFlow(runtimeContext: RuntimeContext, flowData: GeneralFlowData, templateData?: GeneralFlowData): PrepareResult {
  const outputNodes = getOutputNodes(runtimeContext, templateData || flowData);
  if (outputNodes.length === 0) {
    return { success: true, dataInfluences: {}, typeInfluences: {} };
  }
  const result: PrepareResult = {
    success: true,
    dataInfluences: {},
    typeInfluences: {},
  };
  for (const { data: outputNodeData } of outputNodes) {
    const outputAttributes = getNodeDataAttributes(outputNodeData);
    do_assert('outputName' in outputAttributes, '"outputName" attribute not found in output node.');
    const outputName = outputAttributes.outputName;
    do_assert(typeof outputName === 'string', 'Output node name is not a string.');
    const { success, dataInfluences, typeInfluences } = prepareNode(runtimeContext, outputNodeData, true);
    if ('output' in dataInfluences) {
      result.dataInfluences[outputName] = dataInfluences['output'];
    } else if ('output' in typeInfluences) {
      result.typeInfluences[outputName] = typeInfluences['output'];
    }
    if (success === false) {
      result.success = false;
    } else if (success !== true) {
      if (result.success) {
        result.success = undefined;
      }
    }
  }
  return result;
}