import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden bg-bg">
        {children}
      </div>
    </div>
  );
}
