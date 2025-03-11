import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import scrollbarHide from 'tailwind-scrollbar-hide';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        // 向上投影 - 不同强度
        'up-sm': '0 -1px 2px 0 rgba(0,0,0,0.05)',
        'up': '0 -2px 4px 0 rgba(0,0,0,0.1)',
        'up-md': '0 -4px 6px -1px rgba(0,0,0,0.1)',
        'up-lg': '0 -10px 15px -3px rgba(0,0,0,0.1)',
        'up-xl': '0 -20px 25px -5px rgba(0,0,0,0.1)',
        
        // 向下投影 - 不同强度
        'down-sm': '0 1px 2px 0 rgba(0,0,0,0.05)',
        'down': '0 2px 4px 0 rgba(0,0,0,0.1)',
        'down-md': '0 4px 6px -1px rgba(0,0,0,0.1)',
        'down-lg': '0 10px 15px -3px rgba(0,0,0,0.1)',
        'down-xl': '0 20px 25px -5px rgba(0,0,0,0.1)',
        
        // 向左投影 - 不同强度
        'left-sm': '-1px 0 2px 0 rgba(0,0,0,0.05)',
        'left': '-2px 0 4px 0 rgba(0,0,0,0.1)',
        'left-md': '-4px 0 6px -1px rgba(0,0,0,0.1)',
        'left-lg': '-10px 0 15px -3px rgba(0,0,0,0.1)',
        'left-xl': '-20px 0 25px -5px rgba(0,0,0,0.1)',
        
        // 向右投影 - 不同强度
        'right-sm': '1px 0 2px 0 rgba(0,0,0,0.05)',
        'right': '2px 0 4px 0 rgba(0,0,0,0.1)',
        'right-md': '4px 0 6px -1px rgba(0,0,0,0.1)',
        'right-lg': '10px 0 15px -3px rgba(0,0,0,0.1)',
        'right-xl': '20px 0 25px -5px rgba(0,0,0,0.1)',
        
        // 组合投影 - 轻微强度 (sm)
        'up-left-sm': '-1px -1px 2px 0 rgba(0,0,0,0.05)',
        'up-right-sm': '1px -1px 2px 0 rgba(0,0,0,0.05)',
        'down-left-sm': '-1px 1px 2px 0 rgba(0,0,0,0.05)',
        'down-right-sm': '1px 1px 2px 0 rgba(0,0,0,0.05)',
        
        // 组合投影 - 基础强度
        'up-left': '-2px -2px 4px 0 rgba(0,0,0,0.1)',
        'up-right': '2px -2px 4px 0 rgba(0,0,0,0.1)',
        'down-left': '-2px 2px 4px 0 rgba(0,0,0,0.1)',
        'down-right': '2px 2px 4px 0 rgba(0,0,0,0.1)',
        
        // 组合投影 - 中等强度 (md)
        'up-left-md': '-4px -4px 6px -1px rgba(0,0,0,0.1)',
        'up-right-md': '4px -4px 6px -1px rgba(0,0,0,0.1)',
        'down-left-md': '-4px 4px 6px -1px rgba(0,0,0,0.1)',
        'down-right-md': '4px 4px 6px -1px rgba(0,0,0,0.1)',
        
        // 组合投影 - 较强强度 (lg)
        'up-left-lg': '-10px -10px 15px -3px rgba(0,0,0,0.1)',
        'up-right-lg': '10px -10px 15px -3px rgba(0,0,0,0.1)',
        'down-left-lg': '-10px 10px 15px -3px rgba(0,0,0,0.1)',
        'down-right-lg': '10px 10px 15px -3px rgba(0,0,0,0.1)',
        
        // 组合投影 - 最强强度 (xl)
        'up-left-xl': '-20px -20px 25px -5px rgba(0,0,0,0.1)',
        'up-right-xl': '20px -20px 25px -5px rgba(0,0,0,0.1)',
        'down-left-xl': '-20px 20px 25px -5px rgba(0,0,0,0.1)',
        'down-right-xl': '20px 20px 25px -5px rgba(0,0,0,0.1)',
      },
    },
  },
  darkMode: "selector",
  plugins: [
    scrollbarHide,
    plugin(function({ addVariant }) {
      addVariant('flow-node', '.react-flow__node &');
      addVariant('flow-node-selected', '.react-flow__node.selected &');
      addVariant('flow-node-focus', '.react-flow__node:focus &');
      addVariant('flow-node-focus-visible', '.react-flow__node:focus-visible &');
      addVariant('flow-node-hover', '.react-flow__node:hover &');
      addVariant('flow-handle', '.react-flow__handle &');
      addVariant('flow-handle-selected', '.react-flow__handle.selected &');
      addVariant('flow-handle-focus', '.react-flow__handle:focus &');
      addVariant('flow-handle-focus-visible', '.react-flow__handle:focus-visible &');
      addVariant('flow-handle-hover', '.react-flow__handle:hover &');
      addVariant('flow-handle-connecting', '.react-flow__handle.connecting &');
      addVariant('flow-handle-connecting-from', '.react-flow__handle.connectingfrom &');
      addVariant('flow-handle-connecting-to', '.react-flow__handle.connectingto &');
    }),
  ],
};

export default config;