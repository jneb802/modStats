export async function sendWebhookMessage(message: string): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("DISCORD_WEBHOOK_URL not set");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    if (!response.ok) {
      console.log(`Discord webhook error: ${response.status}`);
      return false;
    }
    console.log("Discord message sent successfully");
    return true;
  } catch (e) {
    console.log("Failed to send Discord message:", e);
    return false;
  }
}
