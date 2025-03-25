export enum RecommandLevel {
  BROKEN = -2, // show error message when user use this node
  DEPRECATED = -1, // show warning message when user use this node
  NORMAL = 0, // show nothing when user use or not use this node
  RECOMMAND = 1, // show info message when user not use this node
  SHOULD = 2, // show warning message when user not use this node
  MUST = 3, // show error message when user not use this node
};
