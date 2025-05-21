"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DownloadIcon, CopyIcon, ImageIcon } from "lucide-react";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type ImageDimensions = {
  width: number;
  height: number;
  align: "left" | "center" | "right" | "none";
};

interface MarkdownExportToolsProps {
  markdownContent: string;
  previewRef: React.RefObject<HTMLDivElement | null>;
  onInsertImageAction: (imageUrl: string, dimensions?: ImageDimensions) => void;
  currentFilename?: string;
}

const MarkdownExportTools: React.FC<MarkdownExportToolsProps> = ({
  markdownContent,
  previewRef,
  onInsertImageAction,
  currentFilename,
}) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({
    width: 100,
    height: 100,
    align: "none",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openImageDialog, setOpenImageDialog] = useState(false);
  const [markdownFileSystem, setMarkdownFileSystem] = useState<FileSystemDirectoryHandle | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Export as HTML
  const exportAsHtml = () => {
    if (!previewRef.current) return;

    const blob = new Blob(
      [
        `<html><head><style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        pre { background-color: #f0f0f0; padding: 1em; border-radius: 5px; overflow-x: auto; }
        code { font-family: monospace; }
        img { max-width: 100%; }
        h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
        p { margin: 1em 0; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        tr:nth-child(even) { background-color: #f2f2f2; }
      </style></head><body>${previewRef.current.innerHTML}</body></html>`,
      ],
      { type: "text/html" },
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exported-document.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("HTML exported successfully");
  };

  // Export as PDF
  const exportAsPdf = async () => {
    if (!previewRef.current) return;

    const toastId = toast.loading("Generating PDF...");

    try {
      // Dynamically import jspdf and html2canvas
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas-pro");
      
      // Create a temporary hidden div with exact A4 dimensions
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.height = '297mm'; // A4 height
      
      // Clone the content
      tempDiv.innerHTML = previewRef.current.innerHTML;
      document.body.appendChild(tempDiv);

      // Render with html2canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      // Remove temp div
      document.body.removeChild(tempDiv);
      
      // Create PDF with exact A4 dimensions
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });
      
      // Add the image to the PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      // Save the PDF
      pdf.save('exported-document.pdf');
      
      toast.success("PDF exported successfully", { id: toastId });
    } catch (error) {
      toast.error("Failed to export PDF", { id: toastId });
      console.error("PDF export error:", error);
    }
  };

  // Export markdown
  const exportAsMarkdown = () => {
    const blob = new Blob([markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFilename || "document.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Markdown exported successfully");
  };

  // Save to OPFS
  const saveToFileSystem = async () => {
    try {
      setIsSaving(true);
      
      // Initialize file system if not already done
      if (!markdownFileSystem) {
        if (!('storage' in navigator && 'getDirectory' in navigator.storage)) {
          toast.error('Your browser does not support the Origin Private File System API');
          setIsSaving(false);
          return;
        }
        
        // Get the root directory
        const root = await navigator.storage.getDirectory();
        
        // Get or create the markdown directory
        try {
          const mdDir = await root.getDirectoryHandle('markdown', { create: true });
          setMarkdownFileSystem(mdDir);
        } catch (e) {
          console.error('Failed to access markdown directory:', e);
          toast.error('Failed to access storage');
          setIsSaving(false);
          return;
        }
      }
      
      // Prompt for filename if needed
      let filename = currentFilename;
      if (!filename || filename === 'unsaved.md') {
        const userFilename = window.prompt('Enter a filename:', 'document.md');
        if (!userFilename) {
          setIsSaving(false);
          return;
        }
        filename = userFilename.endsWith('.md') ? userFilename : `${userFilename}.md`;
      }
      
      // Also save to localStorage for quick access
      if (filename && typeof window !== 'undefined') {
        window.localStorage.setItem(`md_content_${filename}`, markdownContent);
      }
      
      // Save the file
      if (!markdownFileSystem) {
        throw new Error('File system not initialized');
      }
      const fileHandle = await markdownFileSystem.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(markdownContent);
      await writable.close();
      
      // Notify the parent that we've saved a file
      window.postMessage({ 
        type: 'MARKDOWN_SAVED', 
        filename,
        timestamp: new Date().toISOString()
      }, window.location.origin);
      
      toast.success(`Saved to ${filename}`);
    } catch (err) {
      console.error('Error saving file:', err);
      toast.error('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdownContent).then(
      () => {
        toast.success("Content copied to clipboard");
      },
      (err) => {
        toast.error("Failed to copy: " + err);
      },
    );
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Insert image into markdown
  const handleInsertImage = () => {
    if (!imageUrl) {
      toast.error("Please select an image first");
      return;
    }

    onInsertImageAction(imageUrl, imageDimensions);
    setOpenImageDialog(false);
    setImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("Image inserted successfully");
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please drop an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageUrl(event.target.result);
        setOpenImageDialog(true);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <TooltipProvider>
      <div
        className="flex items-center gap-2 mb-4"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={exportAsMarkdown}>
                  <DownloadIcon className="h-4 w-4" />
                  MD
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as Markdown</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={exportAsHtml}>
                  <DownloadIcon className="h-4 w-4" />
                  HTML
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as HTML</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={exportAsPdf}>
                  <DownloadIcon className="h-4 w-4" />
                  PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as PDF</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <CopyIcon className="h-4 w-4" />
                  Copy
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy to clipboard</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={saveToFileSystem} 
                  disabled={isSaving}
                >
                  <CopyIcon className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save to file system</TooltipContent>
            </Tooltip>
          </div>

        <div className="ml-auto">
          <Dialog open={openImageDialog} onOpenChange={setOpenImageDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ImageIcon className="h-4 w-4" />
                Insert Image
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Insert Image</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="image-upload">Upload Image</Label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="w-full mt-1 p-2 border rounded-md"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Or drag and drop an image anywhere on the editor
                  </p>
                </div>

                {imageUrl && (
                  <div className="space-y-4">
                    <div>
                      <Label>Image Preview</Label>
                      <div className="mt-2 border rounded-md p-2 flex justify-center">
                        <Image
                          src={imageUrl}
                          alt="Preview"
                          width={500}
                          height={300}
                          unoptimized
                          style={{
                            maxWidth: "100%",
                            maxHeight: "200px",
                            width: `${imageDimensions.width}%`,
                            height: "auto",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Width (%)</Label>
                      <Slider
                        value={[imageDimensions.width]}
                        min={10}
                        max={100}
                        step={5}
                        onValueChange={(value) =>
                          setImageDimensions({
                            ...imageDimensions,
                            width: value[0],
                          })
                        }
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Alignment</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {(["left", "center", "right", "none"] as const).map((align) => (
                          <Button
                            key={align}
                            variant={
                              imageDimensions.align === align ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setImageDimensions({
                                ...imageDimensions,
                                align,
                              })
                            }
                          >
                            {align.charAt(0).toUpperCase() + align.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleInsertImage} className="w-full">
                      Insert Image
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
};

export { MarkdownExportTools };
export default MarkdownExportTools;
