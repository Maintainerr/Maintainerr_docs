---
description: Rules configurations and basic information about using rules.
title: Rules
---

Rules are the core of Maintainerr. They evaluate your Plex media based on the parameters you set. If a media item matches a rule, it is added to a collection.

Media in a collection will remain there for the number of days you specify. After that period, Maintainerr will delete the media from disk and any connected external applications. If a collections media item no longer matches a rule, it will be removed from it.

???+ note "Rule Handling"
    Rule handling is a batch process that runs every 8 hours (this interval can be changed in the settings). During each run, Maintainerr checks all your rules and updates collections by adding or removing media items as needed. You can manually trigger this process with the `Run Rules` button on the 'Rules' page.

## Creating rules

### General

General info about the rule. Some of the information specified here will be shown on the generated collection. In here you also specify how to handle the collection.

| Parameter                    | Description                                                                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                         | The Rule and Plex Collection  |
| Description                  | Description of the Rule. This is also used as the Collection's description  |
| Library                      | Which Plex library's media to use  |
| Media type                   | The type of TV media the rules will apply to, either the entire show, only seasons or only episodes  |
| Radarr server                | The server that Radarr specific rules and actions will be applied to  |
| Radarr action                | Unmonitor or delete movies from Radarr  |
| Sonarr server                | The server that Sonarr specific rules and actions will be applied to  |
| Sonarr action                | Unmonitor or delete series from Sonarr  |
| Plex action                  | Delete media from Plex directly. Only applicable when no *arr server is selected.  |
| Do nothing action            | No action will be taken on the media in this collection.  |
| Active                       | If inactive, the rule won't run  |
| Show on library recommended  | Show the rule's collection on the Plex library recommended screen  |
| Show on home                 | Show the rule's collection on the Plex home screen  |
| Add list exclusions          | Prevent \*arr import lists from re-adding media that has been removed by Maintainerr  |
| Media deleted after days     | Amount of days media will live in the collection before deletion  |
| Use rules                    | Disable the rule engine, for when you want to add media to the Plex collection manually  |
| Force reset Overseerr record | Force resets the Overseerr record by deleting any requests instead of relying on availability-sync. 'Enable CSRF Protection' needs to be disabled in Overseer's settings for this to work. [^1] |
| Custom collection            | Use a manually created Plex collection. Maintainerr will never automatically add or remove this collection from Plex.  |
| Custom collection name       | The name of the manual Plex collection to use [^2]  |

[^1]:
    This is the old method of telling Overseerr that something has been removed. The default method now, is to tell Overseerr to initiate an `Availability Sync`, through its API. This happens automatically at the end of the collection handler job. This option is not available for Jellyseerr.
[^2]: Only shown and needed when the Custom Collection checkbox is checked.

#### TV media type

With the *Media type* parameter, you specify which type of media to target in a TV library. This allows you to run rules on shows, seasons, or episodes.

For example, you might create a rule group that selects and deletes old or watched seasons of a TV show, while keeping newer seasons untouched. Alternatively, you could target watched episodes and set them to unmonitored in Sonarr.

???+ info
    - Plex collections cannot contain mixed media types. Therefore, Maintainerr restricts each rule group / collection to a single media type.

    - Running rules on episodes is slower than on shows or seasons, as Maintainerr must process a larger volume of data.

#### Manual collections

If you prefer to manage Plex collections yourself or use a different tool, you can enable the manual collection option. With this enabled, Maintainerr will not automatically create and delete collections in Plex.

## Adding rules

Adding a rule is done by using the *Add* button next to a section title. If the button is not available, it means your current rule isn't finished yet.

A rule consists of at least 4 values. If the `second value` contains a custom value, a `custom value` parameter will also pop up.

Starting from the second rule or section, a `operator` parameter is also required. Here you must specify the action to take on the results of the previous rule.

| Param        | Description                                    |
| ------------ | ---------------------------------------------- |
| Operator     | Action to take on the previous rule or section |
| First value  | The first value to compare with                |
| Action       | The comparable action to take                  |
| Second value | The second value to compare with               |
| Custom value | A custom value input                           |

