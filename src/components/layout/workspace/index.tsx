import { PropsWithChildren } from "react";

export const Workspace = ({ children }: PropsWithChildren) => {
  return (
    <div
      className={`
        workspace 
        relative flex flex-col flex-1
        overflow-x-hidden overflow-y-auto
      `}
    >
      { children }
    </div>
  );
};