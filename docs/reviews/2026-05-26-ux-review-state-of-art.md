# UX Review — Etat de l'art et orientations recommandees
## OpenERP Admin — CRM + Project + Billing (FR-CA / EN-CA)
### Date : 2026-05-26 | Role : best-practices / etat-de-l-art uniquement

> Ce document est la passe "etat de l'art" pour une decision tri-agent conforme a rules/ui-review.md.
> Il ne constitue PAS une decision finale. Les orientations ci-dessous sont des entrees pour une passe de revue implementee et une passe de synthese/contradiction.

---

## Contexte base sur le code lu

Shell actuel (`apps/web/src/routes/+layout.svelte`) :
- Sentropic `Header` avec locale switcher (UXDR-002 GO D2, accepte).
- `SideNav` avec **14 items plats** dans l'ordre suivant :
  Leads, Companies, Contacts, Opportunities, Projects, Rates, Invoices, Taxes, Accounting, Users, Roles, Approvals, Audit, Settings.
- Trois modules metier (CRM × 4 items, Project × 2, Billing × 3) plus fondation-admin (× 5 items : Users, Roles, Approvals, Audit, Settings).

Routes et patterns observes :
- CRM : list + detail (`[id]`) pour Leads, Companies, Contacts, Opportunities. Detail = meta card + timeline uniquement (pas de sous-entites inline, sauf Opportunity qui n'a que le timeline).
- Project : list pour Projects, Rates (list-seul). Detail projet = meta card + 4 sections inline (Tasks, Time, Team, Invoicing) + timeline.
- Billing : list + detail pour Invoices (detail = meta + lines + taxes + payments + journal). Taxes = list-seul. Accounting = list-seul.

I18n :
- Cles structurees `module.entity.scope.key` — coherent.
- FR-CA utilise "courriel" (correct), "Societes", "Taux", "Comptabilite".
- Seed fixtures mentionnent TPS/TVQ (FR) et GST/QST (EN) — coherent pour le Quebec/Canada.
- Montants formates via `Intl.NumberFormat` avec locale `fr-CA` ou `en-CA` — correct.
- Le projet rates utilise "Amount (dollars)" en EN — point faible (pas de label devise explicite CAD).

---

## Etat de l'art par sujet

---

### 1. Navigation primaire / IA — 14 items plats

#### Convention

Les consoles ERP et admin matures (Odoo, Sage Intacct, NetSuite, Freshbooks, design systems gouvernementaux canadiens) organisent la navigation en **groupes modules** a partir de 8-10 items. Au-dela, la liste plate produit des effets connus :

- Charge cognitive : le cerveau traite une liste homogene comme un ensemble uniforme; reperer un item prend plus de temps qu'une liste groupee avec en-tetes visuels.
- Perte de contexte metier : un operateur CRM voit "Leads, Companies, Contacts, Opportunities" puis immediatement "Projects, Rates, Invoices, Taxes..." sans signal visuel de changement de domaine.
- Scalabilite zero : chaque nouvel item futur (ex. Devis, Contrats, Fournisseurs) allonge la liste sans recours structurel.

Les patterns reconnus pour les back-offices multi-modules :

**a) Groupes avec en-tetes visuels statiques** : la sidebar liste les items avec des separateurs/titres de section non-cliquables. Simple, sans etat cote client, compatible avec des SideNav existants. Pattern dominant dans les interfaces admin B2B compactes (Stripe Dashboard, Notion workspace, Linear).

**b) Navigation deux niveaux collapsible** : un item parent cliquable ou simplement un toggle expanse ses enfants. Adapte quand les modules ont plus de 4 items chacun. Introduce de l'etat (quel groupe est ouvert ?), risque de perdre le contexte sur navigation mobile si le groupe se referme.

**c) Module switcher top-level + nav contextuelle** : un selecteur de module (header ou top-bar secondaire) change le contenu de la sidebar. Pattern enterprise lourd (Salesforce, SAP Fiori). Premature pour la taille actuelle du produit.

