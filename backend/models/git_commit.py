"""
Git 提交记录模型
"""

from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from models.user import User


class GitCommit(Base, UUIDMixin, TimestampMixin):
    """
    Git 提交记录模型
    存储每次 git commit 的信息
    """

    commit_hash: Mapped[str] = mapped_column(
        String(40),
        unique=True,
        index=True,
        nullable=False,
        comment="提交哈希",
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="提交信息",
    )

    author_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="作者 ID",
    )

    parent_hash: Mapped[Optional[str]] = mapped_column(
        String(40),
        nullable=True,
        comment="父提交哈希",
    )

    changed_files: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="变更文件列表",
    )

    remote_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="远程仓库地址",
    )

    branch: Mapped[str] = mapped_column(
        String(255),
        default="main",
        nullable=False,
        comment="所属分支",
    )

    # 关系
    author: Mapped["User"] = relationship(
        "User",
        back_populates="git_commits",
    )

    def __repr__(self) -> str:
        return f"<GitCommit(hash={self.commit_hash[:7]}, message={self.message[:30]})>"
