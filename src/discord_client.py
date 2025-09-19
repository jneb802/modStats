import requests
import os
from dotenv import load_dotenv

load_dotenv()

class DiscordClient:
    def __init__(self):
        self.webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
        if not self.webhook_url:
            raise ValueError("DISCORD_WEBHOOK_URL environment variable is required")

    def send_webhook_message(self, message="Hello World"):
        """Send a message via Discord webhook using requests"""
        try:
            data = {
                "content": message
            }
            response = requests.post(self.webhook_url, json=data)
            response.raise_for_status()
            print(f"Message sent successfully: {message}")
            return True
        except requests.exceptions.RequestException as e:
            print(f"Failed to send Discord message: {e}")
            return False

if __name__ == "__main__":
    client = DiscordClient()
    client.send_webhook_message("Testing webhook")