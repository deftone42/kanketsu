// src/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.post("https://graphql.anilist.co", async ({ request }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await request.json()) as any;
    const { id } = body?.variables || {};

    if (id || body?.query?.includes("Media(")) {
      return HttpResponse.json({
        data: {
          Media: {
            id: 1,
            title: { userPreferred: "One Piece" },
            description: "Gol D. Roger was known as the Pirate King...",
            coverImage: {
              large:
                "https://s4.anilist.co/file/anilistcdn/media/anime/cover/small/bx21-ELSYx3yMPcKM.jpg",
            },
            startDate: { year: 1999 },
            averageScore: 88,
            episodes: 1000,
            status: "RELEASING",
          },
        },
      });
    }

    return HttpResponse.json({
      data: {
        Page: {
          media: [
            {
              id: 1,
              title: { userPreferred: "One Piece" },
              coverImage: {
                medium:
                  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/small/bx21-ELSYx3yMPcKM.jpg",
              },
              startDate: { year: 1999 },
              averageScore: 88,
            },
          ],
        },
      },
    });
  }),
];
