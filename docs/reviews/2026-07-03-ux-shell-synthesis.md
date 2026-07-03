# Passe contradiction/synthèse — Shell OpenERP (2026-07-03)

Rôle : confrontation des deux rapports indépendants, arbitrage des zones floues, orientation
consolidée et matière UXDR-003.

Sources primaires :
- Passe état de l'art : `docs/reviews/2026-07-03-ux-shell-state-of-art.md`
- Passe UI implémentée : `docs/reviews/2026-07-03-ux-shell-implemented.md`
- Décisions antérieures : `rules/ux-decisions.md` (UXDR-001 à UXDR-007)
- Code vérifié : `apps/web/src/routes/login/finish/+server.ts`, `+layout.server.ts`, `hooks.server.ts`, `app.d.ts`

---

## 1. Confrontation des deux passes

### 1.1 Points d'accord complets (non disputés)

| Sujet | Accord |
|---|---|
| Header pleine largeur fixe, sticky | Les deux passes — confirmé par le DOM live |
| Ordre utilitaires header : Langue → Identité | Les deux passes, conforme UXDR-002 GO D2 + règle Carbon |
| Toggle hamburger absent = blocant | Les deux passes — absente du DOM live |
| Boîte identité absente du header = blocant | Les deux passes — "Sign in" dans le contenu de page |
| Composant DS : `OverflowMenu` pour la boîte identité | Passe implémentée (API confirmée) ; passe état de l'art recommande le même pattern |
| 5 groupes SideNav conservés (UXDR-003 + UXDR-007) | Les deux passes |
| Skip link WCAG 2.4.1 absent = bloquant | Les deux passes |
| `aria-expanded` + `aria-controls` sur le hamburger | Les deux passes |
| `inert` sur le drawer overlay mobile | Les deux passes |
| Route de déconnexion absente = prérequis technique | Passe implémentée ; passe état de l'art le déduit |
| `aria-current="page"` sur les items SideNav actifs | Les deux passes |

### 1.2 Contradictions et zones floues

#### Zone A — Desktop : sidebar collapsible en rail vs statique

La passe état de l'art recommande une sidebar collapsible avec toggle hamburger conservé même sur
desktop, et propose un mode rail (icônes 48 px) pour tablette 600–1055 px. Elle cite Carbon comme
référence et mentionne que certains opérateurs veulent maximiser l'espace contenu.

La passe implémentée recommande de conserver la sidebar desktop comme `<aside>` statique (240 px,
sticky, dans le CSS grid), sans toggle desktop, et d'utiliser le composant `Drawer` DS uniquement
en mobile. Elle ne mentionne pas de mode rail.

**Analyse** : La passe état de l'art indique elle-même : "Le saut direct Persistent → Overlay à
≤ 768 px est le pattern le plus courant pour les apps B2B qui n'ont pas encore de vue tablette
optimisée." et recommande de "reporter le rail à une phase ultérieure". La passe implémentée
converge vers ce choix court terme. La contradiction est donc réelle sur le principe (rail vs pas
de rail) mais les deux passes s'accordent implicitement sur la trajectoire immédiate.

**Tranche (voir §3) :** Sidebar desktop PERSISTANTE et STATIQUE (240 px), sans toggle desktop ni
mode rail. Toggle hamburger CSS `display: none` sur ≥ 769 px. Mode rail différé.

#### Zone B — Composant Drawer DS : périmètre d'usage

