"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MessageSquare, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface ToggleNavProps {
  className?: string;
}

export function ToggleNav({ className }: ToggleNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const isChat = pathname !== "/mdx-editor";
  
  const handleToggle = (view: "chat" | "markdown") => {
    if ((view === "chat" && pathname !== "/") || (view === "markdown" && pathname !== "/mdx-editor")) {
      setIsTransitioning(true);
      setTimeout(() => {
        if (view === "chat") {
          router.push("/");
        } else {
          router.push("/mdx-editor");
        }
        // Reset after navigation completes
        setTimeout(() => setIsTransitioning(false), 300);
      }, 150);
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
          x: isChat ? 0 : "100%",
          width: "50%"
        }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
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
          !isChat
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
          isTransitioning ? "cursor-not-allowed opacity-80" : "cursor-pointer"
        )}
        disabled={isTransitioning}
      >
        <FileText className="size-3.5" />
        <span>Markdown</span>
      </button>
    </div>
  );
}

export default ToggleNav;