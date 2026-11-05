# PASS 2 — Revue de l’implémenté

Audit en lecture seule des conventions que le futur écran de rapprochement bancaire devra réutiliser. Les preuves sont citées sous la forme `path:line`.

## 1. Closest analogue screen

**Gabarit structurel à retenir : la file d’approbations admin**, soit
`apps/web/src/routes/admin/approvals/+page.svelte` avec son chargement et ses actions dans
`apps/web/src/routes/admin/approvals/+page.server.ts`. C’est le seul écran examiné qui représente
directement une file d’objets nécessitant une décision humaine. La facturation expose plutôt des
listes de ressources et de maintenance : les factures sont une grille de cartes avec actions
conditionnées par le statut (`apps/web/src/routes/admin/billing/invoices/+page.svelte:121`) et la
comptabilité est une table de consultation extensible (`apps/web/src/routes/admin/billing/accounting/+page.svelte:117`).

- **Coque de page :** `<Container size="xl" as="section">` puis `<Stack gap={6}>`
  (`apps/web/src/routes/admin/approvals/+page.svelte:36`). L’en-tête est un `Row` distribué
  `between`, avec `h1` + texte d’introduction à gauche et, à droite, un `Tag` indiquant la source
  API/démo/erreur (`apps/web/src/routes/admin/approvals/+page.svelte:38`,
  `apps/web/src/routes/admin/approvals/+page.svelte:45`). Titre et introduction viennent du
  catalogue i18n (`apps/web/src/routes/admin/approvals/+page.svelte:40`).
- **Filtres :** aucun filtre, recherche, tri, onglet ou pagination n’existe sur cet écran. La file
  reçue est rendue telle quelle à partir de `data.approvals`.
- **Liste :** ce n’est ni une table ni une liste HTML sémantique. Un `Stack` porte la classe
  `approvals-list`, puis un `{#each}` rend un `Card` par demande
  (`apps/web/src/routes/admin/approvals/+page.svelte:76`). Chaque carte montre comme titre
  `subjectType:subjectId`, le motif, un `Tag` d’urgence et l’horodatage
  (`apps/web/src/routes/admin/approvals/+page.svelte:78`,
  `apps/web/src/routes/admin/approvals/+page.svelte:81`). La mise en page locale reste limitée à
  des espacements et couleurs via tokens (`apps/web/src/routes/admin/approvals/+page.svelte:112`).
- **Actions de ligne :** chaque carte contient son propre formulaire POST progressif
  `action="?/decide"` avec identifiant caché, un `Input` de justification obligatoire
  (`minlength={3}`), puis deux `Button`, « approuver » primaire et « rejeter » secondaire
  (`apps/web/src/routes/admin/approvals/+page.svelte:87`,
  `apps/web/src/routes/admin/approvals/+page.svelte:89`,
  `apps/web/src/routes/admin/approvals/+page.svelte:97`). Il n’existe pas de panneau de détail
  séparé ni d’action groupée.
- **État vide :** `EmptyState` remplace entièrement la liste, avec titre et message traduits
  (`apps/web/src/routes/admin/approvals/+page.svelte:70`).
- **Chargement :** aucun squelette, spinner, `aria-busy`, désactivation ou libellé « en cours »
  n’est codé pour la file ou pour les deux soumissions. `use:enhance` est utilisé sans callback
  d’état (`apps/web/src/routes/admin/approvals/+page.svelte:87`).
- **Erreurs :** une indisponibilité backend conserve la page en mode de repli et affiche un
  `Alert tone="warning"` avec message serveur ou texte de secours
  (`apps/web/src/routes/admin/approvals/+page.svelte:52`). Une action échouée affiche un
  `Alert tone="error"` avec code et éventuel message (`apps/web/src/routes/admin/approvals/+page.svelte:58`).
  Une action réussie affiche un `Alert tone="success"` avec l’identifiant et la décision
  (`apps/web/src/routes/admin/approvals/+page.svelte:64`).
- **Confirmation des mutations :** approuver/rejeter n’ouvre **aucune** confirmation préalable ;
  la justification obligatoire est la seule friction avant soumission, et l’`Alert` est la
  confirmation après coup. Le seul précédent destructif trouvé dans le périmètre comparé est la
  suppression d’une facture brouillon : `onsubmit` appelle le `confirm()` natif du navigateur et
  annule l’envoi en cas de refus (`apps/web/src/routes/admin/billing/invoices/+page.svelte:158`).
  Ce n’est pas un dialogue du design system.

**Conséquence pour le futur worklist :** reprendre cette coque, la séquence
en-tête → alertes → état vide/liste → action par item et le formulaire progressif par item. Une
table dense peut être justifiée par le volume de données bancaires, mais elle ne serait alors pas
une copie littérale du gabarit actuellement livré ; l’analogue décisionnel reste la file
d’approbations.

## 2. Data access idiom

L’analogue n’appelle pas l’API depuis le composant Svelte. Il utilise le couple SvelteKit
**`+page.server.ts` SSR pour la lecture + named form action pour la mutation**, avec un client API
typé :

```ts
export const load: PageServerLoad = async ({ fetch, locals }) => {
  const session = clientFromLocalsOrEnv(fetch, locals);
  // ...
  const approvals =
    await session.client.listPendingApprovalsForApprover(session.actorUserId);
  return { approvals, source: "api" as const, locale: locals.locale };
};

export const actions: Actions = {
  decide: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    // validation...
    const result = await session.client.decideApprovalRequest({ /* ... */ });
    return { ok: true as const, id, decision };
  }
};
```

Cette forme est celle du code livré
(`apps/web/src/routes/admin/approvals/+page.server.ts:60`,
`apps/web/src/routes/admin/approvals/+page.server.ts:78`). Le composant soumet ensuite un formulaire
HTML à l’action nommée et l’améliore avec `use:enhance`
(`apps/web/src/routes/admin/approvals/+page.svelte:87`) : le worklist doit conserver ce fallback
HTML et ne pas introduire un `fetch` navigateur parallèle.

