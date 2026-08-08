export const SEARCH_ANIME_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: ANIME, isAdult: false, format_in: [TV, MOVIE], sort: [SEARCH_MATCH, POPULARITY_DESC]) {
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
        description(asHtml: false)
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
