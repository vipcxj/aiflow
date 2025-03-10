import type { NodeMeta } from "./data-type";
import { RecommandLevel } from "./enum";

export const globalNodeMetas: NodeMeta[] = [
  {
    id: 'math/plus',
    version: '0.0.1',
    title: 'Plus',
    type: 'base',
    native: true,
    runtime: 'backend',
    inputs: [
      {
        name: 'operand 1',
        type: [{
          name: 'int',
        }, {
          name: 'float',
        }],
        recommandLevel: RecommandLevel.MUST,
        description: 'The first number to be added.',
      },
      {
        name: 'operand 2',
        type: [{
          name: 'int',
        }, {
          name: 'float',
        }],
        recommandLevel: RecommandLevel.MUST,
        description: 'The second number to be added.',
      }
    ],
    outputs: [{
      name: 'result',
      type: [{
        name: 'int',
      }, {
        name: 'float',
      }],
      recommandLevel: RecommandLevel.NORMAL,
      description: 'The result of the addition.',
    }],
    defaultRenderer: 'default',
  }
];