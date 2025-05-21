"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MessageSquare, FileText, PenLine } from "lucide-react";
import { motion } from "framer-motion";

interface ToggleNavProps {
  className?: string;
}

export function ToggleNav({ className }: ToggleNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const isChat = !pathname.includes("/mdx-editor") && !pathname.includes("/drawings");
  const isMarkdown = pathname.includes("/mdx-editor");
  const isDrawings = pathname.includes("/drawings");
  
  const handleToggle = (view: "chat" | "markdown" | "drawings") => {
    if ((view === "chat" && pathname !== "/") || 
        (view === "markdown" && pathname !== "/mdx-editor") ||
        (view === "drawings" && pathname !== "/drawings")) {
      setIsTransitioning(true);
      setTimeout(() => {
        if (view === "chat") {
          router.push("/");
        } else if (view === "markdown") {
          router.push("/mdx-editor");
        } else {
          router.push("/drawings");
        }
        // Reset after navigation completes
        setTimeout(() => setIsTransitioning(false), 400);
      }, 100);
    }
  };

  return (
    <div 
      className={cn(
        "flex h-9 items-center rounded-md border p-1 text-center text-xs font-medium w-full shadow-sm relative overflow-hidden",
        isTransitioning ? "cursor-not-allowed" : "",
        className
      )}
    >
      <motion.div 
        className="absolute inset-0 bg-primary z-0 rounded-sm"
        initial={false}
        animate={{
          x: isChat ? 0 : isMarkdown ? "100%" : "200%",
          width: "33.333%"
        }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
      />
      <button
        onClick={() => !isTransitioning && handleToggle("chat")}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1 w-full transition-all duration-300 relative z-10",
          isChat
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
          isTransitioning ? "cursor-not-allowed opacity-80" : "cursor-pointer"
        )}
        disabled={isTransitioning}
      >
        <MessageSquare className="size-3.5" />
        <span>Chat</span>
      </button>
      <button
        onClick={() => !isTransitioning && handleToggle("markdown")}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1 w-full transition-all duration-300 relative z-10",
          isMarkdown
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
          isTransitioning ? "cursor-not-allowed opacity-80" : "cursor-pointer"
        )}
        disabled={isTransitioning}
      >
        <FileText className="size-3.5" />
        <span>Markdown</span>
      </button>
      <button
        onClick={() => !isTransitioning && handleToggle("drawings")}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1 w-full transition-all duration-300 relative z-10",
          isDrawings
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
          isTransitioning ? "cursor-not-allowed opacity-80" : "cursor-pointer"
        )}
        disabled={isTransitioning}
      >
        <PenLine className="size-3.5" />
        <span>Drawings</span>
      </button>
    </div>
  );
}

export default ToggleNav;