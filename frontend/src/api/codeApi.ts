/**
 * 代码协作 API 客户端
 */

import { api } from "./client";

const API_PREFIX = "/code";

export interface FileTreeItem {
  path: string;
  name: string;
  type: "file" | "directory";
}

export interface FileStatus {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitStatus {
  clean: boolean;
  files: FileStatus[];
}

export interface CommitInfo {
  hash: string;
  message: string;
  author_name: string;
  author_email: string;
  date: string;
  parent: string | null;
}

export interface CommitResponse {
  commit_hash: string;
  message: string;
  branch: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
}

export interface DiffResponse {
  diff: string;
}

export interface BranchResponse {
  branch: string;
}

export interface RemoteResponse {
  url: string | null;
}

export interface FileContentResponse {
  content: string;
}

interface ApiResponse<T> {
  data?: T;
  detail?: string;
}

const codeApi = {
  // 文件操作
  getFileTree: async (path: string = "."): Promise<FileTreeItem[]> => {
    const response = await api.get<ApiResponse<FileTreeItem[]>>(`${API_PREFIX}/files?path=${encodeURIComponent(path)}`);
    return response.data || [];
  },

  readFile: async (path: string): Promise<string> => {
    const response = await api.get<ApiResponse<FileContentResponse>>(`${API_PREFIX}/files/${encodeURIComponent(path)}`);
    return response.data?.content || "";
  },

  writeFile: async (path: string, content: string): Promise<void> => {
    await api.put(`${API_PREFIX}/files/${encodeURIComponent(path)}`, { content });
  },

  // Git 状态
  getStatus: async (): Promise<GitStatus> => {
    const response = await api.get<ApiResponse<GitStatus>>(`${API_PREFIX}/status`);
    return response.data || { clean: true, files: [] };
  },

  // 提交历史
  getCommits: async (path?: string, limit: number = 50): Promise<CommitInfo[]> => {
    let url = `${API_PREFIX}/commits?limit=${limit}`;
    if (path) {
      url += `&path=${encodeURIComponent(path)}`;
    }
    const response = await api.get<ApiResponse<CommitInfo[]>>(url);
    return response.data || [];
  },

  // 创建提交
  createCommit: async (message: string): Promise<CommitResponse> => {
    const response = await api.post<ApiResponse<CommitResponse>>(`${API_PREFIX}/commit`, { message });
    if (!response.data) {
      throw new Error("提交失败");
    }
    return response.data;
  },

  // 差异
  getDiff: async (commitA: string, commitB: string = "HEAD", path?: string): Promise<string> => {
    let url = `${API_PREFIX}/diff?commit_a=${commitA}&commit_b=${commitB}`;
    if (path) {
      url += `&path=${encodeURIComponent(path)}`;
    }
    const response = await api.get<ApiResponse<{ diff: string }>>(url);
    return response.data?.diff || "";
  },

  // 文件在指定提交的内容
  getFileAtCommit: async (commitHash: string, path: string): Promise<string> => {
    const response = await api.get<ApiResponse<FileContentResponse>>(
      `${API_PREFIX}/commits/${commitHash}/file/${encodeURIComponent(path)}`
    );
    return response.data?.content || "";
  },

  // 同步操作
  push: async (remote: string = "origin", branch: string = "main"): Promise<SyncResponse> => {
    const response = await api.post<ApiResponse<SyncResponse>>(`${API_PREFIX}/push`, { remote, branch });
    if (!response.data) {
      throw new Error("推送失败");
    }
    return response.data;
  },

  pull: async (remote: string = "origin", branch: string = "main"): Promise<SyncResponse> => {
    const response = await api.post<ApiResponse<SyncResponse>>(`${API_PREFIX}/pull`, { remote, branch });
    if (!response.data) {
      throw new Error("拉取失败");
    }
    return response.data;
  },

  // 远程仓库
  getRemote: async (): Promise<string | null> => {
    const response = await api.get<ApiResponse<RemoteResponse>>(`${API_PREFIX}/remote`);
    return response.data?.url || null;
  },

  setRemote: async (url: string): Promise<void> => {
    await api.post(`${API_PREFIX}/remote`, { url });
  },

  // 分支
  getBranch: async (): Promise<string> => {
    const response = await api.get<ApiResponse<BranchResponse>>(`${API_PREFIX}/branch`);
    return response.data?.branch || "main";
  },

  // 初始化仓库
  initRepo: async (remoteUrl?: string): Promise<void> => {
    await api.post(`${API_PREFIX}/init`, { remote_url: remoteUrl });
  },
};

export default codeApi;
