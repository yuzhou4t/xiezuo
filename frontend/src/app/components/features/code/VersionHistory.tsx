import { useState, useEffect } from "react";
import { History, Eye, RotateCcw } from "lucide-react";
import { codeApi, CommitInfo } from "../../../../api/codeApi";

interface VersionHistoryProps {
  filePath?: string;
  onViewDiff: (commitHash: string) => void;
  onRestore: (commitHash: string) => void;
}

export function VersionHistory({ filePath, onViewDiff, onRestore }: VersionHistoryProps) {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCommits();
  }, [filePath]);

  const loadCommits = async () => {
    setLoading(true);
    setError(null);
    try {
      const history = await codeApi.getCommits(filePath, 50);
      setCommits(history);
    } catch (err) {
      setError(`加载历史失败: ${err}`);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <History className="w-4 h-4" />
        <span className="text-sm font-medium">版本历史</span>
        <button
          onClick={loadCommits}
          className="ml-auto p-1 hover:bg-gray-100 rounded"
        >
          <History className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {commits.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            暂无提交记录
          </div>
        ) : (
          <div className="divide-y">
            {commits.map((commit) => (
              <div
                key={commit.hash}
                className="px-3 py-2 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{commit.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {commit.author_name} · {formatDate(commit.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => onViewDiff(commit.hash)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="查看差异"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onRestore(commit.hash)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="恢复到此版本"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-blue-500 font-mono mt-1">
                  {commit.hash.substring(0, 7)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