**Authentification et tenant :**

- `clientFromLocalsOrEnv()` lit `OPENERP_API_URL` et privilégie
  `locals.session.token`; il retourne aussi `locals.session.userIdentityId` comme acteur
  (`apps/web/src/routes/admin/approvals/+page.server.ts:33`,
  `apps/web/src/routes/admin/approvals/+page.server.ts:37`).
- Avec une session, `createApiClient` envoie `Authorization: Bearer <token>` et **n’envoie pas** les
  en-têtes `x-*`; le tenant est donc résolu à partir du JWT par l’API
  (`apps/web/src/lib/api/client.ts:107`, `apps/web/src/lib/api/client.ts:142`).
- Sans session, le mode de développement exige `OPENERP_DEV_ORG_ID` et
  `OPENERP_DEV_USER_ID`, transmis au client (`apps/web/src/routes/admin/approvals/+page.server.ts:46`).
  Le client les sérialise en `x-organization-id` et `x-user-identity-id`
  (`apps/web/src/lib/api/client.ts:151`).
- Le `fetch` fourni par l’événement SvelteKit est injecté dans le client, aussi bien au chargement
  que dans l’action (`apps/web/src/routes/admin/approvals/+page.server.ts:42`,
  `apps/web/src/routes/admin/approvals/+page.server.ts:50`).

**Contrat et erreurs :**

- Le client centralise URL, JSON et en-têtes ; `request<T>` lève une `ApiError` portant le statut
  HTTP et, si présent, le `code` de la réponse (`apps/web/src/lib/api/client.ts:159`,
  `apps/web/src/lib/api/client.ts:170`). Les méthodes d’approbation sont typées par les types de
  domaine et encodent query/path/body (`apps/web/src/lib/api/client.ts:211`,
  `apps/web/src/lib/api/client.ts:216`).
- Si aucun contexte session/dev n’est disponible, le `load` rend un jeu de démonstration et
  `source: "demo"` ; l’action refuse en `fail(503, { code: "DEMO_MODE_NO_API" })`
  (`apps/web/src/routes/admin/approvals/+page.server.ts:62`,
  `apps/web/src/routes/admin/approvals/+page.server.ts:93`).
- Une erreur de lecture ne fait pas échouer la navigation : elle devient
  `{ approvals: [], source: "error", locale, message }`
  (`apps/web/src/routes/admin/approvals/+page.server.ts:65`). Les entrées d’action sont validées
  côté serveur avec `fail(400, ...)`, les conflits métier deviennent `fail(409, ...)`, et les
  exceptions API `fail(502, { code: "API_ERROR", message })`
  (`apps/web/src/routes/admin/approvals/+page.server.ts:87`,
  `apps/web/src/routes/admin/approvals/+page.server.ts:105`,
  `apps/web/src/routes/admin/approvals/+page.server.ts:109`).
- Les mutations portent une clé d’idempotence, aujourd’hui
  ``web-${id}-${Date.now()}``, et l’identité de l’approbateur
  (`apps/web/src/routes/admin/approvals/+page.server.ts:97`). Le client la place dans
  `idempotency-key` (`apps/web/src/lib/api/client.ts:163`).

**Écart bancaire constaté :** aucune méthode ou type bancaire n’est actuellement exposé par
`apps/web/src/lib/api/client.ts` (recherche ciblée `bank|Bank|reconcil|transaction|match`, sans
résultat). Même si `/banking/*` existe côté backend, le nouvel écran devra d’abord étendre ce client
typé ; il ne doit pas contourner l’idiome avec des appels directs dans `+page.svelte`.

## 3. Design system

Le contrat du dépôt impose les packages `@sentropic/design-system-*` au runtime
(`rules/MASTER.md:7`). L’application web déclare exactement :

- `@sentropic/design-system-svelte` `^0.34.66`
  (`apps/web/package.json:17`) ;
- `@sentropic/design-system-themes` `^0.11.0`
  (`apps/web/package.json:18`) ;
- `@sentropic/design-system-tokens` `^0.11.0`
  (`apps/web/package.json:19`).

Le shell compile `sentTechTheme` vers `:root`
(`apps/web/src/routes/+layout.svelte:22`, `apps/web/src/routes/+layout.svelte:27`) et la feuille
globale exige des variables `--st-*` plutôt que des couleurs, espacements ou familles de police
codés en dur (`apps/web/src/app.css:1`). Le nouvel écran doit donc composer les primitives et tokens
du DS, sans hex, dimension `px` locale ni composant maison concurrent.

### Primitives effectivement utilisées dans l’application

