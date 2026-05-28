# UX Review Synthesis — 2026-05-26

Role: contradiction / synthesis pass (read-only)
Inputs: `2026-05-26-ux-review-implemented.md` (Agent A), `2026-05-26-ux-review-state-of-art.md` (Agent B)
Cross-references: `rules/ui-review.md`, `rules/ux-decisions.md`, `rules/MASTER.md`

---

## Etat de l'art (distillation de Agent B)

Les consoles ERP et back-offices B2B multi-modules convergent vers quatre patterns etablis : groupes visuels statiques dans la sidenav a partir de 8–10 items, selecteurs semantiques pour toute relation entre entites (jamais un UUID brut expose en champ libre), stepper de statut sur les cycles de vie lineaires (Invoice, Opportunity pipeline), et un breakpoint mobile avec navigation en drawer. Pour le bilinguisme FR-CA, l'etat de l'art recommande un switcher global dans l'en-tete (UXDR-002 GO), des tokens monetaires avec devise explicite (CAD), et le reformatage des dates d'affichage selon la locale active. Le detail "Company" vide d'informations liees est identifie comme un deficit operationnel pour les profils CRM — le standard de marche expose les Opportunites et Contacts rattaches directement depuis la fiche.

---

## Revue implementee (distillation de Agent A — avec verdict F-02 verifie)

