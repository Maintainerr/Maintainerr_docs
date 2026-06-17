---
description: Definitions of each rule and what they do and are used for.
title: Rule Glossary
slug: /glossary
id: glossary
---

This glossary describes the available rules that can be used in Maintainerr.
Each rule contains the media type it applies to, the key and the data type of the returned value.

The key is used for identification in YAML rule files.

### Plex

#### Date added

:::info
The date when the Plex item was added to the server.

:::

- Key: Plex.addDate
- Availability: movies, shows, seasons, episodes
- Type: date

#### Viewed by (username)

:::info
List of Plex usernames who have viewed the Plex item.

:::

- Key: Plex.seenBy
- Availability: movies
- Type: text[]

#### Release date

:::info
The release date of the Plex item.

:::

- Key: Plex.releaseDate
- Availability: movies, shows, seasons, episodes
- Type: date

#### User rating (scale 1-10)

:::info
The user rating of the Plex item on a scale of 1 to 10.

Currently, only checks for the server owner's ratings.

:::

- Key: Plex.rating_user
- Availability: movies, shows, seasons, episodes
- Type: number

#### People involved

:::info
List of people involved in the Plex item. This includes actors, directors,..

:::

- Key: Plex.people
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Times viewed

:::info
The total number of completed viewing sessions across all Plex users. If the same user has watched the item multiple times, each session counts separately.

:::

- Key: Plex.viewCount
- Availability: movies
- Type: number

#### Present in amount of other collections

:::info
The number of collections the Plex item is present in. For seasons and episodes, this will **not** include the collections of the parent season and show.

:::

- Key: Plex.collections
- Availability: movies, shows, seasons, episodes
- Type: number

#### Last view date

:::info
The date when the Plex item was last viewed.

If the item has no recorded watch history, this value is simply missing.

If Plex watch history cannot be fetched at all, Maintainerr treats this value as unknown instead of assuming the item was never watched. In other words, a lookup failure is kept separate from a genuinely missing `lastViewedAt` value.

:::

- Key: Plex.lastViewedAt
- Availability: movies, shows, seasons, episodes
- Type: date

#### Is Watched

:::info
Indicates whether the Plex item has been watched. For TV libraries, this property is only available when the rule targets episodes.

:::

- Key: Plex.isWatched
- Availability: movies, episodes
- Type: boolean

#### Media file resolution (4k, 1080,..)

:::info
The resolution of the media file associated with the Plex item. Possibilities include 4k, 1080, 720, 480, 360, 240.

:::

- Key: Plex.fileVideoResolution
- Availability: movies
- Type: text

#### Media file bitrate

:::info
The bitrate of the media file associated with the Plex item.

:::

- Key: Plex.fileBitrate
- Availability: movies
- Type: number

#### Media file codec

:::info
The codec of the media file associated with the Plex item.

:::

- Key: Plex.fileVideoCodec
- Availability: movies
- Type: text

#### List of genres (Action, Adventure,..)

:::info
List of genres associated with the Plex item.

:::

- Key: Plex.genre
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Users that watched every episode

:::info
List of users who have watched every available episode of the Plex item. This rule is only available for shows.

:::

- Key: Plex.sw_allEpisodesSeenBy
- Availability: shows, seasons
- Type: text[]

#### Newest episode view date

:::info
The date when the newest episode of the Plex item was viewed. This rule is only available for shows.

:::

- Key: Plex.sw_lastWatched
- Availability: shows, seasons
- Type: date

#### Amount of available episodes

:::info
The total number of episodes available for the Plex item. This rule is only available for shows.

:::

- Key: Plex.sw_episodes
- Availability: shows, seasons
- Type: number

#### Amount of watched episodes

:::info
The number of episodes that have been watched for the Plex item. This rule is only available for shows and seasons.

:::

:::note
If an episode was marked as watched manually or via a separate tool, it will not be counted by this rule. Maintainerr can only track watch events through Plex sessions. Use "Amount of episodes marked as watched" for a show/season count that includes Plex's watched state, or "Is Watched" for movie/episode watched state.

:::

- Key: Plex.sw_viewedEpisodes
- Availability: shows, seasons
- Type: number

#### Amount of episodes marked as watched

:::info
The number of episodes Plex currently considers watched for the item. This includes episodes marked as watched manually, even when they have no Plex play history. This rule is only available for shows and seasons.

:::

- Key: Plex.sw_markedWatchedEpisodes
- Availability: shows, seasons
- Type: number

#### Last episode added at

:::info
The date when the last episode was added to the Plex item. This is not for the most recently aired episode of the show. Just the last episode that was added to Plex. This rule is only available for shows.

:::

- Key: Plex.sw_lastEpisodeAddedAt
- Availability: shows, seasons
- Type: date

#### Last episode aired at

:::info
The date when the newest episode added to Plex was originally aired. This is not for the most recently aired episode of the show. Just the last episode that was added to Plex. This rule is only available for shows.

:::

- Key: Plex.sw_lastEpisodeAiredAt
- Availability: shows, seasons
- Type: date

#### Last episode aired at (season)

