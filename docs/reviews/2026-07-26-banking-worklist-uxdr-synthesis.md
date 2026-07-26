# Synthèse 3 — Worklist de rapprochement bancaire (UXDR), owner-ratifiée 2026-07-26
Passerelle de synthèse du worklist de rapprochement bancaire (UXDR), ratifiée par l’owner le 2026-07-26.

# UXDR — Passe 3 : contradiction / synthèse du worklist de rapprochement bancaire

- **Date** : 2026-07-25
- **Statut** : orientation finale proposée à l’owner
- **Périmètre** : v1 paiement seulement, montant + devise exacts, relation 1:1, mono-acteur avec audit, attestation sans écriture comptable

## 1. Réconciliation des deux passes

### Accords

Les deux passes convergent sur les points structurants suivants :

- la ligne bancaire est l’unité primaire d’une file de travail, et la proposition est son détail/action subordonné ;
- l’Option A — file unique avec preuve développable en ligne — est la meilleure taille pour un v1 paiement seulement, exact montant + devise et 1:1 ;
- `GET /banking/reconciliation/suggestions` ne fait que lire des propositions stockées ; le recalcul reste une mutation explicite ;
- aucune confirmation en masse et aucun score numérique ne doivent être exposés : l’égalité montant/devise est une condition d’admissibilité, non une preuve d’identité ni une probabilité ;
- la confirmation est une attestation auditée et n’écrit aucun journal ; ce fait doit être visible avant l’action et dans son retour de succès ;
- les actions sont unitaires, portées par des formulaires SvelteKit nommés avec `use:enhance`, validation serveur et clé d’idempotence ; aucun `fetch` direct depuis le composant ;
- la coque applicative vient de la file d’approbations, mais la collection doit être sémantique (`DataTable`, ou `ul/li` si des cartes sont retenues) ;
- le feedback livré est `Alert`, les états vides utilisent `EmptyState`, et les statuts utilisent des `Tag` localisés ;
- toutes les chaînes visibles et ARIA doivent être ajoutées simultanément aux catalogues EN et FR ;
- l’écran est un sous-item de Facturation/Billing sous une route `/admin/billing/...`, sans nouveau module de premier niveau.

### Conflits tranchés

1. **Confirmation d’ignore : composer `Modal` + `Button` du DS, et ne pas utiliser `window.confirm`.** L’absence d’`AlertDialog` spécialisé n’empêche pas une confirmation accessible : `Modal` est livré, gère dialogue, focus et Échap, tandis qu’ignore n’a aucun inverse dans l’API et mérite plus de friction que les approbations directement soumises. La même confirmation est requise pour reject, car une paire rejetée ne sera jamais reproposée.

2. **Feedback : utiliser des `Alert` de page contextualisées, pas des toasts.** Les messages peuvent rester riches et spécifiques à l’action, avec état occupé du bouton et retour de focus, sans inventer pour une route un hôte de toast absent de l’application.

3. **Trois états : conserver les trois vues, mais les porter par trois liens `Button` standards et le paramètre URL `status`.** `Tabs` et `FilterBar` n’apportent ici aucune capacité nécessaire et n’ont pas de précédent applicatif ; des liens « À rapprocher / Rapprochées / Ignorées » avec état actif accessible donnent une navigation persistante, partageable et fidèle à `GET /banking/transactions?status=...`.

4. **Unmatch n’est pas présenté comme « Undo ».** Le handler valide `linkId`, appelle `unmatchReconciliationProposal` et renvoie un `ReconciliationLink`; les fichiers contractuels autorisés ne déclarent ni la transaction résultante ni une transition `confirmed → proposed`. Le libellé doit donc être « Défaire le rapprochement », puis l’UI relit transactions et propositions ; elle ne promet ni restauration instantanée de la proposition ni effacement de l’audit. En revanche, ignore est bien irréversible dans l’API livrée : aucune route `unignore` ou `ignored → unmatched` n’existe. La ligne reste consultable et l’évidence importée n’est pas supprimée.

### Contrat API revérifié et stratégie d’actualisation

