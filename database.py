import sqlite3
import os
from typing import List, Dict, Any, Tuple

DB_FILE = os.path.join(os.path.dirname(__file__), "hospital.db")
SCHEMA_FILE = os.path.join(os.path.dirname(__file__), "schema.sql")

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Reads schema.sql and executes DDL/DML statements to set up tables and seed data."""
    if not os.path.exists(SCHEMA_FILE):
        raise FileNotFoundError(f"Schema file not found at {SCHEMA_FILE}")
    
    with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
        sql_script = f.read()
    
    conn = get_connection()
    try:
        conn.executescript(sql_script)
        conn.commit()
    finally:
        conn.close()

def query_all(sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def query_one(sql: str, params: tuple = ()) -> Dict[str, Any] | None:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def execute_commit(sql: str, params: tuple = ()) -> int:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

def execute_raw_sql(sql_query: str) -> Tuple[List[str], List[List[Any]], str]:
    """
    Executes raw SQL query string for the SQL Interactive Console.
    Returns (column_names, rows_data, message)
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql_query)
        if sql_query.strip().upper().startswith(("SELECT", "PRAGMA", "EXPLAIN")):
            rows = cursor.fetchall()
            columns = [description[0] for description in cursor.description] if cursor.description else []
            data = [list(row) for row in rows]
            return columns, data, f"Query executed successfully. {len(data)} row(s) returned."
        else:
            conn.commit()
            affected = cursor.rowcount
            return [], [], f"Statement executed successfully. {affected} row(s) affected."
    except Exception as e:
        return [], [], f"Error: {str(e)}"
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
