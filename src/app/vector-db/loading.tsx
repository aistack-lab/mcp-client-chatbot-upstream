import React from "react";

export default function Loading() {
  return (
    <div className="flex flex-col w-full h-full">
      <div className="px-4 pt-3 pb-2 bg-background animate-pulse opacity-60">
        <div className="flex flex-col space-y-2">
          <div className="h-9 w-[280px] bg-muted rounded-md"></div>
          <div className="h-8 w-64 bg-muted rounded-md"></div>
          <div className="h-5 w-80 bg-muted rounded-md"></div>
        </div>
      </div>

      <div
        className="flex-1 mx-4 mb-4 border border-border rounded-lg overflow-hidden"
        style={{ height: "calc(100vh - 140px)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-w-4xl mx-auto animate-pulse opacity-60">
          <div className="border rounded-lg p-6 h-52 flex flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted"></div>
            <div className="h-6 w-32 bg-muted rounded-md"></div>
            <div className="h-4 w-full bg-muted rounded-md"></div>
            <div className="h-4 w-3/4 bg-muted rounded-md"></div>
          </div>
          <div className="border rounded-lg p-6 h-52 flex flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted"></div>
            <div className="h-6 w-40 bg-muted rounded-md"></div>
            <div className="h-4 w-full bg-muted rounded-md"></div>
            <div className="h-4 w-4/5 bg-muted rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
