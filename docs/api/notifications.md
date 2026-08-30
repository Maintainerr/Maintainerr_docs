---
slug: /api/notifications
title: Notifications API
description: Notification agents, configurations, rule group links, and test sends.
---

Create and manage notification agent configurations, attach them to rule groups, and send test messages. See the [Notifications](../Notifications.md) page for what the feature does.

See [API conventions](../API.md#api-conventions) for the rules that apply across the API.

:::caution Two different response envelopes on one page
`POST /api/notifications/configuration/add` answers with the usual `status`, `code` and `message` envelope. The connect, disconnect and delete routes instead answer with `code` and **`result`**. Read the field names carefully.

Either way, failure is reported in the body and not in the status code.
:::

## Reference data

### `GET /api/notifications/agents`

**List every supported notification agent and the option fields it accepts.**

A fixed list built in code. Nothing is read from the database and nothing is contacted. The UI renders one input per entry when you add or edit an agent.

Response:

```json
[
  {
    "name": "discord",
    "friendlyName": "Discord",
    "options": [
      {
        "field": "webhookUrl",
        "type": "text",
        "required": true,
        "extraInfo": ""
      },
      {
        "field": "botUsername",
        "type": "text",
        "required": false,
        "extraInfo": ""
      },
      {
        "field": "botAvatarUrl",
        "type": "text",
        "required": false,
        "extraInfo": ""
      }
    ]
  }
]
```

Agents are returned in a fixed order: `email`, `discord`, `lunasea`, `slack`, `telegram`, `pushbullet`, `pushover`, `webhook`, `gotify`, `ntfy`. The `name` values are exactly the `agent` keys the add and test routes accept. `type` is one of `text`, `password`, `number`, `checkbox` or `json`.

| Status | Cause                         |
| ------ | ----------------------------- |
| `200`  | Always. The route cannot fail |

:::note This is form metadata, not validation
Nothing on the server checks a submitted `options` object against this spec, and the `required` flags do not always match what an agent actually needs. Telegram is listed as requiring `chatId` but only checks the bot token before sending, and Pushbullet checks nothing at all. Treat the flags as UI hints.

For email, `secure`, `ignoreTls` and `requireTls` describe mutually exclusive TLS modes and nothing stops you setting more than one.
:::

### `GET /api/notifications/types`

**List the subscribable notification event types with their numeric values.**

Response:

```json
[
  { "title": "Media Added To Collection", "id": 2 },
  { "title": "Media Removed From Collection", "id": 4 },
  { "title": "Media About To Be Handled", "id": 8 },
  { "title": "Media Handled", "id": 16 },
  { "title": "Rule Handling Failed", "id": 32 },
  { "title": "Collection Handling Failed", "id": 64 },
  { "title": "Overlay Applied", "id": 256 },
  { "title": "Overlay Reverted", "id": 512 },
  { "title": "Update Available", "id": 1024 }
]
```

| Status | Cause                         |
| ------ | ----------------------------- |
| `200`  | Always. The route cannot fail |

The ids are powers of two, but they are **not** used as a bitmask. Store them as a plain array of numbers in a configuration's `types` field, and the server matches by array membership.

The test notification type, `128`, is deliberately missing from this list. It is a real value, and the test route appends it to whatever `types` you send. That is exactly what stops a real event from being delivered as a test.

## Configurations

### `GET /api/notifications/configurations`

**Return every stored notification agent configuration.**

Response:

```json
[
  {
    "id": 1,
    "name": "My Discord",
    "agent": "discord",
    "enabled": true,
    "types": [2, 4],
    "options": {
      "agent": "discord",
      "webhookUrl": "https://discord.com/api/webhooks/..."
    },
    "aboutScale": 3
  }
]
```

| Status                   | Cause                        |
| ------------------------ | ---------------------------- |
| `200`                    | JSON array of configurations |
| `200` with an empty body | The read failed              |

An empty body is not the same as `[]`. `[]` means no agents are configured, an empty body means the read threw. Check the body type to tell them apart.

Rule group links are not included on this route.

:::danger Secrets are returned in cleartext
There is no masking on this route. `options` carries webhook URLs, auth headers, bot tokens, access tokens, user tokens, SMTP passwords and PGP keys exactly as stored.

This is unlike `GET /api/settings`, which masks its secrets. Since the API has no authentication, anyone who can reach the port can read every notification credential you have saved. See [Security and Authentication](../Security.md).
:::

A row whose `agent` value this build does not recognise is still returned here even though it produces no working agent. It is skipped with a warning when agents are registered.

### `POST /api/notifications/configuration/add`

**Create a notification agent configuration, or update an existing one.**

This is both the create and the update path. There is no `PUT` or `PATCH`. Omit `id` to create; supply it to update.

Request body:

```json
{
  "id": 1,
  "agent": "discord",
  "name": "My Discord",
  "enabled": true,
  "types": [2, 4],
  "aboutScale": 3,
  "options": {
    "agent": "discord",
    "webhookUrl": "https://discord.com/api/webhooks/..."
  }
}
```

| Field        | Type     | Required | Description                                                                                                     |
| ------------ | -------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `id`         | number   | No       | Omit to create. Supply to update that row                                                                       |
| `agent`      | string   | Yes      | An agent key from `GET /api/notifications/agents`                                                               |
| `name`       | string   | Yes      | Display name                                                                                                    |
| `enabled`    | boolean  | Yes      | Whether the agent may send                                                                                      |
| `types`      | number[] | Yes      | Event type ids from `GET /api/notifications/types`                                                              |
| `aboutScale` | number   | Yes      | How many days before an item's scheduled handling date the "about to be handled" warning fires. Defaults to `3` |
| `options`    | object   | Yes      | The agent-specific option block                                                                                 |

Response:

```json
{ "status": "OK", "code": 1, "message": "Success" }
```

| Status | Cause                                                                                      |
| ------ | ------------------------------------------------------------------------------------------ |
| `201`  | Always, including every failure. Read `status` and `code` in the body, not the status line |

Changes take effect for live delivery immediately. No restart is needed, and nothing is sent to the destination.

:::caution Updates that silently do nothing
The create-or-update decision is made purely on whether `id` is **present**, not on whether it is useful. Sending `"id": null` or `"id": 0` takes the update path, matches no row, writes nothing, and still answers `code: 1` and `status: "OK"`. An `id` that matches no existing row behaves the same way.

There is no `404` here, and no way to tell a real update from a no-op.
:::

`agent`, `types` and `options` are not validated. An unknown agent key, or an options block missing fields the agent needs, is stored happily. The mismatch only shows up later as a skipped agent or a failure at send time. The real gate is that `name`, `agent` and `options` cannot be null, so omitting one of those fails the write and comes back as `status: "NOK"`.

Editing an agent does not touch its rule group links.

### `DELETE /api/notifications/configuration/{id}`

**Permanently delete a notification agent configuration and all of its rule group links.**

| Parameter | Type   | Required | Description                       |
| --------- | ------ | -------- | --------------------------------- |
| `id`      | number | Yes      | Id of the configuration to delete |

Response:

```json
{ "code": 1, "result": "success" }
```

| Status | Cause                                                                    |
| ------ | ------------------------------------------------------------------------ |
| `200`  | Always, success or failure. An id matching no row also returns `code: 1` |

:::warning Destructive
Deletes the configuration row and, by a database cascade, **every rule group link that used it**. Those rule groups silently stop notifying, with no warning and no list of what was affected.

**This cannot be undone.** There is no soft delete and no server-side confirmation step, and the stored credentials go with it. The only confirmation is the dialog in the web UI.

If you only want to stop delivery, set `enabled: false` through `POST /api/notifications/configuration/add` instead.
:::

The response cannot tell a real deletion from a no-op, because the number of affected rows is never checked.

## Rule group links

Both routes below work, but nothing in Maintainerr calls them. The web UI attaches agents to a rule group by sending the whole `notifications` array to the [rules endpoints](./rules.md) instead, which is the path to prefer.

### `POST /api/notifications/configuration/connect`

**Attach an existing notification configuration to an existing rule group.**

Request body:

```json
{ "rulegroupId": 1, "notificationId": 2 }
```

Both ids are checked for truthiness, so `0` counts as missing.

Response:

```json
{ "code": 1, "result": "success" }
```

| Status | Cause                                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| `201`  | Always, including failure. A missing rule group or notification is `code: 0` with `result: "failed"`, not a `404` |

A missing record and a falsy id produce the same `failed` result, so you cannot tell them apart.

### `POST /api/notifications/configuration/disconnect`

**Detach a notification configuration from a rule group.**

Removes the link only. The configuration itself is left completely intact, so use `DELETE /api/notifications/configuration/{id}` if you want to remove the agent.

Request body:

```json
{ "rulegroupId": 1, "notificationId": 2 }
```

| Status | Cause                                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| `201`  | Always, including failure. A missing rule group or notification is `code: 0` with `result: "failed"`, not a `404` |

Disconnecting a link that was never there returns `code: 1` and `result: "success"`, because both records exist and removing nothing succeeds.

## Testing

### `POST /api/notifications/test`

**Fire a real test notification through an agent configuration supplied in the request body.**

The agent is built from the body rather than looked up, so you can test values before saving them. The test type is appended automatically, so you do not need to include it in `types`.

Takes the same body as `POST /api/notifications/configuration/add`. Only `agent`, `enabled` and `options` decide whether anything is delivered. `id`, `name` and `aboutScale` are ignored.

The response is a bare JSON string, not an object. It is `Success`, or `Failure: ` followed by a reason, or `Agent is not allowed to send this message.`

| Status | Cause                                                                        |
| ------ | ---------------------------------------------------------------------------- |
| `201`  | Every delivery outcome, success or failure. The result is in the string body |
| `500`  | Malformed body, specifically a missing `types` or a missing `options`        |

Nothing is written to the database and the live agent list is untouched. Because no media items are involved, a test works even with no media server configured.

:::warning This sends a real message to a destination you name in the request
The credentials and the target URL both come from the request body, so this route will make an outbound request to whatever address the caller supplies. The only check is that webhook style agents use an `http` or `https` scheme. There is no host or private network filtering, and Gotify's URL is not checked at all.

On an unauthenticated instance that is a way to make your server issue requests on someone else's behalf. Treat this as an operator-only endpoint and see [Security and Authentication](../Security.md).
:::

Three results that look like success but are not:

- `enabled` normally has to be `true` or nothing is sent, and you get `Agent is not allowed to send this message.` rather than a clear error. **Pushbullet is the exception**: a disabled or token-less Pushbullet configuration answers `Success` having delivered nothing.
- An unrecognised `agent` key returns a flat `Success` without sending anything.
- Any agent whose stored `types` do not match returns `Success` without sending. This cannot happen on this route, since the test type is always appended, but it is worth knowing when reading agent behaviour.
