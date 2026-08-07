# Rediseño del watching score: la historia cerrada como techo

## Problema

`evaluateWatchingScore` responde hoy a la pregunta equivocada. Premia el
backlog: una mega-serie en emisión (90) y una ventana de hype (95) puntúan por
encima de una franquicia terminada (85), así que nada puede llegar al 100 y el
cierre de la historia no es el techo.

Además:

- **`sourceStatus` y `sourceFormat` se calculan y se tiran.** `summarizeFranchise`
  los produce; `evaluateWatchingScore` no los desestructura. Que el manga siga
  publicándose no influye en nada.
- **El hiatus de facto no existe.** Una franquicia que emitió su última
  temporada hace ocho años, con la fuente aún viva y sin secuela anunciada, cae
  en `FINISHED` y recibe el badge "Completed Story". Es el peor error posible:
  la nota más alta para el caso que el usuario más quiere evitar. El `HIATUS`
  actual es el de AniList, que significa producción oficialmente pausada de una
  obra concreta — otra cosa.
- **La calidad contamina el momento.** El score debe responder a *¿es buen
  momento para verlo?*, no a *¿es bueno?*. El `qualityBonus` mezcla las dos.
- **Hay una rama muerta.** `evaluate-score.ts:90` comprueba
  `totalEpisodes === null`, pero el campo es `number` (viene de un `reduce`).

## Modelo de cálculo

Tres pasos, en lugar del `if` por estado:

1. **Situación** — una de diez, mutuamente excluyentes, derivada de `status`,
   `totalEpisodes`, `nextAiringEpisode`, `sourceStatus` y `endYear`.
2. **Base** — fijada por la situación.
3. **Modificadores** — suman o restan poco y **añaden un mensaje**. Nunca
   cambian de situación.

Resultado final acotado a 0–100.

### Situaciones y bases

| # | Situación | Base | Level |
|---|---|---|---|
| 1 | Terminado, fuente terminada o sin fuente conocida | 100 | `PERFECT_TIME` |
| 2 | Terminado, fuente en publicación | 100 (−5) | `PERFECT_TIME` |
| 3 | Secuela anunciada dentro de la ventana de hype | 70 (+15) | `GOOD_TIME` |
| 4 | Mega-serie en emisión (≥150 episodios) | 80 | `GOOD_TIME` |
| 5 | Secuela anunciada lejos o sin fecha | 70 | `RISK_INCOMPLETE` |
| 6 | Emitiendo ahora, serie normal | 50 | `IF_CANT_WAIT` |
| 7 | Hiatus de facto | 30 | `NOT_GOOD_TIME` |
| 8 | Hiatus oficial de AniList | 20 | `NOT_GOOD_TIME` |
| 9 | No empezada | 15 | `NOT_GOOD_TIME` |
| 10 | Cancelada | 5 | `NOT_RECOMMENDED` |

Las filas 2 y 3 no son situaciones propias: son las filas 1 y 5 con un
modificador aplicado. Se listan porque son las notas que el usuario verá.

El `level` **no se fija por situación, se deriva de la nota final** por bandas:

| Nota final | Level |
|---|---|
| ≥ 90 | `PERFECT_TIME` |
| ≥ 75 | `GOOD_TIME` |
| ≥ 60 | `RISK_INCOMPLETE` |
| ≥ 40 | `IF_CANT_WAIT` |
| ≥ 10 | `NOT_GOOD_TIME` |
| < 10 | `NOT_RECOMMENDED` |

Si el level fuera propio de cada situación, la fila 3 se contradiría: es la fila
5 más un modificador, pero cruza a `GOOD_TIME` porque 85 ya no es un riesgo de
historia incompleta. Derivarlo de la nota mantiene una sola fuente de verdad y
hace que los modificadores puedan cambiar el level sin casos especiales.

El salto grande está entre 50 y 70, y es deliberado: por encima puedes ver algo
ahora mismo sin esperar semana a semana, por debajo no.

### Modificadores

| Condición | Delta | Mensaje |
|---|---|---|
| `sourceStatus === "ONGOING"` | −5 | El manga/novela sigue en publicación |
| Próximo episodio dentro de `HYPE_WINDOW_DAYS` | +15 | Nueva temporada en N días |

`sourceFormat` decide la palabra del primer mensaje ("manga" o "novela"), que
es para lo que se calculaba.

## Reglas de derivación

Orden de evaluación, primera que aplica gana:

1. `status === "CANCELLED"` → cancelada
2. `status === "HIATUS"` → hiatus oficial
3. `status === "NOT_RELEASED"` → no empezada
4. `status === "ONGOING"` y `totalEpisodes >= 150` → mega-serie
5. `status === "ONGOING"` → emitiendo normal
6. `status === "NEW_SEASON_COMING"` → secuela anunciada
7. `status === "FINISHED"`, `sourceStatus === "ONGOING"` y `endYear` anterior a
   hace 5 años → hiatus de facto
