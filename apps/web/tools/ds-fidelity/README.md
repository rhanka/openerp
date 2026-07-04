# Audit de fidélité DS (pixel/computed-styles, élément par élément)

Méthode exigée avant toute revue visuelle du shell :

1. Servir la référence docs du DS : `npm run --workspace apps/docs build` dans
   `~/src/sent-tech-design-system` puis `npx vite preview --port 4381` dans `apps/docs`.
2. Démarrer le dev server web (`npm run dev`, port 4173).
3. `node tools/ds-fidelity/diff.mjs` — diff computed-styles vs docs
   (`layouts/dashboard`, `components/app-header`).
4. `node tools/ds-fidelity/controls-diff.mjs` — diff contrôles vs le consommateur
   live (preprod.sentropic.sent-tech.ca).
5. Lint officiel : `node ~/.claude/skills/sent-tech-design/scripts/audit.mjs <url>`.

Zéro delta (ou delta justifié par écrit) = condition de sortie.
Référence header : AppHeader nu (56px) = ce que rend le consommateur live ;
le site docs ajoute son chrome AppChrome (80 px, blur) par-dessus — ne pas comparer à ça.
