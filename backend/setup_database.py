"""
Bring the database to the current schema, whatever state it is in. Run on every deploy:

    python setup_database.py

  * empty database            -> create every table from the models, then mark it as up to date
  * database managed by alembic -> apply any pending migrations (same as `alembic upgrade head`)
  * tables but no alembic record -> stop and explain (never guess on a database that has data)

Why: the migration history starts from an existing database (migration 001 alters tables
that it never creates), so `alembic upgrade head` cannot build a new database on its own.
"""
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

sys.path.insert(0, str(Path(__file__).resolve().parent))

import models  # noqa: F401,E402  (register every table)
from database import Base, engine  # noqa: E402


def _alembic_config() -> Config:
    cfg = Config(str(Path(__file__).resolve().parent / "alembic.ini"))
    cfg.set_main_option("script_location", str(Path(__file__).resolve().parent / "alembic"))
    return cfg


def run() -> str:
    tables = set(inspect(engine).get_table_names())
    cfg = _alembic_config()

    if "alembic_version" in tables:
        command.upgrade(cfg, "head")
        return "upgraded"

    if not tables:
        Base.metadata.create_all(bind=engine)
        command.stamp(cfg, "head")
        return "created"

    raise SystemExit(
        "This database already has tables but no migration history, so I will not guess its state.\n"
        "If it was built by an older version of this app, run:  alembic stamp <revision>  for the "
        "revision that matches it (see `alembic history`), then run this script again.\n"
        "If it is a throwaway database, drop it and re-run."
    )


if __name__ == "__main__":
    print(f"Database {run()}.")
