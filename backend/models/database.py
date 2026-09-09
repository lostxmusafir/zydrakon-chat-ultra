import pymongo
import certifi
import logging
from backend.utils.config import settings

import os

_client = None

def get_db():
    global _client
    if _client is None:
        # Pass certifi's CA certificate bundle path for secure MongoDB Atlas SSL/TLS connections
        _client = pymongo.MongoClient(settings.MONGODB_URL, tlsCAFile=certifi.where())
    # Use configurable database name, default to "zydrakon"
    db_name = os.getenv("MONGO_DB_NAME", "zydrakon")
    return _client[db_name]

def init_db():
    db = get_db()
    try:
        # 24 hours = 86400 seconds retention for logs, messages, sessions, and rate limits
        RETENTION_24_HOURS = 86400
        ttl_configs = [
            ("sessions", "created_at", RETENTION_24_HOURS),
            ("messages", "timestamp", RETENTION_24_HOURS),
            ("cached_responses", "created_at", RETENTION_24_HOURS),
            ("rate_limits", "timestamp", RETENTION_24_HOURS)
        ]
        
        # Setup TTL Indexes with safety fallback for IndexOptionsConflict
        for col_name, field_name, expire_secs in ttl_configs:
            idx_name = f"{field_name}_1"
            # 1. Try collMod to dynamically update expireAfterSeconds if index already exists
            try:
                db.command({
                    "collMod": col_name,
                    "index": {
                        "keyPattern": {field_name: 1},
                        "expireAfterSeconds": expire_secs
                    }
                })
                logging.info(f"Updated TTL index '{idx_name}' on '{col_name}' to {expire_secs}s via collMod.")
            except Exception:
                # 2. Fallback to create_index or drop & recreate if options conflicted
                try:
                    db[col_name].create_index(field_name, expireAfterSeconds=expire_secs)
                except pymongo.errors.OperationFailure as e:
                    # Code 85 is IndexOptionsConflict
                    if e.code == 85:
                        try:
                            db[col_name].drop_index(idx_name)
                            db[col_name].create_index(field_name, expireAfterSeconds=expire_secs)
                            logging.info(f"Re-created conflicting TTL index '{idx_name}' on collection '{col_name}' with {expire_secs}s expiration.")
                        except Exception as drop_err:
                            logging.error(f"Failed to drop/recreate conflicting index '{idx_name}': {str(drop_err)}")
                    else:
                        logging.error(f"Failed to create TTL index on {col_name}.{field_name}: {str(e)}")
                except Exception as idx_err:
                    logging.error(f"Failed to create TTL index on {col_name}.{field_name}: {str(idx_err)}")

        
        # Normal Indexes for querying
        db.messages.create_index("session_id")
        try:
            db.cached_responses.create_index(
                [("query_hash", pymongo.ASCENDING), ("model_used", pymongo.ASCENDING)],
                unique=True
            )
        except Exception as cache_idx_err:
            logging.warning(f"Did not recreate unique cache index: {str(cache_idx_err)}")
            
        db.rate_limits.create_index([("identifier", pymongo.ASCENDING), ("timestamp", pymongo.ASCENDING)])
        
        # Flush any stale/corrupted cached responses
        try:
            db.cached_responses.delete_many({})
            logging.info("Flushed stale cached responses successfully.")
        except Exception as cache_flush_err:
            logging.warning(f"Cache flush warning: {str(cache_flush_err)}")
    except Exception as e:
        logging.error(f"Error initializing MongoDB: {str(e)}")
