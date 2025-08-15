import requests
import json
from typing import Dict, Optional

def get_package_metrics(namespace: str, name: str) -> Optional[Dict]:
    """
    Fetch package metrics from the Thunderstore API.
    
    Args:
        namespace (str): The package namespace
        name (str): The package name
        
    Returns:
        Dict: Package metrics data if successful, None if failed
    """
    url = f"https://thunderstore.io/api/v1/package-metrics/{namespace}/{name}/"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        print(f"(Getting metrics for {namespace} - {name})")
        return response.json()
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching package metrics: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}")
        return None
