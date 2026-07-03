# Revue UI implémentée — Shell OpenERP (2026-07-03)

Passe "revue de l'UI implémentée" pour la décision UX shell.  
Directive produit : drawer et menus verticaux + header classique (boîte identité = sign-in/out, langues).

---

## État actuel — DOM live + code

### Structure DOM (confirmé par curl sur openerp-dev.sent-tech.ca)

**Page `/` (authentifiée ou non) :**

```
<div data-st-theme="sent-tech">
  <div class="shell">                              ← CSS grid 240px | 1fr
    <header class="st-header st-header--sticky shell__header">
      <!-- leading : logo shell__brand -->
      <!-- actions : locale-switcher uniquement (EN/FR) -->
    </header>
    <aside class="shell__sidebar">                 ← position: sticky, statique
      <div class="shell__nav-group">               ← wrapper custom (hors DS)
        <p class="shell__nav-heading">CRM</p>      ← heading custom (hors DS)
        <nav class="st-sidenav shell__sidenav">    ← composant DS SideNav
          <ul> <li><a href="...">Leads</a> …
      …  (5 groupes : CRM, Projets, Facturation, Rapports, Admin)
    </aside>
    <main class="shell__main">
      <!-- contenu de page -->
      <!-- "Sign in" link apparaît ICI dans le contenu page, pas dans le header -->
    </main>
  </div>
</div>
```

**Page `/login` :**
```
<div class="shell shell--no-sidebar">   ← sidebar absente (isPreAuth)
  <header class="st-header …">         ← même header que ci-dessus, logo + langues
  <main class="shell__main">           ← grid-column: 1 / -1 via .shell--no-sidebar
```

### CSS (app.css) — responsive déclaré

Un seul breakpoint mobile à `max-width: 760px` :
- Le grid passe à `grid-template-columns: 1fr` (1 colonne).
- La sidebar (`shell__sidebar`) passe en `position: static`, `max-height: none`, `overflow-y: visible`, et s'empile en `grid-row: 2` sous le header.
- La `shell__main` passe en `grid-row: 3`.
- **Résultat** : sur mobile la sidebar s'affiche toujours, entière, avant le contenu — elle n'est jamais masquée ni togglée.

---

## Écarts vs directive

| # | Élément attendu | État actuel | Gravité |
|---|-----------------|-------------|---------|
| 1 | **Drawer DS** pour la nav principale (surtout mobile) | `<aside>` statique custom dans le CSS grid — composant `Drawer` DS non utilisé | Bloquant |
| 2 | **Toggle mobile** (hamburger) | Absent — pas de bouton dans le header pour ouvrir/fermer la nav sur mobile | Bloquant |
| 3 | **Boîte identité dans le header** (sign-in/out + utilisateur) | Le header n'expose que le locale-switcher. Le lien "Sign in" se trouve dans le contenu de la page principale, pas dans le header | Bloquant |
| 4 | **Session exposée au layout** | `locals.session` est parsé dans `hooks.server.ts` mais `+layout.server.ts` ne retourne que `{ locale, chatEnabled }` — le composant layout ignore complètement la session | Bloquant |
| 5 | **Route déconnexion** | Absente — aucun fichier `logout` / `signout` dans `apps/web/src/routes/`. Le cookie `openerp_session` est `httpOnly`, impossible à effacer côté client | Bloquant |
| 6 | **Groupes SideNav via DS** | Les 5 groupes sont composés avec des `<div class="shell__nav-group">` et `<p class="shell__nav-heading">` entièrement custom — le DS SideNav ne supporte pas nativement les sections | À composer |
| 7 | **Design system sémantique strict** | Les class `shell__nav-heading` utilisent `font-size: 0.6875rem` codé en dur (valeur fixe non tokenisée) ; `padding: 0 0.75rem` direct — petit écart aux règles DS (ne jamais hard-coder les valeurs, toujours `var(--st-…)`) | Mineur |

---

## APIs DS disponibles — précises avec props

### `Drawer`

```ts
type DrawerProps = {
  open?: boolean;           // défaut false — contrôle d'affichage
  title: string;            // requis — aria-label du dialog
  description?: string;
  side?: "left" | "right";  // défaut "right" — placement du panneau
  closeLabel?: string;      // texte du bouton ×
  class?: string;
  children?: Snippet;       // corps du drawer (nav groups ici)
  footer?: Snippet;         // actions bas de panneau (optionnel)
  onclose?: () => void;     // callback dismiss
};
```

**Comportement observé dans la source :**
- Rendu conditionnel `{#if open}` — pas d'animation CSS incluse.
- Backdrop `<div class="st-drawer__backdrop">` en `position: fixed; inset: 0` avec `z-index: --st-component-drawer-zIndex` (90).
- Panneau `<aside role="dialog" aria-modal="true">` en `position: absolute` dans le backdrop.
- Bouton close appelle `onclose` — pas de gestion de la touche `Escape` ni de focus trap dans la source svelte publiée.
- Largeur : `--st-component-drawer-width: 24rem` (max `min(100vw, 24rem)`).
- `side="left"` : `left: 0` + `border-right`.

