import { NodeMeta } from "@/data/data-type";
import { useAppSelector } from "@/lib/hooks";
import { selectCurrentWorkspace, selectGlobalNodeMetas } from "@/lib/slices/workspace-slice";
import { useMemo } from "react";

export type VersionedNodeMetas = {
  [version: string]: NodeMeta;
}

export type NodeMetaTree = {
  [key: string]: NodeMetaTree | VersionedNodeMetas;
}

export function isNodeMeta(node: NodeMetaTree | NodeMeta): node is NodeMeta {
  return typeof (node as NodeMeta).id === 'string';
}

export function isNodeMetaTree(node: NodeMetaTree | NodeMeta): node is NodeMetaTree {
  return !isNodeMeta(node);
}

function makeNodeMetaTree(nodeMetas: NodeMeta[], tree: NodeMetaTree) {
  for (const meta of nodeMetas) {
    const path = meta.id.split('/');
    let current = tree;
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      if (i === path.length - 1) {
        const realKey = `[m]${key}`;
        const versionedNodeMeta = current[realKey];
        if (!versionedNodeMeta) {
          current[realKey] = {
            [meta.version]: meta,
          };
        } else {
          versionedNodeMeta[meta.version] = meta;
        }
      } else {
        const realKey = `[d]${key}`;
        current[realKey] = current[realKey] || {};
        current = current[realKey] as NodeMetaTree;
      }
    }
  }
}

export const useNodeMetaTree = () => {
  const globalNodeMetas = useAppSelector(selectGlobalNodeMetas);
  const currentWorkspace = useAppSelector(selectCurrentWorkspace);
  const nodeMetaTree = useMemo((): NodeMetaTree => {
    const globalTree: NodeMetaTree = {};
    const userTree: NodeMetaTree = {};
    const tree: NodeMetaTree = {
      '[d]Add System Node': globalTree,
      '[d]Add User Node': userTree,
    };
    makeNodeMetaTree(globalNodeMetas, globalTree);
    makeNodeMetaTree(currentWorkspace.embeddedNodeImpls.map(impl => impl.meta), userTree);
    return tree;
  }, [globalNodeMetas, currentWorkspace.embeddedNodeImpls]);
  return nodeMetaTree;
}