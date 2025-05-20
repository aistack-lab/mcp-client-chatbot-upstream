"use client";

import { useState } from "react";
import { useCopy } from "@/hooks/use-copy";
import { Button } from "ui/button";
import { Clipboard, CheckIcon, Download } from "lucide-react";

interface SVGRendererProps {
  svgContent: string;
}

export function SVGRenderer({ svgContent }: SVGRendererProps) {

  const { copied, copy } = useCopy();
  const [showSource, setShowSource] = useState(false);

  // Create a data URL for download
  const svgDataUrl = () => {
    try {
      // Make sure the SVG has proper XML declaration and namespace
      const svgWithNamespace = svgContent.includes('xmlns="http://www.w3.org/2000/svg"') 
        ? svgContent 
        : svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      
      const blob = new Blob([svgWithNamespace], { type: 'image/svg+xml' });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error("Error creating SVG data URL:", err);
      return null;
    }
  };

  // Safety check for SVG content
  const isSafeToRender = () => {
    // Simple validation to ensure it's an SVG
    return svgContent.trim().startsWith('<svg') && svgContent.includes('</svg>');
  };

  return (
    <div className="relative bg-accent/30 flex flex-col rounded-2xl overflow-hidden border">
      <div className="w-full flex z-20 py-2 px-4 items-center">
        <span className="text-sm text-muted-foreground">svg</span>
        <div className="ml-auto flex">
          <Button
            size="icon"
            variant="ghost"
            className="z-10 p-3! size-2! rounded-sm"
            onClick={() => setShowSource(!showSource)}
            title={showSource ? "Show rendered SVG" : "Show SVG source"}
          >
            {showSource ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 7L7 17M7 7L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="z-10 p-3! size-2! rounded-sm"
            onClick={() => {
              const url = svgDataUrl();
              if (url) {
                const link = document.createElement('a');
                link.href = url;
                link.download = 'diagram.svg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }
            }}
            title="Download SVG"
          >
            <Download className="size-3!" />
          </Button>
          <Button
            size="icon"
            variant={copied ? "secondary" : "ghost"}
            className="z-10 p-3! size-2! rounded-sm"
            onClick={() => {
              copy(svgContent);
            }}
            title="Copy SVG source"
          >
            {copied ? <CheckIcon /> : <Clipboard className="size-3!" />}
          </Button>
        </div>
      </div>
      <div className="px-6 pb-6">
        {showSource ? (
          <pre className="text-xs overflow-auto p-2 bg-background rounded">
            {svgContent}
          </pre>
        ) : isSafeToRender() ? (
          <div className="flex justify-center transition-opacity max-w-full overflow-auto bg-white rounded p-2">
            <div dangerouslySetInnerHTML={{ __html: svgContent }} />
          </div>
        ) : (
          <div className="text-red-500 p-4">
            <p>Error: Invalid SVG content</p>
            <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs overflow-auto">
              {svgContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}