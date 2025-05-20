"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { MarkdownCodeRenderer } from "@/components/ui/MarkdownCodeRenderer";

// Dynamically import the editor to prevent SSR issues
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);

export default function MdxEditorPage() {
  const [markdown, setMarkdown] = useState(`
# AIStack Markdown Editor

## Features

- Full Markdown support
- Live preview
- Mermaid diagram support in preview

## Example Mermaid Diagram

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?};
    B -->|Yes| C[Great!];
    B -->|No| D[Keep trying];
    C --> E[Have fun!];
    D --> B;
\`\`\`

\`\`\`mermaid
sequenceDiagram
    participant Patient
    participant Arzt
    participant Kasse
    
    Patient->>Arzt: Vorstellung mit Beschwerden
    Arzt->>Patient: Untersuchung & Diagnose
    Arzt->>Kasse: Abrechnung nach GOÄ
    Kasse->>Patient: Kostenerstattung
\`\`\`
`);

  const handleEditorChange = (value?: string) => {
    setMarkdown(value || "");
  };

  return (
    <div className="container py-10 mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Markdown Editor with Mermaid</h1>
        <p className="text-muted-foreground">
          Edit Markdown content and see Mermaid diagrams rendered in the live preview.
        </p>
      </div>
      
      <div data-color-mode="dark">
        <MDEditor
          value={markdown}
          onChange={handleEditorChange}
          height={600}
          previewOptions={{
            components: {
              code: MarkdownCodeRenderer
            }
          }}
          preview="live"
        />
      </div>
    </div>
  );
}
