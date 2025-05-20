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

import { useEffect } from "react";
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
  DropdownMenuTrigger 
} from "ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
const browserSidebarStorage = getStorageManager<boolean>("sidebar_state");

export function AppSidebar() {
  const { open } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    browserSidebarStorage.set(open);
  }, [open]);

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
            <h4 className="text-sm font-semibold text-muted-foreground">MDX Editor Navigation</h4>
            <p className="text-xs text-muted-foreground mt-2">
              (Future: List of Markdown documents will appear here)
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
