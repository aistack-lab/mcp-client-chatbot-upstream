"use client";

import React from "react";
import { Search, Zap } from "lucide-react";
import { Toaster } from "sonner";
import { ToggleNav } from "@/components/ui/toggle-nav";

// This is a placeholder page for Vector DBs feature
export default function VectorDBPage() {
  return (
    <div className="flex flex-col w-full h-full">
      <Toaster position="top-right" />

      <div className="px-4 pt-3 pb-2 bg-background">
        <div className="flex flex-col space-y-2">
          <ToggleNav className="w-[280px]" />
          <h1 className="text-2xl font-bold">Vector Database Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage and query vector databases for semantic search and AI operations.
          </p>
        </div>
      </div>

      <div
        className="flex-1 mx-4 mb-4 border border-border rounded-lg overflow-hidden flex flex-col"
        style={{ height: "calc(100vh - 140px)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-w-4xl mx-auto">
          <div className="border rounded-lg p-6 flex flex-col items-center text-center gap-4 bg-card hover:bg-accent/10 transition-colors">
            <Search className="h-10 w-10 text-primary" />
            <h2 className="text-xl font-semibold">Semantic Search</h2>
            <p className="text-muted-foreground">
              Search across your vector embeddings using natural language queries to find
              semantically similar content.
            </p>
          </div>

          <div className="border rounded-lg p-6 flex flex-col items-center text-center gap-4 bg-card hover:bg-accent/10 transition-colors">
            <Zap className="h-10 w-10 text-primary" />
            <h2 className="text-xl font-semibold">Index Management</h2>
            <p className="text-muted-foreground">
              Create, update, and manage vector indexes for your documents, images, and
              other content.
            </p>
          </div>
        </div>

        <div className="mt-auto mb-6 text-center">
          <p className="text-sm text-muted-foreground">
            This feature is currently under development.
          </p>
        </div>
      </div>
    </div>
  );
}
