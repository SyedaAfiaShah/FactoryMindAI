import sqlite3
import os

# DB File is stored inside the backend directory for persistence
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "smartfactory.db"))

def init_db():
    """
    Initializes the SQLite database and creates the users table if it doesn't exist.
    """
    print(f"Initializing SQLite Database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create the users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    
    # Create an index on username for quick verification during login/registration
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)")
    
    conn.commit()
    conn.close()

def get_db_connection() -> sqlite3.Connection:
    """
    Creates and returns a new connection to the SQLite database.
    Configures row_factory to sqlite3.Row for dict-style row access.
    """
    conn = sqlite3.connect(DB_PATH, timeout=10.0) # 10s busy timeout for concurrent safety
    conn.row_factory = sqlite3.Row
    return conn
