import type { ExecRuntime } from './runtime';

function plus({ args }: ExecRuntime) {
  const arg1 = args['a'];
  const arg2 = args['b'];
  if (typeof arg1 !== 'number' || typeof arg2 !== 'number') {
    throw new Error('Arguments must be numbers.');
  }
  return { result: arg1 + arg2 };
}

const apis = {
  plus,
};

export default apis;