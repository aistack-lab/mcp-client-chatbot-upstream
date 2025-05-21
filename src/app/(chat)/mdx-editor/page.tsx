"use client";

import React, { useState, useRef, useEffect } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { MarkdownCodeRenderer } from "@/components/ui/MarkdownCodeRenderer";
import type { ImageDimensions } from "@/components/ui/MarkdownExportTools";
import { Toaster } from "sonner";
import { ToggleNav } from "@/components/ui/toggle-nav";

// Dynamically import the MarkdownExportTools to avoid SSR issues
const MarkdownExportTools = dynamic(() => import("@/components/ui/MarkdownExportTools"), {
  ssr: false,
});

// Dynamically import the editor to prevent SSR issues
const MDEditor = dynamic(() => import("@uiw/react-md-editor").then(mod => {
  // We need to modify the global window object to prevent React DOM conflicts
  if (typeof window !== 'undefined') {
    // Monkey patch the removeChild method to prevent errors
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function(child) {
      try {
        if (child && this.contains(child)) {
          return originalRemoveChild.call(this, child);
        }
      } catch (_) {
        // Silent fail to avoid console noise
      }
      return child as any; // Fix type casting
    };
    
    // Add minimal styling for cursor alignment
    if (typeof document !== 'undefined') {
      // Create and add style to document
      const style = document.createElement('style');
      style.textContent = `
      .w-md-editor-text-pre > code,
      .w-md-editor-text-input {
        font-family: monospace !important;
        font-size: 14px !important;
        line-height: 20px !important;
      }
    `;
      document.head.appendChild(style);
    }
  }
  return mod;
}), { ssr: false });

export default function MdxEditorPage() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const defaultMarkdown = `
# AIStack Markdown Editor

## Features

- Full Markdown support
- Live preview
- Mermaid diagram support in preview
- Export to HTML, PDF, and Markdown
- Image upload with drag-and-drop
- Image resizing and alignment

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
`;
  
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);

  const handleEditorChange = (value?: string) => {
    updateEditorContent(value || "");
  };

  const handleInsertImage = (imageUrl: string, dimensions?: ImageDimensions) => {
    let imageMarkdown = `![image](${imageUrl})`;

    if (dimensions) {
      const { width, align } = dimensions;
      let alignStyle = "";

      if (align === "left") alignStyle = "float:left;margin-right:10px;";
      else if (align === "right") alignStyle = "float:right;margin-left:10px;";
      else if (align === "center") alignStyle = "display:block;margin:0 auto;";

      imageMarkdown = `<img src="${imageUrl}" alt="image" style="width:${width}%;${alignStyle}" />`;
    }

    setMarkdown((prev) => {
      // Get cursor position for editor to insert at proper location
      // For simplicity, we'll append to the end in this implementation
      return `${prev}\n\n${imageMarkdown}`;
    });
  };

  // Use our custom hook to safely handle the editor lifecycle
  // No reference needed
  
  // Listen for file loading messages from sidebar
  // Load saved content from localStorage on initial render
  useEffect(() => {
    // If we have a default state but no explicit filename, use "default.md"
    if (typeof window !== 'undefined' && markdown === defaultMarkdown) {
      const savedDefault = window.localStorage.getItem('md_content_default.md');
      if (savedDefault) {
        updateEditorContent(savedDefault);
      } else {
        // Store the default content in localStorage
        window.localStorage.setItem('md_content_default.md', defaultMarkdown);
      }
    }
  }, [markdown, defaultMarkdown]);
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from the same origin
      if (event.origin !== window.location.origin) return;
      
      // Check if it's a markdown load request
      if (event.data && event.data.type === 'LOAD_MARKDOWN') {
        const contentToLoad = event.data.content;
        
        if (event.data.filename) {
          setCurrentFilename(event.data.filename);
          // Store the association between filename and content
          window.localStorage.setItem(`md_content_${event.data.filename}`, contentToLoad);
        } else {
          setCurrentFilename(null);
        }
        
        updateEditorContent(contentToLoad);
      }
      
      // Handle save notifications
      if (event.data && event.data.type === 'MARKDOWN_SAVED') {
        if (event.data.filename) {
          setCurrentFilename(event.data.filename);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Handle editor init and DOM conflict prevention
  // Helper function to update editor content
  const updateEditorContent = (content: string) => {
    setMarkdown(content);
    
    // Store content in localStorage for persistence
    if (typeof window !== 'undefined') {
      // Store with filename as key if available
      if (currentFilename) {
        window.localStorage.setItem(`md_content_${currentFilename}`, content);
      }
      
      // Broadcast content update to sidebar
      window.postMessage({ 
        type: 'EDITOR_CONTENT_UPDATED', 
        content: content 
      }, window.location.origin);
    }
  };

  return (
    <div className="w-full py-10 px-4">
      <Toaster position="top-right" />
      <div className="mb-6">
        <ToggleNav className="w-[280px] mb-4" />
        <h1 className="text-3xl font-bold mb-2">AIStack Markdown Editor</h1>
        <p className="text-muted-foreground">
          Edite Markdown, bearbeite Mermaid diagramme, mit live preview.
        </p>
      </div>

      <MarkdownExportTools
        markdownContent={markdown}
        previewRef={previewRef}
        onInsertImageAction={handleInsertImage}
        currentFilename={currentFilename || "unsaved.md"}
      />

      <div data-color-mode="dark" className="w-full">
        <MDEditor
          value={markdown}
          onChange={handleEditorChange}
          height={650}
          previewOptions={{
            components: {
              code: (props: any) => <MarkdownCodeRenderer {...props} />,
            },
          }}
          preview="live"
          textareaProps={{
            style: {
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '20px',
            }
          }}
        />

        {/* Hidden div to handle PDF export */}
        <div ref={previewRef} style={{ display: "none" }}>
          <MarkdownPreview source={markdown} />
        </div>
      </div>
    </div>
  );
}