8. `status === "FINISHED"` → terminado

`deriveStatus` no cambia: el orden de precedencia que ya tiene (cancelada gana a
hiatus, gana a no-estrenada, gana a en-emisión) se mantiene tal cual.

### Casos límite decididos

- **Fuente desconocida** (`sourceStatus === "UNKNOWN"`, p. ej. Steins;Gate, que
  no tiene obra fuente enlazada en AniList) → **sin modificador y sin mensaje**.
  Una serie original terminada saca 100: no hay fuente que pueda quedar
  incompleta.
- **Hiatus de facto no acumula el modificador de fuente.** Su base de 30 ya
  incorpora que la fuente sigue viva; aplicar además el −5 lo contaría dos
  veces. Lleva su propio mensaje, no el genérico.
- **`endYear === null` en una franquicia `FINISHED`** → no hay forma de medir la
  antigüedad, así que no es hiatus de facto. Cae en "terminado".
- **La ventana de hype solo modifica la situación 5.** Aplicarla sobre
  "terminado" rompería el invariante de que el cierre es el techo. En la
  práctica no puede ocurrir: `deriveStatus` devuelve `NEW_SEASON_COMING`, no
  `FINISHED`, en cuanto hay un episodio por emitir.
- **`nextAiringEpisode` sale de `timeline + related`**, comportamiento actual
  que se conserva. Una película o un especial próximos pueden disparar la
  ventana de hype. Aceptado por ahora.

## Cambio de firma

```ts
evaluateWatchingScore(summary: FranchiseSummary, now: Date): TimingScore
```

El hiatus de facto necesita saber cuántos años han pasado desde `endYear`, y el
dominio no puede leer el reloj sin dejar de ser puro ni testeable sin mocks de
tiempo. El reloj se inyecta desde `useAnimeSearch`.

La ventana de hype no lo necesita: `timeUntilAiringSeconds` ya viene relativo.

## Cambios en el modelo

`TimingScore` gana un campo:

```ts
notes: string[];   // vacío cuando no hay modificadores
```

`badgeText`, `summary` y `details` siguen describiendo la situación principal.
Los `notes` son las líneas secundarias que la UI pinta bajo el badge.

`ScoreLevel` no cambia de forma, pero `RISK_INCOMPLETE` pasa a usarse.

`averageScore` sale del cálculo. `summarizeFranchise` lo sigue produciendo y la
UI lo muestra aparte, como dato de AniList: *"está mirando si es buen momento de
verlo, no si es buen anime"*.

## Constantes

```ts
MEGA_SERIES_EPISODE_THRESHOLD = 150   // sin cambios
HYPE_WINDOW_DAYS = 60                 // sin cambios
DE_FACTO_HIATUS_YEARS = 5             // nueva
```

`BASE_SCORE = 70` desaparece: ya no hay una base común con deltas, cada
situación fija su nota.

`DE_FACTO_HIATUS_YEARS = 5` es deliberadamente conservador. Con 2 o 3 años se
marcaría como hiatus la espera normal entre temporadas, que en la industria son
2–3 años, y la nota mentiría en el caso más común. Con 5 solo disparan los
abandonos flagrantes.

## Testing

`evaluate-score.test.ts` se reescribe entero. Los tests actuales que afirman
notas dejan de ser válidos, no porque el rediseño los rompa sino porque ya no
describen el comportamiento deseado.

Estructura:

- **Un test por situación**, diez en total, cada uno afirmando la **nota exacta**
  y el `level`. Son la tabla de arriba hecha ejecutable.
- **Bandas de level**: los bordes exactos (90, 75, 60, 40, 10).
- **Modificadores por separado**: fuente en publicación resta 5 y añade su
  mensaje; ventana de hype suma 15 y añade el suyo; fuente desconocida no toca
  nada; hiatus de facto no acumula el −5.
- **Casos límite**: `endYear === null`, exactamente 150 episodios, exactamente
  60 días, exactamente 5 años.
- **`now` fijo** en cada test — nada de `new Date()` sin argumento.

`summarize-franchise.test.ts` no se toca: el summary no cambia de forma.

## Fuera de alcance

- **Fuente terminada que el anime no adaptó entera.** Sale como cierre completo
  con un 100. Detectarlo exigiría comparar capítulos adaptados contra
  publicados, dato que AniList no ofrece de forma fiable.
- **Distinguir "4 temporadas cerradas + secuela" de "1 temporada + secuela".**
  Ambas caen en la situación 5. Exigiría una variable nueva en
  `FranchiseSummary` y otro umbral. Se revisará con uso real delante.
- **La UI.** Este spec cubre dominio y modelo. Pintar `notes` y el
  `averageScore` separado es trabajo aparte.

## Documentación

`docs/SCORING-SYSTEM.md` describe el sistema anterior y debe reescribirse con
esta tabla.