Les réponses d’erreur sont `{ code: "INVALID_JSON" }` pour un JSON illisible, `{ code: "INVALID_INPUT", message }` pour une validation, `{ code: "NOT_FOUND", message }` pour `404` et `{ code: "CONFLICT", message }` pour `409`. L’UI localise le message principal par `code`, peut afficher le `message` serveur en détail, ne retire jamais une ligne sur échec et propose de relire l’état sur conflit.

| Endpoint | Réponse `200` du handler | `400 / 404 / 409` atteignables dans le handler | Actualisation UI après succès |
|---|---|---|---|
| `POST /banking/import` | `BankingImportResult`, corps brut | `400` JSON invalide ou validation ; le mapper commun sait aussi rendre `404` et `409` si le service les lève | relire la vue de transactions ; ne pas lancer refresh implicite |
| `GET /banking/transactions?status=...&limit=...&offset=...` | `{ items }` (`BankTransactionList`) | `400` si status, limit ou offset est invalide ; aucun chemin `404/409` | remplacer la page lue, sans mise à jour optimiste |
| `GET /banking/reconciliation/suggestions` | `{ items }` (`ReconciliationSuggestionList`) | aucun chemin `400/404/409` explicite | remplacer les propositions stockées ; aucune écriture |
| `POST /banking/reconciliation/refresh` | `BankingRefreshResult`, corps brut | le mapper commun sait rendre `400/404/409` si le service les lève | relire les suggestions et conserver la vue/focus lorsque possible |
| `POST /banking/reconciliation/:linkId/confirm` | `ReconciliationLink`, corps brut | `400` UUID invalide/validation, `404` lien absent, `409` conflit | relire transactions et suggestions ; annoncer l’attestation sans écriture |
| `POST /banking/reconciliation/:linkId/reject` | `ReconciliationLink`, corps brut | `400` UUID invalide/validation, `404` lien absent, `409` conflit | relire transactions et suggestions ; garder la transaction dans unmatched |
| `POST /banking/reconciliation/:linkId/unmatch` | `ReconciliationLink`, corps brut | `400` UUID invalide/validation, `404` lien absent, `409` conflit | relire transactions et suggestions ; ne pas supposer le nouvel état du lien |
| `POST /banking/transactions/:id/ignore` | `BankTransaction`, corps brut | `400` UUID invalide/validation, `404` transaction absente, `409` conflit | utiliser le retour comme preuve de succès puis relire transactions et suggestions |

### Écarts et gaps restants

- Le registre `buildBankingRoutes()` sous-documente les handlers : `GET /transactions` omet son `400`, import omet son `400`, et les mutations par identifiant omettent au minimum `400` et `404` dans `errorStatuses`. Le client web doit gérer le comportement réel des handlers, pas seulement la liste du registre.
- `GET /banking/transactions` renvoie `{ items }` sans total ni curseur. Le v1 peut offrir précédent/suivant avec `limit/offset`, mais ne doit pas afficher un total global ou un nombre de pages inventé.
- Les réponses confirm/reject/unmatch sont des liens, pas les transactions corrélées. Toute suppression ou migration optimiste d’une ligne serait fragile ; la relecture serveur est normative.
- Le contrat autorisé ne montre aucun endpoint de consultation d’un lien confirmé par transaction. Une action immédiate « Défaire » peut réutiliser le `linkId` renvoyé par confirm, mais une vue Rapprochées persistante ne peut promettre « Défaire le rapprochement » qu’à condition que `BankTransaction` expose effectivement ce `linkId`. C’est un critère de Go/No-Go de l’intégration, pas une hypothèse UI.
- L’écran, le client web bancaire et les clés i18n n’existent pas encore. Le build devra ajouter les méthodes typées, la route, le sous-item de navigation et les deux catalogues avant toute revue visuelle.

## 2. Critères d’acceptation corrigés

