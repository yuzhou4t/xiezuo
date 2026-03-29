import { useState, useEffect } from "react";
import { Upload, Download, Settings, RefreshCw } from "lucide-react";
import codeApi from "../../../../api/codeApi";

interface SyncPanelProps {
  onStatusChange?: (status: { clean: boolean; files: any[] }) => void;
}

export function SyncPanel({ onStatusChange }: SyncPanelProps) {
  const [branch, setBranch] = useState<string>("main");
  const [remote, setRemote] = useState<string | null>(null);
  const [status, setStatus] = useState<{ clean: boolean; files: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState("");

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    try {
      const [branchRes, remoteRes, statusRes] = await Promise.all([
        codeApi.getBranch(),
        codeApi.getRemote(),
        codeApi.getStatus(),
      ]);
      setBranch(branchRes);
      setRemote(remoteRes);
      setStatus(statusRes);
      onStatusChange?.(statusRes);
    } catch (error) {
      console.error("Failed to load git info:", error);
    }
  };

  const handlePush = async () => {
    if (!remote) {
      setMessage({ type: "error", text: "请先配置远程仓库" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await codeApi.push();
      if (result.success) {
        setMessage({ type: "success", text: "推送成功" });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: `推送失败: ${error}` });
    }
    setLoading(false);
  };

  const handlePull = async () => {
    if (!remote) {
      setMessage({ type: "error", text: "请先配置远程仓库" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await codeApi.pull();
      if (result.success) {
        setMessage({ type: "success", text: "拉取成功" });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: `拉取失败: ${error}` });
    }
    setLoading(false);
  };

  const handleSaveRemote = async () => {
    if (!remoteUrl.trim()) return;
    setLoading(true);
    try {
      await codeApi.setRemote(remoteUrl);
      setRemote(remoteUrl);
      setShowSettings(false);
      setMessage({ type: "success", text: "远程仓库已配置" });
    } catch (error) {
      setMessage({ type: "error", text: `配置失败: ${error}` });
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b">
      {/* 分支信息 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">分支:</span>
        <span className="font-medium">{branch}</span>
      </div>

      {/* 状态指示 */}
      {status && (
        <div className="flex items-center gap-2 text-sm">
          {status.clean ? (
            <span className="text-green-600">✓ 已同步</span>
          ) : (
            <span className="text-orange-600">
              ⚠ {status.files.length} 个文件待提交
            </span>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={handlePull}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          拉取
        </button>

        <button
          onClick={handlePush}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          推送
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={loadInfo}
          disabled={loading}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className={`absolute top-full left-0 right-0 px-4 py-2 text-sm ${
            message.type === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <div className="absolute top-full right-0 mt-1 bg-white border rounded shadow-lg p-4 w-80 z-50">
          <h4 className="font-medium mb-3">远程仓库设置</h4>
          <input
            type="text"
            value={remoteUrl}
            onChange={(e) => setRemoteUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            className="w-full px-3 py-2 border rounded mb-3"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowSettings(false)}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSaveRemote}
              disabled={loading}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
