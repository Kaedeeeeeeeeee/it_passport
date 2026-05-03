import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AttemptSync } from "@/components/AttemptSync";
import { SubscribeModalProvider } from "@/components/subscribe/SubscribeModal";
import { isPro, requireAuth } from "@/lib/auth";

export default async function ShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireAuth("/home");
  const sidebarUser = {
    email: profile.email,
    isPro: isPro(profile.subscription_status),
  };

  return (
    <SubscribeModalProvider>
      <div className="flex flex-1 min-h-0">
        <Sidebar user={sidebarUser} />
        <div className="flex-1 flex flex-col overflow-hidden bg-bg">
          {children}
        </div>
        <AttemptSync />
      </div>
    </SubscribeModalProvider>
  );
}