| Besoin | État livré | Preuve et conséquence |
|---|---|---|
| Table | **`DataTable` utilisé** (le composant `Table` ne l’est pas) | L’audit construit des `DataTableColumn`/`DataTableRow` puis fournit `caption`, `pageSize` et libellé vide (`apps/web/src/routes/admin/audit/+page.svelte:49`, `apps/web/src/routes/admin/audit/+page.svelte:92`). Le DS permet aussi cellule rendue par snippet, sélection, tri, pagination et clic de ligne (`node_modules/@sentropic/design-system-svelte/dist/DataTable.svelte.d.ts:4`, `node_modules/@sentropic/design-system-svelte/dist/DataTable.svelte.d.ts:27`). Des tables HTML artisanales subsistent en facturation (`apps/web/src/routes/admin/billing/accounting/+page.svelte:85`) mais ne constituent pas le modèle à étendre. |
| Bouton | **`Button` utilisé partout** | Variantes primaire/secondaire et taille `sm` structurent les décisions de la file (`apps/web/src/routes/admin/approvals/+page.svelte:97`). |
| Badge / statut | **`Tag` utilisé ; `Badge` non utilisé** | Source, urgence et statuts métier sont tous des `Tag` avec `tone` sémantique (`apps/web/src/routes/admin/approvals/+page.svelte:46`, `apps/web/src/routes/admin/approvals/+page.svelte:82`). |
| Dialogue / modale | **`Modal` utilisé une fois** | La recherche globale du shell emploie la modale DS (`apps/web/src/routes/+layout.svelte:363`). Le composant DS fournit `role="dialog"`, `aria-modal`, piège de focus, Échap et retour au focus précédent (`node_modules/@sentropic/design-system-svelte/dist/Modal.svelte:52`, `node_modules/@sentropic/design-system-svelte/dist/Modal.svelte:69`, `node_modules/@sentropic/design-system-svelte/dist/Modal.svelte:119`). |
| Toast | **non utilisé par l’application** | Le package exporte néanmoins `Toast` (`node_modules/@sentropic/design-system-svelte/dist/index.d.ts:218`) avec rôles `status`/`alert` selon le ton (`node_modules/@sentropic/design-system-svelte/dist/Toast.svelte:13`). Les routes livrées confirment les actions par `Alert`, pas par toast. |
| Contrôles de formulaire | **`Form`, `FormGroup`, `Input`, `Select` et `Search` utilisés** | Login emploie `FormGroup` + `Input` (`apps/web/src/routes/login/+page.svelte:71`), les écrans reporting emploient `Select` (`apps/web/src/routes/admin/reporting/report-definitions/+page.svelte:120`) et le shell emploie `Search` (`apps/web/src/routes/+layout.svelte:370`). Les `Checkbox`, `Textarea`, `FilterBar`, `FilterPill` du DS ne sont pas utilisés par l’app. |
| Onglets | **non utilisés par l’application** | `Tabs` est bien exporté par la version installée (`node_modules/@sentropic/design-system-svelte/dist/index.d.ts:206`), mais aucune route web ne l’importe. |

### Ensemble nécessaire au worklist

Le socle de conformité est `Container` + `Stack` + `Row/Flex` pour la page, `Alert` pour les
résultats/erreurs, `EmptyState`, `Button`, `Tag`, et `Input`/`Select` ou `Search` pour les filtres.
Si le worklist est dense, `DataTable` est le composant disponible : ses cellules par snippet
permettent d’y placer `Tag`, montants et actions sans fabriquer une table parallèle. Une action
nécessitant confirmation doit employer `Modal`; les retours de mutation doivent par défaut suivre
le précédent `Alert`, faute de convention applicative autour des toasts. Aucun besoin démontré
n’impose `Tabs`.

### Primitives manquantes ou sans précédent

- **Pas de primitive DS fondamentale manquante pour construire l’écran :** `DataTable`, `Button`,
  `Tag`, `Modal`, `Toast`, contrôles et `Tabs` sont tous exportés.
- **CONTRAINTE — confirmation :** le package n’exporte pas de `Dialog`/`AlertDialog` spécialisé ;
  seulement le `Modal` générique (`node_modules/@sentropic/design-system-svelte/dist/index.d.ts:151`).
  Une confirmation accessible devra donc composer `Modal` + `Button` et définir explicitement le
  libellé, les actions et le focus initial ; le `confirm()` natif de facturation n’est pas une
  primitive DS.
- **CONTRAINTE — notifications :** `Toast` existe mais aucun hôte, empilement, cycle de vie ou
  précédent d’usage n’existe dans `apps/web`; l’implémentation ne doit pas inventer une
  infrastructure de toast pour ce seul écran. `Alert` est le langage livré.
- **CONTRAINTE — filtres/onglets :** `FilterBar`, `FilterPill` et `Tabs` sont disponibles dans le
  package (`node_modules/@sentropic/design-system-svelte/dist/index.d.ts:89`,
  `node_modules/@sentropic/design-system-svelte/dist/index.d.ts:206`) mais encore sans convention
  applicative. Leur adoption serait un nouveau choix UX/DS à couvrir par l’UXDR, pas une réutilisation
  démontrée.

## 4. Status visual language

Le langage visuel livré repose sur **`Tag` + libellé i18n + `tone` sémantique**. Le code métier
reste une valeur de domaine et sert à construire la clé de traduction ; par exemple
`billing.invoices.status.${status}` (`apps/web/src/routes/admin/billing/invoices/+page.svelte:35`)
et `workflow.status.${run.status}` (`apps/web/src/routes/admin/reporting/workflows/+page.svelte:41`).

### Vocabulaire et tons existants

- **Factures :** `draft` → « Brouillon » / “Draft”, `issued` → « Emise » / “Issued”,
  `paid` → « Payee » / “Paid”, `partially_paid` → « Partiellement payee » / “Partially paid”,
  `void` → « Annulee » / “Void”, `written_off` → « Passee en perte » / “Written off”
  (`packages/i18n/src/foundation.fr.json:363`,
  `packages/i18n/src/foundation.en.json:363`). `issued` et `paid` sont `success`;
  `void` et `written_off` sont `warning`; `draft` et `partially_paid` tombent sur `neutral`
  (`apps/web/src/routes/admin/billing/invoices/+page.svelte:39`). Le statut est rendu dans un
  `Tag` en en-tête de carte (`apps/web/src/routes/admin/billing/invoices/+page.svelte:138`).