### `Header`

```ts
type HeaderProps = {
  title?: string;
  label?: string;            // aria-label du <header>
  sticky?: boolean;          // défaut true — position: sticky top: 0
  class?: string;
  logo?: Snippet;            // zone leading gauche
  navigation?: Snippet;      // nav horizontale centrée (flex: 1)
  actions?: Snippet;         // zone droite (margin-left: auto)
  children?: Snippet;        // fallback libre
};
```

**Disposition interne :**
- `st-header__leading` : flex, contient `logo` + `title` texte.
- `st-header__navigation` : flex, `justify-content: center`, `flex: 1 1 auto` — zone centrale optionnelle.
- `st-header__actions` : flex, `margin-left: auto` — flush droite.
- Le snippet `navigation` n'est **pas utilisé** dans le layout actuel.

### `SideNav`

```ts
export interface SideNavItem {
  label: string;
  href: string;
  active?: boolean;
}

type SideNavProps = {
  items: SideNavItem[];   // liste plate — pas de sous-items ni de groupes
  label?: string;         // aria-label du <nav>
  class?: string;
};
```

**Limite critique** : le composant ne supporte que des listes plates. Aucun slot ou prop pour des sections/groupes. Les 5 groupes de la nav actuels (CRM, Projets, Facturation, Rapports, Admin) sont composés entièrement à l'extérieur du composant.

### `OverflowMenu`

```ts
export interface OverflowMenuItem {
  value: string;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onclick?: () => void;
}

type OverflowMenuProps = {
  items: OverflowMenuItem[];
  label?: string;
  open?: boolean;                   // bindable
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  triggerLabel?: string;
  class?: string;
  onselect?: (value: string) => void;
};
```

C'est le composant le plus adapté pour la boîte identité : bouton trigger + dropdown positionné + item `danger` disponible pour "Se déconnecter".

### `Popover`

```ts
type PopoverProps = {
  open?: boolean;
  label: string;
  placement?: "top" | "right" | "bottom" | "left";
  class?: string;
  trigger?: Snippet;    // le déclencheur (bouton, avatar…)
  children?: Snippet;   // contenu libre du panneau
};
```

Alternative à OverflowMenu si on veut un panel riche (avatar + email + actions multiples).

### `Menu`

```ts
type MenuProps = {
  label: string;
  items: MenuItem[];    // { label, value, disabled? }
  class?: string;
  onselect?: (value: string) => void;
};
```

Liste d'actions sans trigger intégré ni positionnement automatique — moins adapté pour la boîte identité.

### `Dropdown`

```ts
type DropdownProps = {
  label: string;
  options: DropdownOption[];   // { label, value, disabled? }
  value?: string;
  placeholder?: string;
  open?: boolean;
  class?: string;
  onselect?: (value: string) => void;
};
```

Sélecteur de valeur — inadapté pour une boîte d'actions identité.

### `Button`

```ts
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  class?: string;
  children?: Snippet;
};
```

Utilisé pour le locale-switcher. À utiliser pour le bouton hamburger mobile (`variant="ghost"` + icône Lucide `Menu`/`X`).

---

## Manques DS à composer

| Manque | Impact | Solution proposée |
|--------|--------|-------------------|
| **Pas de composant Avatar** | La boîte identité ne peut pas afficher l'initiale ou la photo | Composer un `<div>` custom avec `--st-semantic-surface-subtle`, `--st-semantic-text-primary`, tokens radius — ou abbréger `userIdentityId` en 2 lettres |
| **Pas de SideNav avec groupes/sections** | Les 5 sections sont composées hors DS | Maintenir le pattern `shell__nav-group` + `shell__nav-heading` avec tokens `--st-…` à la place des valeurs codées en dur |
| **Pas d'IconButton DS** | Le bouton hamburger mobile doit être composé | `<Button variant="ghost" size="sm">` + `<Menu size={20} />` Lucide — pattern déjà utilisé dans le chat dock |
| **Pas de focus trap dans Drawer** | Dialog modal non conforme WCAG 2.1 § 4.1.2 | Ajouter `use:trapFocus` (utilitaire svelte, `focus-trap` npm) ou `<svelte:window onkeydown>` pour Escape |
| **Pas d'animation de transition DS** | Le Drawer apparaît/disparaît par `{#if}` sans animation | Ajouter une transition Svelte `transition:fly={{ x: -240 }}` ou CSS custom sur `.st-drawer` |

---

## Contraintes session / i18n

### Session

**Cookie `openerp_session` (httpOnly, JSON) — champs stockés :**
```ts
{
  token: string;            // JWT brut
  userIdentityId: string;   // UUID utilisateur
  organizationId: string;   // UUID organisation
}
```

**`locals.session` est parsé dans `hooks.server.ts`** et disponible côté serveur, mais **n'est pas retourné par `+layout.server.ts`** :

