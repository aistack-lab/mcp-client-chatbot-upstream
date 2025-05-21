"use client";
import { Excalidraw } from "@excalidraw/excalidraw";
import React from "react";

import "@excalidraw/excalidraw/index.css";

interface ExcalidrawWrapperProps {
  theme?: "light" | "dark";
}

const ExcalidrawWrapper: React.FC<ExcalidrawWrapperProps> = ({ theme = "light" }) => {
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Excalidraw
        theme={theme}
        UIOptions={{
          canvasActions: {
            export: false,
          },
          dockedSidebarBreakpoint: 9999,
        }}
        gridModeEnabled
      />
    </div>
  );
};

export default ExcalidrawWrapper;