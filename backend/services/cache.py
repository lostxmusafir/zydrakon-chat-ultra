import hashlib
import uuid
import logging
from datetime import datetime
from typing import Optional
from backend.models.database import get_db

logger = logging.getLogger(__name__)

class CacheService:
    @staticmethod
    def _get_hash(query: str) -> str:
        # Normalize: strip leading/trailing whitespace and convert to lowercase for exact match
        normalized = query.strip().lower()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def get_cached_response(self, query: str, model: str) -> Optional[str]:
        db = get_db()
        query_hash = self._get_hash(query)
        try:
            doc = db.cached_responses.find_one({"query_hash": query_hash, "model_used": model})
            if doc:
                logger.info(f"Cache hit for query hash {query_hash} using model {model}")
                return doc["response"]
            return None
        except Exception as e:
            logger.error(f"Error reading cache: {str(e)}")
            return None

    def cache_response(self, query: str, response: str, model: str):
        db = get_db()
        query_hash = self._get_hash(query)
        cache_id = str(uuid.uuid4())
        try:
            now = datetime.utcnow()
            db.cached_responses.update_one(
                {"query_hash": query_hash, "model_used": model},
                {"$set": {
                    "id": cache_id, 
                    "response": response, 
                    "created_at": now
                }},
                upsert=True
            )
            logger.info(f"Cached response for query hash {query_hash} using model {model}")
        except Exception as e:
            logger.error(f"Error writing to cache: {str(e)}")

    def delete_cached_response(self, query: str, model: Optional[str] = None):
        """Invalidates cache entries for a given query (and optionally specific model)."""
        db = get_db()
        query_hash = self._get_hash(query)
        try:
            filter_query = {"query_hash": query_hash}
            if model:
                filter_query["model_used"] = model
            db.cached_responses.delete_many(filter_query)
            logger.info(f"Deleted cache entries for query hash {query_hash}")
        except Exception as e:
            logger.error(f"Error deleting cached response: {str(e)}")

    def clear_unwanted_raj_cache(self):
        """Cleans out stale cached entries that mention Raj Patil for general queries."""
        db = get_db()
        try:
            result = db.cached_responses.delete_many({
                "response": {"$regex": "raj patil", "$options": "i"}
            })
            if result.deleted_count > 0:
                logger.info(f"Purged {result.deleted_count} stale cache entries containing 'Raj Patil'")
        except Exception as e:
            logger.error(f"Error purging stale Raj Patil cache entries: {str(e)}")

cache_service = CacheService()
