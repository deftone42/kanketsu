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
