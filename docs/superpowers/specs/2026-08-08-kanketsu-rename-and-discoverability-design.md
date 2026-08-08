# Kanketsu: rename + descubrimiento

Fecha: 2026-08-08
Estado: decidido, sin implementar

## Decisión

Renombrar la app de **AniTime** a **Kanketsu** (完結, "conclusión" — la etiqueta que
usan las editoriales japonesas para una obra completa). El concepto es el corazón del
scoring: una historia cerrada es la única vía al 100.

El repo, el paquete npm y el proyecto de Vercel **no** se renombran. Solo cambia el
nombre visible del producto.

## Por qué, y qué se asume

Motivos originales para cambiar de AniTime, revisados durante la discusión:

| Motivo alegado | Veredicto |
| --- | --- |
| "Suena a AniList" | Descartado — `ani-` es el prefijo genérico del nicho (AniDB, AniChart, AniWave), no de AniList. |
| "Poco semántico" | Descartado — `time` es exactamente el eje del producto ("¿es ahora el momento?"). |
| "Poco único, colisiona en Google" | Real. Es el único motivo que sostiene el cambio. |

Kanketsu se elige asumiendo conscientemente sus costes:

- **No es tecleable de memoria** por un público occidental (kanketsu / kanketzu / kankestu).
- **No señala la categoría ni la función.** Se compensa en el `<title>`, no en el nombre.
- A cambio: campo libre como entidad en Google, techo de marca alto, y señal cultural
  para el público objetivo (una palabra japonesa comunica "anime" a un aficionado).

Alternativa considerada y descartada: **WaitOrWatch**. Mejor recuperación y semántica
directa, pero no señala anime y colisiona con el modismo inglés "wait and watch".

## Alcance del rename

`src/site-config.ts` centraliza la mayor parte. Puntos con el nombre incrustado:

- `src/site-config.ts` — `name`, `url`, `title`
- `src/app/page.tsx` — footer
- `src/components/ScoreCard.tsx` — "AniTime Watching Score"
- `src/components/ScoringGuide.tsx` — varias menciones en copy, incluido el encabezado
  "How AniTime decides"
- `src/app/__tests__/page.test.tsx` — asserts sobre "How AniTime decides"
- `src/infrastructure/adapters/anilist/anilist-graphql-repository.ts` — `User-Agent`
- `src/scripts/record-fixtures.ts` — `User-Agent`
- `README.md`

## Descubrimiento: el problema real

Hoy existe **una sola ruta** (`src/app/page.tsx`) y su contenido se genera en cliente
tras la búsqueda del usuario. No hay contenido sobre ningún anime en el HTML servido.
`robots.ts` y `sitemap.ts` existen, pero apuntan a una página vacía.

Con un nombre opaco como Kanketsu, las búsquedas de marca no van a existir. El único
canal viable es contenido posicionando por long-tail: *"should I start One Piece now"*,
*"is Chainsaw Man finished"*. Eso exige una página por franquicia.

### Trabajo pendiente, por orden

1. **Rename a Kanketsu** — aislado y barato.
2. **Dominio propio** apuntando al proyecto de Vercel, en lugar de
   `anitime-inky.vercel.app`. Aporta más SEO que el rename en sí.
3. **Rutas por franquicia** — el trabajo de verdad. Merece su propia sesión de diseño.
4. **Titles que carguen la categoría** que el nombre ya no lleva:
   `Kanketsu — Should you start One Piece now?`.
5. **Structured data por anime**, además del JSON-LD de `WebApplication` del layout.
6. **Imágenes OG por anime.** El score es intrínsecamente compartible y es la vía
   realista a los primeros enlaces entrantes.
7. **Distribución manual** al principio (r/anime, foros de AniList, Product Hunt).
   Con marca opaca y dominio nuevo, los primeros usuarios no llegan por Google.

### Restricción a resolver en el diseño de las rutas

`output: "export"` y todas las llamadas a AniList en cliente. Consecuencias:

- Las páginas no pueden generarse bajo demanda. Hay que prerenderizarlas en build con
  `generateStaticParams`, llamando a AniList durante el build para un conjunto finito
  de franquicias (queda por decidir cuál y cuántas).
- El contenido debe quedar en el HTML. Google ejecuta JS en una segunda pasada, más
  lenta y menos fiable; apostar la indexación a un fetch en cliente es frágil.
- **Los scores caducan**: cambia el estado de emisión, sale una secuela. Una página
  estática se queda mintiendo. Hace falta rebuild periódico (cron de Vercel contra un
  deploy hook), que es infraestructura que hoy no existe.
