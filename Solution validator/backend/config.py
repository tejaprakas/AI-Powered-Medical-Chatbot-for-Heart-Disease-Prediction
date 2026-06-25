import os
from pydantic import BaseModel

class Config(BaseModel):
    serper_api_key: str | None = os.environ.get("SERPER_API_KEY")
    gemini_api_key: str | None = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    port: int = int(os.environ.get("PORT", 8000))
    host: str = os.environ.get("HOST", "127.0.0.1")

# Create a singleton config instance
config = Config()
