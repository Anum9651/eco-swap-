from fastapi import FastAPI
from database import engine
from sqlalchemy import text
import os
print("DATABASE_URL:", os.getenv("DATABASE_URL"))

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "ECO-SWAP Backend Running"}

@app.get("/test-db")
def test_db():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            return {"database": "connected"}
    except Exception as e:
        return {"error": str(e)}