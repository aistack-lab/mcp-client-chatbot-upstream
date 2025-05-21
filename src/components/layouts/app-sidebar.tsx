"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "ui/sidebar";
import { useRouter, usePathname } from "next/navigation";

import { useEffect, useState } from "react";
import { getStorageManager } from "lib/browser-stroage";

import { AppSidebarMenus } from "./app-sidebar-menus";
import { AppSidebarThreads } from "./app-sidebar-threads";
import { AppSidebarUser } from "./app-sidebar-user";
import { MCPIcon } from "ui/mcp-icon";
import { AppSidebarProjects } from "./app-sidebar-projects";
import { MarkdownFileManager } from "@/components/ui/MarkdownFileManager";
import { ToggleNav } from "@/components/ui/toggle-nav";
import { isShortcutEvent, Shortcuts } from "lib/keyboard-shortcuts";

const browserSidebarStorage = getStorageManager<boolean>("sidebar_state");

export function AppSidebar() {
  const { open, toggleSidebar } = useSidebar();

  const router = useRouter();
  const pathname = usePathname();
  const [_currentContent, setCurrentContent] = useState<string | null>(null);
  const [_currentFilename, setCurrentFilename] = useState<string | null>(null);
  // Track current drawing state
  // No drawing state needed yet - will be implemented in future
  const [currentDrawing] = useState<string | null>(null);

  useEffect(() => {
    browserSidebarStorage.set(open);
  }, [open]);

  // Listen for editor messages to update current content state
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from the same origin
      if (event.origin !== window.location.origin) return;

      if (event.data && event.data.type === "MARKDOWN_SAVED") {
        if (event.data.filename) {
          setCurrentFilename(event.data.filename);
        }
      }

      if (event.data && event.data.type === "EDITOR_CONTENT_UPDATED") {
        if (event.data.content) {
          setCurrentContent(event.data.content);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShortcutEvent(e, Shortcuts.openNewChat)) {
        e.preventDefault();
        e.stopPropagation();
        router.push("/");
      }
      if (isShortcutEvent(e, Shortcuts.toggleSidebar)) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, toggleSidebar]);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex flex-col items-center gap-3 px-0 py-2">
            <div className="flex items-center gap-1">
              <MCPIcon className="size-4 fill-foreground" />
              <h4 className="font-bold">aistack/chat-bot</h4>
            </div>
            <ToggleNav className="w-full px-2" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="mt-3">
        {pathname === "/mdx-editor" ? (
          <div className="p-4">
            <h4 className="text-sm font-semibold text-muted-foreground">
              MDX Editor Navigation
            </h4>
            <MarkdownFileManager
              onFileSelectAction={(content) => {
                // Use window.postMessage to communicate with the editor
                window.postMessage(
                  { type: "LOAD_MARKDOWN", content },
                  window.location.origin,
                );
                setCurrentContent(content);
              }}
            />
          </div>
        ) : pathname.startsWith("/drawings") ? (
          <div className="p-4">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Drawings
            </h4>
            <p className="text-xs text-muted-foreground mt-2">
              Use the drawing tools to create diagrams and sketches.
              {currentDrawing && <span className="block mt-1 font-medium">{currentDrawing}</span>}
            </p>
          </div>
        ) : (
          <>
            <AppSidebarMenus isOpen={open} />
            <AppSidebarProjects />
            <AppSidebarThreads />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <AppSidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