#### Pourquoi changer

14 items dont 5 fondation-admin (Users, Roles, Approvals, Audit, Settings) ne sont pas des destinations quotidiennes pour un operateur CRM ou projet. Les melanger visuellement avec les modules metier degrade le ratio signal/bruit pour les deux profils.

#### Orientation recommandee

**Groupes visuels statiques avec en-tetes de section dans la SideNav.** Structure proposee :

```
CRM
  Leads
  Companies
  Contacts
  Opportunities

Projects
  Projects
  Rates

Billing
  Invoices
  Taxes
  Accounting

Admin
  Users
  Roles
  Approvals
  Audit
  Settings
```

Chaque en-tete de groupe est visuel (texte muted + separateur), non cliquable, non navigable. Les items restent des liens directs. Aucun etat client necessaire. La SideNav Sentropic doit supporter des groupes/sections — a verifier avec l'API du composant.

#### Alternatives rejetees

- **Conserver le plat** : acceptable pour un MVP de 6-8 items; inacceptable a 14 et plus, non scalable.
- **Two-level collapsible** : sur-ingenierie pour le volume actuel; risque d'etat ouvert/ferme a gerer; a reconsiderer si un module depasse 6 items.
- **Module switcher** : hors echelle pour le produit actuel; introduit une couche de navigation supplementaire non justifiee.

---

### 2. Patterns liste → detail → section

#### Convention

Les consoles ERP et CRUD admin suivent generalement une regle coherente : **les entites filles qui ont leur propre identite (ID, cycle de vie, navigation externe) meritent une page dedicace; les entites accessoires qui n'ont de sens que dans le contexte du parent restent des sections inline sur la page du parent.**

Exemples du marche :
- Une tache a un ID, un statut, un responsable, et pourrait etre consultee independamment → page dedicace ideale.
- Une ligne de facture n'a de sens que dans la facture → section inline justifiee.
- Un paiement a un statut et une reference mais est toujours consulte depuis la facture → section inline acceptable a court terme.

#### Etat actuel

Le projet a deux approches simultanees sans regle claire :

**A — Sections inline sur la page parent (Project detail)** : Tasks, TimeEntries, Assignments, InvoiceProposals, Timeline — toutes visibles et editables sur `/admin/project/projects/[id]`. La page est longue (5 sections + formulaires inline). La section Invoicing (proposals) duplique visuellement une partie du workflow billing.

**B — Detail pur avec timeline (CRM entities)** : Company, Contact, Lead, Opportunity ont chacun une page detail legere (meta card + timeline). Pas de sous-entites inline. La relation Company → Opportunities n'est pas visible depuis la fiche societe; il faut aller sur la liste des opportunites et filtrer.

**C — Detail hybride (Invoice)** : Lines + Taxes + Payments + JournalEntry en sections inline. Justifie car ces entites n'ont pas de page propre et n'existent que dans le contexte de la facture.

#### Problemes identifies

1. La page Project detail est tres chargee (4 formulaires inline + 4 listes + timeline). Une section comme "Team" (assignments) pourrait etre moins visible qu'une section "Tasks" a forte frequence.
2. La CRM detail (Company) est trop vide : pas de liste des opportunites liees, des contacts, des projets. Un commercial naviguant sur une societe ne voit que le timeline d'audit — peu d'utilite operationnelle.
3. Incoherence : le projet expose ses sous-entites inline, le CRM ne le fait pas. Les deux patterns coexistent sans regle.

#### Orientation recommandee

**Regle uniforme : sections inline pour les sous-entites sans navigation autonome; onglets ou sections pour les entites enfants avec identite propre.**