### Sections

A section is a group of rules. What happens to the result of a section depends on the choice of *Operator* in the section's first rule.

### Adding new sections

The *New section* button, at the bottom of the form, is only available if all rules are completed.

### Operators

There are 2 operator choices, both explained below.
The choice of operator defines what happens to the result of each section or rule.

#### AND

Using this operator, the rule will run against the result of the previous rule (or section).
The output of the rule will then be passed on to the next rule.

#### OR

Using this operator, the rule will start off with all media and add its result to the previous rule (or section) result.
The output of the rule will then be passed on to the next rule.

### Actions

The action defines the way the `first value` and `second value` will be compared.
The available actions are dependent on the type of the `first value`

| Action |Description | Types |
| ---------- | ----------------------------------------------------------- | ------------------ |
| bigger | Is the `first value` bigger than the `second value` ? | number |
| smaller | Is the `first value` smaller than the `second value` ? | number |
| contains | Does the `first value` contain the `second value`? Lists will confirm the existence of an exact match within the `first value` list | number, text |
| contains (partial) | Does the `first value` contain the `second value` ? Lists will confirm the existence of a partial match within the `first value` list | number, text |
| not contains | Does the `first value` lack the `second value`? Lists will indicate the absence of an exact match within the `first value` list. | number, text |
| not contains (partial) | Does the `first value` lack the `second value` ? Lists will indicate the absence of a partial match within the `first value` list. | number, text |
| equals | Is the `first value` equal to the `second value` ? | number, text, date |
| not equals | Is the `first value` unequal to the `second value` ? | number, text, date |
| before | Does the `first value` occur before the `second value` ? | date |
| after | Does the `first value` occur after the `second value` ? | date |
| in last | Does the `first value` occur in the last x amount of days ? | date |
| in next | Does the `first value` occur in the next x amount of days ? | date |

The difference between ***Contains/Contains (exact)*** and ***Contains (partial)*** is only apparent with list values. When comparing a text list, ***Contains (exact)*** will only return true if the `second value` *exactly* matches any value in the `first value` list. ***Contains (partial)*** will return true if the `first value` list has a value that *partially* matches any value in the `second value` list.

#### List Examples

<div class="grid" markdown>

``` title="True `Contains (partial)`"
firstValue:
  - user1
  - user2
  - user3
secondValue:
  - use
  - ser
  - ser3
  - user
  - ser1
  - er3
```

``` title="True `Contains (partial)`"
firstValue:
  - user1
  - user2
  - user3
secondValue:
  - user1
  - user2
  - user3
  - user5
⠀
⠀
```

``` title="False `Contains (partial)`"
firstValue:
  - user1
  - user2
  - user3
secondValue:
  - friend
  - james
  - wilhelm
  - frank
```

``` title="True `Contains (exact)`"
firstValue:
  - user1
  - user2
  - user3
secondValue:
  - user1
  - user2
  - user5
⠀
```

``` title="True `Contains (exact)`"
firstValue:
  - user1
  - user2
  - user3
  - user7
secondValue:
  - user1
  - user2
  - user7
```

``` title="True `Contains (exact)`"
firstValue:
  - user1
  - user2
  - user3
secondValue:
  - user1
  - user5
  - user8
⠀
```  

``` title="False `Contains (exact)`"
firstValue:
  - user1
  - user2
  - user3
secondValue:
  - use
  - friend
  - 1
  - 2
  - 3
``` 

</div>

### Custom values

The `second value` field allows some custom values. The available custom values are dependent on the type of `first value`.

| Action | Description | Types |
| ------------- |------------- | ------------- |
| Custom days | This behavior depends on the selected `action`. In case of `in_last` or `in_next`, this translates to 'in the last (or next) x days'. in case of `before` the value will be translated to the current date **subtracted** by the amount of `custom days`. In all other cases, the amount of days will be **added** to the current date | date  |
| Custom date | Takes a specific date | date |
| Custom number | Takes a specific number | number |
| Custom text | Takes a specific text | text |
| Custom text (list) | Takes a list in JSON format | ["Jef", "Frank", "Wilhelm"] |
