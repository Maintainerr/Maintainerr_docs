---
id: test-media
slug: /test-media
description: Use Test Media to see whether a specific item matches a rule and why.
title: Test Media
---

Test Media lets you run a single item against a rule and inspect the result before the normal rule jobs run. It is useful when you want to answer questions like:

- Why was this movie added to a collection?
- Why was this show not added?
- Which part of the rule failed?

Using Test Media does not create or update collections by itself. It only evaluates the selected media item and shows the result.

## Before you start

You need an existing rule before you can use Test Media.

- If you have not created one yet, start with [Rules](/rules).
- If you want a guided example, see the [Walkthroughs](/blog).

## Where to find it

After creating and saving a rule, open the collection that belongs to that rule. On the collection page, use the `Test Media` button in the top-left area.

![Test Media button](/img/test-media-button.png)

## What you can test

The options shown in the Test Media dialog depend on the rule's library and media type.

| Field | Description |
| ----- | ----------- |
| Media | The movie or show you want to test |
| Season | The season to test for TV rules when applicable |
| Episode | The episode to test for episode-level rules when applicable |
| Output | The YAML result showing how Maintainerr evaluated the rule |

### Search behavior

Start typing in the `Media` field to search your library.

- For movie rules, you can test movies.
- For TV rules, you can test shows, seasons, or episodes depending on the rule's configured media type.
- You cannot test a movie against a TV rule, or TV content against a movie rule.

After selecting the media item, choose a season or episode if needed, then run the test.

## Reading the output

The result is shown as YAML. It includes the overall result and the nested results for each section and rule that Maintainerr actually evaluated.

Example:

```yaml
- plexId: 73061
  result: false
  sectionResults:
    - id: 0
      result: false
      ruleResults:
        - operator: OR
          action: contains_partial
          firstValueName: Overseerr - Requested by user (Plex or local username)
          firstValue: null
          secondValueName: text
          secondValue: ydkmlt84
          result: false
```

### What the main fields mean

| Field | Meaning |
| ----- | ------- |
| `plexId` | The media server ID of the item you tested |
| `result` | The overall result for the test item |
| `sectionResults` | The results for each evaluated section |
| `ruleResults` | The detailed comparison output for each evaluated rule |
| `firstValue` | The actual value Maintainerr retrieved from Plex, Jellyfin, Overseerr, Sonarr, Radarr, or another source |
| `secondValue` | The value configured in your rule |

### How to interpret it

In the example above:

- the overall `result` is `false`
- the rule action is `contains_partial`
- `firstValue` is `null`
- `secondValue` is `ydkmlt84`

That means Maintainerr checked whether `Overseerr - Requested by user (Plex or local username)` contained `ydkmlt84`, and it did not. In this case, the returned value was `null`, which means there was no matching request data for that item in Overseerr.

## Why some rules do not appear in the output

Test Media does not always show every rule in the ruleset. Maintainerr stops evaluating when the remaining result is already determined.

For example:

- if Rule 1 is `false`
- and Rule 2 is joined with `AND`

Then Rule 2 may not be evaluated at all, because `false AND anything` will still be `false`.

The same logic applies to sections. This is normal and does not mean Test Media is missing data.

## When to use Test Media

Test Media is most useful when:

- a specific item is not being added and you need to know why
- an item was added unexpectedly and you want to see which rule matched
- you are building a more complex rule and want quick feedback before waiting for the next scheduled rule run

:::tip
If you are trying to validate a new rule safely, keep `Take action after days` high enough that you have time to inspect the collection before any cleanup action runs.
:::
