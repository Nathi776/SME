#!/usr/bin/env python
import sys
from alembic.config import Config
from alembic import script, migration
from sqlalchemy import inspect, create_engine

# Check database connection
from database import engine

# Get inspector
inspector = inspect(engine)

# Check if fee_rate column exists
columns = [col['name'] for col in inspector.get_columns('finance_requests')]
print(f"Columns in finance_requests table: {columns}")
print(f"fee_rate exists: {'fee_rate' in columns}")

# Get migration info
cfg = Config('alembic.ini')
script_dir = script.ScriptDirectory.from_config(cfg)
with engine.connect() as connection:
    ctx = migration.MigrationContext.configure(connection)
    current_rev = ctx.get_current_revision()
    print(f"Current migration: {current_rev}")
