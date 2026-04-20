import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AttemptSync } from "@/components/AttemptSync";
import { getProfile, isPro } from "@/lib/auth";

export default async function ShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getProfile();
  const sidebarUser = profile
    ? { email: profile.email, isPro: isPro(profile.subscription_status) }
    : null;

  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar user={sidebarUser} />
      <div className="flex-1 flex flex-col overflow-hidden bg-bg">
        {children}
      </div>
      {profile ? <AttemptSync /> : null}
    </div>
  );
}
