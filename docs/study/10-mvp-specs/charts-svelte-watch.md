# Veille Charts Svelte — PG-10

## Progress

Fait : veille technologique 2026-05-14 sur les bibliothèques charts Svelte-compatibles pour la primitive `Widget`/`Dashboard` foundation OpenERP (PG-10), suite à arbitrage decision-pack (primitive native SvelteKit + coordination `@sent-tech` design system).
À faire : décision finale après clarification du périmètre `@sent-tech` (tokens uniquement ou composants charts wrappés ?), validation par essai POC d'un widget reporting non trivial (heatmap + drill-down).
Attendu : arbitrage entre 2-3 finalistes avant implémentation du module reporting (`rep-001`) et de la première vague de dashboards CRM / projet / billing.

## Critères d'évaluation

| Critère | Pondération | Détail |
| --- | --- | --- |
| Licence | bloquante | Apache-2.0, MIT, BSD, ISC acceptables ; AGPL/GPL = exclusion ; commercial = exclusion sauf si négocié dans `@sent-tech` |
| Bundle size | haute | Tree-shaking + lazy loading attendu, cible < 200 KB minified par widget hydraté |
| Svelte-natif vs wrapper | haute | Préférence Svelte-natif (rendu déclaratif, composants `<svelte>` plutôt qu'instances impératives) |
| Accessibilité WCAG 2.2 AA | haute | ARIA, navigation clavier, lecteur d'écran, alternative textuelle automatique |
| Types TypeScript | haute | Types officiels stricts, pas de `any` fuyants dans l'API publique |
| FR-CA / EN-CA support | haute | Locale, dates, nombres, devises, séparateurs typographiques |
| Datasets larges | moyenne | Virtualisation, downsampling, performance > 100k points (cas streaming télémétrie / journaux financiers) |
| Variétés de charts | moyenne | Bar, line, area, pie, scatter, heatmap, sankey, tree, geo, gantt |
| Drill-down / interactivité | moyenne | Click, hover, brush, zoom, tooltip, sélection croisée |
| Theming / tokens | haute | Compatibilité tokens design system `@sent-tech` (couleurs, typo, espacement) |
| Aspiration VizQL | basse | Sémantique drag-drop, algèbre des marques, encodage déclaratif (style Vega-Lite/Tableau) |
| Maintenance / community | haute | Activité GitHub, dernière release, contributeurs, gouvernance |

## Bibliothèques évaluées

### LayerChart (techniq/layerchart)
- Licence : MIT.
- Bundle : modulaire, sub-path exports par couche de rendu (HTML, SVG, Canvas) ; primitives HTML-only ~95 % plus légères que la variante SVG complète. Pas de chiffre absolu publié, mais tree-shaking natif via SvelteKit.
- Type : Svelte-natif (88 % de la base est `.svelte`), Svelte 5 supporté depuis la v1.0.x (release janvier 2026).
- Forces : composition déclarative (chaque mark / scale / axis est un composant), dépendance D3 sous le capot (scales, shapes, hierarchies), large couverture de types (cartésien, radial, hiérarchie, sankey, géo, globe), maintenance très active (1787 commits, 225 releases), philosophie « unbundled » qui colle à la primitive `Widget` OpenERP.
- Faiblesses : pas d'engagement WCAG 2.2 AA documenté ; accessibilité à instrumenter au niveau primitive `Widget` (ARIA, table fallback, `aria-describedby`). Locales i18n non gérées par la lib (déléguées à `@formatjs` / `Intl`). Documentation API dense mais courbe d'apprentissage notable.
- Verdict : candidat principal pour la primitive `Widget` OpenERP. Modèle compositionnel s'aligne avec l'aspiration VizQL long terme (chaque mark = composant), et la licence MIT + Svelte-natif évitent la dette d'un wrapper.

### Chart.js + svelte-chartjs (SauravKanchan/svelte-chartjs)
- Licence : MIT (Chart.js et wrapper).
- Bundle : Chart.js ~60 KB base, ~200 KB tous registerables, descend à ~14 KB en tree-shaking agressif pour un seul type de chart.
- Type : wrapper Svelte 5 (v4.0.1, mars 2026) au-dessus d'une lib canvas vanilla. Composant `<Chart>` qui instancie l'objet Chart.js impérativement.
- Forces : extrêmement mature, communauté massive, riche écosystème de plugins (zoom, annotations, finance), bonne perf canvas, types officiels.
- Faiblesses : rendu canvas = accessibilité pénible (ARIA limité au `<canvas>`, fallback à fournir à la main), pas Svelte-natif (binding impératif), peu adapté à une grammaire de marques. API impérative (option object) éloignée d'une trajectoire VizQL.
- Verdict : excellent plan B pour widgets simples (KPI tile, mini sparkline), mais inadapté comme socle d'une primitive composable.

### Apache ECharts + svelte-echarts (bherbruck/svelte-echarts)
- Licence : Apache-2.0 (ECharts) + MIT (wrapper Svelte 5, v1.0.0 avril 2025).
- Bundle : volumineux par défaut (>800 KB minified avec tout) ; tree-shaking via `echarts/core` + `echarts/charts/<Type>` + composants nommés réduit fortement, mais reste lourd vs LayerChart/uPlot.
- Type : wrapper Svelte autour d'une lib canvas/SVG vanilla, options déclaratives via objet JSON (proche de Vega).
- Forces : couverture chart la plus large du marché (sankey, gantt, parallel, graph, treemap, candlestick, geo, 3D via extension), accessibilité WAI-ARIA depuis v4 avec descriptions auto et patterns decal pour daltoniens, i18n native via `echarts/lib/i18n/` (FR inclus), gouvernance Apache.
- Faiblesses : wrapper communautaire avec maintenance modérée (6 releases, dernière avril 2025 — à surveiller), bundle non négligeable, modèle option objet géant pas idéal pour primitive composable, theming via JSON theme objects (mapping vers tokens `@sent-tech` à construire).
- Verdict : second candidat solide. Sa11y native + i18n native = atouts majeurs pour OpenERP FR-CA / EN-CA. Possiblement à retenir comme moteur d'appoint pour widgets exotiques (sankey, geo, gantt) que LayerChart ne couvre pas finement.

### D3 (d3/d3) + Svelte custom wrapping
- Licence : ISC.
- Bundle : modulaire (`d3-scale`, `d3-shape`, `d3-hierarchy`, `d3-geo`, `d3-force`, etc.), import sélectif < 30 KB possible.
- Type : librairie utilitaire bas niveau ; le pattern Svelte usuel utilise D3 pour scales/shapes/layouts et délègue le rendu au DOM/SVG via la réactivité Svelte (« D3 for math, Svelte for DOM »).
- Forces : flexibilité maximale, types DefinitelyTyped solides, dernière release v7.9.0 (mars 2024 — stable, pas mort), foundation incontournable.
- Faiblesses : zéro chart prêt à l'emploi, coût d'ingénierie élevé pour reproduire ce que LayerChart livre. Pas une « solution », un substrat.
- Verdict : substrat sous-jacent de LayerChart, Observable Plot, Vega-Lite. Pas un candidat direct, mais l'expertise D3 reste un prérequis pour exploiter LayerChart et tendre vers VizQL.

### Observable Plot
- Licence : ISC.
- Bundle : ~150 KB minified, dépend de D3. SvelteKit SSR documenté via JSDOM (render server-side, hydrate côté client).
- Type : librairie déclarative grammaire-des-marques, API JS impérative (`Plot.plot({ marks: [...] })`). Pas Svelte-natif mais facilement encapsulable.
- Forces : grammaire de marques explicite (proche Vega-Lite, ancêtre conceptuel de VizQL), expressivité élevée, équipe Observable/D3, syntaxe concise, idéal pour exploration ad hoc.
- Faiblesses : TypeScript support partiel (types officiels mais documentation moins riche que D3), peu d'interactivité avancée native (brush/zoom à composer manuellement), bundle non tree-shakable au niveau marque.
- Verdict : très intéressant pour la trajectoire VizQL post-MVP. Pour le MVP : trop léger sur l'interactivité et le theming. Garder en veille comme moteur d'exploration / notebook reporting.

### visx (airbnb/visx)
- Exclusion : **React-only**. Marqué en veille comme référence de design (composants D3 composables) mais hors périmètre SvelteKit.

### Recharts
- Exclusion : **React-only**. Modèle JSX déclaratif, sans équivalent direct Svelte.

### deck.gl (visgl/deck.gl)
- Licence : MIT, supervisé OpenJS Foundation. Dernière release v9.3.3 (mai 2026), 72 % TypeScript.
- Type : moteur GPU/WebGL spécialisé geospatial / 3D / massive scale. Intégration documentée React et vanilla JS ; pas de wrapper Svelte officiel mais utilisable via API vanilla dans un composant Svelte.
- Forces : performance GPU exceptionnelle (millions de points), intégration Mapbox/MapLibre/Google/Carto, idéal pour widgets cartographiques OpenERP (livraisons, géolocalisation clients, supply chain).
- Faiblesses : hors scope pour charts statistiques classiques, bundle lourd, courbe d'apprentissage haute, pas Svelte-natif.
- Verdict : à conserver pour le **vertical géospatial** post-MVP (carte d'implantation clients, optimisation tournées). Pas un candidat pour la primitive `Widget` généraliste.

### uPlot (leeoniya/uPlot)
- Licence : MIT.
- Bundle : ~48 KB minified, vanilla JS, types `.d.ts` fournis.
- Type : canvas, time-series spécialisé. Wrapper Svelte communautaire (Sergey Kalinichev).
- Forces : performance ahurissante (166 650 points en 25 ms, 60 fps avec 100k points visibles, ~10 % CPU à 3600 updates/sec), parfait pour télémétrie / streaming / journaux financiers temps réel.
- Faiblesses : limité aux time-series / line / area / OHLC / bar, pas de sankey/heatmap/geo/hiérarchie, accessibilité canvas faible, pas Svelte-natif.
- Verdict : à retenir comme **moteur spécialisé time-series haute-fréquence** post-MVP (audit logs viewer, monitoring agents, streams comptables). Pas un candidat primaire.

### ApexCharts + svelte-apexcharts (galkatz373/svelte-apexcharts)
- Licence : **dual-license** — Community (MIT-like) gratuit sous seuil de 2 M USD CA annuel ; Commercial obligatoire au-delà ; OEM/redistribution séparée.
- Type : wrapper Svelte communautaire (non officiel), Apex est SVG vanilla.
- Forces : esthétique soignée, large couverture de types, bonne doc.
- Faiblesses : **licence problématique pour un produit OpenERP destiné à être distribué et commercialisé** — le seuil 2 M USD CA et la licence OEM tombent dans la zone d'exclusion. ARIA non documenté explicitement. Wrapper Svelte communautaire à fiabilité variable.
- Verdict : **exclusion conditionnelle** — la trajectoire OpenERP (produit destiné à monter en CA, distribution multi-tenant) tombe dans la clause commerciale et OEM. À écarter sauf si `@sent-tech` négocie une OEM (non recommandé).

### Plotly.js
- Licence : MIT.
- Bundle : énorme — distribution complète ~10 MB ; partiels (`plotly.js-basic-dist-min`) plus raisonnables mais toujours > 1 MB. Custom bundles possibles via build, mais friction.
- Type : librairie scientifique vanilla, wrapper Svelte communautaire (`cshaa/svelte-plotly.js`).
- Forces : >40 types de charts (3D, statistique, financier, cartes SVG), maturité, écosystème Dash/Plotly Studio.
- Faiblesses : bundle hors cible, TypeScript support partiel (types DefinitelyTyped non officiels), accessibilité non documentée, wrapper Svelte non officiel.
- Verdict : surdimensionné pour la primitive `Widget`. À garder en veille pour un éventuel module **reporting scientifique / data exploration** futur si besoin de 3D ou de stats avancées.

### Highcharts
- Exclusion : **licence commerciale propriétaire** (gratuit usage non commercial uniquement). Incompatible avec un produit OpenERP commercial.

### Carbon Charts (IBM)
- Exclusion : **éliminé par utilisateur 2026-05-14** — drawback identifié (commercialisation IBM sur base nominalement libre, posture jugée ambiguë pour un produit canadien indépendant).

## Verdict

### Tête de classement

1. **LayerChart** — MIT, Svelte-natif, composable, Svelte 5, maintenance très active, modèle qui s'aligne avec la primitive `Widget`/`Dashboard` et avec l'aspiration VizQL (composants = marques). Couverture chart suffisante pour 90 % des besoins OpenERP MVP.
2. **Apache ECharts + svelte-echarts** — Apache-2.0, accessibilité WAI-ARIA native, i18n FR/EN native, couverture chart la plus large (sankey, gantt, geo, candlestick). Réserve : wrapper Svelte 5 à maintenance modérée, à valider par POC.
3. **uPlot** — MIT, performance hors compétition pour time-series. Réservé aux widgets streaming haute-fréquence (logs, monitoring, télémétrie agentique).

### Exclusions

- **visx / Recharts** : React-only, hors périmètre SvelteKit.
- **ApexCharts** : dual-license avec seuil 2 M USD CA + clause OEM — incompatible avec la trajectoire commerciale OpenERP.
- **Highcharts** : licence commerciale propriétaire.
- **Carbon Charts** : éliminé par l'utilisateur 2026-05-14 (posture commerciale ambiguë IBM).
- **Plotly.js** : licence MIT correcte mais bundle hors cible (>1 MB minimum).
- **deck.gl** : hors scope généraliste (rester en veille pour un vertical géospatial).
- **D3 brut** : substrat, pas une solution.

### Reco MVP

**LayerChart** comme socle unique de la primitive `Widget` OpenERP, avec deux compléments **lazy-loaded** prévus dès la conception :

- **uPlot** pour widgets time-series haute-fréquence (audit log viewer, monitoring agents, comptes courants temps réel).
- **Apache ECharts** comme moteur d'appoint pour types non couverts par LayerChart (sankey complexe, gantt, geo détaillé) — chargé à la demande via dynamic import si la primitive `Widget` reçoit un `type` que LayerChart ne sait pas rendre nativement.

Cette stratégie en couches permet :
- de garder un bundle de base raisonnable (LayerChart tree-shaké pour les widgets standards),
- d'isoler les dépendances lourdes derrière du code splitting SvelteKit,
- de tester la primitive `Widget` comme contrat abstrait (un widget = un mark + données + encodage) plutôt qu'une dépendance dure à une lib.

### Aspiration post-MVP (VizQL)

Trajectoire envisagée : une fois la primitive `Widget` stabilisée et la grammaire LayerChart adoptée, exposer une **API déclarative supérieure** (style Vega-Lite simplifié) qui mappe un encodage abstrait `{ mark, x, y, color, size, facet }` vers les composants LayerChart. Cette couche peut emprunter à Observable Plot (algèbre des marques) et préparer un éditeur drag-drop type Tableau pour les utilisateurs finaux non développeurs. Vega-Lite officiel reste une option de référence (BSD-3, mature) mais ajoute un runtime non négligeable — à arbitrer post-MVP.

## Coordination @sent-tech

Questions ouvertes pour la coordination avec `@sent-tech` design system (à clarifier avant impl `rep-001`) :

1. **Périmètre `@sent-tech` charts** : le design system fournit-il uniquement des **tokens** (couleurs, typo, espacement, séries colorimétriques accessibles) consommés par LayerChart via thème CSS variables, ou prévoit-il aussi des **composants charts wrappés** (`<sent-chart-bar>`, etc.) ? La réponse change radicalement le coût d'intégration.
2. **Si tokens uniquement** : exposer une convention `--sent-color-series-{1..n}`, `--sent-chart-axis-color`, `--sent-chart-grid-color` que la primitive `Widget` OpenERP consomme directement dans les composants LayerChart. À valider avec mainteneurs `@sent-tech`.
3. **Si composants wrappés** : `@sent-tech` adopte-t-il LayerChart en interne ? Sinon, la primitive `Widget` OpenERP s'aligne-t-elle sur le choix `@sent-tech` (risque de dépendance) ou maintient-elle son propre socle (risque de divergence visuelle) ?
4. **Accessibilité** : `@sent-tech` impose-t-il un contrat ARIA / `role="img"` + `aria-describedby` + table fallback que la primitive `Widget` doit respecter ? Si oui, cela doit être codifié au niveau primitive, pas au niveau lib chart.
5. **i18n** : `@sent-tech` fournit-il les locales formatées (FR-CA, EN-CA) pour dates / nombres / devises, ou la primitive `Widget` consomme-t-elle `@formatjs` / `Intl` directement ?
6. **Theming sombre / clair** : tokens light/dark gérés via `@sent-tech` ? La primitive `Widget` doit réagir au thème actif (préférable via CSS variables, pas via re-render).
7. **Versioning** : politique de release `@sent-tech` (semver strict ?) compatible avec la cadence release LayerChart (active, 225 releases) — risque de désynchronisation à anticiper.

## Cross-references

- Decision-pack : `/home/antoinefa/src/openerp/docs/study/10-mvp-specs/decision-pack.md` (PG-10 — primitive `Widget`/`Dashboard` native SvelteKit + coordination `@sent-tech`)
- Reporting spec : `/home/antoinefa/src/openerp/docs/study/10-mvp-specs/reporting-automation.md` (`rep-001` — native SvelteKit + primitive `Widget`)
- Foundation security/i18n : `/home/antoinefa/src/openerp/docs/study/10-mvp-specs/foundation-security-i18n.md` (FR-CA / EN-CA, contrat locale)
- Shortlist : `/home/antoinefa/src/openerp/docs/study/03-shortlist/shortlist.md` (posture Apache Superset / Node-RED — pourquoi pas adopté en bloc)
- Agentic impacts : `/home/antoinefa/src/openerp/docs/study/10-mvp-specs/agentic-impacts.md` (widgets streaming pour monitoring agents — justifie uPlot en complément)