Agent A a couvert 16 routes, 2 viewports, 2 locales via Playwright (696 checks automatises, 2 issues detectees automatiquement, 12 issues visuelles manuelles). Les routes fondation-admin (approvals, audit, users, roles, settings) passent sans anomalie token. **F-02 est CONFIRME et REQUALIFIE (voir section Contradiction ci-dessous).** L'observation la plus structurelle est que le layout global unique (`+layout.svelte`) applique le shell admin complet — sidebar 14 items incluse — a toutes les routes sans exception, dont `/login` et `/register-passkey`. Sur mobile, cela pousse le formulaire d'authentification sous le fold sur les deux routes pre-auth (F-01, blocker). Le seul overflow automatise detecte est le tableau Journal Entries sur `/admin/billing/accounting` a 390x844 (F-03, blocker). Les labels uppercase non traduits (STATUS, STAGE, EXPECTED VALUE sur le detail Opportunity ; codes d'action bruts sur Audit ; EMAIL/WEBSITE en majuscules sur les cartes CRM) sont des majors i18n tangibles. Les boutons "Mark doneDelete" / "ApproveDelete" sur le detail projet sont une concatenation visuelle sans separateur (major, simple a corriger).

---

## Contradiction — verifications objectives

### F-02 — Verdict : REEL, scope corrige (15/20 pages, pas 14/15)

**Evidence directe (verifiee sur le code source) :**

- `@sentropic/design-system-tokens` exporte 227 proprietes CSS, toutes prefixees `--st-*`. Zero propriete `--sent-*`, `--color-*`, `--space-*`, ou `--font-size-*` n'est definie dans ce package.
- `@sentropic/design-system-themes/css/sent-tech.css` definit 182 proprietes `--st-*`. Aucune autre.
- `@sentropic/design-system-svelte` ne definit aucune propriete `--sent-*` dans son dist.
- Le namespace `--sent-*` n'existe nulle part dans le design system Sentropic publie.

**Dans la codebase `apps/web/src/routes/` :**

- 349 occurrences de `var(--sent-*` dans les fichiers `.svelte` de routes.
- 17 occurrences de `var(--space-*` (namespace independant, non-Sentropic).
- 11 occurrences de `var(--color-*` (namespace independant, non-Sentropic).
- 4 occurrences de `var(--font-*` (hors design system).
- Total : **381 references CSS invalides** au runtime (resolvent a `undefined` → browser default).
- Seules **3 occurrences** de `var(--st-*` existent dans les fichiers route (dans `approvals/+page.svelte` et `+page.svelte` racine).

**Scope reel :** Agent A dit "14 de 15" pages. Le decompte exact est **15 pages sur 20 pages admin totales** utilisent au moins un namespace invalide. Les 5 pages propres sont : approvals, audit, users, roles, settings. Les 15 pages affectees sont : toute la section CRM (leads, leads/[id], companies, companies/[id], contacts, contacts/[id], opportunities, opportunities/[id]), toute la section Project (projects, projects/[id], rates), toute la section Billing (invoices, invoices/[id], taxes, accounting).

**Requalification de severite :** Agent A classifie F-02 comme blocker. Ce classement est exact mais la justification merite une nuance : visuellement, les valeurs CSS tombant a `undefined` revertent aux valeurs du navigateur (souvent proches des valeurs de design par coincidence — blanc, gris, 14px). Le rendu n'est pas casse de facon spectaculaire, mais il est decorrele du ThemeProvider, ce qui signifie qu'un changement de theme ne se repercutera pas sur ces pages. C'est un **blocker de theming et de maintenabilite**, pas necessairement un blocker de lisibilite immediate. La nature systemique (15/20 pages) et le volume (381 references) en font un workpackage de migration, pas un patch ponctuel. La classification blocker est maintenue.

**Note supplementaire — F-12 lie a F-02 :** Les scoped redeclarations de `.page`, `.page__header`, `.page__lede` dans chaque page CRM/Project/Billing utilisent exclusivement des tokens `--sent-*`. Elles shadent les definitions correctes de `app.css` (qui utilisent `--st-*`). Supprimer ces redeclarations et conserver les definitions globales resoudrait simultanement F-12 et une partie de F-02 (les tokens de layout). F-12 n'est donc pas un "nit" independant — c'est le mecanisme d'application de F-02 pour les classes de layout.

---

### F-01 / F-04 — Pre-auth nav : verification architecturale

**Evidence :** Il n'existe qu'un seul fichier `+layout.svelte` dans tout l'arbre des routes (`apps/web/src/routes/+layout.svelte`). Ce layout instancie inconditionnellement `<Header>`, `<SideNav>` (14 items), et `<main>`. Les routes `/login` et `/register-passkey` n'ont pas de layout propre et ne peuvent pas echapper a ce shell.

**Verdict F-01 (blocker mobile) :** CONFIRME. Sur mobile, la grille CSS empile sidebar avant le `<main>`, poussant le formulaire sous le fold. Correction technique directe : supprimer la sidebar sur les routes pre-auth au niveau du layout ou creer un layout dediche `(auth)/+layout.svelte`.

**Verdict F-04 (major IA desktop) :** CONFIRME et ELEVE en implication securite/UX. Afficher 14 items de navigation admin sur la page de login ne constitue pas une fuite d'information (les routes sont des chemins statiques), mais cree une confusion IA pour l'utilisateur non authentifie qui voit l'integralite du back-office avant d'avoir saisi ses identifiants. UXDR-002 mentionne explicitement `/login` et `/register-passkey` dans son scope (locale switcher doit etre present et fonctionnel avant authentification) mais ne statue pas sur la sidebar. Un UXDR est necessaire avant implementation, mais le diagnostic technique est clair : la solution architecturale est un layout pre-auth sans sidebar.

**Note :** F-01 et F-04 sont deux facettes du meme probleme architectural (layout global non discriminant). Ils sont unifies dans le backlog sous un seul item "pre-auth shell" avec deux niveaux de severite (blocker mobile, major desktop).

---

### Deduplication A / B — items chevauchants

| Sujet | Agent A | Agent B | Severite retenue | Raison |
|---|---|---|---|---|
| Sidebar 14 items plats | Observation (nit) | Major / orientation | **Major** — decision IA | B donne l'evidence de marche ; A confirme l'etat ; severite elevee car scalabilite zero et charge cognitive documentee |
| UUID bruts (companyId, userId, rateId) | F-05 major | Blocage fonctionnel | **Blocker fonctionnel** | B qualifie correctement le probleme : un formulaire avec un champ UUID expose est inexploitable sans outil externe. Requalifie de major a blocker fonctionnel. |
| Mobile sidebar | F-10 minor (admin routes), F-01 blocker (pre-auth) | Priorite haute | **Blocker pre-auth / Major admin authentifie** | La distinction pre-auth vs admin authentifie est utile. Pre-auth est blocker (formulaire inaccessible). Admin authentifie est major (scroll force, pas d'impossibilite). |
| Stepper de statut | Non couvert | Major (Opportunity, Invoice) | **Major** | Non observe par A (hors scope Playwright pour cet element). B a raison sur le deficit. |
| Coherence accents FR | Non couvert | Minor | **Minor** | Non contredit. |

---

## Synthese — Backlog priorise

| ID | Finding | Severite | Categorie | Effort | Fix recommande |
|---|---|---|---|---|---|
| S-01 | Token namespace fragmentation : 381 references `--sent-*`/`--color-*`/`--space-*` invalides sur 15/20 pages admin ; ThemeProvider sans effet sur ces pages | blocker | DS-tokens | L | Migrer tous les scoped styles vers `--st-semantic-*` / `--st-component-*` ; supprimer les scoped redeclarations de `.page*` (heriter de `app.css`) ; ajouter lint CI sur `--sent-` |
| S-02 | Pre-auth mobile : formulaire /login et /register-passkey sous le fold (sidebar empile avant main) | blocker | IA/nav | S | Creer `(auth)/+layout.svelte` sans `<SideNav>`, deplacer les routes pre-auth dedans |
| S-03 | UUID bruts inexploitables : companyId, userId, rateId en champs libres dans les formulaires Opportunities, Project Team, Billing proposals | blocker | forms/UUID | M | Remplacer par `<Select>` ou combobox peuple depuis l'API/demo data ; le champ transmet l'ID en interne |
| S-04 | Tableau Journal Entries : overflow horizontal a 390x844 (documentDelta=221) | blocker | responsive | S | Wrapper `overflow-x: auto` ; supprimer `white-space: nowrap` sur `.entry-description` en mobile |
| S-05 | Sidebar 14 items plats sans groupement module (CRM / Projects / Billing / Admin) | major | IA/nav | S | Groupes visuels statiques avec en-tetes non-cliquables dans `SideNav` — a conditionner a un UXDR (voir decisions) |
| S-06 | Pre-auth desktop : sidebar admin complète exposée sur /login et /register-passkey (IA + securite perçue) | major | IA/nav | S | Couvre par S-02 (meme layout fix) ; UXDR requis avant implementation |
| S-07 | Opportunity detail : labels uppercase non traduits (STATUS, STAGE, EXPECTED VALUE) en toutes locales | major | i18n | S | Remplacer par cles i18n `crm.opportunities.field.*` |
| S-08 | Project detail : boutons "Mark doneDelete" / "ApproveDelete" concatenes sans separateur | major | forms/UUID | S | Wrapper les boutons dans un conteneur flex avec `gap` |
| S-09 | Stepper de statut absent sur Opportunity (pipeline) et Invoice (draft→emise→payee) | major | status-viz | M | Ajouter composant stepper horizontal avec etape courante marquee ; les donnees sont disponibles en API |
| S-10 | Labels uppercase bruts sur cartes CRM (EMAIL, WEBSITE sur companies/contacts) | minor | i18n | S | Cles i18n ou formatage lowercase avec icone |
| S-11 | Codes d'action audit non traduits (settings.changed, roles.changed, update.preflight_requested) | minor | i18n | S | Ajouter cles i18n pour les types d'action audit, ou transformer en labels lisibles |
| S-12 | Back-link inconsistant sur /admin/billing/invoices/[id] vs autres detail pages | minor | IA/nav | S | Aligner position et style back-link sur le pattern page__header top-right |
| S-13 | Loss reason placeholder non localise sur /admin/crm/opportunities | minor | i18n | S | Remplacer placeholder hardcode par cle i18n |
| S-14 | Proposal ID placeholder non localise sur /admin/billing/invoices | minor | i18n | S | Remplacer placeholder hardcode par cle i18n |
| S-15 | "Pipeline vide" incorrect pour Companies (semantiquement juste pour Opportunities seulement) | minor | i18n | S | Cle `crm.companies.empty.title` = "Aucune societe" |
| S-16 | Accents manquants dans foundation.fr.json (formes ASCII-safe melees aux formes accentuees) | minor | i18n | S | Uniformiser : soit tout accentue, soit tout ASCII-safe |
| S-17 | Company detail vide : pas de sections Opportunites/Contacts lies — deficit operationnel CRM | minor | IA/nav | M | Ajouter sections Opportunites + Contacts lies en lecture sur la page detail Company |
| S-18 | Mobile : sidebar admin authentifie empile avant main sur toutes les routes (scroll 700–750px avant contenu) | minor | responsive | M | Drawer/hamburger mobile (conditionne a UXDR) ; a traiter apres S-02 avec le meme composant |
| S-19 | Champs monetaires (expectedValue) en `<input type="text">` sans contrainte numerique ni label devise CAD | minor | forms/UUID | S | `type="number"` + label "CAD" explicite |
| S-20 | UXDR-002 GO — locale switcher header : acceptance criteria tous passes (F-11) | — | — | — | Aucune action. GO confirme. |

---

## Decisions a arbitrer

Ces items sont des choix UX/IA genuin qui requierent un UXDR et une decision utilisateur avant implementation. Ils ne sont pas de simples bugs.

---

### D-01 — Groupement de la SideNav (14 items plats → 4 sections visuelles)

**Question :** Faut-il introduire des groupes visuels statiques (CRM / Projects / Billing / Admin) dans la SideNav des maintenant, ou conserver la liste plate le temps que le design system Sentropic `SideNav` confirme son API de groupement ?

**Options :**
- A — Groupes visuels immediats avec en-tetes de section non-cliquables (pattern Stripe/Linear/Notion). Effort faible. Depend de l'API `SideNav` — a verifier dans `@sentropic/design-system-svelte`.
- B — Conserver la liste plate jusqu'a la confirmation de l'API SideNav et planifier le groupement dans le prochain workpackage nav.

**Option recommandee :** A, sous reserve de validation de l'API SideNav. Si l'API ne supporte pas les groupes, implementer via des separateurs HTML entre items de nav (conforme HTML semantique, pas de logique d'etat). Impact eleve, effort faible, blocage scalabilite zero.

**UXDR requis :** Oui. Doit nommer l'option retenue, l'API SideNav verifiee, et les criteres d'acceptance visuels.

---

### D-02 — Shell pre-auth : layout dediche sans sidebar

**Question :** Les routes `/login` et `/register-passkey` doivent-elles utiliser un layout separe sans `<SideNav>` (et sans aucun item de navigation admin), ou faut-il conserver le layout global avec la sidebar cachee/reduite en CSS ?

**Options :**
- A — Layout dedie `(auth)/+layout.svelte` : header avec locale switcher uniquement, pas de sidebar. Pattern standard pour les shells SaaS B2B (Salesforce, HubSpot, Notion). Supprime l'exposition pre-auth et resout F-01 (mobile) + F-04 (desktop) d'un coup.
- B — Layout global maintenu, sidebar cachee en CSS sur les routes pre-auth via `$page.url`. Simple a court terme, fragile a la maintenance (chaque nouvelle route pre-auth doit etre listee manuellement).

**Option recommandee :** A. UXDR-002 inclut `/login` et `/register-passkey` dans son scope uniquement pour le locale switcher — cela signifie que le switcher doit rester dans l'en-tete, ce qui est satisfait par l'option A. L'option B produit du CSS conditionnel dans le layout global, ce qui est une dette de maintenabilite.

**UXDR requis :** Oui. La question du locale switcher sur les routes pre-auth est deja couverte par UXDR-002 (GO). Le nouveau UXDR doit couvrir uniquement la structure du shell pre-auth (presence/absence de sidebar).

---

### D-03 — Stepper de statut : Opportunity pipeline et Invoice lifecycle

**Question :** Faut-il ajouter un stepper visuel horizontal sur le detail Opportunity (etapes pipeline) et le detail Invoice (Draft → Emise → Payee), ou le badge Tag existant est-il suffisant pour la Demo Slice courante ?

**Options :**
- A — Stepper horizontal sur les deux pages detail : affiche l'etape courante dans la sequence complete. Les donnees sont disponibles en API (`data.stages` pour Opportunity, statut enum pour Invoice). Pattern adopte par les ERP de marche pour les cycles lineaires.
- B — Conserver le badge Tag uniquement pour la Demo Slice ; planifier le stepper dans un workpackage ulterieur.

**Option recommandee :** A pour Opportunity (le pipeline stage est la proposition de valeur CRM centrale — le voir dans son contexte sequentiel est un besoin metier de premier rang). B acceptable pour Invoice a court terme si le badge colore suffit pour la Demo Slice.

**UXDR requis :** Oui pour l'adoption du composant stepper (si non existant dans `@sentropic/design-system-svelte`, choix de pattern a documenter).

---

### D-04 — Sections enfants sur Company detail (Opportunities + Contacts lies)

**Question :** La page detail Company doit-elle afficher des sections "Opportunites" et "Contacts" lies (listes en lecture), ou rester une fiche meta + timeline uniquement ?

**Options :**
- A — Ajouter sections Opportunites + Contacts lies en lecture sur la fiche Company. Requiert des requetes supplementaires. Aligne avec le pattern Project detail (sections inline). Valeur operationnelle forte pour les profils CRM.
- B — Conserver fiche legere meta + timeline. Les listes CRM permettent deja le filtrage par company ; la navigation Company → ses entites liees reste possible via les listes.

**Option recommandee :** A pour un profil utilisateur CRM. La fiche Company actuelle est operationnellement vide (agent B : "un commercial naviguant sur une societe ne voit que le timeline d'audit"). Cependant, l'implementation doit definir la regle uniforme inline vs page separee (agent B le souligne).

**UXDR requis :** Oui — decision de pattern IA (inline vs navigation), touchant plusieurs entites CRM.

---

## Items "juste corriger" (pas d'arbitrage UX)

Ces items sont des bugs ou des dettes techniques sans ambiguite de choix — ils peuvent etre planifies et implementes directement :

- **S-01** (token migration) — migration technique, pas de choix UX
- **S-03** (UUID → picker) — blocage fonctionnel pur, la solution est evidente
- **S-04** (overflow table mobile) — bug CSS, pas de choix UX
- **S-07** (labels uppercase non traduits) — oubli i18n
- **S-08** (boutons concatenes) — bug de layout CSS
- **S-10** (EMAIL/WEBSITE majuscules) — affichage, cle i18n
- **S-11** (codes audit bruts) — ajout de cles i18n
- **S-12** (back-link inconsistant) — alignement de pattern existant
- **S-13** (loss reason placeholder) — cle i18n manquante
- **S-14** (Proposal ID placeholder) — cle i18n manquante
- **S-15** ("Pipeline vide" pour Companies) — cle i18n incorrecte
- **S-16** (accents FR) — normalisation typographique
- **S-19** (champs montant) — type="number" + label CAD

---

## Synthese executive

**Verdict F-02 :** CONFIRME, SYSTEMIQUE. Le namespace `--sent-*` n'existe pas dans `@sentropic/design-system-tokens` ni dans `@sentropic/design-system-themes`. Les packages Sentropic publient exclusivement `--st-*` (227 proprietes tokens + 182 definitions theme). Les 381 occurrences de `var(--sent-*`, `var(--color-*`, `var(--space-*` dans 15/20 pages admin resolvent toutes a `undefined`. Le ThemeProvider est inoperant sur l'integralite de la section CRM, Project, et Billing. Le scope exact est 15 pages (vs "14 de 15" cite par Agent A — le vrai total est 15/20, les 5 pages propres etant approvals, audit, users, roles, settings). La correction est un workpackage de migration (S-01, effort L).

**Compte final (post-deduplication) :**
- Blockers : 4 (S-01 tokens, S-02 pre-auth mobile, S-03 UUID, S-04 overflow)
- Majors : 5 (S-05 sidebar IA, S-06 pre-auth desktop, S-07 labels i18n, S-08 boutons, S-09 stepper)
- Minors : 10 (S-10 a S-19, hors S-20 qui est GO)
- GO confirme : 1 (UXDR-002 locale switcher)

**Split bugs vs decisions :**
- Corrections directes (pas d'arbitrage) : 13 items (S-01, S-03, S-04, S-07 a S-16, S-19)
- Decisions UX requierant UXDR : 4 items (D-01 sidebar grouping, D-02 pre-auth shell, D-03 stepper, D-04 Company sections)