1. L’entrée charge `GET /banking/transactions?status=unmatched&limit=...&offset=...` et `GET /banking/reconciliation/suggestions`; elle n’appelle jamais refresh au chargement.
2. Les liens À rapprocher, Rapprochées et Ignorées écrivent exclusivement `status=unmatched|matched|ignored` dans l’URL et relisent la liste. Aucun appel n’emploie `reconciliationStatus`.
3. Chaque ligne montre au minimum date, libellé, montant signé et code devise lorsque ces champs sont fournis ; son contrôle d’expansion nomme la ligne sans dépendre de sa position. La pagination n’affiche ni total ni nombre de pages absent de la réponse `{ items }`.
4. Une proposition développée distingue « Ligne bancaire » et « Paiement proposé », montre montant/devise et dates, puis exprime uniquement les raisons effectivement fournies par l’API ; le front ne recalcule ni score, ni recouvrement de référence.
5. Aucun pourcentage, score numérique ou pseudo-niveau de confiance n’apparaît dans le parcours de décision ; les conditions montant/devise et les indices date/référence sont formulés en texte.
6. « Confirmer » appelle `POST /banking/reconciliation/:linkId/confirm`. Le succès utilise le `ReconciliationLink` retourné, annonce qu’aucune écriture comptable n’a été créée, puis relit transactions et suggestions. « Défaire le rapprochement » appelle uniquement `POST /banking/reconciliation/:linkId/unmatch`, exige un `linkId` réellement exposé, puis relit les deux collections sans supposer `confirmed → proposed`.
7. « Écarter cette proposition » ouvre la confirmation DS, appelle `POST /banking/reconciliation/:linkId/reject`, avertit que cette paire ne sera plus proposée et, après succès, laisse la transaction dans À rapprocher après relecture.
8. « Ignorer la ligne » est séparé des actions de proposition, ouvre la confirmation DS, appelle `POST /banking/transactions/:id/ignore`, déplace la ligne dans Ignorées après relecture et n’offre aucun Undo/unignore.
9. « Recalculer les propositions » est une action de page explicite qui appelle `POST /banking/reconciliation/refresh`. Ni `GET /banking/reconciliation/suggestions`, ni ouverture de page, ni changement de status, ni retour de focus ne déclenche cette mutation.
10. Pour toute mutation, seul le formulaire actif est occupé/désactivé. Un `400`, `404`, `409` ou incident réseau conserve la ligne, produit un `Alert` localisé et permet une relecture ; aucun succès n’est anticipé avant la réponse `200`.
11. Un utilisateur peut ouvrir une proposition, parcourir ses preuves, confirmer/rejeter, puis atteindre la prochaine cible logique avec Tab, Maj+Tab, Entrée et Espace, sans piège de focus. Une `Modal` se ferme sur Échap, garde une annulation explicite et rend le focus au déclencheur.
12. Chaque paire est annoncée comme un groupe nommé avec deux objets et un groupe de preuves ; état occupé, succès, conflit et statuts ne reposent ni sur la couleur, ni sur la position. Après retrait d’une ligne, le focus va à la prochaine ligne ou au titre de l’état vide.
13. Les catalogues `foundation.en.json` et `foundation.fr.json` contiennent les mêmes nouvelles clés. Les deux locales distinguent proposition confirmée, transaction rapprochée, paire rejetée et ligne ignorée ; le code devise reste visible et le changement de locale conserve pathname et status.
14. Quatre situations ont des rendus distincts : aucune donnée importée ; lignes sans proposition avant refresh ; aucune proposition admissible après refresh ; aucune ligne unmatched avec répartition visible entre rapprochées et ignorées. L’état sans import ne promet ni upload de fichier ni connexion bancaire non spécifiés.
15. Aucun contrôle, libellé ou état vide ne suppose recherche manuelle de candidats, facture, split, conversion/multi-devise, deuxième approbateur, écriture automatique ou suppression de l’évidence importée.
16. Les tests de contrat utilisent `GET /banking/transactions?status=unmatched|matched|ignored` et `POST /banking/reconciliation/:linkId/unmatch`, et vérifient que le client ne génère ni `reconciliationStatus` ni `/banking/reconciliation-links/:id/unmatch`. Ils couvrent aussi `400` pour query/UUID invalide, `404` pour identifiant absent et `409` pour conflit sur les mutations concernées.

## 3. Option recommandée

**Retenir l’Option A : une file unique centrée sur la ligne bancaire, avec une proposition développable en ligne.** C’est l’option à faire ratifier à l’owner.

La vue active est portée par `status=unmatched|matched|ignored`. Dans À rapprocher, chaque ligne reste compacte jusqu’à l’ouverture de sa proposition ; le détail compare ligne bancaire et paiement, explique les signaux réellement fournis, rappelle qu’une confirmation n’écrit rien, puis expose les actions unitaires. Une seule expansion à la fois est recommandée sur petit écran. Les mutations suivent le formulaire SvelteKit et le feedback `Alert` de l’application ; ignore et reject passent par une `Modal` DS.

