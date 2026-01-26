#!/usr/bin/env python
import os
from sqlalchemy import inspect, text
from database import engine

# Check if fee_rate column exists
with engine.connect() as connection:
    inspector = inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('finance_requests')]
    print(f"Columns in finance_requests: {columns}")
    
    if 'fee_rate' not in columns:
        print("fee_rate column not found - adding it...")
        connection.execute(text("ALTER TABLE finance_requests ADD COLUMN fee_rate FLOAT DEFAULT 0"))
        connection.commit()
        print("Column added successfully")
    else:
        print("fee_rate column already exists")
