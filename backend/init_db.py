from SME import Base, engine
from SME import models

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully!")
