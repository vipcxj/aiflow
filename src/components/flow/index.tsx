import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react'

import '@xyflow/react/dist/style.css';

export const Flow = () => {
    return (
        <ReactFlow nodes={[]} edges={[]}>
            <Controls />
            <MiniMap />
            <Background />
        </ReactFlow>
    );
}