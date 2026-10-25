
from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return the current UTC time as a naive datetime.

    Maintains compatibility with existing database columns that
    store UTC timestamps without timezone information.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
