from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import numpy as np
import os
import requests

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

@app.get("/news")
def get_news():
    try:
        key = os.environ.get("CRYPTOPANIC_KEY", "YOUR_KEY")
        url = f"https://cryptopanic.com/api/v1/posts/?auth_token={key}&public=true"
        resp = requests.get(url)
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/coingecko-history")
def coingecko_history(id: str = "bitcoin", days: int = 30):
    try:
        url = f"https://api.coingecko.com/api/v3/coins/{id}/market_chart?vs_currency=usd&days={days}"
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(url, headers=headers)
        print("CoinGecko status:", resp.status_code)
        print("CoinGecko response:", resp.text[:300])  # Print first 300 chars
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print("CoinGecko error:", e)
        raise HTTPException(status_code=500, detail=str(e))