:::info
The air date of the last episode in the season. Only available at the episode level.

:::

- Key: Plex.sw_seasonLastEpisodeAiredAt
- Availability: episodes
- Type: date

#### Total views

:::info
The total number of views for the Plex item. This rule is only available for shows.

:::

- Key: Plex.sw_amountOfViews
- Availability: shows, seasons, episodes
- Type: number

#### Users that watched at least one episode

:::info
List of users who have watched at least one episode of the Plex item. This rule is only available for shows.

:::

- Key: Plex.sw_watchers
- Availability: shows, seasons, episodes
- Type: text[]

#### Collections media is present in (titles)

:::info
List of collections that the Plex item is present in. For seasons and episodes, this will **not** include the collections of the parent season and show.

:::

:::note
Returned collection titles are trimmed. De-duplication is limited and varies by variant:

- `Collections media is present in (titles)` and `Collections media is present in (titles) (incl. parents)` do **not** de-duplicate, so a collection present at more than one level is returned once per level.
- `Collections media is present in (titles) (incl. smart collections)` and `Collections media is present in (titles) (incl. parents and smart collections)` de-duplicate titles that are identical **before** trimming, then trim. Titles that differ only by surrounding whitespace or only by capitalization remain separate entries.

As a result, the same collection can appear more than once in these lists, which matters when using `COUNT_*` comparators. Managed and manual collection exclusions are still matched case-insensitively, so a rule will not match an item only because of the collection it maintains.

:::

- Key: Plex.collection_names
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Present in amount of playlists

:::info
The number of playlists the Plex item is present in.

:::

- Key: Plex.playlists
- Availability: movies, shows, seasons, episodes
- Type: number

#### Playlists media is present in (titles)

:::info
List of playlists that the Plex item is present in.

:::

- Key: Plex.playlist_names
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Critics rating (scale 1-10)

:::info
The critics rating of the Plex item on a scale of 1 to 10. This will mostly include the rotten tomatoes critics rating.

:::

- Key: Plex.rating_critics
- Availability: movies, shows, seasons, episodes
- Type: number

#### Audience rating (scale 1-10)

:::info
The audience rating of the Plex item on a scale of 1 to 10. This will include the rotten tomatoes audience rating, or the imdb, tvdb, tmdb,.. rating. Depends on your server configuration.

:::

- Key: Plex.rating_audience
- Availability: movies, shows, seasons, episodes
- Type: number

#### Labels

:::info
List of labels associated with the Plex item.

:::

- Key: Plex.labels
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Watchlisted by (username)

:::info
List of Plex users that have the item in their watchlist. Maintainerr scans all users returned by the Plex server account list for this lookup, not only the current user, and there is currently no per-user exclude option. Private watchlists can produce expected warnings because they are not visible to Maintainerr. This rule depends on Plex cloud services such as `plex.tv` and `community.plex.tv`, is experimental, and might be more fragile than purely local metadata rules. Plex only.

:::

- Key: Plex.watchlist_isListedByUsers
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Is Watchlisted

:::info
Indicates whether the item is on any Plex user's watchlist. Maintainerr checks all users returned by the Plex server account list for this lookup, not only the current user, and there is currently no per-user exclude option. Private watchlists can produce expected warnings because they are not visible to Maintainerr. This rule depends on Plex cloud services such as `plex.tv` and `community.plex.tv`, not only the local Plex server. Plex only.

:::

- Key: Plex.watchlist_isWatchlisted
- Availability: movies, shows, seasons, episodes
- Type: boolean

#### Present in amount of other collections (incl. parents)

:::info
The number of collections the Plex item is present in. This will also include collections the parent season and/or show is present in.

:::

- Key: Plex.sw_collections_including_parent
- Availability: seasons, episodes
- Type: number

#### Collections media is present in (titles) (incl. parents)

:::info
List of collections that the Plex item is present in. This will also include collections the parent season and/or show is present in.

:::

- Key: Plex.sw_collection_names_including_parent
- Availability: seasons, episodes
- Type: text[]

#### IMDb rating (scale 1-10)

