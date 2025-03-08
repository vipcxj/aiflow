/**
 * Type definitions for AIFlow node system
 * 
 * @typedef {string} NodeRuntime - Defines where the node can execute
 * @typedef {string} NodeType - Base type for nodes
 * @typedef {string} NodeNativeMode - Controls native execution preference
 * 
 * @typedef {Object} AnyType - Represents an untyped value
 * 
 * @typedef {Object} IntType - Integer type with optional constraints
 * @property {string} name - Type identifier
 * @property {number[]} [enum] - Enumeration of allowed values
 * @property {[number, number]} [range] - Min and max allowed values
 * @property {number} [default] - Default value
 * 
 * @typedef {Object} FloatType - Float type with optional constraints
 * @property {string} name - Type identifier
 * @property {number[]} [enum] - Enumeration of allowed values
 * @property {[number, number]} [range] - Min and max allowed values
 * @property {number} [default] - Default value
 * 
 * @typedef {Object} StringType - String type with optional constraints
 * @property {string} name - Type identifier
 * @property {string[]} [enum] - Enumeration of allowed values
 * @property {string} [default] - Default value
 * 
 * @typedef {Object} BoolType - Boolean type
 * @property {string} name - Type identifier
 * @property {boolean} [default] - Default value
 * 
 * @typedef {Object} ArrayType - Array type with specific shape
 * @property {string} name - Type identifier
 * @property {number[]} shape - Dimensions of the array
 * 
 * @typedef {Object} DictType - Dictionary/object type with defined key types
 * @property {string} name - Type identifier
 * @property {Object.<string, NodeEntryType>} keys - Dictionary of key names to their types
 * 
 * @typedef {Object} NDArrayType - N-dimensional array type
 * @property {string} name - Type identifier
 * @property {number[]} shape - Dimensions of the array
 * 
 * @typedef {Object} TorchTensorType - PyTorch tensor type
 * @property {string} name - Type identifier
 * @property {number[]} shape - Dimensions of the tensor
 * 
 * @typedef {Object} PythonObjectType - Python object reference
 * @property {string} name - Type identifier
 * @property {string} type - Python class or type name
 * 
 * @typedef {(StringType|IntType|FloatType|BoolType|ArrayType|DictType|NDArrayType|TorchTensorType|PythonObjectType|NodeEntryType[])} NodeEntryType - Union of all possible entry types
 * 
 * @enum {number} RecommandLevel - Indicates importance level of nodes
 * @property {number} BROKEN - Shows error when used
 * @property {number} DEPRECATED - Shows warning when used
 * @property {number} NORMAL - Standard node, no notifications
 * @property {number} RECOMMAND - Shows info when not used
 * @property {number} SHOULD - Shows warning when not used
 * @property {number} MUST - Shows error when not used
 * 
 * @typedef {Object} NodeEntry - Input/output definition for a node
 * @property {string} name - Name of the entry point
 * @property {NodeEntryType} type - Data type for this entry
 * @property {RecommandLevel} recommandLevel - Importance level
 * @property {string} description - Human-readable description
 * 
 * @typedef {Object} NodeMeta - Metadata defining node behavior
 * @property {string} id - Unique identifier
 * @property {string} version - Version string
 * @property {NodeType} type - Type classification
 * @property {boolean} native - Whether node has native implementation
 * @property {string} [impl] - Implementation details/path
 * @property {NodeRuntime} runtime - Execution environment
 * @property {Object} [verificationCode] - Code to verify node compatibility
 * @property {string} [verificationCode.js] - JavaScript verification code
 * @property {string} [verificationCode.py] - Python verification code
 * @property {NodeEntry[]} inputs - Input definitions
 * @property {NodeEntry[]} outputs - Output definitions
 * @property {string} [defaultRenderer] - Default rendering component
 * 
 * @typedef {Object} NodeMetaRef - Reference to node metadata
 * @property {string} id - Node identifier
 * @property {string} version - Node version
 * 
 * @typedef {Object} Node - Instance of a node in a graph
 * @property {string} id - Unique instance identifier
 * @property {NodeMetaRef} meta - Reference to node type
 * @property {Object} position - Position in graph
 * @property {number} position.x - X coordinate
 * @property {number} position.y - Y coordinate
 * @property {Object} size - Node dimensions
 * @property {number} size.width - Width of node
 * @property {number} size.height - Height of node
 * @property {boolean} collapsed - Whether node is collapsed in UI
 * @property {NodeNativeMode} nativeMode - Native execution preference
 * @property {string} renderer - UI component to render this node
 */

export type NodeRuntime = 'frontend' | 'backend' | 'prefer-frontend' | 'prefer-backend' | 'not-care';
export type NodeType = 'base';
export type NodeNativeMode = 'prefer' | 'disable' | 'force';

export type AnyType = {
  name: 'any';
};

export type IntType = {
  name: 'int';
  enum?: number[];
  range?: [number, number];
  default?: number;
};

export type FloatType = {
  name: 'float';
  enum?: number[];
  range?: [number, number];
  default?: number;
};

export type StringType = {
  name: 'string';
  enum?: string[];
  default?: string;
};

export type BoolType = {
  name: 'bool';
  default?: boolean;
};

export type ArrayType = {
  name: 'array';
  shape: number[];
};

export type DictType = {
  name: 'dict';
  keys: {
    [key: string]: NodeEntryType;
  }
};

export type NDArrayType = {
  name: 'ndarray';
  shape: number[];
};

export type TorchTensorType = {
  name: 'torch-tensor';
  shape: number[];
};

export type PythonObjectType = {
  name: 'python-object';
  type: string;
};

export type NodeEntryType = 
  StringType 
  | IntType
  | FloatType 
  | BoolType
  | ArrayType
  | DictType
  | NDArrayType
  | TorchTensorType
  | PythonObjectType
  | NodeEntryType[];

export const enum RecommandLevel {
  BROKEN = -2, // show error message when user use this node
  DEPRECATED = -1, // show warning message when user use this node
  NORMAL = 0, // show nothing when user use or not use this node
  RECOMMAND = 1, // show info message when user not use this node
  SHOULD = 2, // show warning message when user not use this node
  MUST = 3, // show error message when user not use this node
};

export type NodeEntry = {
  name: string;
  type: NodeEntryType;
  recommandLevel: RecommandLevel;
  description: string;
};

export type NodeMeta = {
  id: string;
  version: string;
  type: NodeType;
  native: boolean;
  impl?: string;
  runtime: NodeRuntime
  verificationCode?: {
    js?: string;
    py?: string;
  },
  inputs: NodeEntry[];
  outputs: NodeEntry[];
  defaultRenderer?: string;
};

export type NodeMetaRef = {
  id: string;
  version: string;
};

export type Node = {
  id: string;
  meta: NodeMetaRef;
  position: {
    x: number;
    y: number;
  },
  size: {
    width: number;
    height: number;
  },
  collapsed: boolean;
  nativeMode: NodeNativeMode;
  renderer: string;
};