import sys
sys.path.insert(0, 'C:\\Users\\Prince\\SME\\backend')

try:
    from sqlalchemy import inspect, text
    from database import engine
    print("Imports successful")
    
    with engine.connect() as connection:
        print("Connected to database")
        inspector = inspect(connection)
        columns = [col['name'] for col in inspector.get_columns('finance_requests')]
        print(f"Columns: {columns}")
        if 'fee_rate' not in columns:
            print("Adding fee_rate column...")
            connection.execute(text("ALTER TABLE finance_requests ADD COLUMN fee_rate FLOAT DEFAULT 0"))
            connection.commit()
            print("Added!")
        else:
            print("fee_rate already exists")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
