import type { Action, ThunkAction } from '@reduxjs/toolkit';
import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { contextMenuSlice, SLICE_NAME as ContextMenuSliceName } from './slices/context-menu-slice'
import { flowSlice } from './slices/flow-slice';

const persistConfig = {
  key: 'root',
  storage,
  blacklist: [ContextMenuSliceName],
};

const rootReducer = persistReducer(persistConfig, combineSlices(contextMenuSlice, flowSlice));

export const makeStore = () => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredPaths: ['contextMenu'],
          ignoredActions: [
            FLUSH,
            REHYDRATE,
            PAUSE,
            PERSIST,
            PURGE,
            REGISTER,
            `${ContextMenuSliceName}/openContextMenu`,
            `${ContextMenuSliceName}/closeContextMenu`,
          ],
        },
      }),
  });
  const persistor = persistStore(store);
  return { store, persistor }
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>['store'];
export type Persistor = ReturnType<typeof makeStore>['persistor'];
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ThunkReturnType = void> = ThunkAction<ThunkReturnType, RootState, unknown, Action>;