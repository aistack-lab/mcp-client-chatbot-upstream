"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Toaster } from "sonner";
import { Loader } from "lucide-react";
import { useTheme } from "next-themes";
import { ToggleNav } from "@/components/ui/toggle-nav";

// Dynamically import Excalidraw wrapper to prevent SSR issues
const ExcalidrawWrapper = dynamic(
  () => import("./excalidraw-wrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export default function DrawingsPage() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div className="flex flex-col w-full h-full">
      <Toaster position="top-right" />

      <div className="px-4 pt-3 pb-2 bg-background">
        <div className="flex flex-col space-y-2">
          <ToggleNav className="w-[280px]" />
          <h1 className="text-2xl font-bold">Drawing Board</h1>
          <p className="text-muted-foreground text-sm">
            Create diagrams, flowcharts, and illustrations.
          </p>
        </div>
      </div>

      <div className="flex-1 mx-4 mb-4 border border-border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>
        <ExcalidrawWrapper 
          theme={theme}
        />
      </div>
    </div>
  );
}
