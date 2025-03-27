import { AppWorkspaceState, WorkspaceState } from "./flow-type";

export function isAppWorkspace(workspace: WorkspaceState): workspace is AppWorkspaceState {
    return workspace.type === 'app';
}

export function isLibWorkspace(workspace: WorkspaceState): workspace is AppWorkspaceState {
    return workspace.type === 'lib';
}