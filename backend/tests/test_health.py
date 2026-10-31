def test_health_reports_ok_and_leaks_nothing(api):
    r = api.client.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_health_returns_503_when_database_is_down(api, monkeypatch):
    import main

    class Broken:
        def connect(self):
            raise RuntimeError("db down")

    monkeypatch.setattr(main, "engine", Broken())
    r = api.client.get("/health")
    assert r.status_code == 503 and r.json() == {"status": "unavailable"}
