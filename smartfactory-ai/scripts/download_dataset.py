import urllib.request
import os
from pathlib import Path

def download_uci_dataset():
    """
    Downloads the AI4I 2020 Predictive Maintenance Dataset from the UCI Machine Learning Repository.
    """
    url = "https://archive.ics.uci.edu/ml/machine-learning-databases/00601/ai4i2020.csv"
    
    # Ensure data directory exists
    data_dir = Path(__file__).parents[1] / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    target_path = data_dir / "ai4i2020.csv"
    
    print(f"Downloading Predictive Maintenance Dataset from UCI to {target_path}...")
    
    try:
        urllib.request.urlretrieve(url, target_path)
        print("[SUCCESS] Download successful!")
        
        # Verify file size
        size_mb = os.path.getsize(target_path) / (1024 * 1024)
        print(f"File size: {size_mb:.2f} MB")
        
    except Exception as e:
        print(f"[FAILED] Download failed: {e}")

if __name__ == "__main__":
    download_uci_dataset()