- **Approbations :** le domaine prévoit `pending|approved|rejected|escalated|expired`
  (`packages/domain/src/foundation.ts:264`), mais la route ne rend que la file pending et
  **n’affiche pas de Tag de statut**. Elle affiche l’urgence brute : `high` → `error`,
  `low` → `info`, sinon `neutral` (`apps/web/src/routes/admin/approvals/+page.svelte:22`).
  Après décision, l’alerte de réussite traduit seulement `approved|rejected|escalated` en
  « approuvee/rejetee/escaladee » ou “approved/rejected/escalated”
  (`apps/web/src/routes/admin/approvals/+page.svelte:28`,
  `packages/i18n/src/foundation.fr.json:8`,
  `packages/i18n/src/foundation.en.json:8`). Le succès de l’opération est donc distinct de la
  valence métier de la décision : même un rejet réussi est dans un `Alert tone="success"`.
- **Workflows :** une définition active est `success`, inactive `neutral`, partagée `info`
  (`apps/web/src/routes/admin/reporting/workflows/+page.svelte:193`). Une exécution `completed`
  est `success`, `failed` est `warning`, tout autre état — aujourd’hui `skipped` — est `neutral`
  (`apps/web/src/routes/admin/reporting/workflows/+page.svelte:238`). Les libellés sont
  « Terminé / Échec / Ignoré » et “Completed / Failed / Skipped”
  (`packages/i18n/src/foundation.fr.json:628`,
  `packages/i18n/src/foundation.en.json:628`).

La grammaire implicite est donc :

- `success` = état accompli, actif ou engagé ;
- `warning` = état terminal indésirable/annulé/échoué, sans employer `error` ;
- `neutral` = brouillon, attente, inactif, ignoré/skipped ou état par défaut ;
- `info` = qualification secondaire, non bloquante ;
- `error` = urgence élevée ou erreur d’action, pas un statut métier terminal ordinaire.

### Application aux statuts bancaires déjà définis

Les unions canoniques existent déjà :
`BankTransactionReconciliationStatus = "unmatched"|"matched"|"ignored"` et
`ReconciliationLinkStatus = "proposed"|"confirmed"|"rejected"`
(`packages/domain/src/banking.ts:14`). Le worklist ne doit ni renommer ces codes ni les afficher
bruts.

Pour rester dans la grammaire livrée, le mapping de référence est :

| Code | Vocabulaire à traduire | Ton cohérent avec l’existant |
|---|---|---|
| `unmatched` | Non rapprochée / Unmatched | `neutral` — état en attente/default |
| `matched` | Rapprochée / Matched | `success` — état accompli |
| `ignored` | Ignorée / Ignored | `neutral` — parallèle de workflow `skipped` |
| `proposed` | Proposée / Proposed | `neutral` — proposition en attente de décision |
| `confirmed` | Confirmée / Confirmed | `success` — engagement accompli |
| `rejected` | Rejetée / Rejected | `warning` — parallèle de `failed`/`void` |

Le dernier mapping est le moins directement établi : l’approbation « rejected » n’a pas de Tag,
alors que les états négatifs terminaux des factures et workflows utilisent `warning`. L’UXDR final
doit donc ratifier `warning` pour le lien rejeté ou expliciter une autre convention ; il ne faut pas
employer `error` par simple intuition.

## 5. i18n

### Disposition des catalogues

`packages/i18n` est un package workspace publié sous `@sentropic/openerp-i18n`
(`packages/i18n/package.json:2`). Il contient un catalogue JSON plat par locale :

- `packages/i18n/src/foundation.en.json` ;
- `packages/i18n/src/foundation.fr.json`.

Le nom historique `foundation` ne signifie pas un fichier par fonctionnalité : facturation, CRM,
workflow, shell, etc. partagent ces deux fichiers. `catalog.ts` importe statiquement la paire,
limite `LocaleCode` à `"en"|"fr"` et expose `catalog` + `getMessage`
(`packages/i18n/src/catalog.ts:1`, `packages/i18n/src/catalog.ts:4`,
`packages/i18n/src/catalog.ts:7`). Le wrapper web `t(locale, key)` délègue directement à
`getMessage`, et la liste des locales web doit rester alignée sur les deux JSON
(`apps/web/src/lib/i18n.ts:5`, `apps/web/src/lib/i18n.ts:13`). Une clé absente ou dont la valeur est
vide/falsy déclenche aussi une erreur au runtime (`packages/i18n/src/catalog.ts:12`).

### Convention de clés

Les clés sont **plates et séparées par des points**, avec le domaine fonctionnel en tête, puis la
ressource et le rôle du texte :

- `approval.page.title`, `approval.action.approve`, `approval.empty.message`,
  `approval.decision.approved` (`packages/i18n/src/foundation.en.json:3`) ;
- `crm.companies.field.status`, `crm.companies.status.active`
  (`packages/i18n/src/foundation.en.json:33`,
  `packages/i18n/src/foundation.en.json:38`) ;
- `billing.invoices.status.draft` (`packages/i18n/src/foundation.en.json:363`) ;
- `workflow.status.completed` (`packages/i18n/src/foundation.en.json:628`).

Le worklist doit donc introduire les deux moitiés EN/FR d’un namespace cohérent
`banking.<ressource>.<rôle>`, notamment `page`, `field`, `filter`, `action`, `status`, `empty`,
`error` et `success`, plutôt que des chaînes visibles dans le Svelte.

### Ce que `validate-i18n.mjs` impose réellement

Le script lit uniquement `foundation.en.json` et `foundation.fr.json`
(`scripts/validate-i18n.mjs:5`, `scripts/validate-i18n.mjs:11`), trie leurs clés, puis calcule les
différences dans les deux sens (`scripts/validate-i18n.mjs:31`). Si une clé EN manque en FR, il
produit `fr:<clé>` ; si une clé FR manque en EN, `en:<clé>`
(`scripts/validate-i18n.mjs:34`). Toute différence rend `issues.length > 0`, lève
`Error("Missing i18n keys: ...")` et termine la commande en échec
(`scripts/validate-i18n.mjs:19`). `npm run check:foundation` appelle `check:i18n`, donc cet échec
bloque la vérification de fondation/CI (`package.json:12`, `package.json:14`).

