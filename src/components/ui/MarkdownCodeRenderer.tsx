"use client";

import React, { useState, useRef, useEffect, Fragment, useCallback } from "react";
import mermaid from "mermaid";

// Function to safely extract code from various node structures
const getCodeString = (children: any[] = []) => {
  if (!Array.isArray(children)) {
    return "";
  }
  
  return children
    .map((node) => {
      if (!node) return "";
      if (typeof node === "string") return node;
      if (node.type === "text" && node.value) return node.value;
      if (node.children && Array.isArray(node.children)) {
        return getCodeString(node.children);
      }
      return "";
    })
    .join("");
};

// Initialize mermaid with desired configuration
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  fontFamily: "var(--font-geist-sans)",
  securityLevel: "loose",
});

// Generate a random ID
const randomid = () => parseInt(String(Math.random() * 1e15), 10).toString(36);

// Custom code component for markdown preview
export const MarkdownCodeRenderer = ({
  inline,
  children = [],
  className,
  ...props
}: {
  inline?: boolean;
  children?: React.ReactNode[];
  className?: string;
  [key: string]: any;
}) => {
  const demoid = useRef(`dome${randomid()}`);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const isMermaid = className && /language-mermaid/.test(className.toLowerCase());

  // Extract code string from children or props
  const code =
    children && props.node
      ? getCodeString(props.node.children)
      : Array.isArray(children)
        ? (children[0] as string) || ""
        : "";

  // Effect to render mermaid diagrams
  useEffect(() => {
    if (container && isMermaid && demoid.current && code) {
      try {
        mermaid
          .render(demoid.current, code)
          .then(({ svg, bindFunctions }) => {
            if (container) {
              container.innerHTML = svg;
              if (bindFunctions) {
                bindFunctions(container);
              }
            }
          })
          .catch((error) => {
            console.error("Mermaid rendering error:", error);
            if (container) {
              container.innerHTML = `
                <div style="color: #ef4444; padding: 0.5rem; background-color: #fee2e2; border-radius: 0.25rem;">
                  <p style="font-weight: 500; margin-bottom: 0.25rem;">Error rendering diagram:</p>
                  <pre style="font-size: 0.75rem; overflow: auto;">${error.message || "Unknown error"}</pre>
                </div>
              `;
            }
          });
      } catch (error) {
        console.error("Error initializing mermaid render:", error);
      }
    }
  }, [container, isMermaid, code, demoid]);

  // Callback ref to get container element
  const refElement = useCallback((node: HTMLElement | null) => {
    if (node !== null) {
      setContainer(node);
    }
  }, []);

  // Render mermaid diagram or regular code block
  if (isMermaid) {
    return (
      <Fragment>
        <code id={demoid.current} style={{ display: "none" }} />
        <code className={className} ref={refElement} data-name="mermaid" />
      </Fragment>
    );
  }

  // Return regular code block for non-mermaid code
  return <code className={className}>{children}</code>;
};

export default MarkdownCodeRenderer;
