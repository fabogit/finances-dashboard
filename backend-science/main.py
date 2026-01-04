from typing import List, Optional
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Finance Science Service")


class RawTransaction(BaseModel):
    id: str
    date: str
    operation: str
    details: str
    amount: str
    category: Optional[str] = None


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "backend-science"}


@app.post("/process")
async def process_transactions(transactions: List[RawTransaction]):
    return {"message": "Received", "count": len(transactions)}
