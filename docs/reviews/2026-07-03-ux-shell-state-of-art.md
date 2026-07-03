# État de l'art — Shell d'administration ERP/B2B SaaS
## OpenERP — Drawer, Navigation verticale, Header, Boîte identité
### Date : 2026-07-03 | Rôle : état de l'art / best practices uniquement

> Ce document est la passe « état de l'art » d'une décision UX portant sur l'évolution du shell
> OpenERP vers un shell avec drawer, menus verticaux et header classique incluant boîte identité.
> Il ne constitue PAS une décision finale. Il alimente une passe de revue UI implémentée et une
> passe de synthèse/contradiction avant tout arbitrage.

---

## Synthèse

Le shell d'admin B2B SaaS mature converge vers un modèle stable depuis 2018–2022 (IBM Carbon,
Material Design, Salesforce Lightning, HubSpot) : **header pleine largeur fixe** avec
toggle + brand à gauche et utilitaires à droite (aide, langue, identité) ; **drawer vertical
persistant** sur desktop (240–280 px, sticky, collapsible en rail) ; **drawer overlay** sur mobile
(≤768 px) avec scrim, focus trap et Escape. Ce modèle est la référence directe d'IBM Carbon UI
Shell, dont dérive le design system `@sentropic`.

L'état actuel d'OpenERP (`+layout.svelte` / `app.css`) implémente le header et le groupage de nav
(UXDR-002 à UXDR-004), mais la sidebar reste un `<aside>` statique sans comportement de drawer :
pas de toggle hamburger, pas d'overlay mobile, pas de boîte identité. Le CSS mobile (< 760 px)
replie la sidebar en bloc au-dessus du contenu, ce qui est un anti-pattern documenté ci-dessous.

---

## 1. Anatomie header recommandée

### 1.1 IBM Carbon UI Shell (référence directe `@sentropic`)

```
[Hamburger toggle] [Logo / Nom produit]          [Actions globales →] [Avatar utilisateur]
   ↑                      ↑                             ↑                    ↑
 aria-expanded        lien /                   icônes : search,          toujours
 aria-controls=       accueil                  notif, lang, aide        en dernier
 "main-nav"
```

**Règles Carbon :**
- Le toggle hamburger est toujours le premier élément focusable du header.
- Le brand (logo + nom) est un lien `href="/"` immédiatement après le toggle.
- Les « header global actions » (icônes) s'accumulent de droite à gauche par ordre décroissant de
  fréquence d'usage : la moins fréquente est la plus à gauche, l'avatar utilisateur est toujours
  l'élément le plus à droite.
- Sur les breakpoints ≥ 1056 px, le hamburger peut être masqué si la SideNav est persistante et
  toujours visible — le toggle ne réapparaît qu'à ≤ 1055 px pour passer en mode overlay.

Sources : IBM Carbon Design System — UI Shell, Header component,
`carbondesignsystem.com/components/UI-shell-header/usage`.

---

### 1.2 Material Design — Navigation Drawer + App Bar

```
[≡ Menu]  [App name]                                 [Search] [More options]
```

- L'icône « hamburger » (trois traits) contrôle exclusivement le drawer.
- L'App Bar Top (≈ header) est séparée du drawer : elle porte le titre de la vue courante ou le
  nom de l'application.
- Les actions utilitaires (profil, paramètres) sont dans une icône « overflow » (⋮) à droite.
- Google Workspace (version entreprise) place l'avatar utilisateur en dernier à droite, identique
  à Carbon.

Sources : Material Design 3 — Navigation Drawer, Top App Bar, `m3.material.io`.

---

### 1.3 Odoo (ERP de référence)

```
[⊞ App switcher]  [Odoo]           [🐞] [💬] [🔔] [👤 Avatar]
```

- L'app switcher (grille 3×3) est le premier élément, équivalent fonctionnel du hamburger.
- Le brand « Odoo » est cliquable (retour au tableau de bord des apps).
- La langue est dans les préférences utilisateur (menu Avatar → Preferences → Language) — jamais
  dans le header principal.
- L'avatar ouvre un menu déroulant : nom complet, email, « My Profile », « Preferences »,
  « Sign out ».

Sources : Odoo 17 Community + Enterprise, interface admin.

---

### 1.4 Salesforce Lightning Experience

```
[☰] [Salesforce] [Org name]   [Tab nav →]   [🔍] [?] [⚙] [🔔] [👤]
```

