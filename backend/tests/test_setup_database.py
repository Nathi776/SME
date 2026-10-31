import pytest
from sqlalchemy import create_engine, inspect, text

import setup_database as sd


@pytest.fixture()
def fresh(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'db.sqlite'}"
    eng = create_engine(url)
    monkeypatch.setattr(sd, "engine", eng)
    cfg = sd._alembic_config()
    cfg.set_main_option("sqlalchemy.url", url)
    cfg.attributes["url_overridden"] = True
    monkeypatch.setattr(sd, "_alembic_config", lambda: cfg)
    yield eng
    eng.dispose()


def _version(eng):
    with eng.connect() as c:
        return c.execute(text("select version_num from alembic_version")).scalar()


def test_empty_database_is_created_and_stamped_at_head(fresh):
    assert sd.run() == "created"
    tables = set(inspect(fresh).get_table_names())
    assert {"users", "smes", "finance_requests", "finance_request_messages", "data_consents"} <= tables
    from alembic.script import ScriptDirectory
    assert _version(fresh) == ScriptDirectory.from_config(sd._alembic_config()).get_current_head()


def test_running_again_is_safe(fresh):
    sd.run()
    assert sd.run() == "upgraded"


def test_unversioned_database_with_tables_is_not_touched(fresh):
    with fresh.begin() as c:
        c.execute(text("create table users (id integer primary key)"))
    with pytest.raises(SystemExit):
        sd.run()
    assert set(inspect(fresh).get_table_names()) == {"users"}
