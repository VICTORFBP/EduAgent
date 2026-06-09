import sqlite3

db_path = r"C:\Users\admin\.n8n\database.sqlite"
try:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = c.fetchall()
    print("Tables:", tables)
    
    if ('api_key',) in tables or ('user_api_key',) in tables:
        table_name = 'api_key' if ('api_key',) in tables else 'user_api_key'
        c.execute(f"SELECT * FROM {table_name}")
        keys = c.fetchall()
        print("API Keys:", keys)
except Exception as e:
    print("Error:", e)
