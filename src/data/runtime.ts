import { isAssignNodeData, isBaseNodeData, isCode, isIfNodeData, isLiteralNodeData, isNativeNode, isStartNodeData, isSwitchNodeData, isVariableNodeData } from "./data-guard";
import type { NormalizedNodeEntryType } from "./data-type";
import type { AFNodeData, FlowState, SubFlowConfigState, TemplateFlowState, TemplateRef, Variable, WorkspaceState, WorkspaceStateBase } from "./flow-type";
import { getTypeFromData } from "./utils";
import { evaluate } from '../lib/eval';
import { ValError, validateNodeEntryData } from "./validate";
import apis from './apis';
import typeApis from './type-apis';
import { getGlobalNodeMetas } from "./nodes";
import { getGlobalTemplates } from "./templates";
import { mustNodeEntryTypeAssignTo } from "./assignable";
import type { ExceptionError, FlowConfigData, FlowData, FlowRuntimeData, InputNodeEntryConfig, InputNodeEntryConfigData, InputNodeEntryData, InputNodeEntryRuntimeData, NodeConfigData, NodeData, NodeEntry, NodeEntryRuntime, NodeMeta, NodeMetaRef, NodeRuntimeData, OutputNodeEntryConfig, OutputNodeEntryConfigData, OutputNodeEntryData, OutputNodeEntryRuntimeData, ValidateError } from "./node-type";
import { RecommandLevel } from "./enum";
import { compareNodeEntryType } from "./compare";

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

