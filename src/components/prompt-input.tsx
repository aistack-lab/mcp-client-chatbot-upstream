"use client";

import { ChevronDown, CornerRightUp, Paperclip, Pause, Mic, MicOff, Loader2 } from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "ui/button";
import { notImplementedToast } from "ui/shared-toast";
import { toast } from "sonner";
import { PastesContentCard } from "./pasts-content";
import { UseChatHelpers } from "@ai-sdk/react";
import { SelectModel } from "./select-model";
import { appStore } from "@/app/store";
import { VoiceRecordingIndicator } from "./voice-recording-indicator";
import { useShallow } from "zustand/shallow";
import { customModelProvider } from "lib/ai/models";
import { createMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import { ChatMessageAnnotation } from "app-types/chat";
import dynamic from "next/dynamic";
import { ToolChoiceDropDown } from "./tool-choice-dropdown";
import { PROMPT_PASTE_MAX_LENGTH } from "lib/const";
import { ToolSelector } from "./tool-selector";
import { useVoiceInput } from "@/hooks/use-voice-input";

interface PromptInputProps {
  placeholder?: string;
  setInputAction: (value: string) => void;
  input: string;
  onStopAction: () => void;
  appendAction: UseChatHelpers["append"];
  toolDisabled?: boolean;
  isLoading?: boolean;
  model?: string;
  setModel?: (model: string) => void;
}

const MentionInput = dynamic(() => import("./mention-input"), {
  ssr: false,
  loading() {
    return <div className="h-[2rem] w-full animate-pulse"></div>;
  },
});

export default function PromptInput({
  placeholder = "What do you want to know?",
  appendAction,
  model,
  setModel,
  input,
  setInputAction,
  onStopAction,
  isLoading,
  toolDisabled,
}: PromptInputProps) {
  const [mcpList, globalModel, appStoreMutate] = appStore(
    useShallow((state) => [state.mcpList, state.model, state.mutate]),
  );

  const chatModel = useMemo(() => {
    return model ?? globalModel;
  }, [model, globalModel]);

  const setChatModel = useCallback(
    (model: string) => {
      if (setModel) {
        setModel(model);
      } else {
        appStoreMutate({ model });
      }
    },
    [setModel, appStoreMutate],
  );

  const [toolMentionItems, setToolMentionItems] = useState<
    { id: string; label: ReactNode; [key: string]: any }[]
  >([]);

  const modelList = useMemo(() => {
    return customModelProvider.modelsInfo;
  }, []);

  const [pastedContents, setPastedContents] = useState<string[]>([]);
  const { 
    isRecording,
    isTranscribing,
    isSupported: isVoiceSupported,
    startRecording,
    stopRecording,
    cancelRecording
  } = useVoiceInput({
    maxDuration: 60,
    onTranscriptionComplete: (text) => {
      setInputAction(text);
      toast.success("Voice input captured successfully!");
    },
    onError: (_, message) => {
      toast.error(message || "An error occurred with voice recording");
    },
  });
  
  // Use client-side state to avoid hydration mismatch
  const [showVoiceButton, setShowVoiceButton] = useState(false);
  
  useEffect(() => {
    setShowVoiceButton(isVoiceSupported);
  }, [isVoiceSupported]);

  const toolList = useMemo(() => {
    return (
      mcpList
        ?.filter((mcp) => mcp.status === "connected")
        .flatMap((mcp) => [
          {
            id: mcp.name,
            label: mcp.name,
            type: "server",
          },
          ...mcp.toolInfo.map((tool) => {
            const id = createMCPToolId(mcp.name, tool.name);
            return {
              id,
              label: id,
              type: "tool",
            };
          }),
        ]) ?? []
    );
  }, [mcpList]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    if (text.length > PROMPT_PASTE_MAX_LENGTH) {
      setPastedContents([...pastedContents, text]);
      e.preventDefault();
    }
  };

  const submit = () => {
    if (isLoading) return;
    const userMessage = input?.trim() || "";

    const pastedContentsParsed = pastedContents.map((content) => ({
      type: "text" as const,
      text: content,
    }));

    if (userMessage.length === 0 && pastedContentsParsed.length === 0) {
      return;
    }

    const annotations: ChatMessageAnnotation[] = [];
    if (toolMentionItems.length > 0) {
      annotations.push({
        requiredTools: toolMentionItems.map((item) => item.id),
      });
    }
    setPastedContents([]);
    setToolMentionItems([]);
    setInputAction("");
    appendAction!({
      role: "user",
      content: "",
      annotations,
      parts: [
        ...pastedContentsParsed,
        {
          type: "text",
          text: userMessage,
        },
      ],
    });
  };

  const handleMicrophoneClick = async () => {
    if (isTranscribing) {
      return; // Don't do anything if currently transcribing
    }
    
    if (isRecording) {
      stopRecording();
    } else {
      if (await startRecording()) {
        toast.success("Recording started. Click mic icon again to stop.");
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto fade-in animate-in">
      <div className="z-10 mx-auto w-full max-w-3xl relative">
        <fieldset className="flex w-full min-w-0 max-w-full flex-col px-2">
          <div className="rounded-4xl backdrop-blur-sm transition-all duration-200 bg-muted/40 relative flex w-full flex-col cursor-text z-10 border items-stretch focus-within:border-muted-foreground hover:border-muted-foreground p-3">
            <div className="flex flex-col gap-3.5 px-1">
              <div className="relative min-h-[2rem]">
                <MentionInput
                  input={input}
                  onChange={setInputAction}
                  onChangeMention={setToolMentionItems}
                  onEnter={submit}
                  placeholder={placeholder}
                  onPaste={handlePaste}
                  items={toolList}
                />
              </div>
              <div className="flex w-full items-center gap-2">
                {pastedContents.map((content, index) => (
                  <PastesContentCard
                    key={index}
                    initialContent={content}
                    deleteContent={() => {
                      setPastedContents((prev) => {
                        const newContents = [...prev];
                        newContents.splice(index, 1);
                        return newContents;
                      });
                    }}
                    updateContent={(content) => {
                      setPastedContents((prev) => {
                        const newContents = [...prev];
                        newContents[index] = content;
                        return newContents;
                      });
                    }}
                  />
                ))}
                {isRecording && (
                  <VoiceRecordingIndicator 
                    isRecording={isRecording} 
                    duration={60}
                    onMaxDurationReached={stopRecording}
                    onCancel={() => {
                      cancelRecording();
                      toast.info("Recording cancelled");
                    }}
                  />
                )}
              </div>
              <div className="flex w-full items-center z-30 gap-1.5">
                <div
                  className="cursor-pointer text-muted-foreground border rounded-full p-2 bg-transparent hover:bg-muted transition-all duration-200"
                  onClick={notImplementedToast}
                >
                  <Paperclip className="size-4" />
                </div>
                
                {showVoiceButton && (
                  <div
                    className={`cursor-pointer text-muted-foreground border rounded-full p-2 transition-all duration-200 ${
                      isRecording 
                        ? 'bg-red-500/10 border-red-500' 
                        : isTranscribing 
                        ? 'bg-amber-500/10 border-amber-500' 
                        : 'bg-transparent hover:bg-muted'
                    }`}
                    onClick={handleMicrophoneClick}
                    title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Start voice input"}
                  >
                    {isTranscribing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="size-4 text-red-500" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                  </div>
                )}

                {!toolDisabled && (
                  <>
                    <ToolChoiceDropDown />

                    <ToolSelector align="start" side="top" />
                  </>
                )}
                <div className="flex-1" />

                <SelectModel
                  onSelect={setChatModel}
                  providers={modelList}
                  model={chatModel}
                >
                  <Button variant={"ghost"} className="rounded-full">
                    {chatModel}
                    <ChevronDown className="size-3" />
                  </Button>
                </SelectModel>

                <div
                  onClick={() => {
                    if (isLoading) {
                      onStopAction();
                    } else {
                      submit();
                    }
                  }}
                  className="cursor-pointer text-muted-foreground rounded-full p-2 bg-secondary hover:bg-accent-foreground hover:text-accent transition-all duration-200"
                >
                  {isLoading ? (
                    <Pause
                      size={16}
                      className="fill-muted-foreground text-muted-foreground"
                    />
                  ) : (
                    <CornerRightUp size={16} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
