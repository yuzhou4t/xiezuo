import { useState, useEffect, useCallback } from "react";
import { Save, X, File } from "lucide-react";
import codeApi from "../../../../api/codeApi";

interface CodeEditorProps {
  path: string | null;
  onClose: (path: string) => void;
  openFiles: string[];
  onFileChange: (path: string) => void;
}

export function CodeEditor({ path, onClose, openFiles, onFileChange }: CodeEditorProps) {
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (path) {
      loadFile(path);
    }
  }, [path]);

  const loadFile = async (filePath: string) => {
    setLoading(true);
    setError(null);
    try {
      const fileContent = await codeApi.readFile(filePath);
      setContent(fileContent);
      setOriginalContent(fileContent);
    } catch (err) {
      setError(`Failed to load file: ${err}`);
    }
    setLoading(false);
  };

  const handleSave = useCallback(async () => {
    if (!path) return;
    setSaving(true);
    try {
      await codeApi.writeFile(path, content);
      setOriginalContent(content);
    } catch (err) {
      setError(`Failed to save: ${err}`);
    }
    setSaving(false);
  }, [path, content]);

  const handleClose = (filePath: string) => {
    if (content !== originalContent) {
      if (!confirm("有未保存的更改，确定要关闭吗？")) {
        return;
      }
    }
    onClose(filePath);
  };

  const isModified = content !== originalContent;

  if (!path) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <File className="w-12 h-12 mx-auto mb-2" />
          <p>选择文件进行编辑</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* 标签栏 */}
      <div className="flex items-center bg-gray-100 border-b overflow-x-auto">
        {openFiles.map((file) => (
          <div
            key={file}
            className={`flex items-center gap-2 px-3 py-1.5 border-r cursor-pointer ${
              file === path
                ? "bg-white border-b-2 border-b-blue-500"
                : "hover:bg-gray-50"
            }`}
            onClick={() => onFileChange(file)}
          >
            <File className="w-3 h-3" />
            <span className="text-sm">{file}</span>
            {file === path && isModified && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose(file);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* 编辑器内容 */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-red-500">
          {error}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none bg-gray-50"
            spellCheck={false}
          />
          <div className="flex items-center justify-between px-4 py-2 border-t bg-white">
            <span className="text-sm text-gray-500">
              {isModified ? "未保存的更改" : "已保存"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setContent(originalContent)}
                disabled={!isModified}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!isModified || saving}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
