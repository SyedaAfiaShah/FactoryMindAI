import pandas as pd
from prophet import Prophet
from typing import Dict, List, Any

class DemandForecaster:
    def __init__(self):
        self.model = Prophet(yearly_seasonality=True, daily_seasonality=True)
        self.is_fitted = False

    def fit(self, df: pd.DataFrame) -> None:
        """
        Fits the Prophet model.
        
        Args:
            df: DataFrame with 'ds' (datetime) and 'y' (quantity) columns.
        """
        # Ensure correct column names for Prophet
        if 'ds' not in df.columns or 'y' not in df.columns:
            raise ValueError("DataFrame must contain 'ds' and 'y' columns.")
            
        self.model.fit(df)
        self.is_fitted = True

    def forecast(self, periods: int = 7) -> Dict[str, Any]:
        """
        Generates a demand forecast for the specified number of periods (days).
        """
        if not self.is_fitted:
            raise ValueError("Forecaster must be fitted before calling forecast.")
            
        future = self.model.make_future_dataframe(periods=periods)
        forecast = self.model.predict(future)
        
        # Extract relevant components for the response
        results = {
            "dates": forecast['ds'].dt.strftime('%Y-%m-%d').tolist(),
            "yhat": forecast['yhat'].tolist(),
            "yhat_lower": forecast['yhat_lower'].tolist(),
            "yhat_upper": forecast['yhat_upper'].tolist()
        }
        
        return results
