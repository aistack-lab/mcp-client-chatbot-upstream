"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useCopy } from "@/hooks/use-copy";
import { Button } from "ui/button";
import { Clipboard, CheckIcon, Download } from "lucide-react";
import { KrokiClient, DiagramType } from "@/lib/diagram-renderer";

interface KrokiDiagramProps {
  chart: string;
  type: DiagramType;
}

export function KrokiDiagram({ chart, type }: KrokiDiagramProps) {
  const { theme } = useTheme();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [pngUrl, setPngUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { copied, copy } = useCopy();

  useEffect(() => {
    const loadDiagram = async () => {
      if (!chart || !type) {
        setLoading(false);
        return;
      }

      try {
        // First, validate by trying to get the diagram data
        await KrokiClient.getDiagramData({
          type,
          content: chart,
        });

        // If no errors, set the URLs
        const url = KrokiClient.getDiagramUrl({
          type,
          content: chart,
        });

        const pngUrl = KrokiClient.getDiagramUrl({
          type,
          content: chart,
          outputFormat: "png",
        });

        setImageUrl(url);
        setPngUrl(pngUrl);
        setError(null);
      } catch (err) {
        console.error("Kroki diagram rendering error:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      } finally {
        setLoading(false);
      }
    };

    loadDiagram();
  }, [chart, type, theme]);

  return (
    <div className="relative bg-accent/30 flex flex-col rounded-2xl overflow-hidden border">
      <div className="w-full flex z-20 py-2 px-4 items-center">
        <span className="text-sm text-muted-foreground">{type}</span>
        <div className="ml-auto flex">
          {!loading && !error && (
            <Button
              size="icon"
              variant="ghost"
              className="z-10 p-3! size-2! rounded-sm"
              onClick={() => {
                // Open the PNG URL for download
                window.open(pngUrl, "_blank");
              }}
              title="Download as PNG"
            >
              <Download className="size-3!" />
            </Button>
          )}
          <Button
            size="icon"
            variant={copied ? "secondary" : "ghost"}
            className="z-10 p-3! size-2! rounded-sm"
            onClick={() => {
              copy(chart);
            }}
            title="Copy diagram source"
          >
            {copied ? <CheckIcon /> : <Clipboard className="size-3!" />}
          </Button>
        </div>
      </div>
      <div className="px-6 pb-6">
        {loading ? (
          <div className="animate-pulse flex items-center justify-center h-20 w-full">
            <div className="text-sm text-muted-foreground">
              Rendering {type} diagram...
            </div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">
            <p>Error rendering {type} diagram:</p>
            <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs overflow-auto">
              {error}
            </pre>
            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
              {chart}
            </pre>
          </div>
        ) : (
          <div className="flex justify-center transition-opacity max-w-full overflow-auto">
            <img
              src={imageUrl}
              alt={`${type} diagram`}
              className="max-w-full"
              onError={() => setError(`Failed to load ${type} diagram`)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
