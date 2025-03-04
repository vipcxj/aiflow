'use client'
import { useRef } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react';
import { makeStore, AppStore, Persistor } from '@/lib/store'

export default function StoreProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const storeRef = useRef<AppStore>(undefined);
    const persisterRef = useRef<Persistor>(undefined);
    if (!storeRef.current || !persisterRef.current) {
        const { store, persistor } = makeStore();
        storeRef.current = store;
        persisterRef.current = persistor;
    }

    return <Provider store={storeRef.current}>
        <PersistGate loading={null} persistor={persisterRef.current}>
            {children}
        </PersistGate>
    </Provider>
}