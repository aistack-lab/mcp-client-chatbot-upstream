"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "ui/sidebar";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

import { useEffect, useState } from "react";
import { getStorageManager } from "lib/browser-stroage";

import { AppSidebarMenus } from "./app-sidebar-menus";
import { AppSidebarThreads } from "./app-sidebar-threads";
import { AppSidebarUser } from "./app-sidebar-user";
import { MCPIcon } from "ui/mcp-icon";
import { AppSidebarProjects } from "./app-sidebar-projects";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { MarkdownFileManager } from "@/components/ui/MarkdownFileManager";
const browserSidebarStorage = getStorageManager<boolean>("sidebar_state");

export function AppSidebar() {
  const { open } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [_currentContent, setCurrentContent] = useState<string | null>(null);
  const [_currentFilename, setCurrentFilename] = useState<string | null>(null);

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        e.stopPropagation();
        router.push("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="flex items-center gap-1">
                  <MCPIcon className="size-4 fill-foreground" />
                  <h4 className="font-bold">aistack/chat-bot</h4>
                  <ChevronDown className="size-3 ml-1" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href="/">New Chat</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/mdx-editor">MDX Editor</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="mt-6">
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
