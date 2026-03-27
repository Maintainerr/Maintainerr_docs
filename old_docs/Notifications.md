---
status: new
description: Configure and manage notification agents for automated alerts and updates.
title: Notifications
---

Notifications allow Maintainerr to send automated alerts and updates about your media collections through various messaging platforms and services. You can configure multiple notification agents and specify which types of events should trigger notifications.

???+ note "Beta Feature"
    The notification system is currently in beta. Some agents have not been tested extensively.

## Overview

The notification system works by connecting configured notification agents to your rules. When specific events occur (such as media being added to or removed from collections), Maintainerr will send notifications to the configured agents that are subscribed to those event types.

## Configuring Notification Agents

Navigate to **Settings → Notifications** to manage your notification agents. Here you can add, edit, and delete notification configurations.

### General Configuration

Each notification agent requires the following common settings:

| Parameter | Description |
| --------- | ----------- |
| Name | A descriptive name for this notification configuration |
| Enabled | Whether this agent is active and will send notifications |
| Agent | The notification service to use (Discord, Email, etc.) |
| Types | Which notification types this agent should receive |
| Notify x days before removal | For "Media About to be Handled" notifications, how many days before removal to send the alert (default: 3) |

### Notification Types

Maintainerr supports several notification types that you can enable for each agent:

| Type | Description |
| ---- | ----------- |
| Media Added to Collection | Sent when media items are added to a collection |
| Media Removed from Collection | Sent when media items are removed from a collection |
| Media About to be Handled | Advance warning that media will be processed/deleted in X days |
| Media Handled | Confirmation that media has been processed/deleted |
| Rule Handling Failed | Alert when there's an error processing rules |
| Collection Handling Failed | Alert when there's an error processing collections |

## Supported Notification Agents

### Discord

Send notifications to Discord channels via webhooks.

???+ info "Setup Required"
    You'll need to create a Discord webhook for your channel. Follow Discord's guide: [Intro to Webhooks](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)

| Parameter | Required | Description |
| --------- | -------- | ----------- |
| Webhook URL | Yes | Discord webhook URL for the target channel |
| Bot Username | No | Custom username for the bot (defaults to "Maintainerr") |
| Bot Avatar URL | No | Custom avatar image URL for the bot |

### Email

Send notifications via SMTP email.

| Parameter | Required | Description |
| --------- | -------- | ----------- |
| Email From | Yes | Sender email address |
| Sender Name | Yes | Display name for the sender |
| Email To | Yes | Recipient email address |
| SMTP Host | Yes | SMTP server hostname |
| SMTP Port | Yes | SMTP server port (usually 587 or 465) |
| Secure | No | Use implicit TLS |
| Ignore TLS | No | Disable TLS entirely |
| Require TLS | No | Always use STARTTLS |
| Auth User | No | SMTP authentication username |
| Auth Pass | No | SMTP authentication password |
| Allow Self Signed | No | Accept self-signed certificates |
| PGP Key | No | PGP public key for encryption |
| PGP Password | No | Password for PGP key |

### Gotify

Send notifications to a Gotify server.

???+ info "Setup Required"
    You'll need a running Gotify server instance. See the [Gotify documentation](https://gotify.net/docs/install) for installation instructions.

| Parameter | Required | Description |
| --------- | -------- | ----------- |
| URL | Yes | Gotify server URL |
| Token | Yes | Application token from Gotify |

### LunaSea

Send notifications to LunaSea mobile app.

???+ warning "Project Status"
    LunaSea has shut down development as of 2024. While the binaries are still available for download, no further updates will be provided. See [lunasea.app](https://www.lunasea.app/) for more information.

???+ info "Setup Required"
    You'll need the LunaSea mobile app installed and configured. The webhook setup documentation may still be accessible through archived versions.

| Parameter | Required | Description |
| --------- | -------- | ----------- |
| Webhook URL | Yes | LunaSea webhook URL |
| Profile Name | No | Specific profile name (if not using default) |

### Pushbullet

Send notifications via Pushbullet.

???+ info "Setup Required"
    You'll need a Pushbullet account and API token. Visit [Pushbullet Settings](https://www.pushbullet.com/#settings) to create an access token.

| Parameter | Required | Description |
| --------- | -------- | ----------- |
| Access Token | Yes | Pushbullet API access token |
| Channel Tag | No | Specific channel to send to |

### Pushover

Send notifications via Pushover.

???+ info "Setup Required"
    You'll need a Pushover account and to register an application. Visit [Pushover.net](https://pushover.net/apps/build) to sign up and create an application for your API token.

| Parameter | Required | Description |
| --------- | -------- | ----------- |
| Access Token | Yes | Pushover application token |
| User Token | Yes | Your 30-character user or group identifier |
| Sound | No | Notification sound name |

### Slack

Send notifications to Slack channels.

???+ info "Setup Required"
    You'll need to create a Slack webhook for your workspace. Follow Slack's guide: [Sending messages using Incoming Webhooks](https://api.slack.com/messaging/webhooks)

| Parameter | Required | Description |
| --------- | -------- | ----------- |
| Webhook URL | Yes | Slack webhook URL for the target channel |

### Telegram

Send notifications via Telegram bot.

???+ info "Setup Required"
    You'll need to create a Telegram bot and get your chat ID. Follow these steps:
    
    1. Message [@BotFather](https://t.me/botfather) on Telegram to create a new bot
    2. Get your Chat ID by messaging [@get_id_bot](https://t.me/get_id_bot) and using the `/my_id` command

| Parameter | Required | Description |
| --------- | -------- | ----------- |
| Bot Auth Token | Yes | Telegram bot authentication token |
| Chat ID | Yes | Target chat ID (use @get_id_bot to find your chat ID) |
| Bot Username | No | Bot username for user interaction |
| Send Silently | No | Send notifications without sound |

### Webhook

Send notifications to custom webhook endpoints. Requests are sent using the POST request method.

| Parameter | Required | Description |
| --------- | -------- | ----------- |
| Webhook URL | Yes | Target webhook endpoint URL |
| JSON Payload | Yes | Custom JSON payload template |
| Auth Header | No | [Authorization](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Authorization) header value |

#### Webhook Variables

The webhook agent supports variable replacement in the JSON payload. You can use the following variables:

| Variable | Description |
| -------- | ----------- |
| `{{notification_type}}` | The type of notification being sent |
| `{{subject}}` | The notification subject/title |
| `{{message}}` | The notification message content |
| `{{image}}` | Associated image URL (if available) |
| `{{extra}}` | Additional data fields |

Example JSON payload:
```json
{
  "content": "{{subject}}",
  "embeds": [
    {
      "title": "{{notification_type}}",
      "description": "{{message}}",
      "color": 3447003
    }
  ]
}
```

## Connecting Notifications to Rules

When creating or editing a rule, you can specify which notification agents should receive alerts for that rule's collection activities. This allows you to have different notification settings for different types of content or rules.

To configure notifications for a rule:

1. Create or edit a rule group
2. In the rule configuration, find the **Notifications** option
3. Select which configured notification agents should receive alerts for this rule
4. Save the rule configuration

## Testing Notifications

You can test any configured notification agent by:

1. Going to **Settings → Notifications**
2. Editing an existing notification configuration
3. Clicking the **Test** button
4. A test notification will be sent to verify the configuration is working

## Troubleshooting

### Common Issues

- **Notifications not sending**: Verify the agent is enabled and the connection settings are correct
- **Missing notifications**: Check that the notification agent is connected to the relevant rules

### Log Information

Notification activities are logged in the Maintainerr logs. Check the logs for any error messages or delivery confirmations if notifications aren't working as expected.
