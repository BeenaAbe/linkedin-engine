"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

const NO_SHELL_ROUTES = ["/login", "/auth"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isShellless = NO_SHELL_ROUTES.some((r) => pathname.startsWith(r));

  if (isShellless) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 ml-72 h-screen overflow-hidden">{children}</main>
    </>
  );
}
