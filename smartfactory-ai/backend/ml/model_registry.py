import os
import joblib
import pandas as pd
from typing import Any
from pathlib import Path

ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

def save_model(model: Any, name: str) -> None:
    """
    Serializes a model or object to the artifacts directory.
    """
    path = ARTIFACTS_DIR / f"{name}.joblib"
    joblib.dump(model, path)
    print(f"Model {name} saved to {path}")

def load_model(name: str) -> Any:
    """
    Loads a model from the artifacts directory. Returns None if not found.
    """
    path = ARTIFACTS_DIR / f"{name}.joblib"
    if path.exists():
        return joblib.load(path)
    return None

async def init_models() -> None:
    """
    Initializes models on startup. Loads from disk or trains on sample data if missing.
    """
    from ml.maintenance_model import MaintenancePredictor
    
    predictor = load_model("maintenance_predictor")
    
    # If model is missing or exists but is not trained (no scaler), trigger training
    if predictor is None or (hasattr(predictor, 'scaler') and predictor.scaler is None):
        print("Model missing or untrained. Initializing training...")
        # Try multiple possible paths for the real Kaggle data first
        real_data_paths = [
            Path("e:/testingg/smartfactory-ai/data/ai4i2020.csv"),
            Path(__file__).parents[3] / "data" / "ai4i2020.csv",
            Path.cwd() / "data" / "ai4i2020.csv"
        ]
        
        # Fallback sample data paths
        sample_paths = [
            Path("e:/testingg/data/sample_sensor_data.csv"),
            Path(__file__).parents[3] / "data" / "sample_sensor_data.csv",
            Path.cwd() / "data" / "sample_sensor_data.csv"
        ]
        
        found_real = next((p for p in real_data_paths if p.exists()), None)
        found_sample = next((p for p in sample_paths if p.exists()), None)
        
        if found_real or found_sample:
            found_path = found_real if found_real else found_sample
            print(f"✅ DATA FOUND: {found_path}. Training now...")
            df = pd.read_csv(found_path)
            
            # If it's the Kaggle dataset, preprocess it to match our format
            if 'Machine failure' in df.columns:
                print("Processing UCI/Kaggle Dataset format...")
                df = df.rename(columns={'Machine failure': 'Target'})
                
                # Derive Failure Type
                def get_failure_type(row):
                    if row.get('TWF', 0) == 1: return "Tool Wear Failure"
                    if row.get('HDF', 0) == 1: return "Heat Dissipation Failure"
                    if row.get('PWF', 0) == 1: return "Power Failure"
                    if row.get('OSF', 0) == 1: return "Overstrain Failure"
                    if row.get('RNF', 0) == 1: return "Random Failures"
                    return "No Failure"
                    
                df['Failure Type'] = df.apply(get_failure_type, axis=1)
                
            predictor = MaintenancePredictor()
            predictor.train(df)
            save_model(predictor, "maintenance_predictor")
            print("🚀 Model training complete and saved.")
        else:
            paths_str = "Could not find ai4i2020.csv or sample_sensor_data.csv in expected locations."
            print(f"❌ CRITICAL ERROR: Could not find training data in any of these locations:\n{paths_str}")
            predictor = MaintenancePredictor()
    
    return predictor
