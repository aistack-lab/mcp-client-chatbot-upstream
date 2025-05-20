import axios from "axios";
import * as pako from "pako";
import { KrokiOptions } from "./types";

const KROKI_BASE_URL = "https://kroki.io";

export class KrokiClient {
  /**
   * Generates a URL for a diagram from Kroki.io
   */
  public static getDiagramUrl(options: KrokiOptions): string {
    const { type, content, outputFormat = "svg" } = options;

    // Compress and encode the content for Kroki
    const deflated = pako.deflate(content);
    const encodedContent = Buffer.from(deflated)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    return `${KROKI_BASE_URL}/${type}/${outputFormat}/${encodedContent}`;
  }

  /**
   * Fetches the diagram data from Kroki.io
   */
  public static async getDiagramData(
    options: KrokiOptions,
  ): Promise<{ data: Uint8Array; format: string }> {
    const { outputFormat = "svg" } = options;
    const url = this.getDiagramUrl(options);

    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        validateStatus: (status) => status >= 200 && status < 300,
      });

      // Check for HTML errors (Kroki sometimes returns HTML for errors)
      const data = Buffer.from(response.data);
      const contentType = response.headers["content-type"]?.toLowerCase() || "";

      if (
        contentType.includes("text/html") ||
        data.toString("utf-8", 0, 100).trim().toLowerCase().includes("<!doctype html>")
      ) {
        throw new Error(
          "Kroki returned an HTML error. Please check your diagram syntax.",
        );
      }

      return { data, format: outputFormat };
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        // Try to extract a useful error message
        try {
          const responseText = Buffer.from(error.response.data).toString("utf-8");
          throw new Error(
            `Kroki API error (${error.response.status}): ${responseText.slice(0, 200)}`,
          );
        } catch (_) {
          throw new Error(`Kroki API error: ${error.message}`);
        }
      }
      throw error;
    }
  }

  /**
   * Validates if the given diagram type is supported
   */
  public static isValidDiagramType(type: string): boolean {
    const validTypes = [
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
      // "mermaid",
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

    return validTypes.includes(type);
  }
}
