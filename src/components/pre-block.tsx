"use client";

import type { JSX } from "react";
import { bundledLanguages, codeToHast, type BundledLanguage } from "shiki/bundle/web";
import { Fragment, useLayoutEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { safe } from "ts-safe";
import { cn } from "lib/utils";
import { useTheme } from "next-themes";
import { Button } from "ui/button";
import { Clipboard, CheckIcon } from "lucide-react";
import JsonView from "ui/json-view";
import { useCopy } from "@/hooks/use-copy";
import dynamic from "next/dynamic";
import { DiagramType } from "@/lib/diagram-renderer";

// Dynamically import TemplateRenderer component
const TemplateRenderer = dynamic(
  () => import("./template-renderer").then((mod) => mod.TemplateRenderer),
  {
    loading: () => (
      <div className="text-sm flex bg-accent/30 flex-col rounded-2xl relative my-4 overflow-hidden border">
        <div className="w-full flex z-20 py-2 px-4 items-center">
          <span className="text-sm text-muted-foreground">liquid</span>
        </div>
        <div className="relative overflow-x-auto px-6 pb-6">
          <div className="h-20 w-full flex items-center justify-center">
            <span className="text-muted-foreground">Processing Liquid template...</span>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  },
);

// Dynamically import MermaidDiagram component
const MermaidDiagram = dynamic(
  () => import("./mermaid-diagram").then((mod) => mod.MermaidDiagram),
  {
    loading: () => (
      <div className="text-sm flex bg-accent/30 flex-col rounded-2xl relative my-4 overflow-hidden border">
        <div className="w-full flex z-20 py-2 px-4 items-center">
          <span className="text-sm text-muted-foreground">mermaid</span>
        </div>
        <div className="relative overflow-x-auto px-6 pb-6">
          <div className="h-20 w-full flex items-center justify-center">
            <span className="text-muted-foreground">Loading Mermaid renderer...</span>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  },
);

// Dynamically import SVGRenderer component
const SVGRenderer = dynamic(
  () => import("./svg-renderer").then((mod) => mod.SVGRenderer),
  {
    loading: () => (
      <div className="text-sm flex bg-accent/30 flex-col rounded-2xl relative my-4 overflow-hidden border">
        <div className="w-full flex z-20 py-2 px-4 items-center">
          <span className="text-sm text-muted-foreground">svg</span>
        </div>
        <div className="relative overflow-x-auto px-6 pb-6">
          <div className="h-20 w-full flex items-center justify-center">
            <span className="text-muted-foreground">Loading SVG renderer...</span>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  },
);

// Dynamically import KrokiDiagram component
const KrokiDiagram = dynamic(
  () => import("./kroki-diagram").then((mod) => mod.KrokiDiagram),
  {
    loading: () => (
      <div className="text-sm flex bg-accent/30 flex-col rounded-2xl relative my-4 overflow-hidden border">
        <div className="w-full flex z-20 py-2 px-4 items-center">
          <span className="text-sm text-muted-foreground">kroki</span>
        </div>
        <div className="relative overflow-x-auto px-6 pb-6">
          <div className="h-20 w-full flex items-center justify-center">
            <span className="text-muted-foreground">Loading diagram renderer...</span>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  },
);

const PurePre = ({
  children,
  className,
  code,
  lang,
}: {
  children: any;
  className?: string;
  code: string;
  lang: string;
}) => {
  const { copied, copy } = useCopy();

  return (
    <pre className={cn("relative ", className)}>
      <div className="w-full flex z-20 py-2 px-4 items-center">
        <span className="text-sm text-muted-foreground">{lang}</span>
        <Button
          size="icon"
          variant={copied ? "secondary" : "ghost"}
          className="ml-auto z-10 p-3! size-2! rounded-sm"
          onClick={() => {
            copy(code);
          }}
        >
          {copied ? <CheckIcon /> : <Clipboard className="size-3!" />}
        </Button>
      </div>
      <div className="relative overflow-x-auto px-6 pb-6">{children}</div>
    </pre>
  );
};

export async function highlight(
  code: string,
  lang: BundledLanguage | (string & {}),
  theme: string,
) {
  const parsed: BundledLanguage = (
    bundledLanguages[lang] ? lang : "md"
  ) as BundledLanguage;

  if (lang === "json") {
    return (
      <PurePre code={code} lang={lang}>
        <JsonView data={code} initialExpandDepth={3} />
      </PurePre>
    );
  }

  if (lang === "mermaid") {
    return (
      <PurePre code={code} lang={lang}>
        <MermaidDiagram chart={code} />
      </PurePre>
    );
  }
  
  if (lang === "svg") {
    return <SVGRenderer svgContent={code} />;
  }
  
  if (lang === "liquid") {
    return <TemplateRenderer template={code} />;
  }

  // Support for all Kroki diagram types
  const krokiDiagramTypes: DiagramType[] = [
    "plantuml",
    "c4plantuml",
    "ditaa",
    "blockdiag",
    "seqdiag",
    "actdiag",
    "nwdiag",
    "packetdiag",
    "rackdiag",
    "umlet",
    "graphviz",
    "dot",
    "erd",
    "svgbob",
    "symbolator",
    "nomnoml",
    "vega",
    "vegalite",
    "wavedrom",
    "bpmn",
    "bytefield",
    "excalidraw",
    "pikchr",
    "structurizr",
    "diagramsnet",
    "d2",
    "tikz",
    "dbml",
    "wireviz",
  ];

  if (krokiDiagramTypes.includes(lang as DiagramType)) {
    return (
      <KrokiDiagram chart={code} type={lang as DiagramType} />
    );
  }

  if (lang === "map") {
    const MapDiagram = dynamic(
      () => import("./map-diagram").then((mod) => mod.MapDiagram),
      {
        loading: () => (
          <div className="text-sm flex bg-accent/30 flex-col rounded-2xl relative my-4 overflow-hidden border">
            <PurePre className="animate-pulse" code={code} lang={lang}>
              <div className="h-20 w-full flex items-center justify-center">
                <span className="text-muted-foreground">Loading map...</span>
              </div>
            </PurePre>
          </div>
        ),
        ssr: false,
      },
    );

    return <MapDiagram content={code} />;
  }

  const out = await codeToHast(code, {
    lang: parsed,
    theme,
  });

  return toJsxRuntime(out, {
    Fragment,
    jsx,
    jsxs,
    components: {
      pre: (props) => <PurePre {...props} code={code} lang={lang} />,
    },
  }) as JSX.Element;
}

export function PreBlock({ children }: { children: any }) {
  const code = children.props.children;
  const { theme } = useTheme();
  const language = children.props.className?.split("-")?.[1] || "bash";
  const [loading, setLoading] = useState(true);
  const [component, setComponent] = useState<JSX.Element | null>(
    <PurePre className="animate-pulse" code={code} lang={language}>
      {children}
    </PurePre>,
  );

  useLayoutEffect(() => {
    safe()
      .map(() =>
        highlight(code, language, theme === "dark" ? "dark-plus" : "github-light"),
      )
      .ifOk(setComponent)
      .watch(() => setLoading(false));
  }, [theme, language, code]);

  // For other code blocks, render as before
  return (
    <div
      className={cn(
        loading && "animate-pulse",
        "text-sm flex bg-accent/30 flex-col rounded-2xl relative my-4 overflow-hidden border",
      )}
    >
      {component}
    </div>
  );
}
