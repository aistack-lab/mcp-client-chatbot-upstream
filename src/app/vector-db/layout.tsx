```tsx
import { SidebarProvider } from "ui/sidebar";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/app-header";
import React from "react";

export default function VectorDBLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="relative w-full flex flex-col h-screen">
        <AppHeader />
        {children}
      </main>
    </SidebarProvider>
  );
}
```