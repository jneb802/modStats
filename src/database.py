import os
from contextlib import contextmanager
from datetime import datetime, date as dt_date
from typing import Union

from sqlalchemy import (
    create_engine, Column, String, Integer, Date, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

class Mod(Base):
    __tablename__ = 'mods'

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)  # UTC on Heroku
    author = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    host = Column(String(255), nullable=False, default='thunderstore')

    downloads = relationship("ModDownloads", back_populates="mod")

    __table_args__ = (
        UniqueConstraint('author', 'name', 'host', name='unique_mod_author_name_host'),
    )

    def __repr__(self):
        return f"<Mod(created_at={self.created_at}, author='{self.author}', name='{self.name}', host='{self.host}')>"


class ModDownloads(Base):
    __tablename__ = 'mod_downloads'

    id = Column(Integer, primary_key=True, autoincrement=True)
    mod_id = Column(Integer, ForeignKey('mods.id'), nullable=False)
    date = Column(Date, nullable=False)
    total_downloads = Column(Integer, nullable=False)

    mod = relationship("Mod", back_populates="downloads")

    __table_args__ = (
        UniqueConstraint('mod_id', 'date', name='unique_mod_date'),
    )

    def __repr__(self):
        return f"<ModDownloads(date={self.date}, total_downloads={self.total_downloads})>"


def _normalize_database_url(url: str) -> str:
    # postgres:// → postgresql:// for SQLAlchemy
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    # ensure SSL
    if "sslmode=" not in url:
        url += ("&" if "?" in url else "?") + "sslmode=require"
    return url


def _to_date(value: Union[dt_date, datetime]) -> dt_date:
    return value if isinstance(value, dt_date) and not isinstance(value, datetime) else value.date()


class DatabaseManager:
    def __init__(self):
        raw_url = os.getenv('DATABASE_URL')
        if not raw_url:
            raise ValueError("DATABASE_URL environment variable is required")

        database_url = _normalize_database_url(raw_url)

        # Pre-ping to validate connections; recycle to avoid long-idle socket issues
        self.engine = create_engine(
            database_url,
            pool_pre_ping=True,
            pool_recycle=300,
        )
        self.SessionLocal = sessionmaker(bind=self.engine, expire_on_commit=False)

    @contextmanager
    def session_scope(self):
        """Provide a transactional scope around a series of operations."""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_all_mods(self):
        with self.session_scope() as s:
            return s.query(Mod).all()

    def get_downloads_for_mod(self, mod_id: int):
        with self.session_scope() as s:
            return (
                s.query(ModDownloads)
                .filter(ModDownloads.mod_id == mod_id)
                .order_by(ModDownloads.date.desc())
                .all()
            )

    def download_entry_exists(self, mod_id: int, the_date: Union[dt_date, datetime]) -> bool:
        d = _to_date(the_date)
        with self.session_scope() as s:
            return s.query(ModDownloads).filter(
                ModDownloads.mod_id == mod_id,
                ModDownloads.date == d
            ).first() is not None

    def add_download_entry(self, mod_id: int, the_date: Union[dt_date, datetime], total_downloads: int):
        d = _to_date(the_date)
        with self.session_scope() as s:
            entry = ModDownloads(mod_id=mod_id, date=d, total_downloads=total_downloads)
            s.add(entry)
            # expire_on_commit=False -> entry still populated after commit
            return entry
