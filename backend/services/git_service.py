"""
Git 操作服务
通过 subprocess 调用 git 命令操作项目仓库
"""

import asyncio
from pathlib import Path
from typing import List, Dict, Optional, Any

from sqlalchemy.ext.asyncio import AsyncSession

from models.git_commit import GitCommit


class GitService:
    """Git 操作服务"""

    def __init__(self, workspace_path: str = "/workspace/renhang_smartreport"):
        self.workspace_path = Path(workspace_path)

    async def _run_git(self, args: List[str], cwd: Optional[str] = None) -> tuple[str, str, int]:
        """异步执行 git 命令"""
        cwd = cwd or str(self.workspace_path)
        proc = await asyncio.create_subprocess_exec(
            "git", *args,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        return stdout.decode(), stderr.decode(), proc.returncode

    async def get_file_tree(self, path: str = ".") -> List[Dict[str, Any]]:
        """获取文件树结构"""
        full_path = self.workspace_path / path
        if not full_path.exists():
            return []

        result = []
        try:
            stdout, _, code = await self._run_git(["ls-tree", "-r", "--name-only", "HEAD"], cwd=str(full_path.parent))
            if code == 0:
                files = [f.strip() for f in stdout.split("\n") if f.strip()]
                for f in files:
                    parts = f.split("/")
                    result.append({
                        "path": f,
                        "name": parts[-1],
                        "type": "file",
                    })
        except Exception:
            # 首次使用时可能还没有 git 仓库
            for item in full_path.iterdir():
                if item.name.startswith("."):
                    continue
                result.append({
                    "path": item.name,
                    "name": item.name,
                    "type": "directory" if item.is_dir() else "file",
                })

        # 移除重复，按路径排序
        seen = set()
        unique = []
        for item in result:
            if item["path"] not in seen:
                seen.add(item["path"])
                unique.append(item)
        return unique

    async def read_file(self, path: str) -> str:
        """读取文件内容"""
        full_path = self.workspace_path / path
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        stdout, _, code = await self._run_git(["show", f"HEAD:{path}"])
        if code == 0:
            return stdout

        # 如果不在 git 中，直接读取
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()

    async def write_file(self, path: str, content: str) -> None:
        """写入文件内容"""
        full_path = self.workspace_path / path
        full_path.parent.mkdir(parents=True, exist_ok=True)

        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)

    async def get_status(self) -> Dict[str, Any]:
        """获取当前修改状态"""
        stdout, stderr, code = await self._run_git(["status", "--porcelain"])
        if code != 0:
            return {"clean": True, "files": []}

        files = []
        for line in stdout.split("\n"):
            if not line.strip():
                continue
            status = line[:2].strip()
            file_path = line[3:].strip()
            files.append({
                "path": file_path,
                "status": status,
                "staged": status in ["A", "M", "D", "R"],
            })

        return {
            "clean": len(files) == 0,
            "files": files,
        }

    async def stage_all(self) -> None:
        """暂存所有变更"""
        await self._run_git(["add", "-A"])

    async def commit(
        self,
        message: str,
        author_name: str,
        author_email: str,
        db: AsyncSession,
    ) -> GitCommit:
        """创建提交"""
        # 设置 git 用户信息
        await self._run_git(["config", "user.name", author_name])
        await self._run_git(["config", "user.email", author_email])

        # 暂存所有变更
        await self._run_git(["add", "-A"])

        # 执行提交
        stdout, stderr, code = await self._run_git(["commit", "-m", message])
        if code != 0:
            raise RuntimeError(f"Git commit failed: {stderr}")

        # 获取提交 hash
        stdout, _, _ = await self._run_git(["rev-parse", "HEAD"])
        commit_hash = stdout.strip()

        # 获取父提交
        parent_hash = None
        stdout, _, code = await self._run_git(["rev-parse", "HEAD^"])
        if code == 0 and stdout.strip():
            parent_hash = stdout.strip()

        # 获取变更文件列表
        changed_files = []
        stdout, _, code = await self._run_git(["diff", "--name-status", "HEAD~1", "HEAD"])
        if code == 0:
            for line in stdout.split("\n"):
                if line.strip():
                    parts = line.split("\t")
                    if len(parts) >= 2:
                        changed_files.append({
                            "status": parts[0],
                            "path": parts[1],
                        })

        # 获取当前分支
        stdout, _, _ = await self._run_git(["branch", "--show-current"])
        branch = stdout.strip() or "main"

        # 获取远程地址
        remote_url = None
        stdout, _, code = await self._run_git(["remote", "get-url", "origin"])
        if code == 0 and stdout.strip():
            remote_url = stdout.strip()

        # 保存到数据库
        git_commit = GitCommit(
            commit_hash=commit_hash,
            message=message,
            author_id="00000000-0000-0000-0000-000000000001",  # 简化：使用默认用户
            parent_hash=parent_hash,
            changed_files=changed_files,
            remote_url=remote_url,
            branch=branch,
        )
        db.add(git_commit)
        await db.commit()
        await db.refresh(git_commit)
        return git_commit

    async def get_history(self, path: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """获取提交历史"""
        args = ["log", f"-{limit}", "--pretty=format:%H|%s|%an|%ae|%ai|%P"]
        if path:
            args.append("--")
            args.append(path)

        stdout, _, code = await self._run_git(args)
        if code != 0:
            return []

        commits = []
        for line in stdout.split("\n"):
            if not line.strip():
                continue
            parts = line.split("|")
            if len(parts) >= 5:
                commits.append({
                    "hash": parts[0],
                    "message": parts[1],
                    "author_name": parts[2],
                    "author_email": parts[3],
                    "date": parts[4],
                    "parent": parts[5] if len(parts) > 5 else None,
                })
        return commits

    async def get_diff(self, commit_a: str, commit_b: str = "HEAD", path: Optional[str] = None) -> str:
        """获取差异"""
        args = ["diff", commit_a, commit_b]
        if path:
            args.append("--")
            args.append(path)

        stdout, _, _ = await self._run_git(args)
        return stdout

    async def get_file_at_commit(self, path: str, commit_hash: str) -> str:
        """获取指定提交的文件内容"""
        stdout, _, code = await self._run_git(["show", f"{commit_hash}:{path}"])
        if code != 0:
            raise FileNotFoundError(f"File {path} not found at commit {commit_hash}")
        return stdout

    async def push(self, remote: str = "origin", branch: str = "main") -> Dict[str, Any]:
        """推送到远程"""
        stdout, stderr, code = await self._run_git(["push", remote, branch])
        return {
            "success": code == 0,
            "message": stdout if code == 0 else stderr,
        }

    async def pull(self, remote: str = "origin", branch: str = "main") -> Dict[str, Any]:
        """从远程拉取"""
        stdout, stderr, code = await self._run_git(["pull", remote, branch])
        return {
            "success": code == 0,
            "message": stdout if code == 0 else stderr,
        }

    async def init_repo(self, remote_url: Optional[str] = None) -> None:
        """初始化仓库（如果还没有）"""
        git_dir = self.workspace_path / ".git"
        if git_dir.exists():
            return

        await self._run_git(["init"])
        await self._run_git(["config", "user.name", "System"])
        await self._run_git(["config", "user.email", "system@local"])

        if remote_url:
            await self._run_git(["remote", "add", "origin", remote_url])

        # 初始提交
        await self._run_git(["add", "-A"])
        stdout, stderr, code = await self._run_git(["commit", "-m", "Initial commit"])
        if code != 0 and "nothing to commit" not in stderr.lower():
            raise RuntimeError(f"Initial commit failed: {stderr}")

    async def set_remote(self, name: str = "origin", url: str) -> None:
        """设置远程仓库"""
        stdout, _, _ = await self._run_git(["remote"])
        remotes = stdout.strip().split("\n") if stdout.strip() else []

        if name in remotes:
            await self._run_git(["remote", "set-url", name, url])
        else:
            await self._run_git(["remote", "add", name, url])

    async def get_remote(self) -> Optional[str]:
        """获取远程仓库地址"""
        stdout, _, code = await self._run_git(["remote", "get-url", "origin"])
        if code == 0 and stdout.strip():
            return stdout.strip()
        return None

    async def get_current_branch(self) -> str:
        """获取当前分支"""
        stdout, _, _ = await self._run_git(["branch", "--show-current"])
        return stdout.strip() or "main"


# 全局实例
git_service = GitService()
