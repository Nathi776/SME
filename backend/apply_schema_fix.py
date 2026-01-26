#!/usr/bin/env python
"""Add missing fee_rate column to finance_requests table"""

if __name__ == "__main__":
    try:
        from sqlalchemy import inspect, text
        from database import engine
        import sys
        
        print("Connecting to database...")
        with engine.connect() as conn:
            inspector = inspect(conn)
            cols = [c['name'] for c in inspector.get_columns('finance_requests')]
            print(f"Current columns: {', '.join(cols)}")
            
            if 'fee_rate' not in cols:
                print("\nAdding fee_rate column to finance_requests table...")
                conn.execute(text("ALTER TABLE finance_requests ADD COLUMN fee_rate FLOAT DEFAULT 0"))
                conn.commit()
                print("✓ Column added successfully")
                sys.exit(0)
            else:
                print("\n✓ fee_rate column already exists")
                sys.exit(0)
                
    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
