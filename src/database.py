import os
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

class Mod(Base):
    __tablename__ = 'mods'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    author = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    host = Column(String(255), nullable=False, default='thunderstore')
    
    # Relationship to downloads
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
    
    # Relationship to mod
    mod = relationship("Mod", back_populates="downloads")
    
    __table_args__ = (
        UniqueConstraint('mod_id', 'date', name='unique_mod_date'),
    )
    
    def __repr__(self):
        return f"<ModDownloads(date={self.date}, total_downloads={self.total_downloads})>"

class DatabaseManager:
    def __init__(self):
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        # Handle Heroku's postgres:// URL format
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(bind=self.engine)
        
    def get_session(self):
        """Get a database session."""
        return self.SessionLocal()
    
    def get_all_mods(self):
        """Get all mods from the database."""
        session = self.get_session()
        try:
            return session.query(Mod).all()
        finally:
            session.close()
    
    def get_downloads_for_mod(self, mod_id: int):
        """Get all download records for a specific mod."""
        session = self.get_session()
        try:
            return session.query(ModDownloads).filter(
                ModDownloads.mod_id == mod_id
            ).order_by(ModDownloads.date.desc()).all()
        finally:
            session.close()
    
    def download_entry_exists(self, mod_id: int, date: datetime) -> bool:
        """Check if a download entry already exists for the given mod and date."""
        session = self.get_session()
        try:
            existing = session.query(ModDownloads).filter(
                ModDownloads.mod_id == mod_id,
                ModDownloads.date == date.date()
            ).first()
            return existing is not None
        finally:
            session.close()
    
    def add_download_entry(self, mod_id: int, date: datetime, total_downloads: int):
        """Add a new download entry for a mod."""
        session = self.get_session()
        try:
            entry = ModDownloads(
                mod_id=mod_id,
                date=date.date(),
                total_downloads=total_downloads
            )
            session.add(entry)
            session.commit()
            return entry
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
