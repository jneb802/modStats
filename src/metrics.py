

from datetime import datetime, timedelta, timezone
from database import DatabaseManager
from discord_client import DiscordClient

class ModMetrics:
    def __init__(self):
        self.db_manager = DatabaseManager()
        self.discord_client = DiscordClient()

    def BuildDailyMetrics(self):
        """Build daily metrics for mod downloads and send to Discord"""
        # Get current date and previous day (use UTC to match main.py)
        today = datetime.now(timezone.utc).date()
        yesterday = today - timedelta(days=1)
        
        # Get all mods from database
        mods = self.db_manager.get_all_mods()
        
        metrics_data = []
        
        for mod in mods:
            # Get downloads for yesterday and today
            yesterday_downloads = self._get_downloads_for_date(mod.id, yesterday)
            today_downloads = self._get_downloads_for_date(mod.id, today)
            
            # Calculate day-over-day change
            if yesterday_downloads is not None and today_downloads is not None:
                change = today_downloads - yesterday_downloads
                metrics_data.append({
                    'name': mod.name,
                    'author': mod.author,
                    'change': change
                })
        
        # Format and send Discord message
        message = self._format_discord_message(yesterday, metrics_data)
        self.discord_client.send_webhook_message(message)
        
        return metrics_data
    
    def _get_downloads_for_date(self, mod_id, date):
        """Get total downloads for a specific mod on a specific date"""
        with self.db_manager.session_scope() as session:
            from database import ModDownloads
            download_entry = session.query(ModDownloads).filter(
                ModDownloads.mod_id == mod_id,
                ModDownloads.date == date
            ).first()
            
            return download_entry.total_downloads if download_entry else None
    
    def _format_discord_message(self, date, metrics_data):
        """Format the metrics data into a Discord message"""
        # Format date for message
        formatted_date = date.strftime("%B %d, %Y")
        
        message = f"Summary of mod downloads for {formatted_date}\n"
        
        if not metrics_data:
            message += "No download data available for comparison."
        else:
            for mod_data in metrics_data:
                change = mod_data['change']
                message += f"{mod_data['name']}: {change}\n"
        
        return message
