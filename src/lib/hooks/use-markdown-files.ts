"use client";

import { useState, useEffect } from "react";

// Add FileSystemDirectoryHandle.entries() definition
declare global {
  interface FileSystemDirectoryHandle {
    entries(): AsyncIterable<[string, FileSystemHandle]>;
  }
  interface FileSystemHandle {
    readonly kind: 'file' | 'directory';
    getFile(): Promise<File>;
  }
}

export type MarkdownFile = {
  id: string;
  name: string;
  lastModified: Date;
};

export function useMarkdownFiles() {
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileSystemDir, setFileSystemDir] = useState<FileSystemDirectoryHandle | null>(null);

  // Initialize file system and load files on mount
  useEffect(() => {
    async function initializeFileSystem() {
      try {
        if (!('storage' in navigator && 'getDirectory' in navigator.storage)) {
          setError('Your browser does not support the Origin Private File System API');
          setIsLoading(false);
          return;
        }

        // Get the root directory of the origin-private file system
        const root = await navigator.storage.getDirectory();

        // Get or create the markdown directory
        try {
          const mdDir = await root.getDirectoryHandle('markdown', { create: true });
          setFileSystemDir(mdDir);
          await loadFiles(mdDir);
        } catch (e) {
          console.error('Failed to access markdown directory:', e);
          setError('Failed to access markdown directory');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing file system:', err);
        setError('Failed to initialize file system');
        setIsLoading(false);
      }
    }

    initializeFileSystem();
  }, []);

  // Load files from the file system directory
  const loadFiles = async (dirHandle?: FileSystemDirectoryHandle) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const dir = dirHandle || fileSystemDir;
      if (!dir) {
        setError('File system not initialized');
        setIsLoading(false);
        return;
      }

      const filesList: MarkdownFile[] = [];
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'file' && name.endsWith('.md')) {
          const file = await handle.getFile();
          filesList.push({
            id: name,
            name,
            lastModified: new Date(file.lastModified)
          });
        }
      }
      
      // Sort by last modified (newest first)
      filesList.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      setFiles(filesList);
    } catch (err) {
      console.error('Error loading files:', err);
      setError('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  // Get file content
  const getFileContent = async (filename: string): Promise<string> => {
    if (!fileSystemDir) {
      throw new Error('File system not initialized');
    }

    try {
      const fileHandle = await fileSystemDir.getFileHandle(filename);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (err) {
      console.error('Error reading file:', err);
      throw new Error(`Failed to read file ${filename}`);
    }
  };

  // Filter files based on search query
  const filterFiles = (query: string) => {
    if (!query) return files;
    
    const normalizedQuery = query.toLowerCase();
    return files.filter(file => 
      file.name.toLowerCase().includes(normalizedQuery)
    );
  };

  return {
    files,
    isLoading,
    error,
    refreshFiles: () => loadFiles(),
    getFileContent,
    filterFiles
  };
}