"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { FileText, Slash } from "lucide-react";
import { useMCPPrompts, type MCPPromptArg } from "@/lib/hooks/use-mcp-prompts";
import { useMarkdownFiles } from "@/lib/hooks/use-markdown-files";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SlashPromptButtonProps {
  onPromptResult?: (result: string) => void;
  onContentBubble?: (content: string) => void;
}

export function SlashPromptButton({
  onPromptResult,
  onContentBubble,
}: SlashPromptButtonProps) {
  const { prompts, executePrompt, isLoadingPrompt } = useMCPPrompts();
  const { files, getFileContent, isLoading: isLoadingFiles } = useMarkdownFiles();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setIsLoadingMarkdown] = useState(false);
  const [selectedMarkdown, setSelectedMarkdown] = useState<{
    name: string;
    content: string;
  } | null>(null);

  // For prompt arguments dialog
  const [promptDialog, setPromptDialog] = useState<{
    isOpen: boolean;
    promptName: string;
    serverName: string;
    args: MCPPromptArg[];
  } | null>(null);

  const [argValues, setArgValues] = useState<Record<string, any>>({});
  const [argErrors, setArgErrors] = useState<Record<string, string>>({});

  const handlePromptSelect = (
    _promptId: string,
    promptName: string,
    serverName: string,
    args: MCPPromptArg[] = [],
  ) => {
    setOpen(false);

    if (args.length > 0) {
      // Open dialog for arguments
      setPromptDialog({
        isOpen: true,
        promptName,
        serverName,
        args,
      });
      setArgValues({});
      setArgErrors({});
    } else {
      // Execute prompt directly
      executePromptWithArgs(serverName, promptName);
    }
  };

  const handleMarkdownSelect = async (filename: string) => {
    setOpen(false);
    setIsLoadingMarkdown(true);

    try {
      const content = await getFileContent(filename);

      // Show preview dialog
      setSelectedMarkdown({
        name: filename,
        content: content,
      });
    } catch (error) {
      console.error("Error loading markdown file:", error);
      setIsLoadingMarkdown(false);
    }
  };

  const insertMarkdownContent = useCallback(() => {
    if (selectedMarkdown) {
      // Insert the full content without reference comments
      const formattedContent = selectedMarkdown.content;

      if (onContentBubble) {
        // Use the content bubble approach
        onContentBubble(formattedContent);
      } else if (onPromptResult) {
        // Fall back to the original approach
        onPromptResult(formattedContent);
      }
    }
    setSelectedMarkdown(null);
    setIsLoadingMarkdown(false);
  }, [selectedMarkdown, onPromptResult, onContentBubble]);

  const executePromptWithArgs = async (
    serverName: string,
    promptName: string,
    args?: Record<string, any>,
  ) => {
    try {
      const result = await executePrompt(serverName, promptName, args);

      // Extract text from the result
      let resultText = "";
      if (result && result.messages) {
        resultText = result.messages
          .map((msg: any) => msg.content?.text || "")
          .filter(Boolean)
          .join("\n");
      }

      // Pass the result to the parent component
      if (resultText) {
        if (onContentBubble) {
          onContentBubble(resultText);
        } else if (onPromptResult) {
          onPromptResult(resultText);
        }
      }

      // Close any open dialog
      setPromptDialog(null);
    } catch (error) {
      console.error("Error executing prompt:", error);
    }
  };

  const handleArgChange = (name: string, value: any) => {
    setArgValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear any errors for this field
    if (argErrors[name]) {
      setArgErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleArgSubmit = () => {
    if (!promptDialog) return;

    // Validate required arguments
    const newErrors: Record<string, string> = {};
    promptDialog.args.forEach((arg) => {
      if (
        arg.required &&
        (!argValues[arg.name] || String(argValues[arg.name]).trim() === "")
      ) {
        newErrors[arg.name] = "This field is required";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setArgErrors(newErrors);
      return;
    }

    // Execute the prompt with the collected arguments
    executePromptWithArgs(promptDialog.serverName, promptDialog.promptName, argValues);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            title="Prompt Library"
          >
            <Slash className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="end">
          <Command>
            <CommandInput
              placeholder="Search prompts..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No items found</CommandEmpty>
              {prompts && prompts.length > 0 && (
                <CommandGroup heading="Available Prompts">
                  {prompts.map((prompt) => (
                    <CommandItem
                      key={prompt.id}
                      onSelect={() =>
                        handlePromptSelect(
                          prompt.id,
                          prompt.name,
                          prompt.serverName,
                          prompt.arguments,
                        )
                      }
                      className="flex flex-col items-start p-2"
                    >
                      <div className="font-medium">{prompt.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {prompt.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Server: {prompt.serverName}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {files && (
                <>
                  {prompts && prompts.length > 0 && <CommandSeparator />}
                  <CommandGroup heading="Choose the text you want to include">
                    {files.length > 0 ? (
                      files
                        .filter(
                          (file) =>
                            !search ||
                            file.name.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((file) => (
                          <CommandItem
                            key={file.id}
                            onSelect={() => handleMarkdownSelect(file.name)}
                            className="flex items-center p-2"
                          >
                            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">{file.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Last modified: {file.lastModified.toLocaleDateString()}
                              </div>
                            </div>
                          </CommandItem>
                        ))
                    ) : (
                      <div className="px-2 py-3 text-xs text-muted-foreground">
                        No markdown files found. Use the &quot;Save to Markdown&quot;
                        button on assistant messages to create files.
                      </div>
                    )}
                  </CommandGroup>
                </>
              )}

              {isLoadingFiles && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading markdown files...
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Markdown Preview Dialog */}
      {selectedMarkdown && (
        <Dialog open={true} onOpenChange={(open) => !open && setSelectedMarkdown(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Insert Complete Markdown: {selectedMarkdown.name}</DialogTitle>
            </DialogHeader>

            <div className="max-h-[50vh] overflow-y-auto border rounded-md p-4 bg-muted/20">
              <div className="text-xs text-muted-foreground mb-2">
                Preview (full content will be inserted):
              </div>
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {selectedMarkdown.content.slice(0, 1000)}
                {selectedMarkdown.content.length > 1000 ? "..." : ""}
              </pre>
              {selectedMarkdown.content.length > 1000 && (
                <div className="text-xs text-muted-foreground mt-2">
                  Note: This file is truncated in the preview but will be inserted in
                  full.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedMarkdown(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={insertMarkdownContent}
                className="bg-primary"
              >
                Insert Complete Content
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Arguments Dialog */}
      {promptDialog && (
        <Dialog
          open={promptDialog.isOpen}
          onOpenChange={(open) => !open && setPromptDialog(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {promptDialog.promptName}
                <span className="text-xs text-muted-foreground ml-2">
                  from {promptDialog.serverName}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {promptDialog.args.map((arg) => {
                const isLongText =
                  arg.description?.includes("multiline") ||
                  arg.description?.includes("text area") ||
                  arg.name.toLowerCase().includes("content") ||
                  arg.name.toLowerCase().includes("description");

                return (
                  <div key={arg.name} className="space-y-2">
                    <Label htmlFor={`arg-${arg.name}`} className="flex items-center">
                      {arg.name}
                      {arg.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>

                    {arg.description && (
                      <p className="text-sm text-muted-foreground">{arg.description}</p>
                    )}

                    {isLongText ? (
                      <Textarea
                        id={`arg-${arg.name}`}
                        value={argValues[arg.name] || ""}
                        onChange={(e) => handleArgChange(arg.name, e.target.value)}
                        className={cn(argErrors[arg.name] ? "border-red-500" : "")}
                        placeholder={`Enter ${arg.name}...`}
                        rows={4}
                      />
                    ) : (
                      <Input
                        id={`arg-${arg.name}`}
                        value={argValues[arg.name] || ""}
                        onChange={(e) => handleArgChange(arg.name, e.target.value)}
                        className={cn(argErrors[arg.name] ? "border-red-500" : "")}
                        placeholder={`Enter ${arg.name}...`}
                      />
                    )}

                    {argErrors[arg.name] && (
                      <p className="text-sm text-red-500">{argErrors[arg.name]}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPromptDialog(null)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleArgSubmit} disabled={isLoadingPrompt}>
                {isLoadingPrompt ? "Executing..." : "Execute"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
