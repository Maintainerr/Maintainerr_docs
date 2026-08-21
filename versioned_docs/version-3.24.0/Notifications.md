---
id: notifications
slug: /notifications
description: Configure and manage notification agents for automated alerts and updates.
title: Notifications
---

Notifications allow Maintainerr to send automated alerts and updates about your media collections through various messaging platforms and services. You can configure multiple notification agents and specify which types of events should trigger notifications.

:::note Beta Feature
The notification system is in beta. Some agents have not been tested extensively.

:::

## Overview

The notification system works by connecting configured notification agents to your rules. When specific events occur (such as media being added to or removed from collections), Maintainerr will send notifications to the configured agents that are subscribed to those event types.

## Configuring Notification Agents

Navigate to **Settings → Notifications** to manage your notification agents. Here you can add, edit, and delete notification configurations.

### General Configuration

Each notification agent requires the following common settings:

| Parameter                    | Description                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Name                         | A descriptive name for this notification configuration                                                     |
| Enabled                      | Whether this agent is active and will send notifications                                                   |
| Agent                        | The notification service to use (Discord, Email, etc.)                                                     |
| Types                        | Which notification types this agent should receive                                                         |
| Notify x days before removal | For "Media About to be Handled" notifications, how many days before removal to send the alert (default: 3) |

### Notification Types

Maintainerr supports several notification types that you can enable for each agent:

| Type                          | Description                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Media Added to Collection     | Sent when media items are added to a collection                                                                                                  |
| Media Removed from Collection | Sent when media items are removed from a collection                                                                                              |
| Media About to be Handled     | Advance warning that media will be processed/deleted in X days. When Seerr is configured, the message also names the requester (see note below). |
| Media Handled                 | Confirmation that media has been processed/deleted                                                                                               |
| Rule Handling Failed          | Alert when there's an error processing rules                                                                                                     |
| Collection Handling Failed    | Alert when there's an error processing collections. When Maintainerr can tie the failure to one collection, the message names that collection.   |
| Update Available              | Sent when a newer Maintainerr build is available, naming the current and new version and linking the upgrade guide (see note below).             |

Infrastructure-level collection failures that happen before Maintainerr can identify a specific collection still send the generic `Collection Handling Failed` message.

Maintainerr checks for a newer build twice a day, and sends `Update Available` on the `latest`, `stable`, and `main` image tags. The `development` tag moves with every merged commit, so it only shows the sidebar update indicator instead of announcing each one. Release notes are linked only when the newer build is a published release.

:::note Seerr requester in pre-deletion warnings
When Seerr (Overseerr or Jellyseerr) is configured, the **Media About to be Handled** message includes who requested the item, for example: _'Some Title' (requested by alice) will be handled in 3 days_. The lookup is season-aware for TV content and best-effort by design: if Seerr is unreachable or the item was not requested through Seerr, the requester line is silently omitted and the warning is still sent.
:::

### How messages are grouped and delivered

During a collection handling run, `Media Removed from Collection` is collected per collection and sent as one message when the run ends, listing every item that left that collection during the run. This covers items removed after they were handled, items cleaned up because they were gone from the media server, and items pruned from other collections. A rule run reports its own removals in grouped messages while it runs, so those arrive during the run. Emptying a collection by hand is picked up by the next rule run and reported as one message as well.

If a notification service answers with a rate limit, Maintainerr waits the time that service asks for and sends again, up to a minute, instead of dropping the message. Discord messages are cut to Discord's embed limits, so a very long list of items can end in `...`.

## Supported Notification Agents

### Discord

Send notifications to Discord channels via webhooks.

:::note Setup Required
You'll need to create a Discord webhook for your channel. Follow Discord's guide: [Intro to Webhooks](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)

:::

| Parameter      | Required | Description                                             |
| -------------- | -------- | ------------------------------------------------------- |
| Webhook URL    | Yes      | Discord webhook URL for the target channel              |
| Bot Username   | No       | Custom username for the bot (defaults to "Maintainerr") |
| Bot Avatar URL | No       | Custom avatar image URL for the bot                     |

### Email

Send notifications via SMTP email.

| Parameter         | Required | Description                           |
| ----------------- | -------- | ------------------------------------- |
| Email From        | Yes      | Sender email address                  |
| Sender Name       | Yes      | Display name for the sender           |
| Email To          | Yes      | Recipient email address               |
| SMTP Host         | Yes      | SMTP server hostname                  |
| SMTP Port         | Yes      | SMTP server port (usually 587 or 465) |
| Secure            | No       | Use implicit TLS                      |
| Ignore TLS        | No       | Disable TLS entirely                  |
| Require TLS       | No       | Always use STARTTLS                   |
| Auth User         | No       | SMTP authentication username          |
| Auth Pass         | No       | SMTP authentication password          |
| Allow Self Signed | No       | Accept self-signed certificates       |
| PGP Key           | No       | PGP public key for encryption         |
| PGP Password      | No       | Password for PGP key                  |

### Gotify

Send notifications to a Gotify server.

:::note Setup Required
You'll need a running Gotify server instance. See the [Gotify documentation](https://gotify.net/docs/install) for installation instructions.

:::

| Parameter | Required | Description                   |
| --------- | -------- | ----------------------------- |
| URL       | Yes      | Gotify server URL             |
| Token     | Yes      | Application token from Gotify |

### LunaSea

Send notifications to LunaSea mobile app.

