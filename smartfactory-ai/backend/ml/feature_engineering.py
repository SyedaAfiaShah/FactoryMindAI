import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from typing import Dict

TYPE_MAX_WEAR: Dict[str, int] = {
    'L': 200,
    'M': 250,
    'H': 300
}

def engineer_features(df: pd.DataFrame, scaler: StandardScaler = None) -> tuple[pd.DataFrame, StandardScaler]:
    """
    Performs feature engineering and scaling on the AI4I dataset.
    
    Args:
        df: Input DataFrame with raw sensor readings.
        scaler: Optional pre-fitted scaler. If None, a new one is fitted.
        
    Returns:
        A tuple of (processed DataFrame, fitted scaler).
    """
    df = df.copy()
    
    # 1. One-hot encode Type column
    for t in ['L', 'M', 'H']:
        df[f'Type_{t}'] = (df['Type'] == t).astype(int)
    
    # 2. Temperature Delta
    df['temperature_delta'] = df['Process temperature [K]'] - df['Air temperature [K]']
    
    # 3. Power Proxy
    df['power_proxy'] = df['Rotational speed [rpm]'] * df['Torque [Nm]']
    
    # 4. Tool Wear Factor
    def get_wear_factor(row):
        max_wear = TYPE_MAX_WEAR.get(row['Type'], 200)
        return row['Tool wear [min]'] / max_wear
    
    df['tool_wear_factor'] = df.apply(get_wear_factor, axis=1)
    
    # Define features to scale
    numeric_features = [
        'Air temperature [K]', 'Process temperature [K]', 
        'Rotational speed [rpm]', 'Torque [Nm]', 'Tool wear [min]',
        'temperature_delta', 'power_proxy', 'tool_wear_factor'
    ]
    
    # Ensure all one-hot columns are present for the final output
    final_columns = numeric_features + ['Type_L', 'Type_M', 'Type_H']
    
    # Handle Scaling
    if scaler is None:
        scaler = StandardScaler()
        df[numeric_features] = scaler.fit_transform(df[numeric_features])
    else:
        df[numeric_features] = scaler.transform(df[numeric_features])
        
    return df[final_columns], scaler
