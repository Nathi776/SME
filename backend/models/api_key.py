from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from database import Base
from datetime import datetime

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_hash = Column(String, nullable=False)
    key_prefix = Column(String(12), nullable=True, index=True)
    name = Column(String, nullable=False)
    consumer_type = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    def __repr__(self):
        return f"<APIKey(id={self.id}, name='{self.name}', consumer_type='{self.consumer_type}', is_active={self.is_active})>"
