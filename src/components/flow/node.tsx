"use client";

import { isNodeEntryTypeSupportInputs, getNodeEntryNthType } from "@/data/utils";
import { AFNode } from "@/data/flow-type";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { 
  selectGlobalNodeMetas, 
  setNodeEntryData, 
  getNodeMeta, 
  selectCurrentWorkspace, 
  switchNodeEntryMode 
} from "@/lib/slices/workspace-slice";
import { Handle, NodeProps, Position } from "@xyflow/react";
import type { NodeEntry, NodeEntryConfig, NodeEntryRuntime } from "@/data/data-type";
import { useCallback } from "react";
import { Circle } from "../icons/circle";
import { NoSymbol } from "../icons/no-symbol";
import { ArrowPath } from "../icons/arrow-path";
import NumberInput from "../input/number";
import { 
  isBoolNodeEntryType, 
  isNumberNodeEntryType, 
  isNodeEntryTypeSupportInput 
} from "@/data/guard";

export const ErrorNode = (props: NodeProps<AFNode> & { error: string }) => {
  return (
    <div>
      {props.error}
    </div>
  )
};

type BaseNodeRowProps = {
  nodeId: string;
  inputMeta?: NodeEntry;
  inputRuntime?: NodeEntryRuntime;
  inputConfig?: NodeEntryConfig;
  outputMeta?: NodeEntry;
  outputRuntime?: NodeEntryRuntime;
  outputConfig?: NodeEntryConfig;
};

type EntryInputProps = {
  nodeId: string;
  meta: NodeEntry;
  runtime: NodeEntryRuntime;
  config: NodeEntryConfig;
};

const EntryInput = ({ nodeId, meta, runtime, config }: EntryInputProps) => {
  const dispatch = useAppDispatch();
  const entryName = meta.name;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onValueChange = useCallback((value: any) => {
    dispatch(setNodeEntryData({
      nodeId,
      entryId: entryName,
      data: value,
      type: 'input'
    }));
  }, [dispatch, nodeId, entryName]);
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = e.target.value;
    if (isBoolNodeEntryType(meta.type)) {
      data = e.target.checked;
    } else if (isNumberNodeEntryType(meta.type)) {
      if (meta.type.integer) {
        data = parseInt(e.target.value);
      } else {
        data = parseFloat(e.target.value);
      }
    }
    onValueChange(data);
  }, [onValueChange, meta]);
  if (config.mode === 'handle') {
    return null;
  }
  const type = getNodeEntryNthType(meta.type, config.modeIndex);
  if (!isNodeEntryTypeSupportInput(type)) {
    return null;
  }
  if (isBoolNodeEntryType(type)) {
    return (
      <div className="p-1 pl-2 pr-2 nodrag">
        <input
          type="checkbox"
          className="input input-xs"
          checked={runtime.data}
          onChange={onChange}
        />
      </div>
    );
  } else if (isNumberNodeEntryType(type)) {
    return (
      <div className="p-1 pl-2 pr-2 nodrag">
        <NumberInput value={runtime.data} onChange={onValueChange} size="xs" />
      </div>
    );
  } else {
    return (
      <div className="p-1 pl-2 pr-2 nodrag">
        <input
          type="text"
          className="input input-xs"
          value={runtime.data}
          onChange={onChange}
        />
      </div>
    );
  }
};

