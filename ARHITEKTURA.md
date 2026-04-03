# ARHITEKTURA - PravoLes

Poenostavljena arhitektura za trenutno fazo projekta.

Status projekta:
- `Next.js` ni v uporabi.
- Backend trenutno ni v uporabi.
- Baza podatkov trenutno ni v uporabi.
- Projekt je za zdaj statična spletna stran.

---

## Pregled

PravoLes je trenutno zamišljen kot enostaven frontend projekt, zgrajen z `Vite`, `React` in `TypeScript`.

Uporaba v tej fazi:
- predstavitvena statična spletna stran
- prikaz vsebine o podjetju in izdelkih
- pripravljena osnova za kasnejšo razširitev

Trenutna arhitektura:

```text
Browser
  ->
Vite / React / TypeScript frontend
  ->
Static assets (CSS, slike, besedilo)
```

---

## Tehnološki Sklad

| Sloj | Tehnologija | Namen |
|------|-------------|-------|
| Frontend | React 18 | gradnja uporabniškega vmesnika |
| Build tool | Vite | hiter development in build |
| Jezik | TypeScript | tipizacija in boljša vzdržljivost kode |
| Stiliranje | CSS | enostaven statični dizajn brez dodatnih odvisnosti |

Trenutno ne uporabljamo:
- `Next.js`
- `Node/Express` backenda
- `PostgreSQL`, `MySQL` ali druge baze
- autentikacije
- plačilnih integracij
- admin panela

---

## Cilj Trenutne Faze

Cilj je postaviti:
- čist frontend projekt
- eno statično pristajalno stran
- jasno strukturo map
- osnovo za kasnejše dodajanje novih sekcij ali podstrani

Ta faza je namenjena hitremu začetku razvoja in oblikovanja brez kompleksne infrastrukture.

---

## Struktura Projekta

```text
frontend/
  index.html
  package.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    styles.css
```

Opis:
- `index.html` je vstopna HTML datoteka
- `src/main.tsx` zažene React aplikacijo
- `src/App.tsx` vsebuje glavno statično stran
- `src/styles.css` vsebuje globalne stile

---

## Arhitekturna Odločitev

### Zakaj `Vite` namesto `Next.js`

Izbrali smo `Vite`, ker za trenutno fazo potrebujemo:
- enostavno postavitev projekta
- hitro zaganjanje development strežnika
- majhen in pregleden codebase
- brez SSR, API routov ali kompleksne aplikacijske logike

`Next.js` bi imel smisel kasneje, če bi potrebovali:
- SSR ali SSG na več straneh
- backend API rute
- napredno SEO strategijo
- autentikacijo in dinamične podatke

Za zdaj bi bil `Next.js` nepotrebna kompleksnost.

---

## Podatki

Trenutno ni baze podatkov.

Vsebina je za zdaj:
- statično zapisana v frontend kodi
- primerna za predstavitveno stran

Kasneje lahko podatke premaknemo v:
- lokalne `JSON` datoteke
- headless CMS
- lasten backend API
- bazo podatkov

To trenutno ni del implementacije.

---

## Routing

Trenutna verzija uporablja eno statično stran.

Možne naslednje razširitve:
- dodajanje `react-router-dom`
- ločene strani za izdelke, o podjetju in kontakt

Za zdaj routing ni potreben.

---

## Styling

Uporabljen je navaden `CSS`.

Razlogi:
- najmanj odvisnosti
- enostavno prilagajanje
- dobra osnova za hiter vizualni prototip

Kasneje lahko po potrebi preidemo na:
- `Tailwind CSS`
- `CSS Modules`
- `Styled Components`

---

## Build In Zagon

Ukazi za frontend:

```bash
cd frontend
npm install
npm run dev
```

Za produkcijski build:

```bash
cd frontend
npm run build
npm run preview
```

Privzeti lokalni naslov:

```text
http://localhost:5173
```

---

## Deployment

Ker gre za statično stran, je deployment preprost.

Možne platforme:
- `Vercel`
- `Netlify`
- `Cloudflare Pages`
- katerikoli statični hosting

Deploy proces:
1. `npm install`
2. `npm run build`
3. objava vsebine iz mape `dist/`

---

## Nadaljnji Koraki

Ko bo projekt pripravljen za naslednjo fazo, lahko dodamo:
- več podstrani
- katalog izdelkov
- obrazec za kontakt
- povezavo na CMS ali API
- backend in bazo podatkov

Pomembno:
- trenutna arhitektura je namerno minimalna
- zgrajena je za hiter začetek
- kompleksnost bomo dodajali šele, ko bo dejansko potrebna

---

## Povzetek

Aktualna odločitev za PravoLes:
- `Vite + React + TypeScript`
- ena statična spletna stran
- brez `Next.js`
- brez baze podatkov
- brez backenda

To je najprimernejša osnova za trenutno razvojno fazo.

---

**Zadnja sprememba**: 3. april 2026  
**Status**: aktivna frontend osnova  
**Verzija**: 2.0
