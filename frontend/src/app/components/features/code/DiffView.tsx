import { useState, useEffect } from "react";
import { X, ArrowLeftRight } from "lucide-react";
import { codeApi } from "../../../../api/codeApi";

interface DiffViewProps {
  commitHash: string;
  filePath?: string;
  onClose: () => void;
}

export function DiffView({ commitHash, filePath, onClose }: DiffViewProps) {
  const [diff, setDiff] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDiff();
  }, [commitHash, filePath]);

  const loadDiff = async () => {
    setLoading(true);
    setError(null);
    try {
      const diffText = await codeApi.getDiff(commitHash, "HEAD", filePath);
      setDiff(diffText);
    } catch (err) {
      setError(`加载差异失败: ${err}`);
    }
    setLoading(false);
  };

  const renderDiffLine = (line: string, index: number) => {
    let className = "px-2 py-0.5 font-mono text-sm";
    if (line.startsWith("+")) {
      className += " bg-green-100 text-green-800";
    } else if (line.startsWith("-")) {
      className += " bg-red-100 text-red-800";
    } else if (line.startsWith("@@")) {
      className += " bg-blue-50 text-blue-600";
    }
    return (
      <div key={index} className={className}>
        {line}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-3/4 h-3/4 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            <span className="font-medium">差异对比</span>
            <span className="text-sm text-gray-500 font-mono">
              {commitHash.substring(0, 7)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500">
              {error}
            </div>
          ) : diff ? (
            <pre className="p-2">
              {diff.split("\n").map((line, i) => renderDiffLine(line, i))}
            </pre>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              没有差异
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