Application concrete :
- Project detail : conserver Tasks, Time, Team, Invoicing comme sections (justifie — ces entites n'ont pas de page standalone aujourd'hui). Envisager un ancre/sommaire en haut de page si la longueur depasse 3 sections.
- Company detail : ajouter une section "Opportunites" et une section "Contacts" (liste en lecture, lien vers detail). La timeline reste en bas.
- Opportunity detail : envisager une section "Projet lie" si la relation Opportunity → Project est implementee.
- Invoice detail : statu quo justifie — lines/payments/taxes restent inline.

#### Alternatives rejetees

- **Tout inline partout** : produit des pages ingerables pour les entites complexes (un projet avec 50 taches et 200 saisies de temps).
- **Tout en pages separees** : fragmente le flux et multiplie les navigations pour des donnees etroitement liees (ex. lignes de facture).
- **Onglets par section** : peut masquer des informations importantes (statut d'une saisie non approuvee invisible si l'onglet "Temps" n'est pas actif). A reserver si le contenu d'une section est substantiel et independant.

---

### 3. Bilinguisme FR-CA / EN-CA

#### Convention UXDR-002

Locale switcher en header global, UXDR-002 accepte. Ne pas rouvrir.

#### Qualite des traductions — observations

**Points forts :**
- "courriel" (pas "email") — conforme a l'usage institutionnel quebecois.
- "Raison sociale" (pas "legal name") — correct.
- "Date d'echeance", "Entree en vigueur" — vocabulaire comptable standard.
- Taxes : "TPS" et "TVQ" en FR (Taxe sur les produits et services, Taxe de vente du Quebec), "GST" et "QST" en EN — correct pour le Canada/Quebec.
- `Intl.NumberFormat` avec `fr-CA` / `en-CA` pour les montants — correct.

**Points faibles ou incoherences :**
- `nav.leads` = "Leads" en FR — le terme anglais est courant dans le milieu commercial quebecois, mais certaines interfaces institutionnelles preferent "Prospects" ou "Pistes". A noter comme decision a valider.
- `crm.opportunities.field.companyId` = "Company ID" / "Identifiant societe" — dans un formulaire utilisateur, un champ UUID brut n'est pas utilisable; ceci indique un probleme de DX plus que de traduction.
- `project.rates.field.amount` = "Amount (dollars)" en EN — la devise devrait etre CAD ou un selecteur, pas un commentaire entre parentheses dans le label.
- Accents manquants dans le fichier FR : "creee", "cree", "mis a jour", "approuvee" — les formes sans accent semblent intentionnelles (ASCII-safe ?) mais brisent la coherence typographique avec les formes accentuees du meme fichier ("Créer une passkey", "Échec").
- `crm.companies.empty.title` = "Pipeline vide" en FR — semantiquement juste pour Opportunities, mais pour Companies "Aucune societe" serait plus precis.

#### Quebec specifics

- CAD comme devise implicite : les champs `currency` existent mais les formulaires ne pre-remplissent pas "CAD". Un defaut tenant "CAD" serait attendu pour un ERP canadien.
- Format de date : les formulaires utilisent `<input type="date">` (retourne YYYY-MM-DD). En fr-CA, l'affichage devrait etre JJ/MM/AAAA. `toLocaleString("fr-CA")` sur les timestamps est present; les champs date bruts (`project.startDate`, `lead.entryDate`) ne sont pas reformates.
- TPS/TVQ compound : la seed mentionne TVQ compound sur TPS — correct pour le regime quebecois (TVQ s'applique sur le montant HT + TPS).

#### Orientation recommandee

1. Auditer les accents manquants dans `foundation.fr.json` : soit tout en ASCII-safe (sans accents partout), soit tout accentue — pas les deux.
2. Ajouter un defaut de devise `CAD` au niveau du tenant ou du formulaire.
3. Reformater les champs date en affichage (pas en valeur de formulaire) selon la locale active.
4. Valider "Leads" vs "Prospects/Pistes" en FR avec un utilisateur metier — c'est une decision de glossaire, pas de traduction.

---

### 4. Densite des formulaires et saisie de donnees

#### Convention

Les back-offices B2B a forte densite de donnees suivent une distinction etablie :

- **Formulaires inline sur la liste** (create rapide) : justifies pour les entites simples (1-3 champs) a creation frequente. Ex. ajouter un tag, creer une tache rapide.
- **Modals** : adaptes pour les entites a 4-8 champs quand la creation n'empeche pas la consultation de la liste sous-jacente. Risque : perte de contexte si trop de champs.
- **Pages dedicaces** : necessaires pour les entites complexes (>8 champs, relations, validation metier forte). Ex. creer une facture manuelle avec lignes, taxes, paiement.

#### Etat actuel

Tous les formulaires de creation sont **inline sur la page liste** (Companies, Contacts, Opportunities, Leads) ou **inline sur la page detail** (Tasks, TimeEntries, Assignments). La creation d'une facture (simple) est egalement inline sur la liste.

**Avantages observes :**
- Flux zero-navigation pour la creation.
- Visible sans interaction supplementaire.

**Problemes :**
- Les formulaires inline sur les pages detail de projet occupent une place permanente, meme quand l'utilisateur est en mode consultation. La section "Team" a un formulaire affichant un champ "User ID" (UUID brut) — pas exploitable sans connaitre l'identifiant technique.
- La conversion de propositions en factures utilise un champ "Proposal ID" (UUID) — meme probleme.
- Validation : les champs utilisent `required` HTML natif mais pas de message d'erreur contextuel visible. Le retour d'erreur passe par un `Alert` en haut de page — l'utilisateur doit remonter pour comprendre l'echec.
- Les champs monetaires (`expectedValue`, montants) sont des `<input type="text">` sans formatage CAD ni contrainte numerique explicite.
- Les champs date utilisent `<input type="date">` (correct pour la saisie), mais pas de contrainte de plage ni de validation croisee (startDate < endDate).

#### Orientation recommandee

1. **Court terme** : remplacer les UUID bruts par des selecteurs (autocomplete ou dropdown) pour Company, User, Rate dans les formulaires — ceci est un blocage fonctionnel, pas seulement UX.
2. **Court terme** : valider les champs monetaires avec `type="number"` et un label de devise explicite (CAD).
3. **Moyen terme** : les formulaires de creation peuvent rester inline sur les listes pour les entites simples (Leads, Contacts, Companies). Pour les entites complexes (Facture avec lignes, Proposition), envisager une page de creation dedicace.
4. **Moyen terme** : afficher les erreurs de validation inline sous le champ concerne (pas seulement en Alert global).

#### Alternatives rejetees

- **Tout en page dedicace** : casse le flux rapide pour les entites simples.
- **Tout en modal** : les modals avec formulaires longs (>6 champs) sont difficiles a utiliser sur petit ecran et masquent le contexte.

---

### 5. Visualisation des statuts et cycles de vie

#### Convention

Les entites avec des cycles de vie (Opportunity stages, Invoice draft→issued→paid→void, TimeEntry draft→submitted→approved, InvoiceProposal draft→submitted→approved) beneficient de patterns visuels distincts :

**a) Badge de statut colore** : le minimum viable. Presente partout dans le code actuel via `<Tag tone=...>`. Necessaire mais insuffisant seul pour des workflows multi-etapes.

**b) Stepper ou barre de progression** : montre la position dans un cycle oriente (ex. Draft → Emise → Payee). Tres efficace pour les cycles lineaires (Invoices, TimeEntries). Moins adapte aux cycles avec retour arriere ou branches (Opportunity perdue/gagnee).