:::info
The IMDb rating of the Plex item on a scale of 1 to 10. You can override this with a rating from a different source by using [Kometa](https://kometa.wiki/en/latest/kometa/guides/ratings/). Plex only.

:::

- Key: Plex.rating_imdb
- Availability: movies, shows, episodes
- Type: number

#### IMDb rating (show) (scale 1-10)

:::info
The IMDb rating of the parent show on a scale of 1 to 10. Useful when evaluating seasons or episodes. Plex only.

:::

- Key: Plex.rating_imdbShow
- Availability: seasons, episodes
- Type: number

#### RottenTomatoes critic rating (scale 1-10)

:::info
The Rotten Tomatoes critic rating of the Plex item on a scale of 1 to 10. You can override this with a rating from a different source by using [Kometa](https://kometa.wiki/en/latest/kometa/guides/ratings/).

:::

- Key: Plex.rating_rottenTomatoesCritic
- Availability: movies, shows, episodes
- Type: number

#### RottenTomatoes critic rating (show) (scale 1-10)

:::info
The Rotten Tomatoes critic rating of the parent show on a scale of 1 to 10. Useful when evaluating seasons or episodes.

:::

- Key: Plex.rating_rottenTomatoesCriticShow
- Availability: seasons, episodes
- Type: number

#### RottenTomatoes audience rating (scale 1-10)

:::info
The Rotten Tomatoes audience rating of the Plex item on a scale of 1 to 10. You can override this with a rating from a different source by using [Kometa](https://kometa.wiki/en/latest/kometa/guides/ratings/).

:::

- Key: Plex.rating_rottenTomatoesAudience
- Availability: movies, shows, episodes
- Type: number

#### RottenTomatoes audience rating (show) (scale 1-10)

:::info
The Rotten Tomatoes audience rating of the parent show on a scale of 1 to 10. Useful when evaluating seasons or episodes.

:::

- Key: Plex.rating_rottenTomatoesAudienceShow
- Availability: seasons, episodes
- Type: number

#### The Movie Database rating (scale 1-10)

:::info
The Movie Database rating of the Plex item on a scale of 1 to 10. You can override this with a rating from a different source by using [Kometa](https://kometa.wiki/en/latest/kometa/guides/ratings/).

:::

- Key: Plex.rating_tmdb
- Availability: movies, shows, episodes
- Type: number

#### The Movie Database rating (show) (scale 1-10)

:::info
The Movie Database rating of the parent show on a scale of 1 to 10. Useful when evaluating seasons or episodes.

:::

- Key: Plex.rating_tmdbShow
- Availability: seasons, episodes
- Type: number

#### Present in amount of other collections (incl. smart collections)

:::info
The number of collections the Plex item is present in, including Plex smart collections. Plex only.

:::

- Key: Plex.collectionsIncludingSmart
- Availability: movies, shows, seasons, episodes
- Type: number

#### Present in amount of other collections (incl. parents and smart collections)

:::info
The number of collections the Plex item is present in, including parent collections and smart collections. Plex only.

:::

- Key: Plex.sw_collections_including_parent_and_smart
- Availability: seasons, episodes
- Type: number

#### Collections media is present in (titles) (incl. parents and smart collections)

:::info
List of collection titles the Plex item is present in, including parent collections and smart collections. Plex only.

:::

- Key: Plex.sw_collection_names_including_parent_and_smart
- Availability: seasons, episodes
- Type: text[]

#### Collections media is present in (titles) (incl. smart collections)

:::info
List of collection titles the Plex item is present in, including smart collections. Plex only.

:::

- Key: Plex.collection_names_including_smart
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Newest view date across collection

:::info
The newest `lastViewedAt` value across all movies that share a Plex collection with the current movie. This is useful when you want one recently watched movie to protect the rest of a collection.

:::

- Key: Plex.collection_siblings_lastViewedAt
- Availability: movies
- Type: date

---

### Jellyfin

:::note
Jellyfin shares many rule properties with Plex, and Emby mirrors Jellyfin's rule-property set. When switching between Plex, Jellyfin, and Emby, compatible rules are automatically migrated. Jellyfin and Emby do not support native watchlists or smart collections.

If Streamystats is configured on a Jellyfin server, Maintainerr also exposes separate Jellyfin-only Streamystats watchlist rules.

:::

#### Date added

:::info
The date when the Jellyfin item was added to the server.

:::

- Key: Jellyfin.addDate
- Availability: movies, shows, seasons, episodes
- Type: date

#### Viewed by (username)

:::info
List of Jellyfin usernames who have viewed the item.

:::

- Key: Jellyfin.seenBy
- Availability: movies
- Type: text[]

#### Release date

:::info
The release date of the Jellyfin item.

:::

- Key: Jellyfin.releaseDate
- Availability: movies, shows, seasons, episodes
- Type: date

#### User rating (scale 1-10)

:::info
The user rating of the Jellyfin item on a scale of 1 to 10.

:::

- Key: Jellyfin.rating_user
- Availability: movies, shows, seasons, episodes
- Type: number

#### People involved

:::info
List of people involved in the Jellyfin item. This includes actors, directors,..

:::

- Key: Jellyfin.people
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Times viewed

:::info
The number of users who have **completed** watching the item. In Jellyfin, this corresponds to the number of users who have `Played=true` for the item.

:::

- Key: Jellyfin.viewCount
- Availability: movies
- Type: number

#### Total play attempts (including unfinished)

:::info
The total number of play attempts for the item, including plays that were abandoned before completion. See [playCount vs viewCount](#jellyfin-playcount-vs-viewcount) for details.

:::

- Key: Jellyfin.playCount
- Availability: movies
- Type: number

#### Total play attempts - shows (including unfinished)

:::info
The total number of play attempts for the episode, including plays that were abandoned before completion.

:::

- Key: Jellyfin.sw_playCount
- Availability: episodes
- Type: number

#### Present in amount of other collections

:::info
The number of collections the Jellyfin item is present in. For seasons and episodes, this will **not** include the collections of the parent season and show.

:::

- Key: Jellyfin.collections
- Availability: movies, shows, seasons, episodes
- Type: number

#### Last view date

:::info
The date when the Jellyfin item was last viewed.

If the item has no recorded watch history, this value is simply missing.

If Jellyfin watch history cannot be fetched at all, Maintainerr treats this value as unknown instead of assuming the item was never watched. In other words, a lookup failure is kept separate from a genuinely missing `lastViewedAt` value.

:::

- Key: Jellyfin.lastViewedAt
- Availability: movies, shows, seasons, episodes
- Type: date

#### Is Watched

:::info
Indicates whether the Jellyfin item has been watched. For TV libraries, this property is only available when the rule targets episodes.

:::

- Key: Jellyfin.isWatched
- Availability: movies, episodes
- Type: boolean

#### Media file resolution (4k, 1080,..)

:::info
The resolution of the media file associated with the Jellyfin item.

:::

- Key: Jellyfin.fileVideoResolution
- Availability: movies
- Type: text

#### Media file bitrate

:::info
The bitrate of the media file associated with the Jellyfin item.

:::

- Key: Jellyfin.fileBitrate
- Availability: movies
- Type: number

#### Media file codec

:::info
The codec of the media file associated with the Jellyfin item.

:::

- Key: Jellyfin.fileVideoCodec
- Availability: movies
- Type: text

#### List of genres (Action, Adventure,..)

:::info
List of genres associated with the Jellyfin item.

:::

- Key: Jellyfin.genre
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Users that watched every episode

:::info
List of users who have watched every available episode of the Jellyfin item.

:::

- Key: Jellyfin.sw_allEpisodesSeenBy
- Availability: shows, seasons
- Type: text[]

#### Newest episode view date

:::info
The date when the newest episode of the Jellyfin item was viewed.

:::

- Key: Jellyfin.sw_lastWatched
- Availability: shows, seasons
- Type: date

#### Amount of available episodes

:::info
The total number of episodes available for the Jellyfin item.

:::

- Key: Jellyfin.sw_episodes
- Availability: shows, seasons
- Type: number

#### Amount of watched episodes

:::info
The number of episodes that have been watched for the Jellyfin item.

:::

:::note
On Jellyfin — and on Emby, which mirrors Jellyfin's rule-property set — this rule already uses watched state and includes manual watched marks, so there is no separate `Jellyfin.sw_markedWatchedEpisodes` rule.

:::

- Key: Jellyfin.sw_viewedEpisodes
- Availability: shows, seasons
- Type: number

#### Last episode added at

:::info
The date when the last episode was added to the Jellyfin item.

:::

- Key: Jellyfin.sw_lastEpisodeAddedAt
- Availability: shows, seasons
- Type: date

#### Last episode aired at

:::info
The original air date of the last episode added to Jellyfin.

:::

- Key: Jellyfin.sw_lastEpisodeAiredAt
- Availability: shows, seasons
- Type: date

#### Last episode aired at (season)

:::info
The air date of the last episode in the season. Only available at the episode level.

:::

- Key: Jellyfin.sw_seasonLastEpisodeAiredAt
- Availability: episodes
- Type: date

#### Total views

:::info
The total number of views for the Jellyfin item. This rule is only available for shows.

:::

- Key: Jellyfin.sw_amountOfViews
- Availability: shows, seasons, episodes
- Type: number

#### Users that watched at least one episode

:::info
List of users who have watched at least one episode of the Jellyfin item. This rule is only available for shows.

:::

- Key: Jellyfin.sw_watchers
- Availability: shows, seasons, episodes
- Type: text[]

#### Collections media is present in (titles)

:::info
List of collections that the Jellyfin item is present in. For seasons and episodes, this will **not** include the collections of the parent season and show.

:::

:::note
Returned collection titles are trimmed. The `incl. parents` variant additionally de-duplicates on the trimmed title, so identical titles (including ones differing only by surrounding whitespace) collapse, while titles that differ only by capitalization remain separate. Managed and manual collection exclusions are still matched case-insensitively, so a rule will not match an item only because of the collection it maintains. Emby follows the same behavior.

:::

- Key: Jellyfin.collection_names
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Present in amount of playlists

:::info
The number of playlists the Jellyfin item is present in.

:::

- Key: Jellyfin.playlists
- Availability: movies, shows, seasons, episodes
- Type: number

#### Playlists media is present in (titles)

:::info
List of playlists that the Jellyfin item is present in.

:::

- Key: Jellyfin.playlist_names
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Critics rating (scale 1-10)

:::info
The critics rating of the Jellyfin item on a scale of 1 to 10. Typically sourced from the Rotten Tomatoes Tomatometer via the OMDb provider.

:::

- Key: Jellyfin.rating_critics
- Availability: movies, shows, seasons, episodes
- Type: number

#### Audience rating (scale 1-10)

:::info
The audience rating of the Jellyfin item on a scale of 1 to 10. Typically sourced from TMDb's CommunityRating.

:::

- Key: Jellyfin.rating_audience
- Availability: movies, shows, seasons, episodes
- Type: number

#### Tags

:::info
List of tags associated with the Jellyfin item. Equivalent to Plex's Labels.

:::

- Key: Jellyfin.labels
- Availability: movies, shows, seasons, episodes
- Type: text[]

#### Present in amount of other collections (incl. parents)

:::info
The number of collections the Jellyfin item is present in, including parent collections.

:::

- Key: Jellyfin.sw_collections_including_parent
- Availability: seasons, episodes
- Type: number

#### Collections media is present in (titles) (incl. parents)

:::info
List of collection titles the Jellyfin item is present in, including parent collections.

:::

- Key: Jellyfin.sw_collection_names_including_parent
- Availability: seasons, episodes
- Type: text[]

#### Newest view date across collection

:::info
The newest `lastViewedAt` value across all movies that share a Jellyfin collection with the current movie. This is useful when you want one recently watched movie to protect the rest of a collection.

:::

- Key: Jellyfin.collection_siblings_lastViewedAt
- Availability: movies
- Type: date

#### RottenTomatoes critic rating (scale 1-10)

:::info
The Rotten Tomatoes critic rating on a scale of 1 to 10. Sourced from Jellyfin's CriticRating (typically from the OMDb provider).

:::

- Key: Jellyfin.rating_rottenTomatoesCritic
- Availability: movies, shows, episodes
- Type: number

#### RottenTomatoes audience rating (scale 1-10)

:::info
The Rotten Tomatoes audience rating on a scale of 1 to 10.

:::

- Key: Jellyfin.rating_rottenTomatoesAudience
- Availability: movies, shows, episodes
- Type: number

#### The Movie Database rating (scale 1-10)

:::info
The Movie Database (TMDb) rating on a scale of 1 to 10. Sourced from Jellyfin's CommunityRating.

:::

- Key: Jellyfin.rating_tmdb
- Availability: movies, shows, episodes
- Type: number

#### IMDb rating (scale 1-10)

:::info
The IMDb rating on a scale of 1 to 10, when that metadata is available from your Jellyfin providers.

:::

- Key: Jellyfin.rating_imdb
- Availability: movies, shows, episodes
- Type: number

#### IMDb rating (show) (scale 1-10)

:::info
The IMDb rating of the parent show on a scale of 1 to 10.

:::

- Key: Jellyfin.rating_imdbShow
- Availability: seasons, episodes
- Type: number

#### RottenTomatoes critic rating (show) (scale 1-10)

:::info
The Rotten Tomatoes critic rating of the parent show on a scale of 1 to 10.

:::

- Key: Jellyfin.rating_rottenTomatoesCriticShow
- Availability: seasons, episodes
- Type: number

#### RottenTomatoes audience rating (show) (scale 1-10)

:::info
The Rotten Tomatoes audience rating of the parent show on a scale of 1 to 10.

:::

- Key: Jellyfin.rating_rottenTomatoesAudienceShow
- Availability: seasons, episodes
- Type: number

#### The Movie Database rating (show) (scale 1-10)

:::info
The Movie Database rating of the parent show on a scale of 1 to 10.

:::

- Key: Jellyfin.rating_tmdbShow
- Availability: seasons, episodes
- Type: number

#### Favorited by (username)

:::info
List of Jellyfin usernames who have marked the item as a favorite. Jellyfin only.

:::

- Key: Jellyfin.favoritedBy
- Availability: movies
- Type: text[]

#### Favorited by (username) - shows

:::info
List of Jellyfin usernames who have marked the current item (show, season, or episode) as a favorite. Does not check parent items. Jellyfin only.

:::

- Key: Jellyfin.sw_favoritedBy
- Availability: shows, seasons, episodes
- Type: text[]

#### Favorited by (username) (incl. parents) - shows

:::info
List of Jellyfin usernames who have marked the current item or its parent items (show, season, or episode) as a favorite. Jellyfin only.

:::

- Key: Jellyfin.sw_favoritedBy_including_parent
- Availability: seasons, episodes
- Type: text[]

#### Jellyfin: playCount vs viewCount

:::tip Understanding playCount vs viewCount

| Property    | What it counts                                |
| ----------- | --------------------------------------------- |
| `viewCount` | Users who **completed** watching              |
| `playCount` | Total **play attempts** (including abandoned) |

**Example:** A movie has `PlayCount=2, Played=false` in Jellyfin:

- `playCount = 2`
- `viewCount = 0`

**Useful Rule - Movies started but never finished:**

```text
playCount >= 1 AND viewCount = 0
```

:::

---

### Radarr

#### Date added

:::info
The date when the Radarr item was added.

:::

- Key: Radarr.addDate
- Availability: movies
- Type: date

#### Tags

:::info
List of tags associated with the Radarr item.

:::

- Key: Radarr.tags
- Availability: movies
- Type: text[]

#### Quality profile

:::info
The quality profile of the Radarr item.

:::

- Key: Radarr.profile
- Availability: movies
- Type: text

#### Release date

:::info
The release date of the Radarr item.

:::

- Key: Radarr.releaseDate
- Availability: movies
- Type: date

#### Is monitored

:::info
Indicates whether the Radarr item is monitored.

:::

- Key: Radarr.monitored
- Availability: movies
- Type: boolean

#### In cinemas date

:::info
The date when the Radarr item was released in cinemas.

:::

- Key: Radarr.inCinemas
- Availability: movies
- Type: date

#### File - size in MB

:::info
The size of the file associated with the Radarr item in megabytes.

:::

- Key: Radarr.fileSize
- Availability: movies
- Type: number

#### File - audio channels

:::info
The number of audio channels of the file associated with the Radarr item.

:::

- Key: Radarr.fileAudioChannels
- Availability: movies
- Type: number

#### File - audio languages

:::info
The audio languages present in the file associated with the Radarr item.

:::

- Key: Radarr.fileAudioLanguages
- Availability: movies
- Type: text

#### File - quality (2160, 1080,..)

:::info
The quality resolution of the file associated with the Radarr item.

:::

- Key: Radarr.fileQuality
- Availability: movies
- Type: number

#### File - quality name

:::info
The quality profile name of the file associated with the Radarr item (e.g. "Bluray-1080p").

:::

- Key: Radarr.fileQualityName
- Availability: movies
- Type: text

#### File - quality cutoff met

:::info
Indicates whether the file quality meets the cutoff defined in the quality profile.

:::

- Key: Radarr.fileQualityCutoffMet
- Availability: movies
- Type: boolean

#### File - download date

:::info
The date when the file associated with the Radarr item was downloaded.

:::

- Key: Radarr.fileDate
- Availability: movies
- Type: date

#### File - runtime in minutes

:::info
The runtime of the file associated with the Radarr item in minutes.

:::

- Key: Radarr.runTime
- Availability: movies
- Type: number

#### File - file path

:::info
The path of the file associated with the Radarr item. When using Docker, this will be the path inside the container.

:::

- Key: Radarr.filePath
- Availability: movies
- Type: text

#### Original language

:::info
The original language of the Radarr item.

:::

- Key: Radarr.originalLanguage
- Availability: movies
- Type: text

#### Rotten Tomatoes rating (scale 0-100)

:::info
The Rotten Tomatoes rating of the Radarr item on a scale of 0 to 100.

:::

- Key: Radarr.rottenTomatoesRating
- Availability: movies
- Type: number

#### Rotten Tomatoes rating vote count

:::info
The number of votes for the Rotten Tomatoes rating.

:::

- Key: Radarr.rottenTomatoesRatingVotes
- Availability: movies
- Type: number

#### Trakt rating (scale 0-10)

:::info
The Trakt rating of the Radarr item on a scale of 0 to 10.

:::

- Key: Radarr.traktRating
- Availability: movies
- Type: number

#### Trakt rating vote count

:::info
The number of votes for the Trakt rating.

:::

- Key: Radarr.traktRatingVotes
- Availability: movies
- Type: number

#### IMDb rating (scale 0-10)

:::info
The IMDb rating of the Radarr item on a scale of 0 to 10.

:::

- Key: Radarr.imdbRating
- Availability: movies
- Type: number

#### IMDb rating vote count

:::info
The number of votes for the IMDb rating.

:::

- Key: Radarr.imdbRatingVotes
- Availability: movies
- Type: number

#### Remaining disk space (GB)

:::info
The remaining disk space on the selected Radarr root folder in gigabytes. When you use this rule in the UI, Maintainerr lets you choose which Radarr path to check.

:::

- Key: Radarr.diskspace_remaining_gb
- Availability: movies
- Type: number

#### Total disk space (GB)

:::info
The total disk space on the selected Radarr root folder in gigabytes. When you use this rule in the UI, Maintainerr lets you choose which Radarr path to check.

:::

- Key: Radarr.diskspace_total_gb
- Availability: movies
- Type: number

---

### Sonarr

:::info
If a show is not tracked in Sonarr, Maintainerr can still fall back to your configured metadata provider(s) for `Sonarr.ended` and the show-level values of `Sonarr.firstAirDate` and `Sonarr.seasons`.

Source-dependent values such as `Sonarr.status`, `Sonarr.originalLanguage`, and `Sonarr.rating`, along with Sonarr-only state like monitoring, tags, paths, and disk usage, remain unavailable until the series is tracked in Sonarr.

:::

#### Date added

:::info
The date when the Sonarr item was added.

:::

- Key: Sonarr.addDate
- Availability: shows
- Type: date

#### Files - Disk size in MB

:::info
The disk size of the entire show, season or episode in megabytes.

:::

- Key: Sonarr.diskSizeEntireShow
- Availability: shows, seasons, episodes
- Type: number

#### Tags (show)

:::info
List of tags associated with the Sonarr item.

:::

- Key: Sonarr.tags
- Availability: shows, seasons, episodes
- Type: text[]

#### Quality profile name

:::info
The name of the quality profile assigned to the Sonarr item.

:::

- Key: Sonarr.qualityProfileName
- Availability: shows, seasons, episodes
- Type: text

#### Quality profile ID

:::info
The quality profile ID of the Sonarr item.

:::

- Key: Sonarr.qualityProfileId
- Availability: shows, seasons, episodes
- Type: number

#### First air date

:::info
The first air date of the Sonarr item.

:::

- Key: Sonarr.firstAirDate
- Availability: shows, seasons, episodes
- Type: date

#### Number of seasons / episodes (also unavailable)

:::info
The number of seasons or episodes for the Sonarr item. This will also count the unavailable episodes.

:::

- Key: Sonarr.seasons
- Availability: shows, seasons
- Type: number

#### Status (continuing, ended)

:::info
The status of the Sonarr item.

:::

- Key: Sonarr.status
- Availability: shows, seasons
- Type: text

#### Show ended

:::info
Indicates whether the Sonarr show has ended.

:::

- Key: Sonarr.ended
- Availability: shows, seasons
- Type: boolean

#### Is monitored

:::info
Indicates whether the Sonarr item is monitored.

:::

- Key: Sonarr.monitored
- Availability: shows, seasons, episodes
- Type: boolean

#### Has unaired episodes

:::info
Indicates whether the Sonarr show/season has unaired episodes.

:::

- Key: Sonarr.unaired_episodes
- Availability: shows, seasons
- Type: boolean

#### Number of monitored seasons / episodes

:::info
The number of monitored seasons or episodes for the Sonarr item.

:::

- Key: Sonarr.seasons_monitored
- Availability: shows, seasons
- Type: number

#### Season has unaired episodes

:::info
Indicates whether the Sonarr season has unaired episodes.

:::

- Key: Sonarr.unaired_episodes_season
- Availability: episodes
- Type: boolean

#### Is (part of) latest aired/airing season

:::info
Indicates whether the Sonarr item is part of the latest aired or airing season.

:::

- Key: Sonarr.part_of_latest_season
- Availability: seasons, episodes
- Type: boolean

#### Base file path (show)

:::info
The base path on disk of the file associated with the Sonarr item. When using Docker, this will be the path inside the container.

:::

- Key: Sonarr.filePath
- Availability: shows, seasons, episodes
- Type: text

#### Original language

:::info
The original language of the Sonarr item.

:::

- Key: Sonarr.originalLanguage
- Availability: shows, seasons, episodes
- Type: text

#### Has season finale episode

:::info
Indicates whether an episode with the season finale label is available on disk.

:::

- Key: Sonarr.seasonFinale
- Availability: seasons
- Type: boolean

#### Has series finale episode

:::info
Indicates whether an episode with the series finale label is available on disk.

:::

- Key: Sonarr.seriesFinale
- Availability: shows, seasons
- Type: boolean

#### Season number

:::info
The season number of the Sonarr item.

:::

- Key: Sonarr.seasonNumber
- Availability: seasons, episodes
- Type: number

#### Show rating (IMDb) (scale 0-10)

:::info
The IMDb rating of the Sonarr item.

:::

- Key: Sonarr.rating
- Availability: shows, seasons, episodes
- Type: number

#### Show rating (IMDb) vote count

:::info
The IMDb vote count of the Sonarr item.

:::

- Key: Sonarr.ratingVotes
- Availability: shows, seasons, episodes
- Type: number

#### Episode file path

:::info
The file path of the episode on disk. When using Docker, this will be the path inside the container.

:::

- Key: Sonarr.episodeFilePath
- Availability: episodes
- Type: text

#### Episode number

:::info
The episode number within its season.

:::

- Key: Sonarr.episodeNumber
- Availability: episodes
- Type: number

#### Episode file quality cutoff met

:::info
Indicates whether the episode file quality meets the cutoff defined in the quality profile.

:::

- Key: Sonarr.fileQualityCutoffMet
- Availability: episodes
- Type: boolean

#### Episode file quality

:::info
The quality profile name of the episode file (e.g. "HDTV-720p").

:::

- Key: Sonarr.fileQualityName
- Availability: episodes
- Type: text

#### Episode file audio languages

:::info
The audio languages present in the episode file.

:::

- Key: Sonarr.fileAudioLanguages
- Availability: episodes
- Type: text

#### Series type

:::info
The series type as configured in Sonarr (e.g. "standard", "anime", "daily").

:::

- Key: Sonarr.seriesType
- Availability: shows, seasons, episodes
- Type: text

#### Remaining disk space (GB)

:::info
The remaining disk space on the selected Sonarr root folder in gigabytes. When you use this rule in the UI, Maintainerr lets you choose which Sonarr path to check.

:::

- Key: Sonarr.diskspace_remaining_gb
- Availability: shows, seasons, episodes
- Type: number

#### Total disk space (GB)

:::info
The total disk space on the selected Sonarr root folder in gigabytes. When you use this rule in the UI, Maintainerr lets you choose which Sonarr path to check.

:::

- Key: Sonarr.diskspace_total_gb
- Availability: shows, seasons, episodes
- Type: number

#### Number of missing episodes in season

:::info
The number of missing episodes in the current season.

:::

- Key: Sonarr.missing_episodes_season
- Availability: seasons, episodes
- Type: number

#### Number of missing episodes in show

:::info
The total number of missing episodes across the current show.

:::

- Key: Sonarr.missing_episodes_show
- Availability: shows, seasons, episodes
- Type: number

---

### Seerr

#### Requested by user

:::info
The username of the user who requested the media in Seerr. Supports Plex, Jellyfin, Emby, and local usernames.

:::

- Key: Seerr.addUser
- Availability: movies, shows, seasons, episodes
- Type: text

#### Request date

:::info
The date when the media was requested in Seerr.

:::

- Key: Seerr.requestDate
- Availability: movies, shows, seasons, episodes
- Type: date

#### Release/air date

:::info
The release or air date of the media in Seerr.

:::

- Key: Seerr.releaseDate
- Availability: movies, shows, seasons, episodes
- Type: date

#### Approval date

:::info
The date when the media request was approved in Seerr.

:::

- Key: Seerr.approvalDate
- Availability: movies, shows, seasons, episodes
- Type: date

#### Media downloaded date

:::info
The date when the media was downloaded in Seerr.

:::

- Key: Seerr.mediaAddedAt
- Availability: movies, shows, seasons, episodes
- Type: date

#### Amount of requests

:::info
The total number of requests for the media in Seerr.

:::

- Key: Seerr.amountRequested
- Availability: movies, shows, seasons, episodes
- Type: number

#### Requested in Seerr

:::info
Indicates whether the media was requested in Seerr.

:::

- Key: Seerr.isRequested
- Availability: movies, shows, seasons, episodes
- Type: boolean

---

### Tautulli

#### Viewed by (username)

:::info
List of Plex usernames who have viewed (according to Tautulli) the Plex item. The percentage for the item to be considered as viewed is configured in the Tautulli settings.

:::

- Key: Tautulli.seenBy
- Availability: movies
- Type: text[]

#### Users that watched every episode

:::info
List of users who have watched (according to Tautulli) every available episode of the Plex item. The percentage for an episode to be considered as viewed is configured in the Tautulli settings.

:::

- Key: Tautulli.sw_allEpisodesSeenBy
- Availability: shows, seasons
- Type: text[]

#### Users that watched at least one episode

:::info
List of users who have watched (according to Tautulli) at least one episode of the Plex item. The percentage for an episode to be considered as viewed is configured in the Tautulli settings. This rule is only available for shows.

:::

- Key: Tautulli.sw_watchers
- Availability: shows, seasons, episodes
- Type: text[]

#### Date added

:::info
The date when the Plex item was added to the server.

:::

- Key: Tautulli.addDate
- Availability: movies, shows, seasons, episodes
- Type: date

#### Times viewed

:::info
The number of times the Plex item has been viewed (according to Tautulli). The percentage for the Plex item to be considered as viewed is configured in the Tautulli settings.

:::

- Key: Tautulli.viewCount
- Availability: movies
- Type: number

#### Total views

:::info
The total number of views (according to Tautulli) for the Plex item. The percentage for an episode to be considered as viewed is configured in the Tautulli settings. This rule is only available for shows.

:::

- Key: Tautulli.sw_amountOfViews
- Availability: shows, seasons, episodes
- Type: number

#### Last view date

:::info
The date when the Plex item was last viewed (according to Tautulli). The percentage for the Plex item to be considered as viewed is configured in the Tautulli settings.

:::

- Key: Tautulli.lastViewedAt
- Availability: movies, shows, seasons, episodes
- Type: date

#### Amount of watched episodes

:::info
The number of episodes that have been watched (according to Tautulli) for the Plex item. The percentage for an episode to be considered as viewed is configured in the Tautulli settings. This rule is only available for shows.

:::

- Key: Tautulli.sw_viewedEpisodes
- Availability: shows, seasons
- Type: number

#### Newest episode view date

:::info
The date when the newest episode of the Plex item was viewed (according to Tautulli). The percentage for an episode to be considered as viewed is configured in the Tautulli settings. This rule is only available for shows.

:::

- Key: Tautulli.sw_lastWatched
- Availability: shows, seasons
- Type: date

---

### Streamystats

:::note
Streamystats is only available when Jellyfin is the active media server, and these rule properties only appear when Streamystats is configured. Maintainerr authenticates to Streamystats with your Jellyfin API key, so only public Streamystats watchlists are visible to these rules. Maintainerr rebuilds that public-watchlist membership snapshot for each rule-group run and reuses it across items during that run.

:::

#### Is in a watchlist

:::info
Indicates whether the item is present in at least one public Streamystats watchlist.

If Maintainerr cannot fetch the current public-watchlist snapshot, this rule is treated as unknown for that evaluation instead of `false`.

:::

- Key: Streamystats.isInWatchlist
- Availability: movies, shows, seasons, episodes
- Type: boolean

#### In watchlist of (username)

:::info
List of Streamystats usernames whose public watchlists contain the item.

If the item is not present in any public Streamystats watchlist, this returns an empty list. If Maintainerr cannot resolve the watchlist owners back to Jellyfin users, this rule is treated as unknown for that evaluation instead of returning an empty list.

:::

- Key: Streamystats.watchlistedByUsers
- Availability: movies, shows, seasons, episodes
- Type: text[]
