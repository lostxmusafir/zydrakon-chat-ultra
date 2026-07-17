import sqlite3
import os
from backend.utils.config import settings

def get_db():
    db_path = settings.DATABASE_URL
    # Ensure folder containing database exists
    os.makedirs(os.path.dirname(os.path.abspath(db_path)) or '.', exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    try:
        # Create Sessions
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create Messages
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                model_used TEXT,
                search_query TEXT,
                search_results TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
        """)
        
        # Migrations for existing databases
        try:
            conn.execute("ALTER TABLE messages ADD COLUMN search_query TEXT;")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE messages ADD COLUMN search_results TEXT;")
        except sqlite3.OperationalError:
            pass
        
        # Create Cached Responses with a compound unique constraint
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cached_responses (
                id TEXT PRIMARY KEY,
                query_hash TEXT NOT NULL,
                response TEXT NOT NULL,
                model_used TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(query_hash, model_used)
            );
        """)
        
        # Create Rate limits to persist counts across backend service restarts
        conn.execute("""
            CREATE TABLE IF NOT EXISTS rate_limits (
                identifier TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create Indices for query performance
        conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cached_responses_hash_model ON cached_responses(query_hash, model_used);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_ts ON rate_limits(identifier, timestamp);")
        
        conn.commit()
    finally:
        conn.close()
