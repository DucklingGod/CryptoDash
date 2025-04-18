from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MultiTimeframePriceData(BaseModel):
    prices_1d: List[float]
    prices_7d: List[float]
    prices_30d: List[float]

def get_trend(prices):
    if not prices or len(prices) < 2:
        return "unknown"
    return "bullish" if prices[-1] > prices[0] else "bearish"

@app.post("/predict")
def predict_trend(data: MultiTimeframePriceData):
    return {
        "trend_1d": get_trend(data.prices_1d),
        "trend_7d": get_trend(data.prices_7d),
        "trend_30d": get_trend(data.prices_30d),
    }