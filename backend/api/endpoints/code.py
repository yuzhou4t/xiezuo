"""
代码协作 API 端点
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user_id
from core.database import get_db
from services.git_service import git_service

router = APIRouter()


# ==================== Schema ====================

class FileTreeItem(BaseModel):
    path: str
    name: str
    type: str  # "file" or "directory"


class FileStatus(BaseModel):
    path: str
    status: str
    staged: bool


class GitStatus(BaseModel):
    clean: bool
    files: List[FileStatus]


class CommitInfo(BaseModel):
    hash: str
    message: str
    author_name: str
    author_email: str
    date: str
    parent: Optional[str] = None


class CommitCreate(BaseModel):
    message: str


class CommitResponse(BaseModel):
    commit_hash: str
    message: str
    branch: str


class SyncRequest(BaseModel):
    remote: str = "origin"
    branch: str = "main"


class SyncResponse(BaseModel):
    success: bool
    message: str


class RemoteConfig(BaseModel):
    url: str


class FileContent(BaseModel):
    content: str


# ==================== 路由 ====================

@router.get("/files", response_model=List[FileTreeItem])
async def get_file_tree(
    path: str = Query(".", description="目录路径"),
    user_id: str = Depends(get_current_user_id),
):
    """获取项目文件树"""
    return await git_service.get_file_tree(path)


@router.get("/files/{path:path}", response_model=FileContent)
async def read_file(
    path: str,
    user_id: str = Depends(get_current_user_id),
):
    """读取文件内容"""
    try:
        content = await git_service.read_file(path)
        return FileContent(content=content)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")


@router.put("/files/{path:path}")
async def write_file(
    path: str,
    request: FileContent,
    user_id: str = Depends(get_current_user_id),
):
    """写入文件内容"""
    await git_service.write_file(path, request.content)
    return {"message": "File saved", "path": path}


@router.get("/status", response_model=GitStatus)
async def get_status(
    user_id: str = Depends(get_current_user_id),
):
    """获取当前修改状态"""
    return await git_service.get_status()


@router.get("/commits", response_model=List[CommitInfo])
async def get_commits(
    path: Optional[str] = Query(None, description="文件路径（可选）"),
    limit: int = Query(50, ge=1, le=200),
    user_id: str = Depends(get_current_user_id),
):
    """获取提交历史"""
    return await git_service.get_history(path=path, limit=limit)


@router.post("/commit", response_model=CommitResponse)
async def create_commit(
    request: CommitCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """创建提交"""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Commit message cannot be empty")

    try:
        commit = await git_service.commit(
            message=request.message,
            author_name="User",
            author_email="user@example.com",
            db=db,
        )
        return CommitResponse(
            commit_hash=commit.commit_hash,
            message=commit.message,
            branch=commit.branch,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/diff")
async def get_diff(
    commit_a: str = Query(..., description="起始提交 hash"),
    commit_b: str = Query("HEAD", description="结束提交 hash"),
    path: Optional[str] = Query(None, description="文件路径"),
    user_id: str = Depends(get_current_user_id),
):
    """获取差异"""
    diff = await git_service.get_diff(commit_a, commit_b, path)
    return {"diff": diff}


@router.post("/push", response_model=SyncResponse)
async def push(
    request: SyncRequest = SyncRequest(),
    user_id: str = Depends(get_current_user_id),
):
    """推送到远程"""
    result = await git_service.push(remote=request.remote, branch=request.branch)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return SyncResponse(**result)


@router.post("/pull", response_model=SyncResponse)
async def pull(
    request: SyncRequest = SyncRequest(),
    user_id: str = Depends(get_current_user_id),
):
    """从远程拉取"""
    result = await git_service.pull(remote=request.remote, branch=request.branch)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return SyncResponse(**result)


@router.get("/remote")
async def get_remote(
    user_id: str = Depends(get_current_user_id),
):
    """获取远程仓库地址"""
    url = await git_service.get_remote()
    return {"url": url}


@router.post("/remote")
async def set_remote(
    request: RemoteConfig,
    user_id: str = Depends(get_current_user_id),
):
    """设置远程仓库地址"""
    await git_service.set_remote(url=request.url)
    return {"message": "Remote configured", "url": request.url}


@router.get("/branch")
async def get_branch(
    user_id: str = Depends(get_current_user_id),
):
    """获取当前分支"""
    branch = await git_service.get_current_branch()
    return {"branch": branch}


@router.get("/commits/{commit_hash}/file/{path:path}")
async def get_file_at_commit(
    commit_hash: str,
    path: str,
    user_id: str = Depends(get_current_user_id),
):
    """获取指定提交的文件内容"""
    try:
        content = await git_service.get_file_at_commit(path, commit_hash)
        return FileContent(content=content)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found at commit")


@router.post("/init")
async def init_repo(
    remote_url: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
):
    """初始化仓库"""
    try:
        await git_service.init_repo(remote_url)
        return {"message": "Repository initialized"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
