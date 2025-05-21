"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash, FilePlus, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface MarkdownFile {
  name: string;
  path: string;
  lastModified: Date;
}

interface MarkdownFileManagerProps {
  onFileSelectAction: (content: string) => void;
}

// Add FileSystemDirectoryHandle.entries() definition
declare global {
  interface FileSystemDirectoryHandle {
    entries(): AsyncIterable<[string, FileSystemHandle]>;
  }
  interface FileSystemHandle {
    getFile(): Promise<File>;
  }
}

export function MarkdownFileManager({ onFileSelectAction }: MarkdownFileManagerProps) {
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFileName, setNewFileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const fileSystemRef = useRef<FileSystemDirectoryHandle | null>(null);
  const rootDirRef = useRef<FileSystemDirectoryHandle | null>(null);

  // Initialize the file system
  // Listen for markdown save events to refresh the file list
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from the same origin
      if (event.origin !== window.location.origin) return;
      
      // Check if it's a markdown save notification
      if (event.data && event.data.type === 'MARKDOWN_SAVED') {
        loadFiles();
        // Set the active file to the newly saved file
        if (event.data.filename) {
          setActiveFile(event.data.filename);
        }
      }
      
      // Handle editor content updates
      if (event.data && event.data.type === 'EDITOR_CONTENT_UPDATED') {
        if (event.data.content && activeFile) {
          // Store editor content in localStorage
          window.localStorage.setItem(`md_content_${activeFile}`, event.data.content);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeFile]);

  useEffect(() => {
    async function initializeFileSystem() {
      try {
        if (!('storage' in navigator && 'getDirectory' in navigator.storage)) {
          toast.error('Your browser does not support the Origin Private File System API');
          setLoading(false);
          return;
        }

        // Get the root directory of the origin-private file system
        const root = await navigator.storage.getDirectory();
        rootDirRef.current = root;

        // Get or create the markdown directory
        try {
          fileSystemRef.current = await root.getDirectoryHandle('markdown', { create: true });
        } catch (e) {
          console.error('Failed to create markdown directory:', e);
          toast.error('Failed to initialize markdown directory');
          setLoading(false);
          return;
        }

        await loadFiles();
      } catch (err) {
        console.error('Error initializing file system:', err);
        toast.error('Failed to initialize file system');
      }
      setLoading(false);
    }

    initializeFileSystem();
  }, []);

  // Load files from the file system
  const loadFiles = async () => {
    if (!fileSystemRef.current) return;

    try {
      const filesList: MarkdownFile[] = [];
      for await (const [name, handle] of fileSystemRef.current.entries()) {
        if ((handle as any).kind === 'file' && name.endsWith('.md')) {
          const file = await (handle as any).getFile();
          filesList.push({
            name,
            path: name,
            lastModified: new Date(file.lastModified)
          });
        }
      }
      
      // Sort by last modified (newest first)
      filesList.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      setFiles(filesList);
    } catch (err) {
      console.error('Error loading files:', err);
      toast.error('Failed to load files');
    }
  };

  // Create a new file
  const createNewFile = async () => {
    if (!fileSystemRef.current || !newFileName) return;

    const filename = newFileName.endsWith('.md') ? newFileName : `${newFileName}.md`;
    
    try {
      const fileHandle = await fileSystemRef.current.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      // Create with empty content
      const emptyContent = '';
      await writable.write(emptyContent);
      await writable.close();
      
      // Store in localStorage
      window.localStorage.setItem(`md_content_${filename}`, emptyContent);
      
      toast.success(`File "${filename}" created`);
      setNewFileName('');
      setIsCreating(false);
      await loadFiles();
      
      // Open the newly created file
      openFile(filename);
    } catch (err) {
      console.error('Error creating file:', err);
      toast.error('Failed to create file');
    }
  };

  // Delete a file
  const deleteFile = async (filename: string) => {
    if (!fileSystemRef.current) return;

    try {
      await fileSystemRef.current.removeEntry(filename);
      
      // Also remove from localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`md_content_${filename}`);
      }
      
      toast.success(`File "${filename}" deleted`);
      
      // If the active file was deleted, clear the active file
      if (activeFile === filename) {
        setActiveFile(null);
        
        // Notify the editor that the file was deleted
        window.postMessage({ 
          type: 'LOAD_MARKDOWN', 
          content: '',
          filename: null 
        }, window.location.origin);
      }
      
      await loadFiles();
    } catch (err) {
      console.error('Error deleting file:', err);
      toast.error('Failed to delete file');
    }
  };

  // Save current content to a file
  const saveCurrentContent = async () => {
    if (!fileSystemRef.current || !activeFile) return;
    
    try {
      // Get current content from localStorage or use empty string
      const content = window.localStorage.getItem(`md_content_${activeFile}`) || '';
      
      const fileHandle = await fileSystemRef.current.getFileHandle(activeFile, { create: false });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      
      toast.success(`File "${activeFile}" saved`);
      await loadFiles(); // Refresh to update lastModified
    } catch (err) {
      console.error('Error saving file:', err);
      toast.error('Failed to save file');
    }
  };

  // Open and read a file
  const openFile = async (filename: string) => {
    if (!fileSystemRef.current) return;

    try {
      const fileHandle = await fileSystemRef.current.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const contents = await file.text();
      
      // Store content in localStorage for quick access
      window.localStorage.setItem(`md_content_${filename}`, contents);
      
      onFileSelectAction(contents);
      setActiveFile(filename);
      // Also send the filename
      window.postMessage({ 
        type: 'LOAD_MARKDOWN', 
        content: contents,
        filename: filename 
      }, window.location.origin);
      toast.success(`File "${filename}" opened`);
    } catch (err) {
      console.error('Error opening file:', err);
      toast.error('Failed to open file');
    }
  };

  return (
    <div className="flex flex-col space-y-3 px-1">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold">Markdown Files</h4>
        <div className="flex space-x-2">
          {activeFile && (
            <Button 
              variant="outline" 
              size="xs" 
              onClick={saveCurrentContent}
              title="Save current file"
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button 
            variant="outline" 
            size="xs" 
            onClick={() => setIsCreating(!isCreating)}
            title="Create new file"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isCreating && (
        <div className="flex items-center space-x-1">
          <Input
            size={1}
            placeholder="filename.md"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="h-7 text-xs"
          />
          <Button 
            size="xs" 
            onClick={createNewFile}
            disabled={!newFileName}
            variant="outline"
          >
            Create
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-pulse">Loading files...</div>
        </div>
      ) : (
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {files.length === 0 ? (
            <p className="text-xs text-muted-foreground">No markdown files yet</p>
          ) : (
            files.map((file) => (
              <div 
                key={file.path}
                className={`flex items-center justify-between p-1 rounded text-xs group ${
                  activeFile === file.name ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
              >
                <button
                  onClick={() => openFile(file.name)}
                  className="flex items-center flex-1 text-left"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  <span className="truncate">{file.name}</span>
                </button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFile(file.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0"
                  title="Delete file"
                >
                  <Trash className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default MarkdownFileManager;