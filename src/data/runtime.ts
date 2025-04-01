import { isAssignNodeData, isBaseNodeData, isCode, isIfNodeData, isLiteralNodeData, isNativeNode, isStartNodeData, isSwitchNodeData, isVariableNodeData } from "./data-guard";
import type { NormalizedNodeEntryType } from "./data-type";
import type { AFNodeData, FlowState, SubFlowState, TemplateFlowState, TemplateRef, Variable, WorkspaceState } from "./flow-type";
import { getTypeFromData } from "./utils";
import { evaluate } from '../lib/eval';
import { ValError, validateNodeEntryData } from "./validate";
import apis from './apis';
import typeApis from './type-apis';
import { getGlobalNodeMetas } from "./nodes";
import { getGlobalTemplates } from "./templates";
import { mustNodeEntryTypeAssignTo } from "./assignable";
import type { ExceptionError, FlowData, NodeData, NodeEntryRuntime, NodeMeta, NodeMetaRef, ValidateError } from "./node-type";
import { RecommandLevel } from "./enum";
import { isNode } from "@xyflow/react";
import { compareNodeEntryType } from "./compare";

export type RuntimeContext = {
  getFlowMeta: () => FlowState;
  getFlowData: () => FlowData | undefined;
  getNodeMeta: (ref: NodeMetaRef) => NodeMeta | undefined;
  getTemplate: (ref: TemplateRef) => TemplateFlowState | undefined;
  getVariable: (name: string) => Variable | undefined;
};

export class NotImplemented extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplemented';
    Object.setPrototypeOf(this, NotImplemented.prototype);
  }
}

export function createRuntimeContext(ws: WorkspaceState, flowMeta: FlowState, flowData?: FlowData): RuntimeContext {
  const globalNodeMetas = getGlobalNodeMetas();
  const globalTempaltes = getGlobalTemplates();
  return {
    getFlowMeta: () => flowMeta,
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
      return flowMeta.variables[name];
    },
  };
}

export type TypeRuntime = {
  args: Record<string, NormalizedNodeEntryType>;
}

export type TypeFunc = (context: TypeRuntime) => Record<string, NormalizedNodeEntryType>;

export function createTypeRuntime(meta: NodeMeta): TypeRuntime {
  return {
    args: meta.inputs.reduce<Record<string, NormalizedNodeEntryType>>((acc, input) => {
      acc[input.name] = input.type;
      return acc;
    }, {}),
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
  makeNotReady: () => NotReady;
  makeNotImplemented: () => NotImplemented;
};

export function createExecRuntime(meta: NodeMeta, data: NodeData): ExecRuntime {
  const args: ExecRuntime['args'] = {};
  for (const { meta: entryMeta, data: entryData } of nodeInputs(meta, data)) {
    if (entryData.runtime.state === 'data-ready') {
      args[entryMeta.name] = entryData.runtime.data;
    }
  }
  return {
    meta,
    args,
    makeNotReady: () => new NotReady(),
    makeNotImplemented: () => new NotImplemented('Not implemented.'),
  };
}

export type ExecFunc = (context: ExecRuntime) => Record<string, unknown>;

export function getInputNodeEntryData(nodeData: AFNodeData, entryId: string) {
  return nodeData.inputs.find(e => e.config.name === entryId);
}

export function getOutputNodeEntryData(nodeData: AFNodeData, entryId: string) {
  return nodeData.outputs.find(e => e.config.name === entryId);
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
  const dependencies = getFlowDependencyNodes(flowMeta, data, flowData, true);
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
    if (entryData.runtime.state === 'data-ready') {
      setEntryDataRuntimeData(dependentEntryData.runtime, entryData.runtime.data);
    } else if (entryData.runtime.state === 'type-ready') {
      setEntryDataRuntimeType(dependentEntryData.runtime, entryData.runtime.type!);
    } else if (entryData.runtime.state === 'init' || force) {
      const result = prepareNode(runtimeContext, dependency.data, true);
      if (result.success && entryData.config.name in result.infuences) {
        if (result.success === 'data-ready') {
          setEntryDataRuntimeData(dependentEntryData.runtime, result.infuences[entryData.config.name]);
        } else {
          setEntryDataRuntimeType(dependentEntryData.runtime, result.infuences[entryData.config.name]);
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
      const runtime = createExecRuntime(meta, data);
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
      const runtime = createTypeRuntime(meta);
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

function flowNodes(meta: FlowState, data?: FlowData) {
  return {
    *[Symbol.iterator]() {
      for (let i = 0; i < meta.nodes.length; i++) {
        const node = meta.nodes[i];
        yield data?.nodes[i] || node.data;
      }
    }
  };
}

function getStartNodes(flowMeta: SubFlowState, flowData?: FlowData): AFNodeData[] {
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

export function execSubFlow(runtimeContext: RuntimeContext, meta: SubFlowState, data: FlowData, templateMeta?: TemplateFlowState, templateData?: FlowData): ExecResult {
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