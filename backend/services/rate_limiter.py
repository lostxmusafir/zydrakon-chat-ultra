import logging
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any
from backend.models.database import get_db
from backend.utils.config import settings

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self):
        self.rpm_limit = settings.RATE_LIMIT_RPM
        self.daily_limit = settings.RATE_LIMIT_DAILY

    def check_rate_limit(self, identifier: str) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Verifies if requests from the identifier (e.g. session or IP) are within rate limits.
        Returns: (is_limited, reason_code, details)
        """
        conn = get_db()
        try:
            # First, clean up rate limit entries older than 24 hours to keep the database size small
            conn.execute("DELETE FROM rate_limits WHERE timestamp < datetime('now', '-1 day');")
            conn.commit()

            # 1. Check RPM (Requests Per Minute)
            cursor_min = conn.execute(
                "SELECT COUNT(*) FROM rate_limits WHERE identifier = ? AND timestamp > datetime('now', '-1 minute');",
                (identifier,)
            )
            rpm_count = cursor_min.fetchone()[0]

            # 2. Check Daily limit
            cursor_day = conn.execute(
                "SELECT COUNT(*) FROM rate_limits WHERE identifier = ? AND timestamp > datetime('now', '-1 day');",
                (identifier,)
            )
            daily_count = cursor_day.fetchone()[0]

            if rpm_count >= self.rpm_limit:
                # Calculate retry after (approx: time since oldest request in last minute + 60s)
                cursor_oldest = conn.execute(
                    "SELECT timestamp FROM rate_limits WHERE identifier = ? AND timestamp > datetime('now', '-1 minute') ORDER BY timestamp ASC LIMIT 1;",
                    (identifier,)
                )
                oldest_row = cursor_oldest.fetchone()
                retry_after_sec = 60
                if oldest_row:
                    try:
                        # SQLite returns ISO timestamps (e.g. "2026-07-16 15:47:00")
                        oldest_time = datetime.strptime(oldest_row[0], "%Y-%m-%d %H:%M:%S")
                        now_utc = datetime.utcnow()
                        # Calculate seconds until it rolls off
                        elapsed = (now_utc - oldest_time).total_seconds()
                        retry_after_sec = max(1, int(60 - elapsed))
                    except Exception:
                        pass
                
                return True, "RPM_LIMITED", {"retry_after_sec": retry_after_sec, "rpm_limit": self.rpm_limit, "daily_limit": self.daily_limit}

            if daily_count >= self.daily_limit:
                # Calculate retry after (approx: time until next day, or oldest request rolls off)
                cursor_oldest_day = conn.execute(
                    "SELECT timestamp FROM rate_limits WHERE identifier = ? AND timestamp > datetime('now', '-1 day') ORDER BY timestamp ASC LIMIT 1;",
                    (identifier,)
                )
                oldest_row_day = cursor_oldest_day.fetchone()
                retry_after_hours = 24
                if oldest_row_day:
                    try:
                        oldest_time_day = datetime.strptime(oldest_row_day[0], "%Y-%m-%d %H:%M:%S")
                        now_utc = datetime.utcnow()
                        elapsed = (now_utc - oldest_time_day).total_seconds()
                        retry_after_hours = max(1, int((86400 - elapsed) / 3600))
                    except Exception:
                        pass

                return True, "DAILY_LIMITED", {"retry_after_hours": retry_after_hours, "rpm_limit": self.rpm_limit, "daily_limit": self.daily_limit}

            return False, "", {"rpm_count": rpm_count, "daily_count": daily_count}
        except Exception as e:
            logger.error(f"Error checking rate limits: {str(e)}")
            # Fallback to allowing if rate limits fail, to prevent system denial of service
            return False, "", {}
        finally:
            conn.close()

    def record_request(self, identifier: str):
        """Logs a request event into the database to update the rate limits count."""
        conn = get_db()
        try:
            # We insert the current UTC time formatted for SQLite's datetime comparisons
            utc_now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            conn.execute(
                "INSERT INTO rate_limits (identifier, timestamp) VALUES (?, ?);",
                (identifier, utc_now)
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Error recording request to rate limits: {str(e)}")
        finally:
            conn.close()

    def get_remaining_limits(self, identifier: str) -> Dict[str, int]:
        """Returns details on current usage and remaining requests."""
        conn = get_db()
        try:
            cursor_min = conn.execute(
                "SELECT COUNT(*) FROM rate_limits WHERE identifier = ? AND timestamp > datetime('now', '-1 minute');",
                (identifier,)
            )
            rpm_count = cursor_min.fetchone()[0]

            cursor_day = conn.execute(
                "SELECT COUNT(*) FROM rate_limits WHERE identifier = ? AND timestamp > datetime('now', '-1 day');",
                (identifier,)
            )
            daily_count = cursor_day.fetchone()[0]

            return {
                "rpm_limit": self.rpm_limit,
                "rpm_remaining": max(0, self.rpm_limit - rpm_count),
                "daily_limit": self.daily_limit,
                "daily_remaining": max(0, self.daily_limit - daily_count)
            }
        except Exception as e:
            logger.error(f"Error checking remaining limits: {str(e)}")
            return {
                "rpm_limit": self.rpm_limit,
                "rpm_remaining": self.rpm_limit,
                "daily_limit": self.daily_limit,
                "daily_remaining": self.daily_limit
            }
        finally:
            conn.close()

rate_limiter = RateLimiter()
