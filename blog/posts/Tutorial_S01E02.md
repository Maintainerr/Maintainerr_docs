---
date: 2024-03-25
title: Rule Creation (S01E02)
slug: rule-creation-s01e02
categories:
  - Tutorials
authors: [ydkmlt84]
---

**Let's go a little further into Rules with some simple examples to get you started.**

In episode 1 we went over a super basic outline of rules and sections, operators, and general rule setup. In today's episode we will go over some simple rule examples. You could set up a few AND rules and roll with it, but then you wouldn't be using Maintainerr to its full potential. This episode should give you a good base of rule knowledge to build off of.

<!-- truncate -->

Let's bring back the Movie from episode 1, that we wanted to add into our new collection.

![Tutorial poster](/img/movie_poster.png)

This movie has the following attributes across Plex, Overseerr, and Radarr:

**Plex**

| Added    | Last Viewed | Times Viewed | Audience Rating |
| -------- | ----------- | ------------ | --------------- |
| 3Nov2023 | 10Jan2024   | 4            | 7.3             |

**Overseerr**

| Requested by | Requested Date | Times Requested by Anyone |
| ------------ | -------------- | ------------------------- |
| user_girl123 | 2Nov2023       | 4                         |

**Radarr**

| Release Date | Is Monitored | Runtime     |
| ------------ | ------------ | ----------- |
| 31Oct2023    | True         | 114 minutes |

With this information, we have quite a few options that we can use as rule parameters and filters.

# Examples

## Simple Rule

- 1: We can use one rule that states `Plex-Date Added` `before` `amount of days` `60`.
  - This will match in our special tutorial scenario because the day the Movie was added to Plex happened 60 days or more "before" today's date.
- 2: We could use a rule that states `Plex-Times Viewed` `bigger` `number` `3`.
  - This would get added because it has a _Times Viewed_ value of 4, which is bigger than 3.
- 3: We could also use a rule that states `Plex-Audience Rating (scale 1-10)` `bigger` `number` `5`.
  - This rule would catch our movie because its _Audience Rating_ is 7.3, which is bigger than 5.

## Simple AND

- 1: We could add Rule 1 that states `Plex-Date Added` `before` `amount of days` `60`. Rule 2 then states AND `Plex-Times Viewed` `bigger` `number` `5`.
  - This would not catch our movie because it has a _Times Viewed_ value of 4 and we need it to match **(rule 1 AND rule 2)**. It does match rule 1 but it does not match rule 2. If another movie in the library was added 60 days ago or more **AND** it had a view count of more than 5, it **would** get added to this rule.

**Let's try one more.**

- 2: Rule 1 states `Plex-Times Viewed` `bigger` `number` `3`. Rule 2 states AND `Overseerr-Amount of Requests` `equals` `Plex-Times Viewed`.
  - This rule set **would** add our movie because its _Times Viewed_ amount is 4, which is bigger than 3, **AND** the _Amount of Requests_ from Overseerr equals the _Times Viewed_ amount from Plex: **(Rule 1 AND Rule 2)**.

Those are some fairly simple AND examples, and hopefully it is starting to become obvious what is going on. Within a _section_, and only using AND operators, each item also needs to match the rule before it to be counted as a match and added to the collection.

Another way to look at these examples is that within a _section_, each rule is making a list. The next rule is checking that list to see if anything also has that value, plus the value of its own rule.

### Visual Example

```mermaid
graph LR
title:>Rule-set: Rule1 AND Rule2]
   A([Has it been viewed in Plex more than 3 times?]) -->|Yes|B([AND is it monitored in Radarr?])
   B -->|Yes| C([Add it to the collection])
   B -->|No| D([Don't add to the collection.])
```

## Simple OR

We don't have to go too far in depth with this because of what we have already learned. We will just give a quick example, then a visual.

- 1: We can use one rule that states `Plex-Date Added` `before` `amount of days` `90`.
  - This will not match in our special tutorial scenario because the day the Movie was added to Plex happened only _60_ days before today's date. Not quite _90_ days yet.
- 2: Our next rule states OR `Overseerr-Requested by user (Plex or local username)` `Contains (Partial list match)` `text` `user_girl123`.
  - This would match because, as we can see, that is who requested the movie.
- 3: This rule set **would** add our movie because it meets one **OR** the other of our criteria. It was added _60_ days ago so it does not meet our criteria of _before 90 days_, but it did match the Overseerr requested-by-user rule. It gets added because we said we wanted **(Rule 1 OR Rule 2)**.

Now let's get a visual.

### Visual Example

```mermaid
graph LR
title:>Rule-set: Rule1 OR Rule2]
A([Was it added to Plex before 90 days?]) -->|No|B([Did it match one OR the other]);
C([Was it requested by user_girl123]) -->|Yes|B;
B -->|Yes|D([Add it to the collection]);
```

Again, I hope this is starting to come together. In our next episode we will go over the use of sections and when they can be useful. Stay tuned.