:::warning Project Status
LunaSea ended development in 2024. While the binaries are still available for download, no further updates will be provided. See [lunasea.app](https://www.lunasea.app/) for more information.

:::
:::note Setup Required
You'll need the LunaSea mobile app installed and configured. The webhook setup documentation may still be accessible through archived versions.

:::

| Parameter    | Required | Description                                  |
| ------------ | -------- | -------------------------------------------- |
| Webhook URL  | Yes      | LunaSea webhook URL                          |
| Profile Name | No       | Specific profile name (if not using default) |

### ntfy

Send notifications to an [ntfy](https://ntfy.sh) server.

:::note Setup Required
You can use the public [ntfy.sh](https://ntfy.sh) server or a self-hosted instance. Pick a topic name (any string) and, if your server requires authentication, generate an access token. See the [ntfy docs](https://docs.ntfy.sh/) for setup details.

:::

| Parameter | Required | Description                                          |
| --------- | -------- | ---------------------------------------------------- |
| URL       | Yes      | Base URL of the ntfy server (e.g. `https://ntfy.sh`) |
| Topic     | Yes      | Topic name to publish notifications to               |
| Token     | No       | Bearer access token for protected topics             |

### Pushbullet

Send notifications via Pushbullet.

:::note Setup Required
You'll need a Pushbullet account and API token. Visit [Pushbullet Settings](https://www.pushbullet.com/#settings) to create an access token.

:::

| Parameter    | Required | Description                 |
| ------------ | -------- | --------------------------- |
| Access Token | Yes      | Pushbullet API access token |
| Channel Tag  | No       | Specific channel to send to |

### Pushover

Send notifications via Pushover.

:::note Setup Required
You'll need a Pushover account and to register an application. Visit [Pushover.net](https://pushover.net/apps/build) to sign up and create an application for your API token.

:::

| Parameter    | Required | Description                                |
| ------------ | -------- | ------------------------------------------ |
| Access Token | Yes      | Pushover application token                 |
| User Token   | Yes      | Your 30-character user or group identifier |
| Sound        | No       | Notification sound name                    |

### Slack

Send notifications to Slack channels.

:::note Setup Required
You'll need to create a Slack webhook for your workspace. Follow Slack's guide: [Sending messages using Incoming Webhooks](https://api.slack.com/messaging/webhooks)

:::

| Parameter   | Required | Description                              |
| ----------- | -------- | ---------------------------------------- |
| Webhook URL | Yes      | Slack webhook URL for the target channel |

### Telegram

Send notifications via Telegram bot.

:::note Setup Required
You'll need to create a Telegram bot and get your chat ID. Follow these steps:

1. Message [@BotFather](https://t.me/botfather) on Telegram to create a new bot
2. Get your Chat ID by messaging [@get_id_bot](https://t.me/get_id_bot) and using the `/my_id` command

:::

| Parameter      | Required | Description                                           |
| -------------- | -------- | ----------------------------------------------------- |
| Bot Auth Token | Yes      | Telegram bot authentication token                     |
| Chat ID        | Yes      | Target chat ID (use @get_id_bot to find your chat ID) |
| Bot Username   | No       | Bot username for user interaction                     |
| Send Silently  | No       | Send notifications without sound                      |

### Webhook

Send notifications to custom webhook endpoints. Requests are sent using the POST request method.

| Parameter    | Required | Description                                                                                                     |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------- |
| Webhook URL  | Yes      | Target webhook endpoint URL                                                                                     |
| JSON Payload | Yes      | Custom JSON payload template                                                                                    |
| Auth Header  | No       | [Authorization](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Authorization) header value |

#### Webhook Variables

The webhook agent supports variable replacement in the JSON payload. You can use the following variables:

| Variable                | Description                         |
| ----------------------- | ----------------------------------- |
| `{{notification_type}}` | The type of notification being sent |
| `{{subject}}`           | The notification subject/title      |
| `{{message}}`           | The notification message content    |
| `{{image}}`             | Associated image URL (if available) |
| `{{extra}}`             | Additional data fields (see below)  |

The `{{extra}}` block is also flattened into the top-level webhook payload as individual keys. The fields present depend on the notification type:

| Extra key        | Type   | Description                                                 |
| ---------------- | ------ | ----------------------------------------------------------- |
| `collectionName` | string | Name of the collection that triggered the notification      |
| `dayAmount`      | number | Days until the item is handled (`null` when not applicable) |
| `mediaItems`     | string | Stringified JSON array of media items (see example below)   |

Example `mediaItems` value for a **Media About to be Handled** notification when Seerr is configured:

```json
[
  {
    "mediaServerId": "abc123",
    "type": "movie",
    "title": "A Sample Movie",
    "providerIds": { "imdb": ["tt0000000"], "tmdb": ["1234"], "tvdb": [] },
    "requestedBy": ["alice"]
  },
  { "mediaServerId": "def456" }
]
```

Every entry contains `mediaServerId`. The rest are optional:

| Field         | Description                                                                          |
| ------------- | ------------------------------------------------------------------------------------ |
| `type`        | `movie`, `show`, `season` or `episode`                                               |
| `title`       | The item's name, worded the same way as in the message text                          |
| `providerIds` | The item's IMDb, TMDB and TVDB ids. Each is an array, and empty when there is no id. |
| `requestedBy` | The Seerr usernames who requested the item                                           |

`type`, `title` and `providerIds` come from a snapshot Maintainerr takes just before it handles an item, so they still name it once the deletion has made its media server id useless. Only **Media About to be Handled** and **Media Handled** carry them, and they are left out for an item the media server could not be asked about at the time.

The ids are the item's own, so a season or episode carries season or episode ids rather than the show's. If you match on them, resolve the show yourself.

`requestedBy` is left out when Seerr is not configured or the item was not requested there.

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
