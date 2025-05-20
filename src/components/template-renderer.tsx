"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useCopy } from "@/hooks/use-copy";
import { Button } from "ui/button";
import { Clipboard, CheckIcon, Code, Maximize2, Minimize2, Loader } from "lucide-react";
import { cn, createDebounce } from "lib/utils";
import { Liquid } from "liquidjs";

// Create a Liquid engine with default options
const liquidEngine = new Liquid({
  strictVariables: false,
  strictFilters: false,
  extname: '.liquid'
});



interface TemplateRendererProps {
  template: string;
  maxHeight?: number;
}

export function TemplateRenderer({ template, maxHeight = 400 }: TemplateRendererProps) {
  const { copied, copy } = useCopy();
  const [renderedOutput, setRenderedOutput] = useState<string>("");
  const [showSource, setShowSource] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Loading state for template processing
  const outputRef = useRef<HTMLDivElement>(null);
  const previousTemplateRef = useRef<string>(template);
  const debounce = useMemo(() => createDebounce(), []);

  useEffect(() => {
    // Reset states if template has changed significantly (new message)
    if (previousTemplateRef.current !== template && !template.startsWith(previousTemplateRef.current)) {
      setLoading(true);
      setError(null);
      setRenderedOutput(""); // Clear previous output
    }
    previousTemplateRef.current = template;

    // Debounce rendering
    debounce(async () => {
      if (!template?.trim()) {
        setRenderedOutput("");
        setError(null);
        setLoading(false);
        return;
      }
      try {
        // Using Liquid to render the template.
        // An empty object {} is passed as context, allowing use of Liquid's
        // built-in features like loops (e.g., {% for i in (1..5) %})
        // and filters that don't rely on external data.
        const result = await liquidEngine.parseAndRender(template, {});
        setRenderedOutput(result);
        setError(null);
      } catch (err: any) {
        console.error("Liquid rendering error:", err);
        setError(err instanceof Error ? err.message : "Failed to render template with Liquid");
        setRenderedOutput("");
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce delay, adjust as needed

    return () => {
      debounce.clear();
    };
  }, [template, debounce]);

  if (loading && !renderedOutput && !error) { // Show loader only if there's no content or error yet
    return (
      <div className="relative bg-accent/30 flex flex-col rounded-2xl overflow-hidden border">
        <div className="w-full flex z-20 py-2 px-4 items-center">
          <span className="text-sm text-muted-foreground">liquid</span>
        </div>
        <div className="px-6 pb-6 overflow-auto" style={{ maxHeight: expanded ? "none" : `${maxHeight}px` }}>
          <div className="flex items-center justify-center h-20 w-full">
            <div className="text-muted-foreground flex items-center gap-2">
              Processing Liquid template <Loader className="size-4 animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-accent/30 flex flex-col rounded-2xl overflow-hidden border">
      <div className="w-full flex z-20 py-2 px-4 items-center">
        <span className="text-sm text-muted-foreground">liquid</span>
        <div className="ml-auto flex">
          <Button
            size="icon"
            variant="ghost"
            className="z-10 p-3! size-2! rounded-sm"
            onClick={() => setShowSource(!showSource)}
            title={showSource ? "Show rendered output" : "Show Liquid template source"}
          >
            <Code className="size-3!" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="z-10 p-3! size-2! rounded-sm"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <Minimize2 className="size-3!" /> : <Maximize2 className="size-3!" />}
          </Button>
          <Button
            size="icon"
            variant={copied ? "secondary" : "ghost"}
            className="z-10 p-3! size-2! rounded-sm"
            onClick={() => {
              copy(showSource ? template : renderedOutput);
            }}
            title={`Copy ${showSource ? "Liquid template" : "rendered output"}`}
          >
            {copied ? <CheckIcon /> : <Clipboard className="size-3!" />}
          </Button>
        </div>
      </div>
      
      <div
        className={cn(
          "px-6 pb-6 overflow-auto",
          !expanded && `max-h-[${maxHeight}px]`
        )}
        style={{ maxHeight: expanded ? "none" : `${maxHeight}px` }}
      >
        {error ? (
          <div className="text-red-500 p-4">
            <p>Error rendering Liquid template:</p>
            <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs overflow-auto">
              {error}
            </pre>
          </div>
        ) : showSource ? (
          <pre className="text-xs overflow-auto p-2 bg-background rounded whitespace-pre-wrap">
            {template}
          </pre>
        ) : (
          <div 
            ref={outputRef}
            className="whitespace-pre-wrap break-words text-sm"
          >
            {renderedOutput}
          </div>
        )}
      </div>
    </div>
  );
}