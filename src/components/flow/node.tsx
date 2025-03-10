"use client";

import { getNodeMeta, isBoolNodeEntryType, isFloatNodeEntryType, isIntNodeEntryType, isNodeEntrySupportInput, sortInputNodeEntries } from "@/data/utils";
import { AFNode } from "@/data/flow-type";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectCurrentFlow, selectGlobalNodeMetas, setNodeEntryData } from "@/lib/slices/workspace-slice";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { NodeEntry, NodeEntryRuntime } from "@/data/data-type";
import { useCallback } from "react";

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
  if (runtime.mode === 'handle') {
    return null;
  }
  const dispatch = useAppDispatch();
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let data: any = e.target.value;
    if (isBoolNodeEntryType(meta.type)) {
      data = e.target.checked;
    } else if (isIntNodeEntryType(meta.type)) {
      data = parseInt(e.target.value);
    } else if (isFloatNodeEntryType(meta.type)) {
      data = parseFloat(e.target.value);
    }
    dispatch(setNodeEntryData({
      nodeId,
      entryId: runtime.name,
      data,
      type: 'input'
    }));
  }, [dispatch, setNodeEntryData, nodeId, runtime.name]);
  if (!isNodeEntrySupportInput(meta)) {
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
  } else if (isIntNodeEntryType(meta.type) || isFloatNodeEntryType(meta.type)) {
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
  return (
    <div className="flex flex-col">
      <div className="inline-flex">
        {inputMeta && inputRuntime && (
          <span className="justify-self-start">
            {inputRuntime.mode === 'handle' && (
              <Handle
                type="source"
                position={Position.Left}
                id={inputRuntime.name}
              />
            )}
            {inputMeta.name}
          </span>
        )}
        {outputMeta && outputRuntime && (
          <span className="justify-self-end">
            {outputMeta.name}
            <Handle
              type="target"
              position={Position.Right}
              id={outputRuntime.name}
            />
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
  const { data } = props;
  const flow = useAppSelector(selectCurrentFlow);
  const globalNodeMetas = useAppSelector(selectGlobalNodeMetas);
  const nodeMeta = getNodeMeta(flow.data, globalNodeMetas, data.meta);
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
          min-h-48
        `}
      >
        <div
          className="flex"
        >
          <span>{data.title || nodeMeta.title}</span>
        </div>
        <div className="divider" />
        <div className="flex flex-col">
          {sortedInputEntries.map((entry, index) => (
            <BaseNodeRow
              key={entry.runtime.name}
              nodeId={data.id}
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