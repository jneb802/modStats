#!/usr/bin/env python3
import os
from datetime import datetime, date as dt_date, time as dt_time, timezone
from thunderstore_api import get_package_metrics
from database import DatabaseManager

def main():
    try:
        print(f"[start] {datetime.now(timezone.utc).isoformat()} — daily metrics run")
        db = DatabaseManager()

        mods = db.get_all_mods()
        if not mods:
            print("No mods found in the database. Please add some mods first.")
            return

        today = datetime.now(timezone.utc).date()  # use UTC date for idempotency

        print(f"Found {len(mods)} mods in the database for {today}:")
        for mod in mods:
            print(f"\n--- {mod.author}/{mod.name} ---")

            if db.download_entry_exists(mod.id, today):
                print(f"  Download data for {today} already exists, skipping")
                continue

            response = get_package_metrics(mod.author, mod.name)
            if response is None:
                print(f"  Failed to get metrics for {mod.author}/{mod.name}")
                continue

            downloads = response['downloads']
            try:
                db.add_download_entry(mod.id, today, downloads)  # or midnight_utc
                print(f"  Added download entry: {downloads:,} downloads")
            except Exception as e:
                print(f"  Error adding download entry: {e}")

        print(f"[done] {datetime.now(timezone.utc).isoformat()} — success")
    except Exception as e:
        print(f"[error] {e}")
        raise

if __name__ == "__main__":
    main()