```ts
// Actuel :
return { locale: locals.locale, chatEnabled };

// À corriger :
return { locale: locals.locale, chatEnabled, session: locals.session };
```

**Données disponibles pour la boîte identité :**
- `userIdentityId` : UUID opaque — peu lisible pour un affichage humain.
- `organizationId` : UUID organisation — pourrait servir pour un badge tenant.
- **Pas d'email ni de displayName dans la session.** Pour afficher quelque chose de lisible, deux options :
  - Option A : Appeler `GET /users/{userIdentityId}` dans le `+layout.server.ts` load (requiert le token) pour récupérer email/displayName — coût réseau à chaque navigation SSR.
  - Option B : Stocker l'email dans le cookie session lors du login (le `+page.svelte` de login connaît l'email saisi avant la passkey — il pourrait le transmettre côté serveur lors de `/login/finish`).
  - Option C (court terme) : Afficher uniquement une icône utilisateur "connecté" (sans nom) + OverflowMenu "Se déconnecter" — fonctionnel sans surcoût réseau.

### Route de déconnexion

**Absente.** Pas de fichier `logout` ni `signout` dans `apps/web/src/routes/`. À créer :

```
apps/web/src/routes/auth/logout/+server.ts
```

Logique minimale :
```ts
export const POST: RequestHandler = ({ cookies }) => {
  cookies.delete("openerp_session", { path: "/" });
  return redirect(303, "/login");
};
```

L'appel depuis le layout se fait via un `<form method="POST" action="/auth/logout">` dans l'`OverflowMenu` identité.

### i18n

**Clés nav.section existantes (FR et EN à synchroniser) :**
- `nav.section.crm`, `nav.section.projects`, `nav.section.billing`, `nav.section.reporting`, `nav.section.admin`

**Clés manquantes pour le shell cible :**

| Clé proposée | Usage |
|---|---|
| `nav.toggle.open` | aria-label bouton hamburger (ouvrir) |
| `nav.toggle.close` | aria-label bouton hamburger / Drawer close |
| `nav.drawer.title` | Titre du Drawer DS (prop `title` requise) |
| `auth.signIn` | Bouton "Se connecter" dans le header (non authentifié) |
| `auth.signOut` | Item OverflowMenu "Se déconnecter" |
| `auth.user.label` | aria-label bouton identité dans le header |

Le pattern existant (`chat.dock.toggle`, `chat.dock.title`) est un bon modèle à suivre. Les clés doivent être ajoutées dans `packages/i18n/src/foundation.fr.json` et `foundation.en.json` simultanément.

---

## Recommandations d'implémentation

### 1. Ajouter la session dans le layout load

Fichier : `apps/web/src/routes/+layout.server.ts`

Ajouter `session: locals.session` au retour. Type : `App.Locals["session"]` (déjà défini dans `app.d.ts` via `hooks.server.ts`).

### 2. Créer la route de déconnexion

Fichier : `apps/web/src/routes/auth/logout/+server.ts`  
Action `POST` : `cookies.delete("openerp_session", { path: "/" })` + `redirect(303, "/login")`.

### 3. Ajouter la boîte identité dans le Header

Dans `+layout.svelte`, dans le snippet `actions` du `Header`, après le locale-switcher :
- Si `data.session` est null → `<Button variant="secondary" size="sm" href="/login">{t(locale, "auth.signIn")}</Button>`
- Si `data.session` → `<OverflowMenu placement="bottom-end" items={[{ value: "logout", label: t(locale, "auth.signOut"), danger: true }]} onselect={handleIdentityAction}>` précédé d'un avatar-badge custom (initiales ou icône User Lucide).

### 4. Drawer DS pour la navigation mobile

Dans `+layout.svelte` :
1. Ajouter `let drawerOpen = $state(false)`.
2. Remplacer la media query `shell__sidebar` empilée par : sidebar cachée en mobile (`display: none` à ≤760px).
3. Ajouter `<Drawer side="left" open={drawerOpen} title={t(locale, "nav.drawer.title")} onclose={() => drawerOpen = false}>` contenant les 5 groupes nav actuels.
4. Dans le snippet `logo` (ou `actions`) du Header, ajouter un bouton hamburger visible uniquement en mobile (`display: none` desktop / `display: flex` mobile) : `<Button variant="ghost" size="sm" onclick={() => drawerOpen = !drawerOpen}><Menu /></Button>`.
5. La sidebar desktop reste un `<aside>` statique — le Drawer n'est actif qu'en mobile.

### 5. Tokeniser les valeurs codées en dur dans shell__nav-heading

Remplacer `font-size: 0.6875rem` par `var(--st-font-size-xs, 0.6875rem)` et `0.75rem 0 0.25rem` par des multiples de `var(--st-spacing-1)` si disponible dans le thème.

---

*Passe produite le 2026-07-03 — source : lecture du code + curl DOM live sur openerp-dev.sent-tech.ca + lecture des sources @sentropic/design-system-svelte/dist/.*
