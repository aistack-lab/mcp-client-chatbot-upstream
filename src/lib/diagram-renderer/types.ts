export type DiagramType =
  | "plantuml"
  | "c4plantuml"
  | "ditaa"
  | "blockdiag"
  | "seqdiag"
  | "actdiag"
  | "nwdiag"
  | "packetdiag"
  | "rackdiag"
  | "umlet"
  | "graphviz"
  | "dot"
  | "erd"
  | "svgbob"
  | "symbolator"
  | "nomnoml"
  // | 'mermaid'
  | "vega"
  | "vegalite"
  | "wavedrom"
  | "bpmn"
  | "bytefield"
  | "excalidraw"
  | "pikchr"
  | "structurizr"
  | "diagramsnet"
  | "d2"
  | "tikz"
  | "dbml"
  | "wireviz";

export type OutputFormat = "svg" | "png" | "pdf" | "jpeg";

export interface KrokiOptions {
  type: DiagramType;
  content: string;
  outputFormat?: OutputFormat;
}
