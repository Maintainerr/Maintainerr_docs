---
id: calendar-feature
slug: /calendar
description: Understand how Maintainerr schedules collection actions on the Calendar page.
title: Calendar
---

The `Calendar` page shows when Maintainerr is expected to take action on media that is already inside a collection.

Maintainerr calculates each scheduled date from:

- when the media was added to the collection
- the collection's `Take action after days` value
- the selected action for that collection

## What appears on the calendar

Only collections that are configured to take an action are shown.

- Collections with `Do nothing` are skipped.
- Collections without `Take action after days` are skipped.
- Entries are grouped by day and action label, such as `Delete`, `Unmonitor/Keep`, or `Change Quality`.

If a day has no scheduled work, Maintainerr shows `No scheduled actions` for that day.

## Using the page

- Desktop supports `Month` and `Week` views.
- Mobile defaults to a week-style view.
- `Prev`, `Today`, and `Next` move the visible date range.
- Clicking a scheduled entry opens the item list for that action on that date.

The details dialog shows:

- media title
- added date
- collection name
- media type

From that dialog, you can jump directly to the related collection.

## Reading the schedule correctly

The Calendar is a planning view. It does not force action to happen immediately at that exact moment.

Actual cleanup still happens through the normal collection handling workflow documented on [Collections](/collections). If you manually run collection handling, Maintainerr can process eligible items sooner than the next scheduled background run.

## Where the data comes from

The page is built from Maintainerr collection membership, not from a separate calendar-only database.

That means:

- removing media from a collection removes it from the future schedule
- changing `Take action after days` changes future scheduled dates
- changing a collection action changes how that future entry is labeled