L’Option B à deux volets est rejetée parce que sa valeur dépend de plusieurs candidats, de recherche manuelle, de pièces ou de splits absents du v1. L’Option C guidée une ligne à la fois est rejetée parce qu’elle masque le travail restant, les lignes sans proposition et la possibilité de remettre un cas à plus tard.

Sont explicitement hors périmètre v1 : confirmation en masse, score/confiance numérique, recherche ou choix manuel d’un autre paiement, rapprochement de factures, split d’une transaction, conversion ou rapprochement entre devises différentes, deuxième approbateur, création/comptabilisation d’écriture, suppression/modification de l’évidence importée, restauration d’une paire rejetée, unignore, connexion bancaire et parseur/upload de fichier non définis par `BankingImportInput`.

## 4. Décisions owner uniquement

1. **Lancement avec ignore irréversible ?**
   - **A — Oui, accepter la limite v1** avec confirmation `Modal`, wording explicite, vue Ignorées consultable et aucun faux Undo. **Défaut recommandé.**
   - **B — Non, rendre le lancement No-Go** jusqu’à la ratification et la livraison d’un endpoint `unignore`.

2. **Route et libellé visibles ?**
   - **A — `/admin/billing/reconciliation`**, « Rapprochement bancaire / Bank reconciliation », quatrième sous-item de Facturation/Billing après Comptabilité/Accounting. **Défaut recommandé.**
   - **B — `/admin/billing/transactions`**, « Transactions bancaires / Bank transactions », au même emplacement.

Le défaut A est recommandé parce que l’écran est un worklist de décision de rapprochement, pas un registre généraliste de transactions.

## 5. Champs du UX Decision Record

### Ou

Futur écran de worklist bancaire, défaut proposé `/admin/billing/reconciliation`, sous Facturation/Billing ; workflow ligne bancaire → proposition stockée → confirm/reject, avec vues durablement filtrées par `status` et actions refresh/unmatch/ignore.

### Orientation

Option A : file sémantique unique, ligne bancaire compacte et preuve développable en ligne ; trois vues par liens URL standards ; recalcul explicite ; décisions unitaires ; facteurs lisibles sans score ; `Alert` pour les retours ; `Modal` pour ignore et reject ; aucune promesse d’effet comptable.

### Options rejetees

- **B — deux volets** : surdimensionnée et évocatrice de recherche, multi-candidats, pièces ou splits absents.
- **C — revue guidée** : masque la file, les lignes sans proposition et la remise à plus tard.
- **Bulk confirm** : aucune route de lot et l’exactitude montant/devise ne prouve pas l’identité.
- **Score numérique** : le score déterministe n’est pas une probabilité calibrée.
- **Tabs/FilterBar** : capacité sans précédent applicatif et sans bénéfice nécessaire face à trois liens URL.
- **Toast** : composant sans hôte ni convention ; `Alert` est le langage livré.
- **`window.confirm`** : précédent incohérent avec l’obligation DS et insuffisant pour les actions sans inverse.

### Preuves

- **Agent passe 1 — état de l’art** : `docs/reviews/2026-07-26-banking-worklist-uxdr-pass1-etat-de-lart.md`, options A/B/C, risques, accessibilité et 16 critères initiaux.
- **Agent passe 2 — revue de l’implémenté** : `docs/reviews/2026-07-26-banking-worklist-uxdr-pass2-revue-implemente.md`, analogue approvals, conventions SvelteKit/DS/i18n/navigation et gaps.
- **Agent passe 3 — contradiction/synthèse** : relecture directe de `apps/api/src/http/routes/banking.ts` et `apps/api/src/http/handlers/banking.ts`, notamment chemins, réponses et mapper `400/404/409`.
- `rules/MASTER.md`, sections Decision protocol et Reporting.
- Sémantiques backend ratifiées communiquées pour cette décision : paiement seulement, montant + devise exacts, 1:1 sur transaction et paiement, aucune écriture, paire rejetée jamais reproposée, import immuable, mono-acteur avec audit.

