from pydantic import BaseModel

class Classification(BaseModel):
    id: int
    filename: str
    predicted_class: str
    confidence_score: float 
    timestamp: str