- Hamburger à gauche, logo, puis nom de l'organisation en sous-titre.
- Navigation d'app (onglets horizontaux) entre le brand et les utilitaires — pattern propre à la
  taille Salesforce, **non recommandé pour OpenERP** à ce stade.
- Utilitaires de droite (gauche → droite) : Recherche, Aide, Configuration, Notifications, Avatar.
- Avatar → dropdown : nom, rôle, organisation (readonly), séparateur, « My Settings », « Switch to
  Lightning », « Log Out ».

Sources : Salesforce Lightning Design System — Global Navigation, App Launcher.

---

### 1.5 HubSpot CRM

```
[🔶 Logo]  [CRM | Marketing | Sales | Service | Reports | Operations]   [🔍] [?] [🔔] [⚙] [👤]
```

- Navigation horizontale d'app au centre (produit de taille enterprise).
- Utilitaires à droite : Search, Help, Notifications, Settings, Avatar.
- Avatar → dropdown : nom complet + email (readonly), nom du « Hub » (org), séparateur, « User
  Preferences », « Sign Out » + lien de basculement d'organisation.

Sources : HubSpot, interface admin, app.hubspot.com.

---

### 1.6 Anatomie recommandée pour OpenERP

```
[☰ Toggle]  [● OpenERP / Foundation]       [🌐 FR | EN]  [👤 Identité]
     ↑               ↑                            ↑              ↑
 aria-expanded   lien /admin             groupe UXDR-002    signin/menu
 aria-controls  aria-label="OpenERP home"                   (voir §3)
```

**Ordre des utilitaires à droite (gauche → droite) :**
1. Aide / Documentation (optionnel, si implémenté)
2. Sélecteur de langue `🌐 FR | EN` (UXDR-002, déjà en place)
3. Boîte identité `👤` (nouveau)

Ce séquençage suit la règle Carbon : les utilitaires globaux fréquents précèdent l'avatar, qui
est toujours le dernier élément avant le bord droit. Le sélecteur de langue reste à la gauche de
l'identité parce que la langue est un paramètre d'affichage global, distinct de la session
utilisateur.

---

## 2. Drawer par breakpoint

### 2.1 Trois modes reconnus (Material Design + Carbon)

| Mode | Alias Carbon | Alias Material | Breakpoint typique | Comportement |
|---|---|---|---|---|
| **Persistent / Standard** | Fixed SideNav | Standard drawer | ≥ 1056 px | Toujours visible, 240 px, ne couvre pas le contenu — le grid pousse la main à droite |
| **Rail** | SideNav rail | Navigation Rail | 600–1055 px (tablette) | Icons seules (48 px), labels masqués. Hover ou focus révèle le label. |
| **Overlay** | Modal SideNav | Modal drawer | ≤ 599 px (mobile) | Recouvre le contenu, scrim semi-transparent derrière, focus trap, Escape ferme |

**OpenERP (court terme):** Le rail est optionnel. Le saut direct Persistent → Overlay à ≤ 768 px
est le pattern le plus courant pour les apps B2B qui n'ont pas encore de vue tablette optimisée.

---

### 2.2 Desktop — Persistant / Collapsible

