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
        genres
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
