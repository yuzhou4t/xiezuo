import { useState } from "react";
import { FileExplorer } from "../components/features/code/FileExplorer";
import { CodeEditor } from "../components/features/code/CodeEditor";
import { VersionHistory } from "../components/features/code/VersionHistory";
import { DiffView } from "../components/features/code/DiffView";
import { SyncPanel } from "../components/features/code/SyncPanel";
import { codeApi } from "../../api/codeApi";

export default function CodePage() {
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  const handleFileSelect = (path: string) => {
    setCurrentFile(path);
    if (!openFiles.includes(path)) {
      setOpenFiles([...openFiles, path]);
    }
  };

  const handleCloseFile = (path: string) => {
    const newOpenFiles = openFiles.filter((f) => f !== path);
    setOpenFiles(newOpenFiles);
    if (currentFile === path) {
      setCurrentFile(newOpenFiles[0] || null);
    }
  };

  const handleViewDiff = (commitHash: string) => {
    setSelectedCommit(commitHash);
  };

  const handleRestore = async (commitHash: string) => {
    if (!confirm("确定要恢复到该版本吗？这将覆盖当前文件内容。")) {
      return;
    }
    try {
      const content = await codeApi.getFileAtCommit(commitHash, currentFile!);
      await codeApi.writeFile(currentFile!, content);
      alert("已恢复到指定版本，请手动保存");
      window.location.reload();
    } catch (error) {
      alert(`恢复失败: ${error}`);
    }
  };

  const handleCommit = async (message: string) => {
    try {
      await codeApi.createCommit(message);
      alert("提交成功");
      window.location.reload();
    } catch (error) {
      alert(`提交失败: ${error}`);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部导航 */}
      <div className="h-12 bg-white border-b flex items-center px-4">
        <h1 className="text-lg font-medium mr-4">代码协作</h1>
        <SyncPanel />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧文件浏览器 */}
        <div className="w-64 flex-shrink-0">
          <FileExplorer
            onFileSelect={handleFileSelect}
            currentFile={currentFile}
          />
        </div>

        {/* 中间编辑器 */}
        <div className="flex-1 flex flex-col">
          <CodeEditor
            path={currentFile}
            onClose={handleCloseFile}
            openFiles={openFiles}
            onFileChange={setCurrentFile}
          />

          {/* 提交面板 */}
          <CommitPanel onCommit={handleCommit} />
        </div>

        {/* 右侧版本历史 */}
        {showHistory && (
          <div className="w-80 flex-shrink-0">
            <VersionHistory
              filePath={currentFile || undefined}
              onViewDiff={handleViewDiff}
              onRestore={handleRestore}
            />
          </div>
        )}
      </div>

      {/* 差异对比弹窗 */}
      {selectedCommit && (
        <DiffView
          commitHash={selectedCommit}
          filePath={currentFile || undefined}
          onClose={() => setSelectedCommit(null)}
        />
      )}
    </div>
  );
}

// 提交面板组件
function CommitPanel({ onCommit }: { onCommit: (message: string) => void }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      alert("请填写提交信息");
      return;
    }
    setLoading(true);
    await onCommit(message);
    setLoading(false);
    setMessage("");
  };

  return (
    <div className="bg-white border-t p-4">
      <h3 className="text-sm font-medium mb-2">创建提交</h3>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="填写提交信息..."
        className="w-full px-3 py-2 border rounded mb-2 text-sm"
        rows={2}
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !message.trim()}
        className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "提交中..." : "提交"}
      </button>
    </div>
  );
}
