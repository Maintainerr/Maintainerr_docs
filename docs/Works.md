---
title: How it works
description: Explanation of the basics and how Maintainerr was designed to be used.
---


## Basic Idea

Some people come to Maintainerr because they heard it was the solution to whatever problem they were having. Not everyone understands completely, what Maintainerr even is and how to use it.

### Quick Rundown

Maintainerr looks through your media library to find items that match against the given ruleset. Rulesets can be as easy or as complex as you want.

??? note "Rule example"
    Here is a quick example:
    ```
    Date added before 90 days
    AND
    Viewed by username contains Seerr- requested by username
    ```
    There are more examples and explanations of each option here &#8594; [Rule Glossary](https://docs.maintainerr.info/latest/Glossary) and here &#8594; [Walkthroughs](https://docs.maintainerr.info/latest/blog/).

Once the rule is setup and the rule handler has ran (every 8 hours by default), Maintainerr will add all of this rule's matches to a Collection. This collection, once it has matched items inside of it, will get synced to your media server. *An empty collection will not get synced*. There are various options as to where you want this collection displayed on your media server, but at the very least they will be inside of your library on the Collections tab.

### Take action after days

Within the rule creation page there is a setting called `Take action after days`, along with a setting called Sonarr/Radarr/Media Server action. Which actions that are available depends on the Library and if you chose a configured Sonarr or Radarr server. An in-depth look at the rule creation settings can be found here &#8594; [Walkthrough S01E01](https://docs.maintainerr.info/latest/blog/tutorials/getting-started-s01e01/#rule-setup)

Take action after days is how long media will be in this collection before action is taken against it. The action is setup by you when creating the rule. Options include `delete, unmonitor and delete, unmonitor and keep, delete season, unmonitor season and keep files, etc.`

Maintainerr will periodically run its Collection handler task (every 12 hours by default), and anything in a collection that meets the `Take action after days` deadline, action will be taken against it.

#### Dry Run

There is no dry run, per se. When either the rule runs on its schedule, or you manually click the Run Rules button, Maintainerr will run every rule. There is currently no way to select which rules you would like to run. You *could* uncheck the active checkbox in a rule if you didn't want that rule included in the run.

Each rule checks the chosen library against the rule parameters you setup, makes a collection for that rule, and everything that matches the ruleset gets added to that collection. A separate task, the *Collection Handler*, is what takes actions against the items in a collection. When the Collection Handler determines that an items has been in the collection long enough to meet the `Take action after days` setting, your chosen action will be taken (Media Server/Sonarr/Radarr unmonitor or delete).

No media will get removed simply by running rules, as this is a separate task. Depending on what you set as `Take action after days`, that is how long you will have to see what collection is created (AKA what the rule actually found as matches), before anything happens to your media. Setting the `Take action after days` to 1 will give you 1 day of those items being in the collection before the Action is taken. For the purposes of a "dry-run", we suggest a minimum of 30 days and this is the default setting. Once your collection is working as you intended, you can adjust this to how long you want to wait.

All of that is to say you can safely use the Run Rules button to see what items get added to the collection, based off of your ruleset. It wouldn't make much sense for us to make a separate dry-run feature as all of the same calculations would need to happen. During this testing, there is no reason to press the Handle Collections button.

## TLDR;

Maintainerr creates collections, synced with your media server, of items that match your ruleset. These items sit in the collection, displayed in various places on your media server, and once a set amount of time has passed, the items are removed/unmonitored. If you setup a rule to catch unwatched items, something got added to a collection, and then the item was watched...Maintainerr will remove it from the collection as it no longer meets the rule criteria (i.e. it is no longer queued for removal).

### Requirements/Limitations

- Maintainerr uses either Plex or Jellyfin as its source of media. Everything has to be in your media server for Maintainerr to do anything with it.
- Setting `Take action after days` to null (empty) prevents automatic action. Set it to 1 or higher for scheduled processing.
- You do not have to have Radarr or Sonarr setup in Maintainerr. However, you do have to if you want to use those rules.
- Maintainerr does have multiple *arr instance capability. We do not currently support mixed HD and UHD libraries from within the same rule.
- Certain rules are only available based off the Library and Media type (show/season/episode).
- The data location within the container is `/opt/data`. This is where your log files live as well as the sqlite file that holds all of your settings.
- If you do not have a persistent host volume tied to this location, when you update Maintainerr, it will all be gone. [Installation](https://docs.maintainerr.info/latest/Installation/).
- The rule handler runs rules from top to bottom. Pay special attention to the order of your rules, to acheive the desired outcome.
- Maintainerr does not have authentication. [Authentication Suggestion](https://maintainerr.info/#:~:text=Does%20Maintainerr%20have%20authentication%3F) and [Feature Request](https://features.maintainerr.info/posts/6/add-authentication-into-the-app)

## Helpful links

| Page | Description |
| -------- | :---------------: |
| [Rules](https://docs.maintainerr.info/latest/Rules) | Basic overview of rules |
| [Rules Glossary](https://docs.maintainerr.info/latest/Glossary)| Outline of the available rules |
| [Collections](https://docs.maintainerr.info/latest/Collections) | Basic overview of collections |
| [Test Media](https://docs.maintainerr.info/latest/Test-Media) | How to test your rules against a specific media item |
| [Common Problems](https://docs.maintainerr.info/latest/Common/) | A short list of common problems and their solutions |
| [Walkthroughs](https://docs.maintainerr.info/latest/blog/) | A short series of *episodes* written to try and help you get started. |
| [Installation](https://docs.maintainerr.info/latest/Installation/) | How to get Maintainerr installed and running. |
| [Debug logging](https://docs.maintainerr.info/latest/Installation/#enabling-debug-logging_1) | How to enable debug logging. |