**c) Actions contextuelles liees au statut** : les boutons d'action disponibles refletent le statut courant (ex. "Emettre" visible uniquement si statut = draft). Le code actuel le fait correctement pour TimeEntries (Submit si draft, Approve si submitted) et Proposals. A completer pour Invoices sur la page list.

**d) Historique de transitions** : le timeline d'audit remplit ce role (transitions horodatees avec payload). Present sur toutes les entites detail. Valeur elevee pour la conformite et l'audit.

#### Etat actuel

- Badge `Tag` avec `tone` : present et coherent partout. Mapping couleur correct (success = won/paid/approved, warning = lost/rejected/void, info = in_progress/submitted, neutral = draft/other).
- Actions contextuelles : partiellement implementees (TimeEntries et Proposals corrects; Invoice list n'expose pas les actions Issue/Pay/Void inline).
- Pas de stepper/barre de progression pour les cycles lineaires.
- L'Opportunity detail affiche stage et statut dans la meta card mais pas la sequence des etapes pipeline (on voit l'etape courante, pas ou on en est dans le pipeline global).

#### Orientation recommandee

1. **Priorite haute** : sur la page detail Opportunity, afficher les etapes du pipeline comme une sequence visuelle avec l'etape courante marquee (ex. breadcrumb d'etapes ou stepper horizontal). La liste des stages existe en API (`data.stages`) — la donnee est disponible.
2. **Priorite haute** : sur la page detail Invoice, ajouter un stepper visuel Draft → Emise → Payee (ou Annulee). Le cycle est lineaire et previsible.
3. **Priorite moyenne** : exposer les actions d'avancement (Issue, Pay, Void) directement sur les lignes de la liste Invoices (ou via un menu contextuel par ligne) pour les cas courants.
4. **Priorite basse** : envisager un indicateur de completude (x taches done / total) sur la carte projet dans la liste.

