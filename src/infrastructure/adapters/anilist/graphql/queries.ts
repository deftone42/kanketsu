export const GET_ANIME_WITH_RELATIONS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        userPreferred
        english
        romaji
        native
      }
      coverImage {
        large
      }
      format
      episodes
      averageScore
      status
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      nextAiringEpisode {
        episode
        timeUntilAiring
      }
      relations {
        edges {
          relationType
          node {
            id
            format
            title {
              userPreferred
            }
          }
        }
      }
    }
  }
`;

export const SEARCH_ANIME_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: ANIME, isAdult: false, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
        id
        title {
          userPreferred
          english
          romaji
        }
        coverImage {
          medium
        }
        startDate {
          year
        }
        averageScore
        relations {
          edges {
            relationType
          }
        }
      }
    }
  }
`;

export const GET_ANIME_BY_ID_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        userPreferred
        english
        romaji
        native
      }
      coverImage {
        large
      }
      averageScore
      status
      episodes
      startDate {
        year
      }
      endDate {
        year
      }
      format
      nextAiringEpisode {
        episode
        timeUntilAiring
      }
      relations {
        edges {
          relationType
          node {
            id
            format
            status
            nextAiringEpisode {
              timeUntilAiring
            }
          }
        }
      }
    }
  }
`;

export const SEARCH_LATEST_BY_NAME_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 3) {
      media(search: $search, type: ANIME, isAdult: false, format_in: [TV, MOVIE], sort: [START_DATE_DESC, SEARCH_MATCH]) {
        id
        status
        format
        startDate {
          year
        }
        relations {
          edges {
            relationType
            node {
              id
              status
              format
              startDate {
                year
              }
              nextAiringEpisode {
                timeUntilAiring
              }
            }
          }
        }
      }
    }
  }
`;

export const SEARCH_FRANCHISE_MEDIA_QUERY = `
  query ($search: String) {
    Page(perPage: 50) {
      media(search: $search, type: ANIME, sort: [START_DATE]) {
        id
        title {
          userPreferred
          english
          romaji
          native
        }
        format
        episodes
        averageScore
        status
        startDate {
          year
        }
        endDate {
          year
        }
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
      }
    }
  }
`;

/**
 * Batched franchise fetch. Two properties make this cheap:
 *  - AniList shares one ID space across anime and manga, so omitting the
 *    `type` filter returns source works in the same request.
 *  - Rate limiting counts requests, not query complexity, so nesting
 *    `relations` three deep is free and collapses a linear chain from
 *    O(nodes) requests to roughly O(depth / 3).
 * Nested nodes carry a reduced projection: they are topology, not content.
 */
export const FRANCHISE_BATCH_QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids) {
        id
        type
        format
        status
        episodes
        chapters
        volumes
        averageScore
        title { userPreferred english romaji native }
        coverImage { large }
        startDate { year month day }
        endDate { year month day }
        nextAiringEpisode { episode timeUntilAiring }
        relations {
          edges {
            relationType
            node {
              id
              type
              format
              title { userPreferred }
              relations {
                edges {
                  relationType
                  node {
                    id
                    type
                    format
                    title { userPreferred }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