Le validateur contrôle **la parité des ensembles de clés seulement**. Il ne vérifie ni la qualité
ou langue de la traduction, ni les valeurs vides, ni les clés effectivement consommées par le web.

### État bancaire

Il n’existe actuellement **aucune clé `banking.*`** dans les deux catalogues (recherche exacte
`rg -n '"banking\\.' packages/i18n`, aucun résultat). Les six statuts bancaires canoniques existent
uniquement dans le domaine (`packages/domain/src/banking.ts:14`) : leurs libellés, ainsi que tout
le texte du worklist, doivent être ajoutés simultanément aux deux JSON pour ne pas casser
`check:i18n`.

## 6. Binding a11y/responsive acceptance criteria

`apps/web/tests/ui-review.spec.ts` est le contrat mesurable du shell. Sa matrice couvre desktop
1440×900, desktop court 1280×720 et mobile 390×844 (`apps/web/tests/ui-review.spec.ts:5`), dans les
deux locales FR/EN (`apps/web/tests/ui-review.spec.ts:78`). La route bancaire n’est pas encore dans
`adminRoutes`, qui énumère aujourd’hui les routes jusqu’aux modules reporting/admin
(`apps/web/tests/ui-review.spec.ts:15`) : elle devra être ajoutée avec ses deux libellés de `h1`.

### Assertions de coque héritées

- Le `h1` localisé exact doit être visible après chargement/hydratation
  (`apps/web/tests/ui-review.spec.ts:95`, `apps/web/tests/ui-review.spec.ts:103`).
- Le `banner` global doit rester visible ; le header, la marque et le sélecteur de locale doivent
  rester contenus et dans le viewport (`apps/web/tests/ui-review.spec.ts:108`,
  `apps/web/tests/ui-review.spec.ts:178`). Sur desktop, header sticky, sidebar et main doivent être
  ordonnés sans recouvrement (`apps/web/tests/ui-review.spec.ts:186`,
  `apps/web/tests/ui-review.spec.ts:663`).
- Aucun débordement horizontal supérieur à 1 px n’est toléré pour `body` ou `documentElement`
  (`apps/web/tests/ui-review.spec.ts:597`). C’est particulièrement contraignant pour une table
  bancaire : le composant et ses actions doivent rester confinés au main, avec défilement interne
  si nécessaire.
- Chaque route génère des preuves reviewer : captures du header, de la sidebar desktop et du main
  (`apps/web/tests/ui-review.spec.ts:191`, `apps/web/tests/ui-review.spec.ts:200`,
  `apps/web/tests/ui-review.spec.ts:211`). Le worklist devra être inclus dans ce passage FR/EN et
  desktop/mobile.

### Desktop, mobile et navigation active

- **Desktop :** sidebar visible, sélecteur de langue visible, une seule section de niveau 2
  correspondant au module actif, lien de route `aria-current="page"` ; les cinq modules de niveau
  1 sont visibles dans le header et le module actif y porte aussi `aria-current="page"`
  (`apps/web/tests/ui-review.spec.ts:157`, `apps/web/tests/ui-review.spec.ts:160`,
  `apps/web/tests/ui-review.spec.ts:167`). Le test UXDR-008 vérifie aussi hamburger caché et
  navigation panel visible à 1280×800 (`apps/web/tests/ui-review.spec.ts:422`,
  `apps/web/tests/ui-review.spec.ts:439`, `apps/web/tests/ui-review.spec.ts:444`).
- **Mobile :** sidebar et sélecteur de langue du header sont cachés ; le bouton « Open/Ouvrir la
  navigation » ouvre `#primary-nav` (`apps/web/tests/ui-review.spec.ts:136`). Le tiroir contient le
  lien actif avec `aria-current="page"`, les cinq sections globales, la langue et l’identité
  (`apps/web/tests/ui-review.spec.ts:144`, `apps/web/tests/ui-review.spec.ts:149`,
  `apps/web/tests/ui-review.spec.ts:153`). À 375×812, le hamburger doit être visible, la sidebar
  desktop invisible et les utilitaires déplacés dans le tiroir
  (`apps/web/tests/ui-review.spec.ts:475`,
  `apps/web/tests/ui-review.spec.ts:492`,
  `apps/web/tests/ui-review.spec.ts:496`,
  `apps/web/tests/ui-review.spec.ts:501`).
- Le tiroir se ferme sur Échap et sur backdrop
  (`apps/web/tests/ui-review.spec.ts:518`, `apps/web/tests/ui-review.spec.ts:526`).

### Clavier, focus et skip link

- L’ordre clavier desktop canonique est
  **skip → marque → CRM → Projects → Billing → Reporting → Admin → recherche → langue → identité
  → premier lien de la sidebar** (`apps/web/tests/ui-review.spec.ts:363`). Les assertions de focus
  traversent les cinq liens, la recherche, la langue, l’identité puis « Users »
  (`apps/web/tests/ui-review.spec.ts:366`, `apps/web/tests/ui-review.spec.ts:373`,
  `apps/web/tests/ui-review.spec.ts:386`, `apps/web/tests/ui-review.spec.ts:391`).
- Le skip link DS `.st-skipLink` doit être focusable et visible lorsqu’il reçoit le focus
  (`apps/web/tests/ui-review.spec.ts:459`).
- Le **retour de focus** est explicitement testé à la fermeture du drawer par Échap : le hamburger
  doit retrouver le focus (`apps/web/tests/ui-review.spec.ts:518`). Aucun test existant ne couvre
  encore le piège de focus ou le retour de focus d’une `Modal`; si le worklist ajoute une
  confirmation modale, ces assertions deviennent un critère à ajouter, même si la primitive DS
  implémente déjà ce comportement.