#### Alternatives rejetees

- **Stepper sur toutes les entites** : les entites avec branches (Opportunity won/lost, Lead converted/disqualified) ne se pretent pas a un stepper lineaire — garder le badge pour elles.
- **Eliminer le timeline audit** : le timeline remplit un role de conformite distinct du stepper de progression — les deux sont complementaires.

---

### 6. Accessibilite et responsive

#### Convention

Les interfaces admin bilinguales destinees a un usage professionnel sont soumises aux memes attentes que les interfaces grand public en matiere d'accessibilite (WCAG 2.1 AA au minimum, RGAA si marche gouvernemental canadien/quebecois).

Points cles pour ce type de shell :

**Navigation clavier :**
- Ordre de focus : brand → locale switcher → premier item nav → contenu principal. Le code actuel place le switcher dans le header avant la SideNav, ce qui est correct pour UXDR-002.
- `aria-current="page"` sur l'item actif : presente dans le contrat de revue (`rules/ui-review.md`), a verifier par la passe implementee.
- Focus visible : les tests Playwright couvrent la sequence brand → EN → FR → nav, mais les styles de focus (`outline`) ne sont pas visibles dans le code Svelte lu — a verifier CSS.

**Mobile :**
- La SideNav actuelle est un `<aside>` statique. Sur mobile (390px), une sidebar fixe de ~200-240px laisse ~150px de contenu — trop etroit pour des tableaux ou formulaires.
- Aucun pattern de drawer/hamburger n'est visible dans le code actuel. Les tests UI couvrent 390x844 uniquement pour overflow horizontal, pas pour la lisibilite du contenu.
- Les pages detail de projet (4+ sections avec formulaires) seront particulierement difficiles sur mobile.

**Tableaux et reflow :**
- Les listes d'entites sont rendues comme `<ol>` avec des `<li>` en flex row (visible dans le code project detail). Sur mobile, les items flex ne se refluent pas automatiquement en colonne sauf si `flex-wrap: wrap` est present. Le code project detail utilise `flex-wrap: wrap` sur les formulaires mais pas sur les items de liste.
- Les colonnes multiples (taches: statut + titre + date + actions) risquent de se comprimer horizontalement sur mobile.

