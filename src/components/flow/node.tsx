"use client";

import { isBoolNodeEntryType, isNumberNodeEntryType, isNodeEntryTypeSupportInput, sortInputNodeEntries } from "@/data/utils";
import { AFNode } from "@/data/flow-type";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectGlobalNodeMetas, setNodeEntryData, getNodeMeta, selectCurrentWorkspace } from "@/lib/slices/workspace-slice";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { NodeEntry, NodeEntryConfig, NodeEntryRuntime } from "@/data/data-type";
import { useCallback } from "react";
import { Circle } from "../icons/circle";
import { NoSymbol } from "../icons/no-symbol";
import { ArrowPath } from "../icons/arrow-path";

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
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
    dispatch(setNodeEntryData({
      nodeId,
      entryId: config.name,
      data,
      type: 'input'
    }));
  }, [dispatch, setNodeEntryData, nodeId, config.name]);
  if (config.mode === 'handle') {
    return null;
  }
  if (!isNodeEntryTypeSupportInput(meta.type)) {
    return null;
  }
  if (isBoolNodeEntryType(meta.type)) {
    return (
      <input
        type="checkbox"
        checked={runtime.data}
        onAbort={onChange}
      />
    );
  } else if (isNumberNodeEntryType(meta.type)) {
    return (
      <input
        type="number"
        value={runtime.data}
        onChange={onChange}
      />
    );
  } else {
    return (
      <input
        type="text"
        value={runtime.data}
        onChange={onChange}
      />
    );
  }
};

const BaseNodeRow = ({ nodeId, inputMeta, inputRuntime, inputConfig, outputMeta, outputRuntime, outputConfig }: BaseNodeRowProps) => {
  let showSwitchBtn = false;
  if (inputMeta && inputRuntime) {

  }
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
                  w-4 h-4 pointer-events-none
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
                className="w-4 h-4 stroke-[1.5] text-secondary/70"
              />
            )}
            {inputConfig.name}
            <button className="btn btn-ghost btn-circle btn-xs">
              <ArrowPath className="w-3 h-3" />
            </button>
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
                w-4 h-4 pointer-events-none
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
  const sortedInputEntries = sortInputNodeEntries(nodeMeta.inputs, data.inputs);
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
          {sortedInputEntries.map((entry, index) => (
            <BaseNodeRow
              key={entry.meta.name}
              nodeId={id}
              inputMeta={entry.meta}
              inputRuntime={entry.runtime}
              inputConfig={entry.config}
              outputMeta={nodeMeta.outputs[index]}
              outputRuntime={data.outputs[index]?.runtime}
              outputConfig={data.outputs[index]?.config}
            />
          ))}
        </div>
      </div>
    </>
  )
};