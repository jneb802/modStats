import discord
from discord import SyncWebhook
import os
from dotenv import load_dotenv

load_dotenv()

WEBHOOK_URL = os.environ["DISCORD_WEBHOOK_URL"]

class DiscordClient(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(intents=intents)
        self.webhook_url = WEBHOOK_URL

    def send_webhook_message(self, message="Hello World"):
        """"Send a message via Discord webhook"""
        webhook = SyncWebhook.from_url(self.webhook_url)
        webhook.send(message)
        print(f"Message sent: {message}")

if __name__ == "__main__":
    client = DiscordClient()
    client.send_webhook_message("Testing webhook")