**Langue et typographie :**
- `html lang` mis a jour via UXDR-002 : correct.
- Le FR-CA a des guillemets specifiques (« »), des espaces insecables avant les deux-points et points d'exclamation. Ces conventions typographiques ne sont pas presentes dans les strings i18n actuelles — acceptable pour un ERP interne, a noter si le produit vise un usage grand public ou institutionnel.

#### Orientation recommandee

1. **Priorite haute** : definir un breakpoint mobile pour la SideNav — soit repli en drawer/hamburger, soit navigation bottom-bar pour mobile. Le pattern drawer est le plus courant pour les admin shells sur mobile.
2. **Priorite haute** : les items de liste dans les pages detail (tasks, time entries) doivent basculer en layout colonne sur mobile (`flex-direction: column` sous un breakpoint defini).
3. **Priorite moyenne** : auditer les styles `focus-visible` sur les composants Sentropic et sur les boutons natifs utilises dans les formulaires de projet (les boutons inline ne passent pas par le composant `Button`).
4. **Priorite basse** : les guillemets et espaces insecables typographiques FR-CA peuvent attendre — pas bloquant pour un ERP interne.

#### Alternatives rejetees

- **Bottom-tab nav mobile** : adapte aux applications grand public; moins conventionnel pour un back-office admin avec 14 items; le drawer est plus scalable.
- **Pas de changement mobile** : les pages detail projet sont actuellement inutilisables sur mobile; inacceptable si des operateurs terrain saisissent du temps depuis un telephone.

---

## Top orientations — priorites et impact

| # | Orientation | Impact | Effort | Severite |
|---|---|---|---|---|
| 1 | **Grouper la SideNav en 4 sections visuelles** (CRM / Projects / Billing / Admin) | Tres eleve — touche tous les utilisateurs a chaque session | Faible (separateurs visuels, pas de logique d'etat) | Majeure |
| 2 | **Stepper de statut sur Opportunity et Invoice** | Eleve — les deux entites les plus consultees en CRM et Billing; le pipeline stage est invisible sans le detail | Moyen (composant stepper + donnees deja disponibles) | Majeure |
| 3 | **Sections enfants sur Company detail** (Opportunities + Contacts lies) | Eleve — actuellement une fiche societe n'a aucune valeur operationnelle; un commercial ne peut pas naviguer Company → ses Opportunities | Moyen (requete supplementaire + section inline) | Importante |
| 4 | **Remplacer les champs UUID bruts** (companyId, userId, rateId) par des selecteurs | Eleve — blocage fonctionnel pur; un formulaire avec un champ "user-uuid" n'est pas exploitable | Moyen (autocomplete ou select peuple par API) | Bloquante |
| 5 | **Drawer mobile pour la SideNav** | Moyen a eleve selon les usages mobiles prevus | Moyen-eleve (logique d'etat drawer + tests responsive) | Importante |
| 6 | **Coherence des accents dans foundation.fr.json** | Faible impact utilisateur, important pour la qualite perçue | Tres faible (chercher-remplacer) | Mineure |
| 7 | **Defaut devise CAD et reformatage des dates en fr-CA** | Moyen (qualite perçue + conformite locale) | Faible | Mineure a importante |

---

## Note pour la passe de synthese

Ce document couvre l'etat de l'art et les conventions. Il reste deux passes necessaires avant decision :

1. **Passe de revue implementee** : captures Playwright par route et viewport (desktop 1280x800, short desktop 1280x600, mobile 390x844), locales FR et EN, avec evidence sur les points 1 (flat nav), 5 (statut visuel), et 6 (mobile overflow).
2. **Passe de contradiction/synthese** : examiner les arguments contre les orientations 1 et 3 en particulier (groupage nav vs coherence Sentropic SideNav API; sections inline vs richesse de la Company detail).

Les points 4 (UUID bruts) et 6 (accents) sont des corrections techniques sans arbitrage UX necessaire — ils peuvent etre implementes directement apres validation fonctionnelle.
