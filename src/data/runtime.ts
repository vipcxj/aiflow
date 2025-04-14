import { isAssignNodeData, isBaseNodeData, isCode, isIfNodeData, isLiteralNodeData, isNativeNode, isSwitchNodeData, isVariableNodeData } from "./data-guard";
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
import type { EdgeData, ExceptionError, InputNodeEntryConfig, InputNodeEntryConfigData, InputNodeEntryData, InputNodeEntryRuntimeData, NodeConfigData, NodeData, NodeEntry, NodeEntryRuntime, NodeMeta, NodeMetaRef, NodeRuntimeData, OutputNodeEntryConfig, OutputNodeEntryConfigData, OutputNodeEntryData, OutputNodeEntryRuntimeData, ValidateError } from "./node-type";
import { RecommandLevel } from "./enum";
import { compareNodeEntryType } from "./compare";
import { get } from "http";

type NodeDataPair = {
  config: NodeConfigData;
  runtime: NodeRuntimeData;
};
type GeneralNodeData = NodeData | NodeDataPair;

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
  getFlowData: () => FlowData | undefined;
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

function getEntryDataConfig(data: InputNodeEntryData | InputNodeEntryDataPair | OutputNodeEntryData | OutputNodeEntryDataPair) {
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

function dealWithExecResult(result: Record<string, unknown>, meta: NodeMeta, data: GeneralNodeData): ExecResult {
  if (typeof result !== 'object') {
    return { success: false, reason: 'exception', error: { message: 'Result is not an object.' } };
  }
  const infuences: Record<string, unknown> = {};
  const validateErrors: ValidateError[] = [];
  for (const { meta: entryMeta, data: entryData } of nodeOutputs(meta, data)) {
    const entryRuntime = getEntryDataRuntime(entryData);
    if (entryMeta.name in result) {
      const value = result[entryMeta.name];
      if (value instanceof NotReady) {
        entryRuntime.state = 'unavailable';
        entryRuntime.data = undefined;
        entryRuntime.type = undefined;
        continue;
      }
      if (entryRuntime.state === 'data-ready' && entryRuntime.data === value) {
        continue;
      }
      entryRuntime.data = value;
      if (entryMeta.recommandLevel < RecommandLevel.NORMAL) {
        const validateError: ValidateError = {
          level: 'info',
          entries: [entryMeta.name],
          message: '',
        };
        if (entryMeta.recommandLevel === RecommandLevel.DEPRECATED) {
          validateError.level = 'warning';
          validateError.message = `Output "${entryMeta.name}" is not recommand.`;
        } else {
          validateError.level = 'error';
          validateError.message = `Output "${entryMeta.name}" is not permit.`;
        }
        validateErrors.push(validateError);
        if (validateError.level === 'error') {
          entryRuntime.state = 'validate-failed';
          entryRuntime.type = undefined;
          continue;
        }
      }
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
          continue;
        }
        throw error;
      }
      entryRuntime.state = 'data-ready';
      entryRuntime.type = getTypeFromData(value);
      infuences[entryMeta.name] = value;
    } else {
      entryRuntime.state = 'unavailable';
      entryRuntime.data = undefined;
      entryRuntime.type = undefined;
      if (entryMeta.recommandLevel > RecommandLevel.NORMAL) {
        const validateError: ValidateError = {
          level: 'info',
          entries: [entryMeta.name],
          message: '',
        };
        if (entryMeta.recommandLevel === RecommandLevel.RECOMMAND) {
          validateError.level = 'warning';
          validateError.message = `Output "${entryMeta.name}" is recommand.`;
        } else if (entryMeta.recommandLevel === RecommandLevel.SHOULD) {
          validateError.level = 'warning';
          validateError.message = `Output "${entryMeta.name}" is super recommand.`;
        } else {
          validateError.level = 'error';
          validateError.message = `Output "${entryMeta.name}" is required.`;
        }
        validateErrors.push(validateError);
      }
    }
  }
  if (validateErrors.length > 0) {
    setNodeDataOutputError(data, {
      validates: validateErrors,
    });
    return { success: false, reason: 'validate-failed', error: validateErrors };
  } else {
    return {
      success: 'data-ready',
      infuences,
    }
  }
}

