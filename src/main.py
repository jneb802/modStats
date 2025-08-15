#!/usr/bin/env python3
import os
from datetime import datetime
from thunderstore_api import get_package_metrics
from database import DatabaseManager

def main():
    """Main function to run the application."""
    try:
        # Initialize database manager
        db = DatabaseManager()
        
        # Get all mods from the database
        mods = db.get_all_mods()
        
        if not mods:
            print("No mods found in the database. Please add some mods first.")
            return
        
        print(f"Found {len(mods)} mods in the database:")
        date = datetime.now()
        
        for mod in mods:
            print(f"\n--- {mod.author}/{mod.name} ---")
            
            # Check if we already have today's download data
            if db.download_entry_exists(mod.id, date):
                print(f"  Download data for {date.strftime('%Y-%m-%d')} already exists, skipping")
                continue
            
            # Fetch current download metrics
            response = get_package_metrics(mod.author, mod.name)
            if response is None:
                print(f"  Failed to get metrics for {mod.author}/{mod.name}")
                continue
            
            downloads = response['downloads']
            
            # Add new download entry
            try:
                entry = db.add_download_entry(mod.id, date, downloads)
                print(f"  Added download entry: {downloads:,} downloads")
            except Exception as e:
                print(f"  Error adding download entry: {e}")
    
    except Exception as e:
        print(f"Error running application: {e}")
        raise

if __name__ == "__main__":
    main()
