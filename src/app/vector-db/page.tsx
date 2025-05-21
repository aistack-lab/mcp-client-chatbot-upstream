"use client";

import React from "react";
import { Search, Zap } from "lucide-react";


// This is a placeholder page for Vector DBs feature
export default function VectorDBPage() {
  return (
    <div className="flex flex-col w-full flex-1 p-4">

      <div
        className="flex-1 border border-border rounded-lg overflow-hidden flex flex-col"
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
