import { useState, useEffect } from "react";
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, RefreshCw } from "lucide-react";
import codeApi, { FileTreeItem } from "../../../../api/codeApi";

interface FileExplorerProps {
  onFileSelect: (path: string) => void;
  currentFile: string | null;
}

export function FileExplorer({ onFileSelect, currentFile }: FileExplorerProps) {
  const [items, setItems] = useState<FileTreeItem[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRoot();
  }, []);

  const loadRoot = async () => {
    setLoading(true);
    try {
      const files = await codeApi.getFileTree(".");
      setItems(files);
    } catch (error) {
      console.error("Failed to load files:", error);
    }
    setLoading(false);
  };

  const toggleDir = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const renderItem = (item: FileTreeItem, depth: number = 0) => {
    const isExpanded = expandedDirs.has(item.path);
    const isSelected = currentFile === item.path;

    return (
      <div key={item.path}>
        <div
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-100 ${
            isSelected ? "bg-blue-50 text-blue-600" : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (item.type === "directory") {
              toggleDir(item.path);
            } else {
              onFileSelect(item.path);
            }
          }}
        >
          {item.type === "directory" ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-yellow-500" />
              ) : (
                <Folder className="w-4 h-4 text-yellow-500" />
              )}
            </>
          ) : (
            <>
              <span className="w-4" />
              <File className="w-4 h-4 text-gray-400" />
            </>
          )}
          <span className="text-sm truncate">{item.name}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white border-r">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-medium">文件浏览器</span>
        <button
          onClick={loadRoot}
          className="p-1 hover:bg-gray-100 rounded"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {items.map((item) => renderItem(item))}
      </div>
    </div>
  );
}