La passe état de l'art décrit l'anatomie d'un overlay mobile avec `<aside aria-modal="true"
inert={!navOpen}>` et focus trap natif, sans préciser si le composant DS `Drawer` ou une
construction custom est à utiliser.

La passe implémentée confirme que le composant `Drawer` DS (`open`, `side="left"`, `onclose`) est
disponible et adapté pour le mobile. Elle note que le composant ne gère pas nativement la touche
Escape ni le focus trap.

**Accord confirmé :** le composant `Drawer` DS est utilisé uniquement en mobile overlay. Sur
desktop, c'est un `<aside>` custom dans le CSS grid. Pas de contradiction — les deux passes
s'alignent sur ce périmètre.

**Gap à combler :** ajouter `<svelte:window onkeydown={handleEscape}>` pour Escape, et s'appuyer
sur le `aria-modal="true"` natif du composant (`<aside role="dialog" aria-modal="true">` confirmé
dans la source publiée). Le `backdrop` du composant (`position: fixed; inset: 0; z-index: 90`)
joue déjà le rôle de scrim. L'attribut `inert` sur le contenu hors drawer doit être ajouté
manuellement dans le `+layout.svelte`.

#### Zone C — Variant du bouton "Se connecter"

La passe état de l'art propose `variant="primary"`. La passe implémentée propose `variant="secondary" size="sm"`.

**Tranche :** `variant="secondary" size="sm"`. Rationale : OpenERP n'a pas d'inscription publique
(pas de second CTA primaire en concurrence). Sur les pages admin pré-connexion (il n'y en a pas en
dehors de `/login`), un seul bouton secondaire suffit. L'écran `/login` n'affiche pas ce bouton
(UXDR-004 — l'écran est déjà le formulaire). Le variant `primary` est réservé aux actions
destructives ou aux CTA de conversion à fort contraste (UXDR-002 GO D2 n'en parle pas).

#### Zone D — Boîte identité sur mobile : dans le header ou dans le drawer

La passe état de l'art note explicitement : "Il n'est pas recommandé de dupliquer l'identité dans
le drawer sur mobile — anti-pattern de duplication (AP-01)." L'identité reste dans le header à
tous les breakpoints.

La passe implémentée confirme que le header reste visible au-dessus du backdrop du Drawer. L'avatar
ou le CTA "Se connecter" reste accessible dans le header même quand le drawer est ouvert.

**Accord complet.** Pas de duplication.

---

## 2. Décision identité — tranchée sur code réel

### 2.1 Ce que l'API retourne réellement

Fichier vérifié : `apps/web/src/routes/login/finish/+server.ts`

```ts
interface ApiSuccess {
  token: { raw: string; expiresAt: string; issuedAt: string };
  userIdentityId: string;   // UUID opaque
  organizationId: string;   // UUID opaque
}
```

Le cookie `openerp_session` stocke exactement ces trois champs (token brut, deux UUIDs). Ni
`displayName`, ni `email`, ni `firstName` ne sont retournés par `/webauthn/login/finish` — confirmé
par lecture du code.

### 2.2 Évaluation des trois options

**Option (a) — Enrichir le cookie au /login/finish avec displayName/email retournés par l'API**

Faisable uniquement si l'API `/webauthn/login/finish` retourne ces champs. Or `ApiSuccess` ne les
contient pas. Pour les obtenir, il faudrait soit (i) modifier l'API backend pour inclure le profil
utilisateur dans la réponse passkey, soit (ii) chaîner un appel `GET /users/{userIdentityId}`
immédiatement après dans le `+server.ts`. Le (ii) est réalisable côté frontend mais ajoute une
dépendance à un endpoint non documenté dans le scope actuel. Le (i) est hors scope de la décision
shell.

Coût : moyen (endpoint API à stabiliser ou à appeler en chaîne). Risque : appel séquentiel
synchrone dans le login path → latence perçue.

**Option (b) — Appel API dans +layout.server.ts à chaque load**

Techniquement propre : `+layout.server.ts` a accès à `locals.session.token` et
`locals.session.userIdentityId`. Un appel `GET /api/users/{userIdentityId}` avec Bearer token
permettrait d'obtenir le profil. Coût réseau : un appel interne par navigation SSR pour les
utilisateurs connectés. Acceptable si l'API est dans le même cluster (< 10 ms). Introduit un point
de défaillance : si l'endpoint profil est indisponible, le load échoue.

Coût : moyen (endpoint à documenter, gestion d'erreur à écrire, invalidation de cache). Correct
pour phase post-Demo Slice.

**Option (c) — Afficher une icône utilisateur sans nom**

Utiliser l'icône Lucide `User` comme déclencheur de l'`OverflowMenu` quand la session est
présente. Le menu expose uniquement "Se déconnecter" (item `danger: true`). Fonctionnel sans aucun
appel API supplémentaire. Aucun UUID affiché à l'écran (meilleur pour la vie privée et l'UX).
Coût : nul. Livrable en même temps que le reste du shell.

### 2.3 Décision retenue

**Option (c) pour le Demo Slice.** Icône Lucide `User` (ou initiales dérivées des 2 premiers
caractères de l'`userIdentityId` si un avatar visuel est nécessaire) comme déclencheur de
l'`OverflowMenu`. Menu contient : "Se déconnecter" (`danger: true`, `form` POST vers
`/auth/logout`). Pas de nom ni d'email affiché dans cette phase.

**Option (b) comme Attendu workpackage suivant** : une fois l'endpoint `GET /api/users/{id}` (ou
équivalent) documenté et stable, migrer vers un appel dans `+layout.server.ts` pour afficher le
nom complet et l'email dans l'`OverflowMenu`. L'interface `App.Locals` sera étendue avec un champ
`profile: { displayName: string; email: string } | null`.

Rationale de rejet de l'option (a) : modifier le login path pour chaîner un appel profil alourdit
le chemin critique de connexion. C'est une optimisation d'affichage qui ne vaut pas le coût de
latence dans le login flow.

---

## 3. Orientation consolidée — anatomie et comportement

### 3.1 Anatomie du header (gauche → droite)

**Routes admin authentifiées (`/admin/*`) :**

```
[☰ Hamburger (mobile only)]  [● OpenERP / Foundation]    [🌐 FR | EN]  [👤 OverflowMenu]
        ↑                              ↑                        ↑               ↑
   display:none ≥769px           lien href="/"           UXDR-002 GO D2     icône User
   display:flex ≤768px        aria-label="OpenERP home"   aria-pressed      + "Se déconnecter"
   aria-expanded={drawerOpen}
   aria-controls="primary-nav"
```

**Routes pré-auth (`/login`, `/register-passkey`) — per UXDR-004 :**

```
[● OpenERP / Foundation]    [🌐 FR | EN]
```

Pas de hamburger (pas de sidebar). Pas de boîte identité (utilisateur non connecté, l'écran est
déjà la connexion). Conforme UXDR-004 et confirmé par le DOM live.

**État "signed-out" sur routes non-pré-auth (improbable dans le périmètre actuel, mais à prévoir) :**

```
[☰ Hamburger (mobile only)]  [● OpenERP / Foundation]    [🌐 FR | EN]  [Se connecter]
```

`Se connecter` : `<Button variant="secondary" size="sm" href="/login">`.

### 3.2 Comportement du drawer par breakpoint

| Breakpoint | Mode sidebar | Composant | Comportement |
|---|---|---|---|
| ≥ 769 px (desktop) | Persistante statique | `<aside class="shell__sidebar">` dans CSS grid (240 px, sticky) | Toujours visible, repousse le contenu. Pas de toggle. |
| ≤ 768 px (mobile) | Overlay | `<Drawer side="left" open={drawerOpen} title={t(locale,"nav.drawer.title")} onclose={() => drawerOpen = false}>` | Recouvre le contenu, backdrop z-index 90, Escape ferme, focus retour hamburger |

**Mode rail** : différé. Pas de breakpoint tablette intermédiaire dans ce scope.

**Composant DS exact pour mobile** : `Drawer` de `@sentropic/design-system-svelte`.
Props obligatoires : `side="left"`, `open={drawerOpen}`, `title` (localisé `nav.drawer.title`),
`onclose`. Le backdrop `st-drawer__backdrop` joue déjà le rôle de scrim. La largeur est
`min(100vw, 24rem)` — accepté pour le Demo Slice.

**Ajouts à composer autour du Drawer DS (manques confirmés) :**
1. `<svelte:window onkeydown={handleEscape}>` : si `event.key === "Escape" && drawerOpen` →
   `drawerOpen = false` + `hamburgerRef.focus()`.
2. `inert={!drawerOpen}` sur le `<aside class="shell__sidebar">` desktop ET sur `<main>` en mobile
   quand le drawer est ouvert — pour neutraliser le contenu hors drawer des AT.
3. Transition Svelte sur l'ouverture/fermeture : `transition:fly={{ x: -240, duration: 250 }}` sur
   le conteneur interne du Drawer.

### 3.3 Navigation verticale — 5 groupes, structure maintenue

Groupes conservés (UXDR-003 GO + UXDR-007 NO-GO split) :
1. CRM (Leads, Entreprises, Contacts, Opportunités)
2. Projets (Projets, Tarifs)
3. Facturation (Factures, Taxes, Comptabilité)
4. Rapports (Vues enregistrées, Rapports, Tableaux de bord, Livraisons planifiées, Workflows, Webhooks)
5. Admin (Utilisateurs, Rôles, Approbations, Audit, Paramètres)

Structure HTML maintenue : 5 instances `<SideNav items={...}>` précédées de
`<p class="shell__nav-heading" aria-hidden="true">` (API SideNav plate confirmée).
Remplacement des valeurs codées en dur (`font-size: 0.6875rem`) par `var(--st-font-size-xs)`.

### 3.4 Skip link

```svelte
<!-- Premier élément du <body>, dans +layout.svelte avant le Header -->
<a class="skip-link" href="#main-content">{t(locale, "shell.skipToContent")}</a>
```

```css
.skip-link {
  position: absolute;
  transform: translateY(-100%);
  z-index: 200;
}
.skip-link:focus {
  transform: translateY(0);
  /* tokens : background var(--st-semantic-action-primary), color var(--st-semantic-text-on-action) */
}
```

`<main id="main-content" tabindex="-1">`.
Clé i18n à ajouter : `shell.skipToContent` (FR : "Passer au contenu principal" / EN : "Skip to main content").

### 3.5 Accessibilité — récapitulatif des attributs requis

```svelte
<!-- Toggle hamburger -->
<button
  bind:this={hamburgerRef}
  aria-label={drawerOpen ? t(locale, "nav.toggle.close") : t(locale, "nav.toggle.open")}
  aria-expanded={drawerOpen}
  aria-controls="primary-nav"
  class="shell__hamburger"
  style:display={{ base: "flex", md: "none" }}
  onclick={() => drawerOpen = !drawerOpen}