function dealWithTypeResult(result: Record<string, NormalizedNodeEntryType>, meta: NodeMeta, data: GeneralNodeData): ExecResult {
  if (typeof result !== 'object') {
    return { success: false, reason: 'exception', error: { message: 'Result is not an object.' } };
  }
  const infuences: Record<string, NormalizedNodeEntryType> = {};
  const validateErrors: ValidateError[] = [];
  for (const { meta: entryMeta, data: entryData } of nodeOutputs(meta, data)) {
    const entryRuntime = getEntryDataRuntime(entryData);
    entryRuntime.data = undefined;
    if (entryMeta.name in result) {
      const type = result[entryMeta.name];
      if (type instanceof NotReady) {
        entryRuntime.state = 'unavailable';
        entryRuntime.type = undefined;
        continue;
      }
      if (entryRuntime.state === 'type-ready' && compareNodeEntryType(entryRuntime.type, type) === 0) {
        continue;
      }
      if (entryMeta.recommandLevel < RecommandLevel.NORMAL) {
        const validateError: ValidateError = {
          level: 'info',
          entries: [entryMeta.name],
          message: '',
        };
        if (entryMeta.recommandLevel === RecommandLevel.DEPRECATED) {
          validateError.level = 'warning';
          validateError.message = `Output "${entryMeta.name}" is not recommand.`;
        } else {
          validateError.level = 'error';
          validateError.message = `Output "${entryMeta.name}" is not permit.`;
        }
        validateErrors.push(validateError);
        if (validateError.level === 'error') {
          entryRuntime.state = 'validate-failed';
          entryRuntime.type = undefined;
          continue;
        }
      }
      if (!mustNodeEntryTypeAssignTo(entryMeta.type, type)) {
        entryRuntime.state = 'validate-failed';
        entryRuntime.type = type;
        validateErrors.push({
          level: 'error',
          entries: [entryMeta.name],
          message: `Type mismatch. Expected ${entryMeta.type}, but got ${type}.`,
        });
        continue;
      }
      entryRuntime.state = 'type-ready'
      entryRuntime.type = type;
      infuences[entryMeta.name] = type;
    } else {
      entryRuntime.state = 'unavailable';
      entryRuntime.data = undefined;
      entryRuntime.type = undefined;
      if (entryMeta.recommandLevel > RecommandLevel.NORMAL) {
        const validateError: ValidateError = {
          level: 'info',
          entries: [entryMeta.name],
          message: '',
        };
        if (entryMeta.recommandLevel === RecommandLevel.RECOMMAND) {
          validateError.level = 'warning';
          validateError.message = `Output "${entryMeta.name}" is recommand.`;
        } else if (entryMeta.recommandLevel === RecommandLevel.SHOULD) {
          validateError.level = 'warning';
          validateError.message = `Output "${entryMeta.name}" is super recommand.`;
        } else {
          validateError.level = 'error';
          validateError.message = `Output "${entryMeta.name}" is required.`;
        }
        validateErrors.push(validateError);
      }
    }
  }
  if (validateErrors.length > 0) {
    setNodeDataOutputError(data, {
      validates: validateErrors,
    });
    return { success: false, reason: 'validate-failed', error: validateErrors };
  } else {
    return {
      success: 'type-ready',
      infuences,
    }
  }
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

function setNodeDataOutputError(data: GeneralNodeData, error: unknown): void {
  if ('config' in data) {
    data.runtime.outputError = {
      validates: [],
      exception: {
        message: errorToString(error),
      }
    };
  } else {
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


function calcNodeInputsState(nodeData: GeneralNodeData, nodeMeta: NodeMeta): 'data-ready' | 'type-ready' | 'unavailable' | 'validate-failed' | 'error' {
  let targetNum = 0;
  let dataReadyNum = 0;
  let typeReadyNum = 0;
  const dataInputs = getNodeDataInputs(nodeData);
  for (let i = 0; i < nodeMeta.inputs.length; i++) {
    const entryMeta = nodeMeta.inputs[i];
    const entryData = dataInputs[i];
    const entryRuntime = getEntryDataRuntime(entryData);
    if (entryMeta.recommandLevel === RecommandLevel.MUST) {
      targetNum++;
    }
    if (entryRuntime.state === 'init' || entryRuntime.state === 'unavailable') {
      if (entryMeta.recommandLevel === RecommandLevel.MUST) {
        return 'unavailable';
      } else {
        continue
      }
    } else if (entryRuntime.state === 'data-ready') {
      dataReadyNum++;
    } else if (entryRuntime.state === 'type-ready') {
      typeReadyNum++;
    } else if (entryRuntime.state === 'validate-failed') {
      return 'validate-failed';
    } else {
      throw new Error(`Invalid entry state: ${entryRuntime.state}.`);
    }
  }
  if (dataReadyNum >= targetNum) {
    return 'data-ready';
  } else if (dataReadyNum + typeReadyNum >= targetNum) {
    return 'type-ready';
  } else {
    return 'unavailable';
  }
}

function prepareDependencies(runtimeContext: RuntimeContext, data: GeneralNodeData, force: boolean = false): void {
  const flowMeta = runtimeContext.getFlowMeta();
  const flowData = runtimeContext.getFlowData();
  const dependencies = getFlowDependencyNodes(flowMeta, data, flowData);
  for (const entry of Object.keys(dependencies)) {
    const dependency = dependencies[entry];
    const entryData = getOutputNodeEntryData(dependency.data, dependency.entry);
    if (!entryData) {
      throw new Error('Entry data not found.');
    }
    const dependentEntryData = getInputNodeEntryData(data, entry);
    if (!dependentEntryData) {
      throw new Error('Dependent entry data not found.');
    }
    const dependentEntryRuntime = getEntryDataRuntime(dependentEntryData);
    const entryConfig = getEntryDataConfig(entryData);
    const entryRuntime = getEntryDataRuntime(entryData);
    if (entryRuntime.state === 'data-ready') {
      setEntryDataRuntimeData(dependentEntryRuntime, entryRuntime.data);
    } else if (entryRuntime.state === 'type-ready') {
      setEntryDataRuntimeType(dependentEntryRuntime, entryRuntime.type!);
    } else if (entryRuntime.state === 'init' || force) {
      const result = prepareNode(runtimeContext, dependency.data, true);
      if (result.success && entryConfig.name in result.infuences) {
        if (result.success === 'data-ready') {
          setEntryDataRuntimeData(dependentEntryRuntime, result.infuences[entryConfig.name]);
        } else {
          setEntryDataRuntimeType(dependentEntryRuntime, result.infuences[entryConfig.name]);
        }
      } else if (!result.success) {
        setEntryDataRuntimeInitOrUnavailable(dependentEntryRuntime, false);
      }
    }
  }
}

function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function prepareNode(runtimeContext: RuntimeContext, data: GeneralNodeData, useDependencies: boolean = true): ExecResult {
  if (useDependencies) {
    prepareDependencies(runtimeContext, data);
  }
  const meta = runtimeContext.getNodeMeta(getNodeDataMeta(data));
  if (!meta) {
    throw new Error('Node meta is required.');
  }
  const inputsState = calcNodeInputsState(data, meta);
  if (inputsState !== 'data-ready' && inputsState !== 'type-ready') {
    return { success: false, reason: 'unavailable' };
  }
  if (meta.type === 'base') {
    if (meta.frontendImpls) {
      const runtime = createExecRuntime(runtimeContext, meta, data);
      if (isCode(meta.frontendImpls)) {
        try {
          const result = evaluate(meta.frontendImpls.code, runtime) as Record<string, unknown>;
          return dealWithExecResult(result, meta, data);
        } catch (error) {
          if (!(error instanceof NotImplemented)) {
            setNodeDataOutputError(data, error);
            return { success: false, reason: 'exception', error: { message: errorToString(error) } };
          }
        }
      } else {
        if (!(meta.frontendImpls.ref in apis)) {
          throw new Error(`API ${meta.frontendImpls.ref} not found.`);
        }
        const api = (apis as Record<string, ExecFunc>)[meta.frontendImpls.ref];
        try {
          const result = api(runtime);
          return dealWithExecResult(result, meta, data);
        } catch (error) {
          if (!(error instanceof NotImplemented)) {
            setNodeDataOutputError(data, error);
            return { success: false, reason: 'exception', error: { message: errorToString(error) } };
          }
        }
      }
    }
    if (meta.typeCode) {
      const runtime = createTypeRuntime(runtimeContext, meta, data);
      if (isCode(meta.typeCode)) {
        try {
          const result = evaluate(meta.typeCode.code, runtime) as Record<string, NormalizedNodeEntryType>;
          return dealWithTypeResult(result, meta, data);
        } catch (error) {
          if (!(error instanceof NotImplemented)) {
            setNodeDataOutputError(data, error);
            return { success: false, reason: 'exception', error: { message: errorToString(error) } };
          }
        }
      } else {
        if (!(meta.typeCode.ref in typeApis)) {
          throw new Error(`Type API ${meta.typeCode.ref} not found.`);
        }
        const api = (typeApis as Record<string, TypeFunc>)[meta.typeCode.ref];
        try {
          const result = api(runtime);
          return dealWithTypeResult(result, meta, data);
        } catch (error) {
          if (!(error instanceof NotImplemented)) {
            setNodeDataOutputError(data, error);
            return { success: false, reason: 'exception', error: { message: errorToString(error) } };
          }
        }
      }
    }
    return { success: false, reason: 'unavailable' };
  } else {

  }
  if (isBaseNodeData(data)) {
    if (isNativeNode(meta)) {
      const jsImpl = meta.impls[language];
      if (jsImpl) {
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
            if (!(error instanceof NotImplemented)) {
              return { success: false, reason: 'exception', error };
            }
          }
        } else {
          if (!(jsImpl.ref in apis)) {
            throw new Error(`API ${jsImpl.ref} not found.`);
          }
          const api = (apis as Record<string, ExecFunc>)[jsImpl.ref];
          try {
            const result = api(context);
            return dealWithExecResult(result, meta, data);
          } catch (error) {
            if (!(error instanceof NotImplemented)) {
              return { success: false, reason: 'exception', error };
            }
          }
        }
      }
      if (meta.typeCode) {
        const context = createTypeRuntime(meta);
        if (isCode(meta.typeCode)) {
          try {
            const result = evaluate(meta.typeCode.code, context) as Record<string, NormalizedNodeEntryType>;
            return dealWithTypeResult(result, meta, data);
          } catch (error) {
            if (!(error instanceof NotImplemented)) {
              return { success: false, reason: 'exception', error };
            }
          }
        } else {
          if (!(meta.typeCode.ref in typeApis)) {
            throw new Error(`API ${meta.typeCode.ref} not found.`);
          }
          const api = (typeApis as Record<string, TypeFunc>)[meta.typeCode.ref];
          try {
            const result = api(context);
            return dealWithTypeResult(result, meta, data);
          } catch (error) {
            if (!(error instanceof NotImplemented)) {
              return { success: false, reason: 'exception', error };
            }
          }
        }
      }
      return { success: false, reason: 'not-implemented' };
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
  } else if (isLiteralNodeData(data)) {

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
    if (output.runtime.state !== 'data-ready' || output.runtime.data !== result) {
      output.runtime.data = result;
      output.runtime.state = 'data-ready';
      output.runtime.type = getTypeFromData(result);
      return { success: 'data-ready', infuences: { output: result } };
    } else {
      return { success: 'data-ready', infuences: {} };
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
        if (selector.runtime.data === caseValue) {
          if (output.runtime.state !== 'data-ready' || output.runtime.data !== entry.runtime.data) {
            output.runtime.data = entry.runtime.data;
            output.runtime.state = 'data-ready';
            output.runtime.type = getTypeFromData(entry.runtime.data);
            return { success: 'data-ready', infuences: { output: entry.runtime.data } };
          } else {
            return { success: 'data-ready', infuences: {} };
          }
        }
      }
    }
    if (output.runtime.state !== 'data-ready' || output.runtime.data !== defaultCase.runtime.data) {
      output.runtime.data = defaultCase.runtime.data;
      output.runtime.state = 'data-ready';
      output.runtime.type = getTypeFromData(defaultCase.runtime.data);
      return { success: 'data-ready', infuences: { output: defaultCase.runtime.data } };
    } else {
      return { success: 'data-ready', infuences: {} };
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
    if (output.runtime.state !== 'data-ready' || output.runtime.data !== variable.runtime.data) {
      output.runtime.data = variable.runtime.data;
      output.runtime.state = 'data-ready';
      output.runtime.type = variable.runtime.type;
      return { success: 'data-ready', infuences: { output: variable.runtime.data } };
    } else {
      return { success: 'data-ready', infuences: {} };
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
    if (variable.runtime.data !== value.runtime.data || output.runtime.state !== 'data-ready' || output.runtime.data !== value.runtime.data) {
      variable.runtime.data = value.runtime.data;
      variable.runtime.ready = true;
      variable.runtime.type = getTypeFromData(value.runtime.data);
      output.runtime.data = value.runtime.data;
      output.runtime.state = 'data-ready';
      output.runtime.type = getTypeFromData(value.runtime.data);
      return { success: 'data-ready', infuences: { output: value.runtime.data } };
    } else {
      return { success: 'data-ready', infuences: {} };
    }
  } else {
    return { success: false, reason: 'not-implemented' };
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

type InfluncedNodeInfo = {
  entry: string;
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

function getFlowDependencyNodes(meta: FlowState, nodeData: GeneralNodeData, data?: GeneralFlowData): Record<string, InfluncedNodeInfo> {
  const inputs = getNodeDataInputs(nodeData).map(entryName);
  if (inputs.length === 0) {
    return {};
  }
  const id = getNodeDataId(nodeData);
  const result: Record<string, InfluncedNodeInfo> = {};
  for (const edge of meta.edges) {
    if (edge.target === id && edge.targetHandle && inputs.indexOf(edge.targetHandle) !== -1) {
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

function getFlowNodeById(meta: FlowState, id: string, data?: GeneralFlowData): InfluncedNodeInfo['data'] | undefined {
  for (let i = 0; i < meta.nodes.length; i++) {
    const node = meta.nodes[i];
    if (node.id === id) {
      if (data) {
        if ("config" in data) {
          return {
            config: data.config.nodes[i],
            runtime: data.runtime.nodes[i],
          };
        } else {
          return data.nodes[i];
        }
      } else {
        return meta.nodes[i].data;
      }
    }
  }
  return undefined;
}

function getFlowNodeByInflunce(meta: FlowState, nodeId: string, influnces: string[], data?: GeneralFlowData): Record<string, InfluncedNodeInfo> {
  const result: Record<string, InfluncedNodeInfo> = {};
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

export function execSubFlow(runtimeContext: RuntimeContext, meta: FlowState, data: GeneralFlowData, templateMeta?: TemplateFlowState, templateData?: GeneralFlowData): ExecResult {
  if (templateMeta) {

  } else {
    const startNodeDatas = getStartNodes(data);
    if (startNodeDatas.length === 0) {
      return { success: 'data-ready', infuences: {} };
    }
    let currentNodes: GeneralNodeData[] = startNodeDatas;
    let nextNodes: GeneralNodeData[];
    do {
      nextNodes = [];
      for (const nodeData of currentNodes) {
        const result = prepareNode(runtimeContext, nodeData);
        if (!result.success) {
          return result;
        }
        const influncedEntries = Object.keys(result.infuences);
        const influnceds = getFlowNodeByInflunce(meta, getNodeDataId(nodeData), influncedEntries, data);
        for (const influnce of influncedEntries) {
          const influnced = influnceds[influnce];
          if (influnced) {
            const entryData = getInputNodeEntryData(influnced.data, influnced.entry);
            if (!entryData) {
              throw new Error('Entry data not found.');
            }
            const entryRuntime = getEntryDataRuntime(entryData);
            if (entryRuntime.data !== result.infuences[influnce]) {
              entryRuntime.data = result.infuences[influnce];
              entryRuntime.state = 'data-ready';
              entryRuntime.type = getTypeFromData(result.infuences[influnce]);
              nextNodes.push(influnced.data);
            }
          }
        }
      }
      currentNodes = nextNodes;
    } while (nextNodes.length > 0);
  }
}