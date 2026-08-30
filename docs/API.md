---
id: api
slug: /api
description: Documentation of the Maintainerr API and its endpoints.
title: API Docs
hide:
  - navigation
  - toc
---

:::danger
:fire: :fire: The API, and all of Maintainerr for that matter, does not have an authentication method. There are certain API calls, that if you make your instance public facing, will expose your entire settings configuration. This could include all of your service's API keys. Proceed with extreme caution if you choose to expose Maintainerr to the public. See the [Security & Authentication](./Security.md) page for guidance on protecting your instance. :fire: :fire:

:::

Maintainerr exposes 219 HTTP endpoints. Every one of them is documented in the pages below, grouped by area.

## Endpoints by area

| Page                                                          | Endpoints | Covers                                                                             |
| ------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| [Settings](./api/settings.md)                                 | 74        | Every integration's connection settings, connection tests, the media server switch |
| [Rules](./api/rules.md)                                       | 29        | Rule groups, execution, exclusions, community rules, YAML import and export        |
| [Overlays](./api/overlays.md)                                 | 28        | Overlay settings, processing runs, templates, fonts and images                     |
| [Collections](./api/collections.md)                           | 25        | Collections, membership, bulk media actions, handling, posters, logs               |
| [Media server](./api/media-server.md)                         | 23        | Libraries, items, search, watch state, users, media server collections             |
| [Notifications](./api/notifications.md)                       | 8         | Agents, configurations, rule group links, test sends                               |
| [App and health](./api/app-and-health.md)                     | 7         | App status, time zone, releases, health probes, task status                        |
| [Logs](./api/logs.md)                                         | 6         | Log stream, log files, log level settings                                          |
| [Seerr](./api/seerr.md)                                       | 6         | Seerr lookups, requester names, request and media deletion                         |
| [Metadata, storage and events](./api/metadata-and-storage.md) | 6         | Metadata provider lookups, storage metrics, the events stream                      |
| [Servarr](./api/servarr.md)                                   | 5         | Radarr, Sonarr and Sportarr disk space and quality profiles                        |
| [Streamystats](./api/streamystats.md)                         | 2         | Streamystats server info and per-item watch statistics                             |

## API conventions

These hold across the whole API. They are worth reading once before using any endpoint.

### No authentication

There is no authentication anywhere. The only access check in Maintainerr confirms that a media server is configured, not who is calling.

`GET /api/settings/api/generate` mints an API key, but **nothing server-side ever validates an inbound `X-Api-Key`**. That key exists only so Maintainerr's own internal client can call its own API. Generating one does not protect anything.

Anyone who can reach the port can call every endpoint, including the ones that delete media. See [Security & Authentication](./Security.md) for how to put access control in front of it.

### No rate limiting

No request throttling is configured. There is nothing to stop a caller making unlimited requests.

### Base path

When `BASE_PATH` is set it prefixes every path. All paths in these docs are shown in their unprefixed form, so add your prefix to each.

### CORS

In production no CORS middleware is registered at all unless `CORS_ALLOWED_ORIGINS` is set, so no `Access-Control-Allow-Origin` header can be sent and browser calls from another origin will fail. In development the origin that asks is reflected back.

### Request validation

Bodies are validated per endpoint. Where a schema exists, a failure returns:

```json
{ "statusCode": 400, "message": "Validation failed", "errors": [] }
```

`errors` holds the individual validation problems.

Validation is not universal. Of the 70 endpoints that take a body, **17 have no schema at all**, so the body reaches the service unchecked. Most numeric path parameters are checked and reject a non-numeric value with a `400` before the handler runs, but not all: `DELETE /api/notifications/configuration/{id}` declares a numeric id without that check.

### Success and failure in the same status code

Many endpoints, settings especially, report failure as HTTP `200` with a body like this:

```json
{ "status": "NOK", "code": 0, "message": "why it failed" }
```

`status` is `OK` or `NOK`, and `code` is `1` or `0`. A successful call returns `status: "OK"` and `code: 1`.

**This is the single easiest thing to get wrong.** Check the body, not the status line. Where an endpoint behaves this way it is stated in its status code table.

Some areas use a different envelope with `code` and `result`, or `code`, `result` and `message`. The field names are given per endpoint.

A third pattern is worth knowing: several read endpoints return `200` with an **empty body** when something failed, which is not the same as an empty array or object. Those are flagged too.

### POST returns 201

Almost no endpoint overrides the default status, so a successful `POST` answers **`201`**, not `200`, even where an annotation in the generated OpenAPI document says otherwise. `PATCH`, `PUT` and `DELETE` answer `200`.

### Error bodies

There is no global error handler, so error bodies are framework defaults. A denied access check produces:

```json
{ "statusCode": 403, "message": "Forbidden resource", "error": "Forbidden" }
```

### Secrets

`GET /api/settings` masks nine secret fields. The per-integration read routes under `/api/settings` **do not mask** and return the real stored values, because the settings forms need them in order to save them again. `GET /api/settings` also leaves `apikey` and `download_client_username` in the clear.

Two further routes hand over secrets wholesale: `GET /api/notifications/configurations` returns every notification credential unmasked, and `GET /api/settings/database/download` streams the entire database with every secret in plaintext.

There is also **no masked-value detection on writes**. Reading a masked body and posting it back stores the mask over your real secret.

## Interactive reference

Your own instance serves a live, interactive reference generated from the running build:

| URL                                         | What it is               |
| ------------------------------------------- | ------------------------ |
| `http://<maintainerr_url>/api/swagger`      | Swagger UI               |
| `http://<maintainerr_url>/api/swagger-json` | The raw OpenAPI document |

Both are prefixed by `BASE_PATH` when it is set.

A snapshot of that document also ships with this site at `static/openapi-spec/maintainerr_api_specs.yaml`. For the instance you are actually running, the live document is the authority.
