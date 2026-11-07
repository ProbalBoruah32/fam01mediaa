"""
FAMONEMEDIA Relational Database Models (SQLAlchemy)
Defines persistent database entities for Projects, Assets, and Version History.
"""

from __future__ import annotations
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class DBProject(Base):
    __tablename__ = "projects"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False, default="Untitled Project")
    project_type = Column(String(32), default="editor", index=True) # "editor" | "reverse" | "make_edit"
    aspect_ratio = Column(String(16), default="16:9")
    width = Column(Integer, default=1920)
    height = Column(Integer, default=1080)
    fps = Column(Float, default=30.0)
    duration_sec = Column(Float, default=0.0)
    total_clips = Column(Integer, default=0)
    thumbnail_url = Column(String(512), nullable=True)
    data_json = Column(Text, nullable=True) # Serialized timeline JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    versions = relationship("DBProjectVersion", back_populates="project", cascade="all, delete-orphan")


class DBProjectVersion(Base):
    __tablename__ = "project_versions"

    id = Column(String(64), primary_key=True)
    project_id = Column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    version_number = Column(Integer, nullable=False)
    description = Column(String(255), default="Manual Snapshot")
    snapshot_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("DBProject", back_populates="versions")


class DBAsset(Base):
    __tablename__ = "assets"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    media_url = Column(String(512), nullable=False)
    media_type = Column(String(32), default="video", index=True) # "video" | "image" | "audio"
    duration_sec = Column(Float, default=0.0)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    file_size_bytes = Column(Integer, default=0)
    thumbnail_url = Column(String(512), nullable=True)
    waveform_json = Column(Text, nullable=True) # Array of normalized peak values [0.1, 0.4, 0.9, ...]
    tags = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