>
  {#if drawerOpen}<X size={20} />{:else}<Menu size={20} />{/if}
</button>

<!-- Drawer mobile contient : -->
<aside
  id="primary-nav"
  role="dialog"
  aria-modal="true"
  aria-label={t(locale, "nav.drawer.title")}
>
  <!-- 5 groupes SideNav -->
</aside>

<!-- Contenu hors drawer neutralisé en mobile quand ouvert -->
<main id="main-content" tabindex="-1" inert={isMobile && drawerOpen}>
```

Séquence d'ouverture mobile :
1. Clic hamburger → `drawerOpen = true` → retrait `inert` du drawer → focus premier lien nav.
2. Tab/Shift+Tab dans le drawer seulement (`inert` sur main empêche la fuite).
3. Escape → `drawerOpen = false` → `inert` remis sur drawer → `hamburgerRef.focus()`.
4. Clic backdrop → même séquence que Escape.
5. Navigation (clic lien) → fermeture automatique via `afterNavigate` SvelteKit.

Ordre de focus global :
```
[skip-link caché] → [hamburger] → [brand] → [FR] → [EN] → [bouton identité] → [contenu #main-content]
```

---

## 4. UXDR-003 (shell) — Matière décision

> Note : Les UXDR numérotés dans `rules/ux-decisions.md` vont jusqu'à UXDR-007. La prochaine
> décision shell est UXDR-008 pour éviter la collision avec UXDR-003 déjà prise (SideNav grouping).
> Le numéro ci-dessous est UXDR-008. À confirmer lors de l'enregistrement dans ux-decisions.md.

### UXDR-008 — Shell complet : drawer mobile, header identité, skip link

**Ou :**
- `apps/web/src/routes/+layout.svelte`
- `apps/web/src/app.css`
- `apps/web/src/routes/auth/logout/+server.ts` (à créer)
- `packages/i18n/src/foundation.fr.json` et `foundation.en.json`
- `apps/web/tests/ui-review.spec.ts` (assertions Playwright)

**Orientation :**

Sur desktop (≥ 769 px), la sidebar reste un `<aside>` statique (240 px) dans le CSS grid.
Sur mobile (≤ 768 px), la nav principale est exposée via le composant `Drawer` DS (`side="left"`,
overlay) ouvert par un toggle hamburger dans le header. La boîte identité (icône `User` Lucide +
`OverflowMenu` DS avec "Se déconnecter") est ajoutée dans la zone `actions` du `Header` à droite
du locale-switcher, dans tous les états authentifiés. Le skip link WCAG 2.4.1 est le premier
élément focusable du layout.

**Options rejetées :**

- Sidebar desktop collapsible en rail (icônes 48 px) : rejetée pour ce scope. La passe état de
  l'art et la passe implémentée s'accordent sur le différer. Coût d'implémentation
  disproportionné pour le Demo Slice ; déclencheur : ajout d'une tablette-first feature ou
  retour terrain opérateur.
- Toggle hamburger visible sur desktop : rejeté. La sidebar est toujours visible sur desktop —
  aucun opérateur ne gagne à la masquer sans mode rail. L'ajout d'un toggle desktop sans rail
  crée une affordance orpheline (ouvrir pour quoi ?).
- Utilisation de `Popover` ou construction native `role="menu"` pour la boîte identité : rejeté.
  `OverflowMenu` DS expose nativement `placement="bottom-end"`, `danger: true` pour
  "Se déconnecter", et une API de sélection stable. C'est le composant le plus direct.
- Affichage de `userIdentityId` tronqué comme initiales : rejeté. Un UUID commence par des
  chiffres hexadécimaux opaques — pas de valeur sémantique pour l'opérateur. Icône `User` sans
  texte est plus neutre et moins confuse.
- Stockage du displayName dans le cookie session au login (option a) : rejeté. L'API
  `/webauthn/login/finish` ne retourne ni `displayName` ni `email` dans `ApiSuccess` — confirmé
  par lecture du code. Enrichir le login path pour un affichage cosmétique n'est pas justifié.
- Appel `GET /api/users/{id}` dans `+layout.server.ts` (option b) pour afficher le nom : différé
  (pas rejeté). Correct dans un workpackage suivant quand l'endpoint est stable et documenté.
- Duplication de l'identité dans le drawer mobile : rejeté (AP-01 de la passe état de l'art,
  confirmé par la passe implémentée).

**Preuves :**

- Passe état de l'art (2026-07-03) : IBM Carbon UI Shell, Material Design, Odoo, Salesforce,
  HubSpot, WCAG 2.4.1/2.4.3, W3C APG. Pattern drawer overlay + header identité universel.
- Passe UI implémentée (2026-07-03) : DOM live `openerp-dev.sent-tech.ca` confirme 5 écarts
  bloquants. API DS : `Drawer`, `Header`, `SideNav`, `OverflowMenu` documentées avec props.
- Code `apps/web/src/routes/login/finish/+server.ts` : `ApiSuccess` contient uniquement `token`,
  `userIdentityId`, `organizationId` — pas de profil utilisateur.
- Code `apps/web/src/routes/+layout.server.ts` : retourne uniquement `locale` et `chatEnabled`,
  pas de `session` — correction nécessaire.
- Code `apps/web/src/hooks.server.ts` + `app.d.ts` : `locals.session` est déjà parsé et typé,
  disponible pour le `+layout.server.ts` sans modification des hooks.

**Risques :**

- Le composant `Drawer` DS ne gère pas nativement Escape ni le focus trap : risque d'accessibilité
  si les ajouts manuels (`svelte:window onkeydown`, `inert`) sont oubliés. Mitigation : test
  Playwright clavier explicite dans les critères d'acceptation.
- La largeur du Drawer DS est `min(100vw, 24rem)` = 375 px sur iPhone SE, soit plein écran. Carbon
  recommande ≤ 256 px pour laisser le contenu visible. Mitigation : override CSS
  `--st-component-drawer-width: 16rem` (256 px) via la prop `class` du Drawer.
- L'absence de route `auth/logout` empêche la déconnexion. Bloquant avant tout test.
  Mitigation : créer `apps/web/src/routes/auth/logout/+server.ts` (action POST minimale).
- `inert` sur `<main>` en mobile quand le drawer est ouvert : si la logique `isMobile && drawerOpen`
  est calculée côté serveur, elle sera toujours `false` au SSR (pas de `window.innerWidth`). La
  valeur doit être un `$state` réactif côté client uniquement (media query via `matchMedia`).

**Décision proposée :**

GO sur l'orientation complète ci-dessus (§3.1 à §3.5) pour le Demo Slice.

**Go/No-Go — Critères d'acceptation OBSERVABLES et testables Playwright :**

```
// Viewport 1280 × 800 (desktop)

1. Route /admin/crm (authentifiée)
   - getByRole("banner").getByRole("button", { name: /navigation|hamburger/i })
     → not.toBeVisible() [hamburger caché sur desktop]
   - getByRole("banner").getByRole("link", { name: /OpenERP/i })
     → toBeVisible()
   - getByTestId("locale-switcher")
     → toBeVisible() [UXDR-002 maintenu]
   - getByRole("banner").getByRole("button", { name: /identité|profil|user/i })
     → toBeVisible() [boîte identité]
   - getByRole("complementary", { name: /navigation principale/i })
     → toBeVisible() [sidebar desktop visible]
   - page.locator(".skip-link").focus() → toBeVisible() [skip link]

2. Route /admin/crm (authentifiée, desktop) — clavier identité
   - Clic bouton identité → getByRole("menu") → toBeVisible()
   - getByRole("menuitem", { name: /déconnecter|sign out/i }) → toBeVisible()

// Viewport 375 × 812 (mobile)

3. Route /admin/crm (authentifiée)
   - getByRole("button", { name: /ouvrir la navigation|navigation/i })
     → toBeVisible() [hamburger visible]
   - getByRole("complementary") → not.toBeVisible() [sidebar cachée]
   - getByRole("banner").getByRole("button", { name: /identité|profil|user/i })
     → toBeVisible() [identité visible en mobile]

4. Route /admin/crm — ouverture drawer mobile
   - cliquer hamburger → getByRole("dialog") → toBeVisible()
   - getByRole("dialog").getByText("CRM") → toBeVisible() [groupe nav dans le drawer]
   - page.keyboard.press("Escape") → getByRole("dialog") → not.toBeVisible()
   - getByRole("button", { name: /navigation/i }) → toBeFocused() [focus retourné]

5. Route /admin/crm — backdrop drawer mobile
   - ouvrir drawer → cliquer backdrop (coordonnées hors du panneau)
     → getByRole("dialog") → not.toBeVisible()

6. Route /login (pré-auth, desktop 1280×800)
   - getByRole("complementary") → not.toBeAttached() [sidebar absente — UXDR-004]
   - getByRole("banner").getByRole("button", { name: /navigation/i })
     → not.toBeAttached() [pas de hamburger]
   - getByTestId("locale-switcher") → toBeVisible() [UXDR-002]
   - getByRole("banner").getByRole("link", { name: /se connecter|sign in/i })
     → not.toBeAttached() [page EST le formulaire, pas de CTA redondant]

7. Déconnexion (mobile 375×812, authentifiée)
   - Clic bouton identité → getByRole("menu") → toBeVisible()
   - Clic "Se déconnecter" → page.url() → toContain("/login")
   - Cookie openerp_session → not.toBeDefined() [cookie effacé]
```

---

## 5. Clés i18n à ajouter

| Clé | FR | EN |
|---|---|---|
| `shell.skipToContent` | Passer au contenu principal | Skip to main content |
| `nav.toggle.open` | Ouvrir la navigation | Open navigation |
| `nav.toggle.close` | Fermer la navigation | Close navigation |
| `nav.drawer.title` | Navigation principale | Main navigation |
| `auth.signIn` | Se connecter | Sign in |
| `auth.signOut` | Se déconnecter | Sign out |
| `auth.user.label` | Mon compte | My account |

Fichiers cibles : `packages/i18n/src/foundation.fr.json` et `foundation.en.json`.
Modèle existant : `chat.dock.toggle`, `chat.dock.title`.

---

## 6. Prérequis techniques non bloquants UX mais bloquants implémentation

| Prérequis | Fichier | Action |
|---|---|---|
| Exposer `session` dans le layout load | `apps/web/src/routes/+layout.server.ts` | Ajouter `session: locals.session` au retour |
| Route de déconnexion | `apps/web/src/routes/auth/logout/+server.ts` | Créer — `cookies.delete` + `redirect(303, "/login")` |
| Tokeniser `shell__nav-heading` | `apps/web/src/app.css` | Remplacer `font-size: 0.6875rem` → `var(--st-font-size-xs)` |

---

*Passe produite le 2026-07-03 — sources : deux rapports indépendants + vérification code réel.*
