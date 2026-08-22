import logging
from backend.models.database import get_db
from backend.utils.config import settings

logger = logging.getLogger(__name__)

# Override hook for testing storage limits
_test_override_bytes = None

def set_test_storage_bytes(override_bytes: float | None):
    global _test_override_bytes
    _test_override_bytes = override_bytes

def get_database_size_bytes() -> int:
    global _test_override_bytes
    if _test_override_bytes is not None:
        return int(_test_override_bytes)
        
    db = get_db()
    try:
        stats = db.command("dbStats")
        # Use storageSize or dataSize + indexSize
        size = stats.get("dataSize", 0) + stats.get("indexSize", 0)
        if size > 0:
            return size
        return stats.get("storageSize", 0)
    except Exception as e:
        logger.warning(f"dbStats failed, calculating collection stats fallback: {str(e)}")
        total_size = 0
        try:
            for col_name in ["messages", "sessions", "cached_responses", "rate_limits", "users"]:
                try:
                    c_stats = db.command("collStats", col_name)
                    total_size += c_stats.get("size", 0) + c_stats.get("totalIndexSize", 0)
                except Exception:
                    # Fallback estimate by count
                    count = db[col_name].count_documents({})
                    total_size += count * 1024 # estimate 1KB per document
        except Exception as fallback_err:
            logger.error(f"Fallback collection size calculation error: {str(fallback_err)}")
        return total_size

def get_storage_status() -> dict:
    used_bytes = get_database_size_bytes()
    max_bytes = int(settings.MAX_DB_SIZE_MB * 1024 * 1024)
    if max_bytes <= 0:
        max_bytes = 512 * 1024 * 1024 # 512 MB fallback
        
    used_percent = round((used_bytes / max_bytes) * 100, 2)
    warning_80 = used_percent >= 80.0
    critical_90 = used_percent >= 90.0
    
    if warning_80:
        msg = f"⚠️ Warning: Database storage is {used_percent}% full! Jaldi hi aapki history delete kar di jayegi!"
    else:
        msg = f"Database storage usage is normal ({used_percent}%)."
        
    return {
        "used_bytes": used_bytes,
        "max_bytes": max_bytes,
        "used_percent": used_percent,
        "used_mb": round(used_bytes / (1024 * 1024), 2),
        "max_mb": round(max_bytes / (1024 * 1024), 2),
        "warning_80": warning_80,
        "critical_90": critical_90,
        "message": msg
    }

def check_and_enforce_storage_limits() -> dict:
    status = get_storage_status()
    purged = False
    
    if status["critical_90"]:
        logger.warning(f"Database storage reached 90% threshold ({status['used_percent']}%). Initiating emergency chat history purge!")
        db = get_db()
        try:
            # Delete all chat history & session documents to free up database storage memory
            msg_res = db.messages.delete_many({})
            sess_res = db.sessions.delete_many({})
            cache_res = db.cached_responses.delete_many({})
            purged = True
            logger.info(f"Purge complete. Deleted {msg_res.deleted_count} messages, {sess_res.deleted_count} sessions, {cache_res.deleted_count} cached items.")
            
            # Recalculate status after purge
            status = get_storage_status()
            status["purged"] = True
            status["message"] = "Database storage limit reached 90%. Chat history has been automatically deleted to free up space."
        except Exception as e:
            logger.error(f"Error during emergency storage purge: {str(e)}")
            
    status["purged"] = purged
    return status