### Changement de locale

Sur `/admin/approvals`, le sélecteur doit :

1. afficher la locale active et être visible ;
2. changer `html lang` ;
3. traduire le `h1` ;
4. conserver exactement le pathname courant lors de FR → EN puis EN → FR.

Ces quatre résultats sont vérifiés dans les deux sens
(`apps/web/tests/ui-review.spec.ts:302`,
`apps/web/tests/ui-review.spec.ts:323`,
`apps/web/tests/ui-review.spec.ts:330`,
`apps/web/tests/ui-review.spec.ts:341`). Le worklist hérite du même contrat : route, filtres et
contexte de travail ne doivent pas être perdus lors du changement de langue.

### Apport de `uxdr-005-006.spec.ts`

Cette spec n’ajoute pas d’assertion de shell. Elle fixe cependant deux précédents d’accessibilité
et de localisation utiles :

- une progression visuelle doit exposer exactement un `aria-current="step"` et des états
  machine `done/current/upcoming` (`apps/web/tests/uxdr-005-006.spec.ts:23`,
  `apps/web/tests/uxdr-005-006.spec.ts:71`) ; le libellé FR est vérifié
  (`apps/web/tests/uxdr-005-006.spec.ts:86`) ;
- les sous-listes métier sont de vraies listes avec éléments `<li>` et liens vers le détail
  (`apps/web/tests/uxdr-005-006.spec.ts:125`,
  `apps/web/tests/uxdr-005-006.spec.ts:130`,
  `apps/web/tests/uxdr-005-006.spec.ts:153`), et restent visibles/localisées en FR
  (`apps/web/tests/uxdr-005-006.spec.ts:164`).

Un worklist sous forme de cartes doit donc corriger le défaut sémantique de l’analogue approvals
en utilisant `ul/li`; sous forme de `DataTable`, il doit conserver caption/en-têtes et cellule
d’action accessibles. Un stepper n’est pas requis par ce précédent, mais s’il en apparaît un, les
assertions UXDR-005 deviennent contraignantes.

## 7. Prior ratified UX decisions

### Effet de chaque UXDR-00x sur un nouvel écran bancaire

| UXDR | Statut et contrainte |
|---|---|
| **UXDR-001** | **Non opposable.** La décision du switcher en footer de sidebar est contestée et explicitement supersédée ; il ne faut pas la réutiliser (`rules/ux-decisions.md:3`, `rules/ux-decisions.md:5`). |
| **UXDR-002** | **Acceptée.** La langue est un utilitaire global du header, jamais une destination métier ; le changement conserve la route et `html lang` (`rules/ux-decisions.md:45`, `rules/ux-decisions.md:51`). La forme historique en deux boutons a depuis été remplacée par `LanguageToggle`, mais placement et sémantique restent opposables via l’addendum UXDR-008 (`rules/ux-decisions.md:264`). Le worklist ne doit donc pas placer de réglage de langue dans son contenu ou sa nav. |
| **UXDR-003** | **Acceptée.** La navigation admin est groupée par modules avec intitulés localisés et liens actifs `aria-current="page"` (`rules/ux-decisions.md:88`, `rules/ux-decisions.md:94`). Sa structure initiale à quatre sections a ensuite gagné Reporting et été remaniée par UXDR-009 ; elle reste le fondement qui interdit le retour à une liste plate ou à des en-têtes interactifs. |
| **UXDR-004** | **Acceptée, mais portée pré-auth.** Seuls `/login` et `/register-passkey` perdent toute navigation admin (`rules/ux-decisions.md:121`, `rules/ux-decisions.md:127`). Une route `/admin/...` bancaire doit donc utiliser le shell admin complet, pas un layout spécial pleine largeur. |
| **UXDR-005** | **Acceptée, portée détails Opportunity/Invoice.** Le stepper complète le `Tag` sans le remplacer, et le registre affirme que le `Tag` est le pattern compact des vues liste (`rules/ux-decisions.md:155`, `rules/ux-decisions.md:161`, `rules/ux-decisions.md:170`). Le worklist doit conserver les `Tag` de statut ; il ne doit pas importer un stepper de cycle de vie dans chaque ligne. |
| **UXDR-006** | **Acceptée, portée détail Company.** Elle établit la préférence pour des listes liées en lecture seule et rejette, dans ce contexte, inline-create, onglets ou sous-routes (`rules/ux-decisions.md:187`, `rules/ux-decisions.md:193`, `rules/ux-decisions.md:202`). Ce n’est pas une interdiction globale d’onglets, mais il n’existe donc aucun précédent ratifié pour introduire des tabs dans le worklist. |
| **UXDR-007** | **Proposée / NO-GO sur le split.** Reporting reste un seul groupe ; le séparer de l’automatisation est différé jusqu’à un 7e item ou une refonte d’URL (`rules/ux-decisions.md:220`, `rules/ux-decisions.md:222`, `rules/ux-decisions.md:242`). Le bancaire ne doit pas être utilisé comme prétexte pour remanier Reporting. |
| **UXDR-008** | **GO.** Desktop : navigation persistante ; mobile : drawer overlay ; langue et identité rejoignent le drawer compact ; skip link en premier ; Échap/backdrop ferment et rendent le focus ; pré-auth garde uniquement marque/langue (`rules/ux-decisions.md:248`, `rules/ux-decisions.md:252`, `rules/ux-decisions.md:266`). Toute nouvelle route admin hérite de cette anatomie et de ces comportements, sans shell local. |
| **UXDR-009** | **Acceptée et déterminante pour l’IA actuelle.** Les cinq modules CRM, Projets, Facturation, Rapports, Admin sont les liens de niveau 1 dans le header ; le panneau gauche ne montre que les sous-items du module actif ; le layout est `AppShell variant=workspace` (`rules/ux-decisions.md:270`, `rules/ux-decisions.md:276`). Le rail extensible reste une orientation conditionnée au DS, pas une capacité à implémenter dans le worklist (`rules/ux-decisions.md:280`). Le nouvel écran ne doit pas créer un sixième module header. |

