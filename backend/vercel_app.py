from fastapi import FastAPI
from main import app as quest_app

app = FastAPI()

app.mount("/api/backend", quest_app)