Aucune capture du futur écran n’existe puisqu’il n’est pas implémenté ; la preuve visuelle appartient au gate de réalisation, pas à cette orientation.

### Risques

- **Ignore et reject sans inverse** : confirmation modale, wording terminal, vue d’audit consultable ; owner peut choisir le No-Go pour ignore.
- **Unmatch sur vue persistante** : le `linkId` confirmé n’est pas démontré par les réponses listées ; No-Go si la transaction matched ne l’expose pas, ou évolution de contrat séparée.
- **État périmé entre deux acteurs/onglets** : aucun retrait optimiste, traitement explicite du `409`, relecture serveur après toute mutation.
- **Refresh explicitement déclenché donc propositions potentiellement anciennes** : afficher le caractère stocké des propositions et laisser l’action de page visible, sans refresh automatique.
- **Pagination sans total** : précédent/suivant seulement ; ne pas afficher de métrique globale non fournie.
- **Registre de routes incomplet sur les erreurs** : typer et tester `400/404/409` selon les handlers réels.
- **Écran futur non éprouvé** : Playwright, matrice FR/EN desktop/mobile et captures reviewer obligatoires avant Go release.

### Decision proposee

**Oui à l’`Option A`, avec les défauts owner **4.1-A** (ignore irréversible assumé en v1) et **4.2-A** (`/admin/billing/reconciliation`, « Rapprochement bancaire / Bank reconciliation »).

### Go/No-Go

**No-Go actuel pour réalisation finale** tant que les deux choix owner ne sont pas ratifiés et que la disponibilité d’un `linkId` confirmé dans la vue Rapprochées n’est pas démontrée.

Le passage à **Go** est observable lorsque :

1. l’owner ratifie Option A et répond aux deux questions de la section 4 ;
2. les 16 critères de la section 2 passent, dont les vrais chemins `status` et unmatch ;
3. toutes les mutations passent par les form actions SvelteKit et traitent `400/404/409` sans mise à jour optimiste ;
4. EN/FR, clavier, focus, responsive et absence de débordement sont couverts par Playwright ;
5. les captures reviewer montrent le header, le panneau Facturation et le main aux viewports/locales requis ;
6. aucun libellé ou contrôle ne promet une capacité hors API.

## 6. Risques de sur-promesse

| Capacité non livrée | Promesse UI interdite | Traitement honnête du v1 |
|---|---|---|
| Recherche manuelle de candidat | recherche, sélecteur « autre paiement », création manuelle de lien | afficher seulement les propositions stockées ; reject ou laisser la ligne en attente |
| Factures | libellé « facture candidate », accès à une facture comme objet rapproché | parler de paiement enregistré uniquement |
| Splits | « répartir », plusieurs paiements par ligne ou montant partiel | relation strictement 1 transaction ↔ 1 paiement, montants exacts |
| Multi-devise/conversion | taux de change, équivalence CAD/USD, tolérance de conversion | exiger le même code devise et le garder visible |
| Auto-posting | « comptabiliser », « créer/poster l’écriture », état suggérant un journal produit | répéter que confirmer atteste le lien et ne crée aucune écriture comptable |
| Approbation à deux acteurs | étape « en attente d’un second approbateur » | un acteur décide ; l’audit conserve l’action |
| Bulk confirm | sélection multiple ou « confirmer toutes » | une décision auditée à la fois |
| Undo universel | Annuler après reject/ignore ou promesse que unmatch restaure `proposed` | confirmation terminale pour reject/ignore ; unmatch séparé, puis relecture autoritative |
| Import de fichier/connexion bancaire | dropzone CSV, mapping de colonnes ou synchronisation bancaire | ne présenter l’import que si une source amont sait déjà produire `BankingImportInput` |
| Totaux et complétude globale | « N lignes au total », nombre de pages ou « tout est rapproché » depuis une page `{ items }` | navigation limit/offset sans total ; distinguer rapprochées et ignorées |
| Confiance probabiliste | pourcentage, « forte confiance », seuil automatique | afficher seulement les facteurs fournis ; aucun score numérique |

Le test de wording doit notamment échouer si l’écran contient « sélectionner un autre paiement », « facture », « répartir », « convertir », « approuver à deux » ou « comptabiliser » comme capacité disponible.
