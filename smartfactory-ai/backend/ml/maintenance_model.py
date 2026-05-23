import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from ml.feature_engineering import engineer_features

class PredictionResult(BaseModel):
    machine_id: str
    risk_score: float
    failure_probability: float
    predicted_failure_type: str
    urgency: str
    key_factors: List[str]

class MaintenancePredictor:
    def __init__(self):
        self.binary_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.type_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.scaler = None
        self.feature_names = []

    def train(self, df: pd.DataFrame) -> None:
        """
        Trains the predictive models using the provided DataFrame.
        """
        # Prepare features
        X_raw = df.drop(['Target', 'Failure Type', 'UDI', 'Product ID'], axis=1, errors='ignore')
        X_processed, self.scaler = engineer_features(df, scaler=None)
        self.feature_names = X_processed.columns.tolist()
        
        # Binary target (Failure/No Failure)
        y_binary = df['Target']
        self.binary_model.fit(X_processed, y_binary)
        
        # Failure type target (Multi-class)
        # Note: In real scenarios, this might be multi-label, but we treat as multi-class for simplicity
        y_type = df['Failure Type']
        self.type_model.fit(X_processed, y_type)

    def predict(self, readings: List[Dict[str, Any]]) -> List[PredictionResult]:
        """
        Generates predictions for a list of sensor readings.
        """
        if not self.scaler:
            raise ValueError("Model has not been trained or loaded with a scaler.")
            
        df_input = pd.DataFrame(readings)
        X_processed, _ = engineer_features(df_input, scaler=self.scaler)
        
        probs = self.binary_model.predict_proba(X_processed)[:, 1]
        type_preds = self.type_model.predict(X_processed)
        
        results = []
        for i, (prob, fail_type) in enumerate(zip(probs, type_preds)):
            risk_score = prob * 100
            
            # Determine urgency
            if risk_score >= 80:
                urgency = 'immediate'
            elif risk_score >= 60:
                urgency = 'soon'
            elif risk_score >= 40:
                urgency = 'monitor'
            else:
                urgency = 'ok'
                
            # Smart Key Factors: Find features that deviate most from the baseline
            importances = self.binary_model.feature_importances_
            
            # Calculate z-scores (deviations) for this specific row
            z_scores = X_processed.iloc[i].values
            
            # Combine importance with deviation to find the "reason"
            impact_scores = np.abs(z_scores) * importances
            top_indices = np.argsort(impact_scores)[-3:][::-1]
            
            factors = []
            for idx in top_indices:
                feat = self.feature_names[idx]
                val_z = z_scores[idx]
                label = feat.replace('_', ' ').capitalize()
                
                if val_z > 2:
                    factors.append(f"CRITICAL: {label} is {round(val_z, 1)}x standard deviations ABOVE normal")
                elif val_z < -2:
                    factors.append(f"CRITICAL: {label} is {round(abs(val_z), 1)}x standard deviations BELOW normal")
                else:
                    factors.append(f"{label} contributing to baseline risk")

            results.append(PredictionResult(
                machine_id=str(readings[i].get('Product ID', f"M{i}")),
                risk_score=round(risk_score, 2),
                failure_probability=round(float(prob), 4),
                predicted_failure_type=str(fail_type),
                urgency=urgency,
                key_factors=factors
            ))
            
        return results