const BaseNodeRow = ({ nodeId, inputMeta, inputRuntime, inputConfig, outputMeta, outputConfig }: BaseNodeRowProps) => {
  const showSwitchBtn = inputMeta && (
    inputMeta.disableHandle ? isNodeEntryTypeSupportInputs(inputMeta.type) : isNodeEntryTypeSupportInput(inputMeta.type)
  ) || false;
  const dispatch = useAppDispatch();
  const entryName = inputMeta?.name;
  const onSwitchMode = useCallback(() => {
    if (!entryName) {
      return;
    }
    dispatch(switchNodeEntryMode({
      nodeId,
      entryId: entryName
    }));
  }, [entryName, dispatch, nodeId]);
  return (
    <div className="flex flex-col text-xs">
      <div className="inline-flex justify-between">
        {inputMeta && inputConfig && (
          <span className="inline-flex items-center ml-1 mr-4">
            {inputConfig.mode === 'handle' && (
              <Handle
                type="source"
                position={Position.Left}
                id={inputConfig.name}
                style={{
                  position: 'relative',
                }}
              >
                <Circle className={`
                  w-4 h-4 mr-1 pointer-events-none
                  stroke-[1.5]
                  text-secondary/70
                  flow-handle-hover:stroke-3
                  flow-handle-hover:text-secondary
                  flow-handle-connecting-from:stroke-3
                  flow-handle-connecting-from:text-secondary
                  flow-handle-connecting-to:stroke-3
                  flow-handle-connecting-to:text-secondary
                `} />
              </Handle>
            )}
            {inputConfig.mode === 'input' && (
              <NoSymbol
                className="w-4 h-4 mr-1 stroke-[1.5] text-secondary/70"
              />
            )}
            {inputConfig.name}
            {showSwitchBtn && (
              <button className="btn btn-ghost btn-circle btn-xs" onClick={onSwitchMode}>
                <ArrowPath className="w-3 h-3" />
              </button>
            )}
          </span>
        )}
        {outputMeta && outputConfig && (
          <span className="inline-flex items-center mr-1 ml-4">
            {outputConfig.name}
            <Handle
              type="target"
              position={Position.Right}
              id={outputConfig.name}
              style={{
                position: 'relative',
              }}
            >
              <Circle className={`
                w-4 h-4 ml-1 pointer-events-none
                stroke-[1.5]
                text-accent/70
                flow-handle-hover:stroke-3
                flow-handle-hover:text-accent
                flow-handle-connecting-from:stroke-3
                flow-handle-connecting-from:text-accent
                flow-handle-connecting-to:stroke-3
                flow-handle-connecting-to:text-accent
              `} />
            </Handle>
          </span>
        )}
      </div>
      <div>
        {inputMeta && inputRuntime && inputConfig && inputConfig.mode === 'input' && (
          <EntryInput
            nodeId={nodeId}
            meta={inputMeta}
            runtime={inputRuntime}
            config={inputConfig}
          />
        )}
      </div>
    </div>
  );
};

export const BaseNode = (props: NodeProps<AFNode>) => {
  const { id, data } = props;
  const workspace = useAppSelector(selectCurrentWorkspace);
  const globalNodeMetas = useAppSelector(selectGlobalNodeMetas);
  const nodeMeta = getNodeMeta(workspace, globalNodeMetas, data.meta);
  if (!nodeMeta) {
    return <ErrorNode error="NodeMeta not found" {...props} />;
  }
  const len = Math.max(nodeMeta.inputs.length, nodeMeta.outputs.length);
  return (
    <>
      <div
        className={`
          flex flex-col
          bg-base-100
          min-w-32
          rounded-t-lg
          shadow-lg
          flow-node-hover:ring-2
          flow-node-hover:ring-primary/80
          flow-node-selected:ring-2
          flow-node-selected:ring-primary/80
        `}
      >
        <div
          className="flex pl-2 pr-2 pt-2"
        >
          <span className="text-xs text-base-content/70">{data.title || nodeMeta.title}</span>
        </div>
        <div className="divider mt-0 mb-0" />
        <div className="flex flex-col pb-3">
          {[...Array(len).keys()].map((i) => (
            <BaseNodeRow
              key={nodeMeta.inputs[i]?.name || nodeMeta.outputs[i]?.name}
              nodeId={id}
              inputMeta={nodeMeta.inputs[i]}
              inputRuntime={data.inputs[i]?.runtime}
              inputConfig={data.inputs[i]?.config}
              outputMeta={nodeMeta.outputs[i]}
              outputRuntime={data.outputs[i]?.runtime}
              outputConfig={data.outputs[i]?.config}
            />
          ))}
        </div>
      </div>
    </>
  )
};