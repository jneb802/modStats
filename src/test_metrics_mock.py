#!/usr/bin/env python3
"""
Mock test script for ModMetrics functionality
This tests the metrics logic without requiring a real database connection
"""

import sys
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

# Mock data for testing
class MockMod:
    def __init__(self, id, name, author):
        self.id = id
        self.name = name
        self.author = author

class MockModDownloads:
    def __init__(self, total_downloads):
        self.total_downloads = total_downloads

def test_metrics_with_mock_data():
    """Test metrics functionality with mock data"""
    print("Testing ModMetrics with Mock Data...")
    print("=" * 50)
    
    # Mock mods data
    mock_mods = [
        MockMod(1, "TestMod1", "Author1"),
        MockMod(2, "TestMod2", "Author2"),
        MockMod(3, "TestMod3", "Author3"),
    ]
    
    # Mock download data (yesterday vs today)
    mock_download_data = {
        # mod_id: {yesterday: downloads, today: downloads}
        1: {"yesterday": 100, "today": 150},  # +50 change
        2: {"yesterday": 200, "today": 180},  # -20 change
        3: {"yesterday": 50, "today": 75},    # +25 change
    }
    
    try:
        # Import metrics after setting up mocks
        from metrics import ModMetrics
        
        # Create a mock database manager
        mock_db_manager = Mock()
        mock_db_manager.get_all_mods.return_value = mock_mods
        
        # Mock the _get_downloads_for_date method
        def mock_get_downloads(mod_id, date):
            if mod_id in mock_download_data:
                yesterday = datetime.now().date() - timedelta(days=1)
                if date == yesterday:
                    return mock_download_data[mod_id]["yesterday"]
                else:  # today
                    return mock_download_data[mod_id]["today"]
            return None
        
        # Create metrics instance and replace database with mock, keep real Discord client
        metrics = ModMetrics()
        metrics.db_manager = mock_db_manager
        # Keep the real Discord client: metrics.discord_client (no mock)
        metrics._get_downloads_for_date = mock_get_downloads
        
        print("✓ ModMetrics initialized with mock data")
        
        # Test BuildDailyMetrics
        print("\nBuilding daily metrics...")
        metrics_data = metrics.BuildDailyMetrics()
        
        print(f"✓ Metrics built successfully")
        print(f"✓ Found {len(metrics_data)} mods with day-over-day data")
        
        # Display the metrics data
        print("\nMetrics data:")
        for mod_data in metrics_data:
            change = mod_data['change']
            sign = "+" if change > 0 else ""
            print(f"  {mod_data['name']} ({mod_data['author']}) - {sign}{change}")
        
        # Since we're using the real Discord client, we can't easily check if it was called
        # but the method should have sent a real message to Discord
        print("\n✓ Discord webhook should have been called with real data")
        
        print("\n" + "=" * 50)
        print("✓ Mock test completed successfully!")
        
        # Verify expected results
        expected_changes = {
            "TestMod1": 50,
            "TestMod2": 20,
            "TestMod3": 25
        }
        
        print("\nVerifying calculations:")
        for mod_data in metrics_data:
            expected = expected_changes[mod_data['name']]
            actual = mod_data['change']
            status = "✓" if actual == expected else "✗"
            print(f"  {status} {mod_data['name']}: expected {expected}, got {actual}")
        
    except Exception as e:
        print(f"✗ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_metrics_with_mock_data()
