import { http, HttpResponse } from "msw";
import attackOnTitan from "@/test/fixtures/anilist/attack-on-titan.json";

interface GraphQLRequestBody {
  query?: string;
  variables?: { ids?: number[]; search?: string; id?: number };
}

const SEARCH_RESPONSE = {
  data: {
    Page: {
      media: [
        {
          id: 16498,
          title: {
            userPreferred: "Shingeki no Kyojin",
            english: "Attack on Titan",
            romaji: "Shingeki no Kyojin",
          },
          coverImage: { medium: "https://example.test/cover.jpg" },
          startDate: { year: 2013 },
          averageScore: 84,
        },
      ],
    },
  },
};

export const handlers = [
  http.post("https://graphql.anilist.co", async ({ request }) => {
    const body = (await request.json()) as GraphQLRequestBody;

    if (body.query?.includes("id_in")) {
      return HttpResponse.json(attackOnTitan.response);
    }

    return HttpResponse.json(SEARCH_RESPONSE);
  }),
];
