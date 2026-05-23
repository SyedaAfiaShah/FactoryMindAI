from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import scenarios, ingest, analyze, results, ml_routes, auth
from ml.model_registry import init_models
from services.sqlite_db import init_db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite Database
    init_db()
    # Initialize models
    app.state.maintenance_predictor = await init_models()
    yield
    # Cleanup if needed
    pass

app = FastAPI(
    title="SmartFactory AI API",
    description="Industrial intelligence platform backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with version prefix
app.include_router(auth.router, prefix="/api/v1")
app.include_router(scenarios.router, prefix="/api/v1")
app.include_router(ingest.router, prefix="/api/v1")
app.include_router(analyze.router, prefix="/api/v1")
app.include_router(results.router, prefix="/api/v1")
app.include_router(ml_routes.router, prefix="/api/v1")

@app.get("/health")
async def health_check() -> dict:
    """
    Health check endpoint to verify system status.
    
    Returns:
        A dictionary containing status and current timestamp.
    """
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