- La sidebar occupe une colonne fixe (240 px dans OpenERP aujourd'hui — valeur marché standard).
- Le toggle hamburger dans le header la réduit à 0 (masquée) ou à 48 px (rail).
- **Pattern Carbon rail :** icônes uniquement, tooltip sur hover, pas de label visible.
  `SideNav` Sentropic expose un prop `rail` (à vérifier avec l'API du package) ou peut être stylée
  en `width: 3rem` avec `overflow: hidden`.
- Le toggle hamburger doit être conservé même sur desktop si la sidebar est collapsible — certains
  opérateurs veulent maximiser la zone de contenu.

**Transition :** `transition: width 200ms ease-in-out` sur `.shell__sidebar` — assure un animation
perceptible sans surcharger. Carbon utilise 110 ms pour la fermeture, 150 ms pour l'ouverture.

---

### 2.3 Mobile — Overlay + Scrim + Focus trap

#### Structure HTML de référence (Carbon pattern)

```html
<!-- Bouton toggle dans le header -->
<button
  class="shell__hamburger"
  aria-label="Ouvrir la navigation"
  aria-expanded="false"
  aria-controls="primary-nav"
>
  <HamburgerIcon />
</button>

<!-- Scrim -->
<div
  class="shell__scrim"
  aria-hidden="true"
  onclick={closeNav}
></div>

<!-- Drawer -->
<aside
  id="primary-nav"
  class="shell__sidebar"
  aria-label="Navigation principale"
  aria-modal="true"
  inert={!navOpen}
>
  <!-- ... nav groups ... -->
</aside>
```

**Points clés :**
- `aria-expanded` sur le bouton toggle reflète l'état ouvert/fermé du drawer.
- `aria-controls` pointe vers l'`id` de l'`<aside>`.
- `aria-modal="true"` sur le drawer overlay indique aux lecteurs d'écran que le reste du DOM est
  inactif.
- `inert` (attribut HTML natif, support ≥ Chrome 102 / Safari 15.5 / Firefox 112) neutralise
  tout le DOM hors drawer quand le drawer est ouvert — implémente le focus trap nativement sans
  JS supplémentaire. Fallback : bibliothèque `focus-trap` ou boucle Tab manuelle.
- Le scrim a `aria-hidden="true"` : il est décoratif pour les AT.
- `onclick` sur le scrim ferme le drawer.

#### Séquence d'ouverture

1. Clic sur hamburger → `navOpen = true` → retrait de `inert` sur l'aside → focus sur le premier
   élément interactif du drawer (premier lien de nav ou bouton « Fermer »).
2. Tab/Shift+Tab restent dans le drawer.
3. Escape → `navOpen = false` → `inert` remis → focus retourne sur le bouton hamburger.

#### Séquence de fermeture

1. Escape : ferme, focus retourne au toggle.
2. Clic sur le scrim : ferme, focus retourne au toggle.
3. Navigation (clic sur un lien de nav) : ferme automatiquement sur mobile (SvelteKit navigation).

**Carbon Mobile specs :**
- Overlay drawer : 256 px de large (< 100 % viewport), laisse l'application visible derrière.
- Scrim : `background: rgba(0,0,0,0.5)`, `z-index` juste en dessous du drawer.
- Animation d'entrée : `transform: translateX(-100%)` → `translateX(0)` en 250 ms ease-in.

Sources : IBM Carbon — SideNav overlay, `aria-modal` best practices (W3C APG Modal pattern).

---

### 2.4 Tablette (600–1055 px) — Rail optionnel

Si implémenté :
- Sidebar : 48–64 px de large, icônes seules.
- Chaque `SideNavItem` affiche uniquement son icône, avec `title` ou `aria-label` pour l'AT.
- Un clic sur une icône peut soit naviguer directement (si l'item n'a pas d'enfants), soit ouvrir
  un tooltip de sous-navigation.
- Le toggle hamburger passe la rail en mode expanded (240 px) par-dessus le contenu (overlay
  temporaire) ou repousse le contenu (persistent temporaire).

**Décision OpenERP (recommandation) :** reporter le rail à une phase ultérieure ; implémenter
d'abord Persistent (desktop ≥ 769 px) + Overlay (≤ 768 px). Le breakpoint 760 px dans `app.css`
est déjà posé — il faut y remplacer le comportement actuel (bloc statique) par l'overlay.

---

## 3. Boîte identité + sélecteur de langue

### 3.1 Pattern signed-out

**Règle marché :** un bouton d'action primaire ou secondaire « Se connecter » visible dans la zone
d'actions à droite du header. Sur les routes pré-auth, la boîte identité est remplacée par ce CTA.

```
[🌐 FR | EN]   [Se connecter]
```

- `Se connecter` : `<Button variant="primary" href="/login">Se connecter</Button>`.
- Si une inscription est disponible : `[S'inscrire]  [Se connecter]` (secondaire + primaire).
- Sur les routes `/login` et `/register-passkey` (UXDR-004), le bouton peut être omis — l'écran
  est déjà le formulaire d'authentification. Le header n'affiche alors que brand + locale switcher,
  ce qui est l'état actuel correct.

Sources : Salesforce login page, HubSpot, GitHub.

---

### 3.2 Pattern signed-in — Menu déroulant identité

**Déclencheur :** bouton avec avatar (initiales ou photo) en dernier élément du header.

```
┌─────────────────────────────┐
│  👤  Prénom NOM             │  ← nom complet, non interactif
│      prenom.nom@domaine.ca  │  ← email, non interactif
│      Acme Inc.              │  ← organisation / tenant, non interactif
├─────────────────────────────┤
│  Mon profil                 │  → /admin/profile
│  Paramètres                 │  → /admin/settings
├─────────────────────────────┤
│  Se déconnecter             │  → POST /api/logout
└─────────────────────────────┘
```

**Règles marché :**
- Nom + email + organisation sont en lecture seule en tête de menu (contexte de la session, pas des
  actions). Carbon, Salesforce, HubSpot, GitHub suivent tous ce pattern.
- Séparateur visuel entre informations de session et actions.
- « Se déconnecter » est toujours en bas, souvent séparé par un diviseur.
- La langue **n'est pas dans ce menu** pour OpenERP (UXDR-002 GO D2 : switcher dans le header).
  Si une troisième langue est ajoutée plus tard, elle pourrait migrer vers ce menu — mais pas avant
  (voir risques UXDR-002).

**Composant Sentropic à utiliser :** `OverflowMenu` ou `Dropdown` (vérifier API), ou construction
native avec `Popover` + `role="menu"` + `role="menuitem"`.

---

### 3.3 Sélecteur de langue — placement et ordre

**Ordre recommandé dans la zone d'actions header (gauche → droite) :**

```
[Aide]  [🌐 FR | EN]  [👤 Avatar]
```

Ce séquençage est validé par :
- UXDR-002 (GO D2) : le switcher est dans les actions header.
- Pratique Carbon : les global actions précèdent l'avatar (toujours le plus à droite).
- Practice gouvernementale bilingue (Canada.ca, Service Canada) : la langue est toujours accessible
  avant les contrôles de session — un utilisateur non authentifié doit pouvoir changer de langue
  sans être connecté.
- GitHub : globe 🌐 avant avatar sur les pages publiques ; dans les préférences après connexion.

**Format actuel (2 locales) :** deux boutons toggle `FR | EN` avec `aria-pressed` (UXDR-002).
Ce format reste correct à 2 locales. À 3 locales : remplacer par un `Dropdown` avec globe icon
comme déclencheur — voir risques UXDR-002.

---

### 3.4 Boîte identité sur mobile

Sur mobile (overlay drawer ouvert), le header reste visible au-dessus du scrim. L'avatar dans le
header reste accessible. Il n'est pas recommandé de dupliquer l'identité dans le drawer sur
mobile (anti-pattern de duplication — voir §5).

---

## 4. Accessibilité

### 4.1 Toggle hamburger

```html
<button
  aria-label="Ouvrir la navigation"   <!-- ou "Fermer" selon l'état -->
  aria-expanded={navOpen}             <!-- booléen reflétant l'état du drawer -->
  aria-controls="primary-nav"        <!-- id de l'<aside> contrôlé -->
>
```

- `aria-expanded` doit être mis à jour dynamiquement avec l'état réel.
- `aria-label` peut être dynamique (`navOpen ? "Fermer la navigation" : "Ouvrir la navigation"`)
  ou statique (`"Navigation principale"`) — les deux sont acceptés par les AT.
- Ne pas utiliser `aria-haspopup` pour un drawer de navigation (réservé aux menus `role="menu"`).

Sources : W3C APG Disclosure Navigation, Carbon accessibility docs.

---

### 4.2 Focus trap sur overlay

Méthode native recommandée pour SvelteKit / Svelte 5 :

```svelte
<!-- Svelte 5 : inert est un attribut booléen standard -->
<aside
  id="primary-nav"
  inert={!navOpen}
  ...
>
```

L'attribut `inert` rend tous les éléments descendants non focusables, non cliquables, et cachés
des AT. C'est la méthode la plus robuste et la plus légère (pas de JS de boucle Tab). Support
navigateurs courants : Chrome 102+, Firefox 112+, Safari 15.5+ — acceptable pour une app B2B
en 2026.

Fallback si `inert` insuffisant : `focus-trap` (npm), qui gère Tab/Shift+Tab et Escape.

---

### 4.3 `aria-current` sur la navigation

```svelte
<!-- Dans SideNavItem ou équivalent -->
<a
  href={item.href}
  aria-current={item.active ? "page" : undefined}
>
  {item.label}
</a>
```

- `aria-current="page"` est la valeur correcte pour un lien de navigation indiquant la page
  courante (W3C, WCAG 4.1.2, ARIA 1.2).
- Ne pas utiliser `aria-selected` (réservé aux `role="option"` dans les listbox/combobox).
- Le composant `SideNav` Sentropic implémente déjà ce pattern via la prop `active` — vérifier que
  la valeur est bien `aria-current="page"` et non une classe CSS seule.

---

### 4.4 Skip link

```html
<!-- Premier élément du <body>, avant tout contenu de navigation -->
<a class="skip-link" href="#main-content">Passer au contenu principal</a>

<!-- Sur <main> -->
<main id="main-content" tabindex="-1">
```

```css
.skip-link {
  position: absolute;
  transform: translateY(-100%);
}
.skip-link:focus {
  transform: translateY(0);
  /* style visible : background brand, color white, padding */
}
```

- Le skip link doit être le premier élément focusable de la page — avant le header, avant le
  toggle hamburger.
- `tabindex="-1"` sur `<main>` permet au focus de s'y déposer après activation du skip link.
- Obligatoire WCAG 2.4.1 (Bypass Blocks, niveau A).

État actuel OpenERP : skip link absent — à ajouter dans `+layout.svelte` avant le `<Header>`.

---

### 4.5 Comportement Escape

```svelte
function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && navOpen) {
    navOpen = false;
    hamburgerRef?.focus(); // retour focus au toggle
  }
}
```

- Svelte 5 : `onkeydown` sur `window` ou `svelte:window`.
- L'Escape doit uniquement fermer le drawer overlay, pas déclencher d'autre comportement (pas de
  navigation, pas de fermeture de modals imbriquées).
- Si un modal ou un dropdown est ouvert à l'intérieur du drawer, l'Escape ferme d'abord la couche
  la plus interne (modal/dropdown), puis un second Escape ferme le drawer — comportement standard
  W3C APG.

---

### 4.6 Ordre de focus global recommandé

```
[Skip link (caché, visible au focus)]
→ [Toggle hamburger]
→ [Brand (lien)]
→ [Aide (optionnel)]
→ [Sélecteur de langue FR / EN]
→ [Avatar / bouton identité]
→ (drawer si ouvert : premier lien de nav → ... → dernier lien → bouton fermer → retour)
→ [Contenu principal #main-content]
```

Ce séquençage est conforme Carbon et suit l'ordre DOM logique — le header est avant le drawer dans
le HTML, le main vient en dernier.

---

## 5. Anti-patterns à éviter

### AP-01 — Navigation dupliquée (header + sidebar)

**Description :** reproduire les mêmes liens de nav dans le header horizontal ET dans la sidebar
verticale (pattern observé dans certaines versions de Salesforce et SAP).

**Problème :** les utilisateurs ne savent pas laquelle est canonique ; les AT lisent les liens
deux fois ; la maintenance de deux listes synchronisées est un vecteur de divergence.

**Règle :** une seule navigation primaire, dans la sidebar/drawer. Le header ne contient que
brand + utilitaires (langue, aide, identité) — jamais des liens métier (CRM, Billing, etc.).

---

### AP-02 — Drawer qui pousse le contenu sur mobile

**Description :** sur mobile (≤ 768 px), utiliser le mode « standard/persistent » du drawer qui
repousse la main latéralement au lieu d'un overlay.

**Problème :** le contenu réduit à ~150 px (390 px - 240 px drawer) est illisible pour les
tableaux, formulaires, et cartes. Le mode « push » n'est acceptable qu'à partir de 900+ px (tablettes
larges).

**État actuel OpenERP :** le CSS mobile (`@media (max-width: 760px)`) place la sidebar en
`grid-row: 2` au-dessus de la main — c'est également un anti-pattern (sidebar repousse le contenu
vers le bas, pushing it below the fold). À remplacer par drawer overlay.

**Règle :** sur mobile, le drawer est toujours un overlay (scrim + focus trap). Le contenu
derrière est inactif (`inert`) tant que le drawer est ouvert.

---

### AP-03 — Langue dans la navigation métier

**Description :** placer le sélecteur de langue comme un item de navigation dans la sidebar
(ex. : en bas de la SideNav, sous les items Admin).

**Statut :** rejeté explicitement par UXDR-001 et UXDR-002. Le switcher de langue n'est pas une
destination métier et ne doit pas concurrencer `aria-current="page"` sur les items de nav.

**Règle :** la langue est un utilitaire global dans la zone d'actions du header. Ne jamais rouvrir
ce débat sans un nouveau UXDR.

---

### AP-04 — Identité absente ou non accessible sur mobile

**Description :** masquer le bouton avatar ou le CTA « Se connecter » sur mobile pour économiser
de l'espace dans le header, forçant l'utilisateur à ouvrir le drawer pour accéder à son profil
ou à se connecter.

**Problème :** rompt l'affordance minimale — un utilisateur non connecté sur mobile ne peut pas
accéder à la connexion ; un utilisateur connecté ne peut pas se déconnecter facilement.

**Règle :** la boîte identité (avatar ou CTA connexion) est toujours visible dans le header à
tous les breakpoints. Si le header manque d'espace sur mobile, réduire la taille du brand
(`<strong>OpenERP</strong>` peut passer en icône seule `●`) et conserver les utilitaires.

---

### AP-05 — Focus non retourné au toggle après fermeture du drawer

**Description :** fermer le drawer (Escape ou clic sur scrim) sans replacer le focus sur le
bouton toggle.

**Problème :** l'utilisateur clavier se retrouve sans contexte de focus — le focus saute en début
de page ou sur `<body>`. Comportement non conforme WCAG 2.4.3 (Focus Order).

**Règle :** à la fermeture du drawer (quelle que soit la cause), le focus retourne explicitement
sur le bouton hamburger trigger (`hamburgerRef.focus()`).

---

### AP-06 — Drawer overlay sans `aria-modal`

**Description :** implémenter le drawer mobile comme un `<aside>` visible sans déclarer
`aria-modal="true"`.

**Problème :** les lecteurs d'écran (NVDA, JAWS, VoiceOver) continuent de lire le contenu derrière
le scrim, donnant l'impression que le drawer et la page sont accessibles simultanément.

**Règle :** drawer overlay = `aria-modal="true"` + `inert` sur le contenu hors drawer. Les deux
sont complémentaires (`aria-modal` informe les AT ; `inert` garantit le comportement focus/click).

---

### AP-07 — Skip link absent

**Description :** ne pas implémenter de lien « Passer au contenu principal ».

**Problème :** les utilisateurs clavier doivent traverser le toggle, le brand, la langue, l'avatar,
et tous les liens de nav (5 groupes × n items) avant d'atteindre le contenu — soit 25+ Tab presses
selon la section active.

**Statut OpenERP :** skip link actuellement absent — bloquant WCAG 2.4.1 niveau A.

---

## Sources

| Système | Patterns consultés | Référence |
|---|---|---|
| IBM Carbon Design System | UI Shell, Header, SideNav (overlay / fixed / rail), Header global actions, User avatar menu, aria patterns | carbondesignsystem.com — UI Shell, SideNav |
| Material Design 3 | Navigation Drawer (modal / standard / permanent), Navigation Rail, Top App Bar | m3.material.io — Navigation Drawer, Top App Bar |
| W3C APG (ARIA Authoring Practices Guide) | Modal Dialog pattern, Disclosure Navigation pattern, `aria-expanded`, `aria-controls`, `aria-current`, `inert` | w3.org/WAI/ARIA/apg |
| WCAG 2.1 AA | SC 2.4.1 Bypass Blocks, SC 2.4.3 Focus Order, SC 4.1.2 Name/Role/Value | w3.org/TR/WCAG21 |
| Odoo 17 Community + Enterprise | App switcher, Avatar dropdown, Header utilitaires, Langue dans préférences | Odoo interface admin, documentation |
| Salesforce Lightning Experience | Global Navigation, App Launcher, Avatar menu, SideNav collapsible | Salesforce LDS, lightningdesignsystem.com |
| HubSpot CRM (app.hubspot.com) | Header utilitaires, Avatar dropdown, Sidebar contextuelle | HubSpot interface admin |
| UXDR-001 / UXDR-002 | Sélecteur de langue shell, rejet sidebar footer et nav métier | rules/ux-decisions.md |
| UXDR-003 / UXDR-004 | Groupage SideNav, shell pré-auth | rules/ux-decisions.md |
| OpenERP `+layout.svelte` / `app.css` (état actuel) | Shell grid, sidebar statique, header locale switcher | apps/web/src/routes/+layout.svelte, apps/web/src/app.css |
