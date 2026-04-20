import type { ReactNode } from "react";

/** Minimal focus-mode layout: no sidebar, centered content. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      {children}
    </div>
  );
}