**Wording ratifié pertinent :** les groupes bilingues sont CRM, Projets/Projects,
Facturation/Billing, Rapports/Reporting et Admin (`rules/ux-decisions.md:276`). Le nom de route
bancaire et les termes « rapprochement / reconciliation » ne sont ratifiés dans aucun UXDR
existant. En revanche, la collision FR du groupe « Rapports » a déjà conduit à renommer l’item
rapport « Rapports personnalisés » (`rules/ux-decisions.md:235`) : un nouveau libellé doit être
distinct du nom du groupe qui le contient.

### Précédent documentaire dans `docs/reviews/`

Deux séries à trois passes définissent le format attendu :

- 2026-05-26 :
  `2026-05-26-ux-review-state-of-art.md`,
  `2026-05-26-ux-review-implemented.md`,
  `2026-05-26-ux-review-synthesis.md` ;
- 2026-07-03 :
  `2026-07-03-ux-shell-state-of-art.md`,
  `2026-07-03-ux-shell-implemented.md`,
  `2026-07-03-ux-shell-synthesis.md`.

La passe implémentée commence par reviewer, méthode, mode de données, viewports/locales et volume
de contrôles (`docs/reviews/2026-05-26-ux-review-implemented.md:1`), puis fournit une matrice
route×viewport×locale (`docs/reviews/2026-05-26-ux-review-implemented.md:13`), des constats
priorisés et, par route, le bloc canonique :
`Route / Viewport / Locale / Selector / Severity / Evidence / Recommended fix / Acceptance`
(`docs/reviews/2026-05-26-ux-review-implemented.md:184`). Elle termine par les observations
transversales et l’index de captures (`docs/reviews/2026-05-26-ux-review-implemented.md:453`,
`docs/reviews/2026-05-26-ux-review-implemented.md:467`). La revue shell plus récente sépare
explicitement DOM/code actuel, écarts, APIs DS, manques à composer, contraintes session/i18n et
recommandations (`docs/reviews/2026-07-03-ux-shell-implemented.md:8`,
`docs/reviews/2026-07-03-ux-shell-implemented.md:53`,
`docs/reviews/2026-07-03-ux-shell-implemented.md:67`,
`docs/reviews/2026-07-03-ux-shell-implemented.md:217`).

La synthèse cite ses deux entrées indépendantes
(`docs/reviews/2026-05-26-ux-review-synthesis.md:3`), sépare
`Etat de l'art / Revue implementee / Contradiction / Synthese`, transforme les constats en backlog
priorisé puis isole les décisions à arbitrer avec options
(`docs/reviews/2026-05-26-ux-review-synthesis.md:9`,
`docs/reviews/2026-05-26-ux-review-synthesis.md:73`,
`docs/reviews/2026-05-26-ux-review-synthesis.md:100`). Le présent fichier est donc bien une
**passe 2**, pas un UXDR décisionnel autonome : l’orientation finale devra réconcilier cette preuve
avec l’état de l’art et la contradiction avant d’être ajoutée au registre.

## 8. Navigation/IA

La définition réelle de toute la navigation est centralisée dans
`apps/web/src/routes/+layout.svelte`.

### Logique livrée

- `activeModule` classe les URL par préfixe ; toute route commençant par
  `/admin/billing` active le module `billing`
  (`apps/web/src/routes/+layout.svelte:152`).
- `navGroup()` transforme `{ label, href }` en `SideNavItem` et marque l’item actif si le pathname
  commence par son `href` (`apps/web/src/routes/+layout.svelte:162`). Un nouveau href doit donc être
  assez spécifique pour ne pas activer plusieurs items.
- `billingItems` contient aujourd’hui, dans l’ordre, Factures/Invoices, Taxes et
  Comptabilité/Accounting (`apps/web/src/routes/+layout.svelte:181`). Les libellés viennent des
  clés `nav.invoices`, `nav.taxes`, `nav.accounting`, et le groupe de `nav.section.billing`
  (`packages/i18n/src/foundation.fr.json:177`,
  `packages/i18n/src/foundation.fr.json:470`,
  `packages/i18n/src/foundation.fr.json:473`).
- Le desktop ne rend dans le panneau gauche que la `NavSection` du module actif ; pour billing,
  celle-ci reçoit exactement `billingItems` (`apps/web/src/routes/+layout.svelte:230`,
  `apps/web/src/routes/+layout.svelte:240`).
- Le drawer mobile rend au contraire les cinq `NavSection` et leurs `SideNav`
  (`apps/web/src/routes/+layout.svelte:212`,
  `apps/web/src/routes/+layout.svelte:338`).
- Le header conserve cinq liens de niveau 1. « Billing/Facturation » pointe vers
  `/admin/billing/invoices` et devient actif pour tout `activeModule === "billing"`
  (`apps/web/src/routes/+layout.svelte:274`,
  `apps/web/src/routes/+layout.svelte:279`). Le contenu reste dans
  `AppShell variant="workspace"` avec panel actif + main
  (`apps/web/src/routes/+layout.svelte:410`).

### Point d’attache du rapprochement bancaire

L’entrée doit être un **quatrième `SideNavItem` de `billingItems`, sous le groupe existant
Facturation/Billing**, naturellement après Comptabilité/Accounting. Elle ne doit créer ni sixième
module dans le header, ni groupe Banking autonome, ni item sous Admin ou Reporting. Sa route web
doit rester sous le préfixe `/admin/billing/...` pour hériter automatiquement de `activeModule`,
du panel de niveau 2 desktop et de l’état actif dans le drawer mobile.

