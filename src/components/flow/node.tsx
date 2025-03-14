"use client";

import { isBoolNodeEntryType, isNumberNodeEntryType, isNodeEntrySupportInput, sortInputNodeEntries } from "@/data/utils";
import { AFNode } from "@/data/flow-type";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectGlobalNodeMetas, setNodeEntryData, getNodeMeta, selectCurrentWorkspace } from "@/lib/slices/workspace-slice";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { NodeEntry, NodeEntryRuntime } from "@/data/data-type";
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
  outputMeta?: NodeEntry;
  outputRuntime?: NodeEntryRuntime;
};

type EntryInputProps = {
  nodeId: string;
  meta: NodeEntry;
  runtime: NodeEntryRuntime;
};

const EntryInput = ({ nodeId, meta, runtime }: EntryInputProps) => {
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
      entryId: runtime.name,
      data,
      type: 'input'
    }));
  }, [dispatch, setNodeEntryData, nodeId, runtime.name]);
  if (runtime.mode === 'handle') {
    return null;
  }
  if (!isNodeEntrySupportInput(meta.type)) {
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

const BaseNodeRow = ({ nodeId, inputMeta, inputRuntime, outputMeta, outputRuntime }: BaseNodeRowProps) => {
  let showSwitchBtn = false;
  if (inputMeta && inputRuntime) {

  }
  return (
    <div className="flex flex-col text-xs">
      <div className="inline-flex justify-between">
        {inputMeta && inputRuntime && (
          <span className="inline-flex items-center ml-1 mr-4">
            {inputRuntime.mode === 'handle' && (
              <Handle
                type="source"
                position={Position.Left}
                id={inputRuntime.name}
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
            {inputRuntime.mode === 'input' && (
              <NoSymbol
                className="w-4 h-4 stroke-[1.5] text-secondary/70"
              />
            )}
            {inputMeta.name}
            <button className="btn btn-ghost btn-circle btn-xs">
              <ArrowPath className="w-3 h-3" />
            </button>
          </span>
        )}
        {outputMeta && outputRuntime && (
          <span className="inline-flex items-center mr-1 ml-4">
            {outputMeta.name}
            <Handle
              type="target"
              position={Position.Right}
              id={outputRuntime.name}
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
        {inputMeta && inputRuntime && inputRuntime.mode === 'input' && (
          <EntryInput
            nodeId={nodeId}
            meta={inputMeta}
            runtime={inputRuntime}
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
              key={entry.runtime.name}
              nodeId={id}
              inputMeta={entry.meta}
              inputRuntime={entry.runtime}
              outputMeta={nodeMeta.outputs[index]}
              outputRuntime={data.outputs[index]}
            />
          ))}
        </div>
      </div>
    </>
  )
};