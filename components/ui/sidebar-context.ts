import { createContext, useContext } from "react";

export type SidebarContextProps = {
  readonly state: "expanded" | "collapsed";
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly openMobile: boolean;
  readonly setOpenMobile: (open: boolean) => void;
  readonly isMobile: boolean;
  readonly toggleSidebar: () => void;
};

export const SidebarContext = createContext<SidebarContextProps | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}