Le registre ne tranche pas encore le slug ni le libellé exact. La forme la plus explicite serait
une route de type `/admin/billing/reconciliation` avec une paire i18n telle que
`nav.reconciliation`, mais il s’agit d’une **proposition à ratifier**, pas d’un fait livré. Le fait
opposable est le point d’insertion dans `billingItems` et le préfixe `/admin/billing`.

## MUST CONFORM TO

- [ ] **Gabarit :** reprendre la coque de
  `apps/web/src/routes/admin/approvals/+page.svelte` :
  `Container xl` + `Stack`, header `Row`, source `Tag`, alertes, état vide, collection puis action
  par item.
- [ ] **Structure de collection :** employer `DataTable` avec caption/en-têtes/cellules snippet
  pour une file dense, ou `ul/li` + `Card` pour une file en cartes ; ne pas copier le `Stack` non
  sémantique d’approvals ni fabriquer une table CSS parallèle.
- [ ] **États :** couvrir explicitement chargement/soumission, vide, erreur de lecture, erreur
  d’action et succès ; `Alert` est le feedback livré, `EmptyState` l’état vide.
- [ ] **Mutations :** formulaire SvelteKit `method="POST"` + action nommée + `use:enhance`,
  validation serveur avec `fail(...)`, clé d’idempotence, aucun `fetch` direct dans le composant.
- [ ] **Données/auth :** `+page.server.ts` injecte le `fetch` SvelteKit dans
  `createApiClient`; JWT `locals.session.token` en priorité, fallback dev
  organisation/utilisateur seulement selon la convention existante ; locale issue de
  `locals.locale`.
- [ ] **Client :** ajouter des méthodes bancaires typées à `apps/web/src/lib/api/client.ts` sur les
  types de `packages/domain/src/banking.ts`; conserver le traitement central des codes/statuts HTTP.
- [ ] **Design system :** primitives `@sentropic/design-system-svelte` et variables `--st-*`
  exclusivement. Utiliser `Button`, `Tag`, `Alert`, `EmptyState`, contrôles DS, et `Modal` si une
  confirmation est ratifiée ; aucun hex, `px` local ou composant ad hoc concurrent.
- [ ] **Statuts :** ne jamais afficher les codes bruts. Employer des `Tag` localisés et la grammaire
  de tons existante : attente/ignoré `neutral`, accompli/confirmé `success`, terminal négatif
  `warning` à ratifier, `error` réservé aux erreurs/urgences.
- [ ] **i18n :** toutes les chaînes visibles et ARIA sous `banking.*`/`nav.*`, ajoutées
  simultanément à `foundation.en.json` et `foundation.fr.json`; `npm run check:i18n` doit passer.
- [ ] **Responsive :** ajouter la route à la matrice `ui-review.spec.ts` FR/EN pour 1440×900,
  1280×720 et 390×844, plus le comportement mobile à 375×812 ; aucun débordement horizontal.
- [ ] **A11y :** `h1` exact localisé, collection sémantique, caption/en-têtes si table, libellés des
  actions, focus visible, ordre clavier du shell intact, skip link fonctionnel, `aria-current`
  route/module, fermeture Échap et retour de focus pour tout overlay.
- [ ] **Locale :** changement FR/EN conserve le pathname et le contexte/filtre utile, met à jour
  `html lang`, le titre, les statuts, les champs et les actions.
- [ ] **Navigation :** ajouter un sous-item à `billingItems`, sous Facturation/Billing, avec route
  `/admin/billing/...`; ne modifier ni les cinq modules header ni les groupes Reporting/Admin.
- [ ] **Preuves de revue :** Playwright + captures reviewer du header, panneau/main desktop et main
  mobile, pour FR/EN et pour les modes de données effectivement supportés.

## GAPS

- **Écran absent :** aucune route web bancaire ni entrée de navigation n’existe.
- **Client web absent :** aucun type/méthode bancaire dans `apps/web/src/lib/api/client.ts`, malgré
  les routes backend et les types domaine livrés.
- **i18n absent :** aucune clé `banking.*`, aucun libellé de nav bancaire et aucune traduction des
  six statuts.
- **Route/wording non ratifiés :** ni slug web ni libellé EN/FR (« Rapprochement bancaire »,
  « Transactions bancaires », etc.) ne sont décidés.
- **Filtres non précédés :** l’analogue approvals n’en a aucun ; `FilterBar`/`FilterPill` existent
  dans le DS mais ne sont utilisés nulle part dans l’app.
- **Chargement incomplet dans l’analogue :** approvals n’expose ni état pending, ni désactivation,
  ni `aria-busy`.
- **Confirmation non tranchée :** approvals soumet directement après justification et billing
  emploie `window.confirm`; le DS n’a pas d’`AlertDialog` spécialisé, seulement `Modal`.
- **Toast sans convention :** le composant DS existe, mais l’app n’a ni hôte ni usage ; les routes
  livrées emploient `Alert`.
- **Mapping `rejected` à ratifier :** `warning` est cohérent avec failed/void, mais aucun Tag
  d’approbation rejetée ne fournit de précédent direct.
- **A11y spécifique worklist non testée :** aucune assertion actuelle sur le parcours clavier des
  actions de ligne, l’annonce de mise à jour d’un item, le focus après disparition d’une ligne, ou
  le piège/retour de focus d’une confirmation modale.
- **Matrice reviewer à étendre :** `ui-review.spec.ts` ne connaît pas encore la route ni ses
  libellés FR/EN.
- **Preuve visuelle hors périmètre de cette passe :** cet audit est fondé sur code/tests existants
  et n’a pas lancé l’application ni produit de captures de la future route, puisqu’elle n’existe
  pas. La revue de l’implémentation future devra fournir les observations route/viewport/locale/
  mode de données exigées par le gate UI.
