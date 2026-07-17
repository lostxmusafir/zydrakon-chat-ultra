import hashlib
import uuid
import logging
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
        conn = get_db()
        query_hash = self._get_hash(query)
        try:
            cursor = conn.execute(
                "SELECT response FROM cached_responses WHERE query_hash = ? AND model_used = ?",
                (query_hash, model)
            )
            row = cursor.fetchone()
            if row:
                logger.info(f"Cache hit for query hash {query_hash} using model {model}")
                return row["response"]
            return None
        except Exception as e:
            logger.error(f"Error reading cache: {str(e)}")
            return None
        finally:
            conn.close()

    def cache_response(self, query: str, response: str, model: str):
        conn = get_db()
        query_hash = self._get_hash(query)
        cache_id = str(uuid.uuid4())
        try:
            conn.execute(
                """
                INSERT OR REPLACE INTO cached_responses (id, query_hash, response, model_used) 
                VALUES (?, ?, ?, ?);
                """,
                (cache_id, query_hash, response, model)
            )
            conn.commit()
            logger.info(f"Cached response for query hash {query_hash} using model {model}")
        except Exception as e:
            logger.error(f"Error writing to cache: {str(e)}")
        finally:
            conn.close()

cache_service = CacheService()