export function createTypeRuntime(runtime: RuntimeContext, meta: NodeMeta, data: NodeData): TypeRuntime {
  const args: TypeRuntime['args'] = {};
  for (const { meta: entryMeta, data: entryData } of nodeInputs(meta, data)) {
    if (entryData.runtime.state === 'data-ready' || entryData.runtime.state === 'type-ready') {
      args[entryMeta.name] = entryData.runtime.type;
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

export function createExecRuntime(runtime: RuntimeContext, meta: NodeMeta, data: NodeData): ExecRuntime {
  const args: ExecRuntime['args'] = {};
  for (const { meta: entryMeta, data: entryData } of nodeInputs(meta, data)) {
    if (entryData.runtime.state === 'data-ready') {
      args[entryMeta.name] = entryData.runtime.data;
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

type NodeDataPair = {
  config: NodeConfigData;
  runtime?: NodeRuntimeData;
};

type GeneralNodeData = NodeData | NodeDataPair;

type InputNodeEntryDataPair = {
  config: InputNodeEntryConfigData;
  runtime?: InputNodeEntryRuntimeData;
}

type OutputNodeEntryDataPair = {
  config: OutputNodeEntryConfigData;
  runtime?: OutputNodeEntryRuntimeData;
}

function getEntryDataConfig(data: InputNodeEntryData | InputNodeEntryDataPair | OutputNodeEntryData | OutputNodeEntryDataPair) {
  if ('config' in data.config) {
    return (data as (InputNodeEntryDataPair | OutputNodeEntryDataPair)).config.config;
  } else {
    return (data as InputNodeEntryData | OutputNodeEntryData).config;
  }
}

function getEntryDataRuntime(data: InputNodeEntryData | InputNodeEntryDataPair | OutputNodeEntryData | OutputNodeEntryDataPair | undefined) {
  if (!data) {
    return undefined;
  }
  if ('config' in data.config) {
    return (data as (InputNodeEntryDataPair | OutputNodeEntryDataPair)).runtime?.runtime;
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

function nodeInputs(nodeMeta: NodeMeta, nodeData: NodeData) {
  let i = 0;
  const baseInputLen = nodeMeta.inputs.length;
  const inputLen = baseInputLen + (nodeData.metaExtend ? nodeData.metaExtend.inputs.length : 0);
  return {
    *[Symbol.iterator]() {
      while (i < inputLen) {
        if (i < nodeMeta.inputs.length) {
          yield {
            meta: nodeMeta.inputs[i],
            data: nodeData.inputs[i],
          };
        } else {
          yield {
            meta: nodeData.metaExtend!.inputs![i - baseInputLen],
            data: nodeData.inputs[i],
          };
        }
        i++;
      }
    }
  }
}

function nodeOutputs(nodeMeta: NodeMeta, nodeData: NodeData) {
  let i = 0;
  const baseOutputLen = nodeMeta.outputs.length;
  const outputLen = baseOutputLen + (nodeData.metaExtend ? nodeData.metaExtend.outputs.length : 0);
  return {
    *[Symbol.iterator]() {
      while (i < outputLen) {
        if (i < nodeMeta.outputs.length) {
          yield {
            meta: nodeMeta.outputs[i],
            data: nodeData.outputs[i],
          };
        } else {
          yield {
            meta: nodeData.metaExtend!.outputs![i - baseOutputLen],
            data: nodeData.outputs[i],
          };
        }
        i++;
      }
    }
  }
}

function dealWithExecResult(result: Record<string, unknown>, meta: NodeMeta, data: NodeData): ExecResult {
  if (typeof result !== 'object') {
    return { success: false, reason: 'exception', error: { message: 'Result is not an object.' } };
  }
  const infuences: Record<string, unknown> = {};
  const validateErrors: ValidateError[] = [];
  for (const { meta: entryMeta, data: entryData } of nodeOutputs(meta, data)) {
    if (entryMeta.name in result) {
      const value = result[entryMeta.name];
      if (value instanceof NotReady) {
        entryData.runtime.state = 'unavailable';
        entryData.runtime.data = undefined;
        entryData.runtime.type = undefined;
        continue;
      }
      if (entryData.runtime.state === 'data-ready' && entryData.runtime.data === value) {
        continue;
      }
      entryData.runtime.data = value;
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
          entryData.runtime.state = 'validate-failed';
          entryData.runtime.type = undefined;
          continue;
        }
      }
      try {
        validateNodeEntryData(value, entryMeta, entryData);
      } catch (error) {
        if (error instanceof ValError) {
          entryData.runtime.state = 'validate-failed';
          entryData.runtime.type = undefined;
          validateErrors.push({
            level: 'error',
            entries: error.entries,
            message: error.message,
          });
          continue;
        }
        throw error;
      }
      entryData.runtime.state = 'data-ready';
      entryData.runtime.type = getTypeFromData(value);
      infuences[entryMeta.name] = value;
    } else {
      entryData.runtime.state = 'unavailable';
      entryData.runtime.data = undefined;
      entryData.runtime.type = undefined;
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
    data.outputError = {
      validates: validateErrors,
    };
    return { success: false, reason: 'validate-failed', error: validateErrors };
  } else {
    return {
      success: 'data-ready',
      infuences,
    }
  }
}

function dealWithTypeResult(result: Record<string, NormalizedNodeEntryType>, meta: NodeMeta, data: NodeData): ExecResult {
  if (typeof result !== 'object') {
    return { success: false, reason: 'exception', error: { message: 'Result is not an object.' } };
  }
  const infuences: Record<string, NormalizedNodeEntryType> = {};
  const validateErrors: ValidateError[] = [];
  for (const { meta: entryMeta, data: entryData } of nodeOutputs(meta, data)) {
    entryData.runtime.data = undefined;
    if (entryMeta.name in result) {
      const type = result[entryMeta.name];
      if (type instanceof NotReady) {
        entryData.runtime.state = 'unavailable';
        entryData.runtime.type = undefined;
        continue;
      }
      if (entryData.runtime.state === 'type-ready' && compareNodeEntryType(entryData.runtime.type, type) === 0) {
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
          entryData.runtime.state = 'validate-failed';
          entryData.runtime.type = undefined;
          continue;
        }
      }
      if (!mustNodeEntryTypeAssignTo(entryMeta.type, type)) {
        entryData.runtime.state = 'validate-failed';
        entryData.runtime.type = type;
        validateErrors.push({
          level: 'error',
          entries: [entryMeta.name],
          message: `Type mismatch. Expected ${entryMeta.type}, but got ${type}.`,
        });
        continue;
      }
      entryData.runtime.state = 'type-ready'
      entryData.runtime.type = type;
      infuences[entryMeta.name] = type;
    } else {
      entryData.runtime.state = 'unavailable';
      entryData.runtime.data = undefined;
      entryData.runtime.type = undefined;
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
    data.outputError = {
      validates: validateErrors,
    };
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

function setNodeDataOutputError(data: NodeData, error: unknown): void {
  data.outputError = {
    validates: [],
    exception: {
      message: errorToString(error),
    }
  };
  for (const entry of data.outputs) {
    entry.runtime.state = 'unavailable';
    entry.runtime.data = undefined;
    entry.runtime.type = undefined;
  }
}


function calcNodeInputsState(nodeData: NodeData, nodeMeta: NodeMeta): 'init' | 'data-ready' | 'type-ready' | 'unavailable' | 'error' {
  let targetNum = 0;
  let dataReadyNum = 0;
  let typeReadyNum = 0;
  for (let i = 0; i < nodeMeta.inputs.length; i++) {
    const entryMeta = nodeMeta.inputs[i];
    const entryData = nodeData.inputs[i];
    if (entryMeta.optional) {
      continue;
    }
    targetNum++;
    if (entryData.runtime.state === 'init') {
      return 'init';
    } else if (entryData.runtime.state === 'data-ready') {
      dataReadyNum++;
    } else if (entryData.runtime.state === 'type-ready') {
      typeReadyNum++;
    } else if (entryData.runtime.state === 'unavailable') {
      continue;
    } else if (entryData.runtime.state === 'error') {
      return 'error';
    } else {
      throw new Error(`Invalid entry state: ${entryData.runtime.state}.`);
    }
  }
  if (dataReadyNum === targetNum) {
    return 'data-ready';
  } else if (typeReadyNum === targetNum) {
    return 'type-ready';
  } else {
    return 'unavailable';
  }
}

function prepareDependencies(runtimeContext: RuntimeContext, data: NodeData, force: boolean = false): void {
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
    const entryConfig = getEntryDataConfig(entryData);
    const entryRuntime = getEntryDataRuntime(entryData);
    if (!entryRuntime) {
      throw new Error('Entry runtime not found.');
    }
    if (entryRuntime.state === 'data-ready') {
      setEntryDataRuntimeData(dependentEntryData.runtime, entryRuntime.data);
    } else if (entryRuntime.state === 'type-ready') {
      setEntryDataRuntimeType(dependentEntryData.runtime, entryRuntime.type!);
    } else if (entryRuntime.state === 'init' || force) {
      const result = prepareNode(runtimeContext, dependency.data, true);
      if (result.success && entryConfig.name in result.infuences) {
        if (result.success === 'data-ready') {
          setEntryDataRuntimeData(dependentEntryData.runtime, result.infuences[entryConfig.name]);
        } else {
          setEntryDataRuntimeType(dependentEntryData.runtime, result.infuences[entryConfig.name]);
        }
      } else if (!result.success) {
        setEntryDataRuntimeInitOrUnavailable(dependentEntryData.runtime, false);
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

export function prepareNode(runtimeContext: RuntimeContext, data: NodeData, useDependencies: boolean = true): ExecResult {
  if (useDependencies) {
    prepareDependencies(runtimeContext, data);
  }
  const meta = runtimeContext.getNodeMeta(data.meta);
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

type NodeInfo = {
  config: NodeConfigData;
  runtime?: NodeRuntimeData
};

function flowNodes(flowMeta: SubFlowConfigState, flowData?: FlowRuntimeData) {
  return {
    *[Symbol.iterator]() {
      for (let i = 0; i < flowMeta.nodes.length; i++) {
        const config = flowMeta.nodes[i].data;
        const runtime = flowData?.nodes[i];
        yield {
          config,
          runtime,
        };
      }
    }
  };
}

function getStartNodes(flowMeta: SubFlowConfigState, flowData?: FlowRuntimeData): NodeInfo[] {
  const result: NodeInfo[] = [];
  const targets: Set<string> = new Set();
  for (const edge of flowMeta.edges) {
    targets.add(edge.target);
  }
  for (const info of flowNodes(flowMeta, flowData)) {
    if (!(info.config.id in targets)) {
      result.push(info);
    }
  }
  return result;
}

type InfluncedNodeInfo = {
  entry: string;
  data: GeneralNodeData;
}

function entryName(value: NodeEntry | InputNodeEntryData | InputNodeEntryConfigData | InputNodeEntryConfig | OutputNodeEntryData | OutputNodeEntryConfigData | OutputNodeEntryConfig): string {
  if ("config" in value) {
    return value.config.name;
  } else {
    return value.name;
  }
}

type GeneralFlowData = FlowData | { config: FlowConfigData, runtime: FlowRuntimeData };

function getFlowDependencyNodes(meta: FlowState, nodeData: NodeData | NodeConfigData, data?: GeneralFlowData): Record<string, InfluncedNodeInfo> {
  const inputs = nodeData.inputs.map(entryName);
  if (inputs.length === 0) {
    return {};
  }
  const result: Record<string, InfluncedNodeInfo> = {};
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
    const startNodeDatas = getStartNodes(meta, data);
    if (startNodeDatas.length === 0) {
      return { success: 'data-ready', infuences: {} };
    }
    let currentNodes: AFNodeData[] = startNodeDatas;
    let nextNodes: AFNodeData[];
    do {
      nextNodes = [];
      for (const nodeData of currentNodes) {
        const result = prepareNode(runtimeContext, nodeData);
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