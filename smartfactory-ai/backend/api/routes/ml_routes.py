from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Dict, Any
from datetime import datetime
from ..models.scenario import ScenarioResponse # Reusing for structure if needed or just Pydantic models
from ...ml.maintenance_model import MaintenancePredictor, PredictionResult
from ...ml.model_registry import load_model

router = APIRouter(prefix="/ml", tags=["machine-learning"])

@router.post("/predict/maintenance")
async def predict_maintenance(
    request: Request,
    payload: Dict[str, List[Dict[str, Any]]]
) -> Dict[str, Any]:
    """
    Predicts maintenance risk and failure types for a batch of machine readings.
    
    Args:
        payload: Dictionary containing 'readings' list.
        
    Returns:
        Prediction results and metadata.
    """
    readings = payload.get("readings")
    if not readings:
        raise HTTPException(status_code=400, detail="Missing 'readings' in payload")

    # Get model from app state
    predictor: MaintenancePredictor = request.app.state.maintenance_predictor
    
    if not predictor:
        raise HTTPException(status_code=503, detail="ML Model not initialized")

    try:
        predictions = predictor.predict(readings)
        return {
            "predictions": [p.model_dump() for p in predictions],
            "model_version": "v1.0.0-rf",
            "inferred_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Inference Error",
                "detail": str(e),
                "code": "ML_PREDICTION_ERROR"
            }
        )

@router.get("/parameters")
async def get_model_parameters(request: Request) -> Dict[str, Any]:
    """
    Returns the trained model's feature importances and scaler statistics.
    """
    predictor: MaintenancePredictor = request.app.state.maintenance_predictor
    if not predictor or not predictor.scaler:
        raise HTTPException(status_code=503, detail="Model not trained")

    importances = {
        name: round(float(imp) * 100, 2) 
        for name, imp in zip(predictor.feature_names, predictor.binary_model.feature_importances_)
    }

    scaler_stats = {
        "means": predictor.scaler.mean_.tolist(),
        "scales": predictor.scaler.scale_.tolist()
    }

    return {
        "feature_importances_percent": importances,
        "scaler_baseline": scaler_stats
    }
