# UXDR — Passe 1 : état de l’art du worklist de rapprochement bancaire

- **Date** : 2026-07-25
- **Statut** : orientation de design, avant revue de l’implémenté et contradiction/synthèse
- **Ou** : futur écran comptable de rapprochement bancaire OpenERP; route UI et emplacement exact dans la navigation non établis par les sources autorisées
- **Périmètre** : v1 D9, paiement seulement, appariement exact montant + devise, relation 1:1, mono-acteur avec audit, attestation sans écriture comptable
- **Orientation** : **Option A — file unique centrée sur la ligne bancaire, avec proposition développable en ligne**
- **Décision proposée** : retenir A comme défaut v1, sans confirmation en masse et sans score numérique

Cette passe décrit des familles de patterns et des principes génériques dans ses propres mots. Elle ne reproduit ni texte, ni écran, ni structure de workflow d’un produit tiers.

## 1. Layout patterns

### Pattern 1 — File unique avec proposition développable en ligne

Chaque ligne bancaire est une unité stable de la file « À rapprocher ». Son résumé montre ce que la banque atteste : date comptable, libellé, montant signé, devise et compte. Lorsqu’une proposition stockée existe, la ligne indique qu’elle est prête à être revue; son développement révèle le paiement candidat et les preuves de rapprochement. Confirmer ou écarter la proposition ne demande pas de quitter la file.

**Forces**

- Conserve le contexte de progression : une ligne bancaire reste visible avant la décision.
- Correspond directement aux états durables de la transaction : `unmatched`, `matched`, `ignored`.
- Réduit la densité initiale tout en rendant les preuves disponibles au moment nécessaire.
- Convient à un modèle simple où une proposition associe un paiement de même montant et de même devise à une ligne.
- S’adapte bien à une revue clavier séquentielle.

**Limites**

- Une ligne développée devient haute; plusieurs propositions ouvertes à la fois rendraient la file difficile à balayer.
- Une mise en page trop proche d’un simple tableau peut faire paraître la confirmation automatique ou anodine.
- L’expansion doit préserver le focus, la position de défilement et l’association sémantique entre les deux objets.

### Pattern 2 — Espace à deux volets, ligne bancaire à gauche et candidat à droite

Le volet gauche sert de file; la sélection d’une ligne charge sa proposition et ses preuves dans un panneau de décision persistant à droite.

**Forces**

- Offre beaucoup d’espace pour comparer les deux côtés sans élargir chaque ligne.
- Maintient la file visible pendant la revue.
- Évolue mieux vers plusieurs candidats, des pièces jointes, des répartitions ou une résolution d’exception plus riche.

**Limites**

- Surdimensionné pour un v1 paiement seulement, exact et 1:1.
- La relation sélectionnée peut devenir ambiguë pour une personne au clavier ou avec un lecteur d’écran si le focus visuel et le focus réel divergent.
- Demande une stratégie responsive distincte; sur écran étroit, il redevient un flux à une colonne.
- Incite à anticiper des capacités que l’API v1 ne fournit pas, notamment la recherche libre de candidats et le fractionnement.

### Pattern 3 — Revue guidée, une ligne à la fois

Une vue focalisée présente une transaction et une proposition, puis avance vers la suivante après une décision.

**Forces**

- Rend le moment de décision très clair.
- Facilite une cadence clavier prévisible et un affichage accessible en une seule séquence.
- Évite la surcharge d’une longue file.

**Limites**

- Cache la forme générale du travail restant et rend les comparaisons entre lignes difficiles.
- Peut pousser à décider trop vite pour « avancer ».
- Ajoute un mode et une navigation propres alors que la file unique suffit au périmètre v1.
- Gère moins bien les lignes sans proposition ou celles que l’utilisateur souhaite remettre à plus tard.

### Ajustement au périmètre v1

Le meilleur ajustement est le **Pattern 1**. L’égalité du montant et de la devise retire une grande partie du besoin d’un comparateur complexe; le 1:1 et le périmètre paiement seulement retirent le besoin d’un espace de composition. Le détail développé doit néanmoins ressembler à une comparaison explicite, pas à une simple action placée au bout d’une ligne.

La **ligne bancaire est l’unité primaire de travail**. La proposition est une preuve/action subordonnée à cette ligne, pas l’objet principal de la navigation. Ce choix reste cohérent quand une ligne n’a aucune proposition, lorsqu’elle est ignorée, et lorsqu’un lien confirmé est défait. Il évite aussi de présenter deux fois la même transaction si le modèle de propositions évolue.

Le mode guidé peut devenir plus tard une préférence de revue, mais ne devrait pas être une deuxième architecture v1. Le deux-volets devient pertinent seulement si la recherche manuelle, plusieurs candidats crédibles, les répartitions ou les pièces justificatives entrent dans le périmètre.

## 2. Le moment de décision

Le bloc développé doit mettre les deux objets en parallèle sous un intitulé unique, par exemple « Proposition pour la ligne du 18 juillet, 1 250,00 CAD ». L’utilisateur doit pouvoir répondre à trois questions sans ouvrir une autre page :

1. Est-ce bien le même mouvement d’argent?
2. Quels signaux soutiennent cette association?
3. Qu’est-ce que la confirmation va réellement faire?

### Champs à présenter

**Ligne bancaire**

- montant signé, code devise toujours visible;
- date comptable;
- libellé bancaire complet, sans troncature dans le détail;
- compte bancaire ou son nom d’affichage, si plusieurs comptes sont dans la même file;
- identifiant/référence bancaire utile à la distinction, seulement s’il est exposé par la réponse API.

**Paiement proposé**

- montant et devise;
- date du paiement;
- référence du paiement;
- payeur/bénéficiaire ou libellé métier, si la réponse de suggestion le fournit;
- identifiant du paiement en information secondaire, utile à l’audit mais pas comme preuve humaine principale.

**Preuves calculées**

- « Montant exact » et devise identique : ce sont des conditions d’admissibilité, pas un bonus;
- écart de dates écrit concrètement, par exemple « 1 jour après », accompagné des deux dates;
- référence concordante : montrer les fragments significatifs communs, sans présenter la totalité de la chaîne comme identique;
- absence de concordance de référence dite explicitement, plutôt que masquée;
- si une preuve n’est pas fournie par l’API, l’interface ne doit pas la reconstruire de façon divergente.

Les deux montants peuvent être alignés visuellement, mais ne doivent pas être signalés uniquement par la couleur. Les différences et ressemblances de références doivent rester compréhensibles sans surlignage.

### Traitement du score

**Ne pas afficher le score numérique en v1.** Un nombre tel que `0,85` suggère une probabilité calibrée alors que le moteur additionne des règles déterministes : base d’admissibilité par montant/devise, proximité de date et recouvrement de référence. Il pousserait aussi à considérer comme sûres deux associations de même montant malgré une identité métier ambiguë.

Ne pas remplacer ce nombre par un vague « 85 % fiable ». Le meilleur signal qualitatif est le **résumé des preuves elles-mêmes** : « montant exact · dates à 1 jour · référence concordante ». Si une catégorie globale est absolument nécessaire pour trier, elle devra être définie et testée séparément; elle n’est pas requise pour décider dans le layout recommandé.

Sous les boutons, une phrase persistante doit fixer la portée : **« Confirmer atteste l’association; aucune écriture comptable n’est créée ni comptabilisée. »** Le texte doit être visible au premier rapprochement et rester accessible ensuite dans le détail, sans dépendre d’une infobulle.

## 3. Flow et états

### Entrée

L’entrée logique est la zone financière/bancaire, par un libellé explicite « Rapprochement bancaire / Bank reconciliation ». La route UI et sa place exacte dans l’architecture d’information ne figurent pas dans les sources autorisées : elles doivent être confirmées lors de la passe de revue de l’implémenté, pas inventées ici.

À l’ouverture, la vue charge la file `unmatched` et les **propositions déjà stockées**. Une lecture de suggestions ne doit jamais déclencher un recalcul.

### Refresh : action explicite

`refresh` doit rester une **action utilisateur explicite**, intitulée selon son effet, par exemple « Recalculer les propositions », avec une courte aide « Utilise les lignes non rapprochées et les paiements admissibles ». Elle ne doit pas s’exécuter à chaque chargement, changement d’onglet ou retour de focus :

- le registre de routes le qualifie d’explicite;
- l’opération reconstruit des propositions persistées et est auditée;
- une proposition rejetée ne doit jamais être réintroduite;
- un recalcul implicite rendrait difficile de comprendre pourquoi la file a changé.

Après un import réussi, l’étape suivante peut proposer clairement « Recalculer les propositions », mais le clic reste distinct. Le retour du refresh annonce combien de propositions ont été créées, conservées ou non trouvées **uniquement si ces nombres sont réellement fournis par la réponse**. Sinon, un message honnête « Propositions recalculées » suivi du rechargement des données suffit.

### Navigation par état

Trois vues sœurs utilisent les états de transaction durables :

- **À rapprocher / Unmatched** : travail actif, avec ou sans proposition;
- **Rapprochées / Matched** : attestations confirmées, avec accès au détail et à « Défaire le rapprochement »;
- **Ignorées / Ignored** : lignes explicitement exclues du travail.

Le changement de vue ne doit pas perdre les filtres communs pertinents, mais aucun filtre non disponible dans l’API ne doit être promis. La pagination doit rester visible et stable; l’API plafonne une page à 200 éléments.

Le vocabulaire d’interface doit conserver la distinction du modèle : une **proposition est confirmée ou rejetée**, tandis qu’une **transaction est à rapprocher, rapprochée ou ignorée**.

### Placement des actions

- **Confirmer** : action primaire à l’intérieur du bloc de proposition, proche du résumé de preuves.
- **Écarter cette proposition** : action secondaire dans le même bloc. Son dialogue avertit que cette paire précise ne sera plus proposée.
- **Ignorer la ligne** : action de la ligne bancaire, séparée visuellement de la proposition. Elle ne doit pas ressembler à un refus du candidat.
- **Défaire le rapprochement** : dans le détail d’une ligne `matched`, pas dans la file active. Elle ramène le lien de `confirmed` à `proposed`.
- **Recalculer les propositions** : action de niveau page, jamais dans chaque ligne.
- **Importer** : action de niveau page ou état initial, utilisant uniquement l’import de snapshot normalisé exposé; cette passe ne définit pas de parseur de fichier ou de connexion bancaire.

### Feedback par action

Pour toutes les mutations, le bouton actif prend un état occupé, les autres actions de cette seule ligne sont temporairement désactivées, et le reste de la file demeure utilisable. Le succès est annoncé dans une région live et le focus passe de façon prévisible à la prochaine ligne ou au titre de l’état atteint. En cas de `409` ou d’erreur réseau, la ligne reste en place, son contenu n’est pas optimistement supprimé, et le message permet de recharger son état.

- **Confirm** : « Ligne rapprochée — attestation enregistrée, aucune écriture comptable créée », puis retrait de la vue active. Une action immédiate « Défaire » peut appeler l’unmatch existant.
- **Reject** : « Proposition écartée; cette paire ne sera plus proposée ». La ligne reste `unmatched` et peut se retrouver sans proposition.
- **Unmatch** : « Rapprochement défait; la proposition est de nouveau à revoir », puis déplacement vers `unmatched`.
- **Ignore** : « Ligne déplacée vers Ignorées ». L’interface ne doit pas offrir un faux bouton Annuler : l’API fournie n’expose aucun retour `ignored → unmatched`.
- **Refresh** : résultat au niveau page; les expansions et le focus sont conservés lorsque l’objet correspondant existe toujours.

### États vides et fin de travail

Il faut distinguer quatre situations :

1. **Aucune donnée importée** : expliquer que le rapprochement commence par un snapshot bancaire normalisé et proposer l’import.
2. **Lignes à rapprocher, aucune proposition stockée** : proposer le recalcul; ne pas laisser croire que la lecture de la page calcule automatiquement.
3. **Après recalcul, aucune proposition admissible** : expliquer sobrement que les propositions exigent montant et devise identiques; laisser la ligne en attente et rendre « Ignorer » disponible, sans pousser à l’utiliser pour vider la file.
4. **Plus aucune ligne `unmatched` mais des lignes traitées** : état « Toutes les lignes importées ont été traitées », avec accès aux vues Rapprochées et Ignorées. « Entièrement rapproché » serait trompeur s’il existe des lignes ignorées; le résumé doit distinguer les deux issues.

## 4. Bulk versus un par un

**Position claire : aucune action « Confirmer toutes les propositions fortes » en v1.**

L’égalité exacte du montant et de la devise est un bon filtre d’admissibilité, mais pas une preuve d’identité. Des paiements récurrents ou plusieurs règlements d’un même montant peuvent être simultanément plausibles. La date et la référence améliorent le rang sans transformer le score en probabilité de correction. De plus, le produit demande précisément une attestation humaine auditée; une confirmation en masse affaiblit la signification de cette attestation.

Le fait que confirmer ne crée pas d’écriture comptable réduit le coût d’une erreur, mais ne la rend pas bénigne : l’unicité 1:1 peut bloquer le bon paiement et produire une fausse impression de complétude. Un batch introduirait aussi des questions absentes du contrat v1 : sélection partielle, erreurs mixtes, aperçu, reprise et audit de lot.

L’efficacité doit venir d’une revue séquentielle :

- ouverture et fermeture rapides du détail;
- ordre stable;
- actions clavier accessibles et confirmées par une annonce;
- passage automatique mais non forcé à la prochaine ligne après succès;
- possibilité de laisser une ligne pour plus tard.

Une action de masse ne deviendrait défendable qu’après mesure d’un volume réel, analyse du taux de correction/défaire, définition publique d’un seuil et conception d’un aperçu de lot. Ces preuves n’existent pas dans ce périmètre.

## 5. Risque et réversibilité

### Confirmation

La confirmation est techniquement réversible avec l’unmatch livré. Pour la rendre sûre :

- rappeler au point de décision qu’elle atteste seulement une correspondance;
- ne pas utiliser de vocabulaire tel que « comptabiliser », « poster » ou « créer l’écriture »;
- afficher le nom de l’acteur et l’horodatage dans le détail si l’API les expose;
- offrir « Défaire le rapprochement » dans la vue Rapprochées;
- après confirmation, offrir une action courte « Défaire » qui appelle la même transition, sans prétendre effacer l’audit.

Défaire ne signifie pas effacer : l’audit doit rester. Le message doit dire que la ligne revient à revoir.

### Ignore et reject

Le risque principal est une asymétrie du contrat. **L’API fournie ne propose ni `unignore`, ni restauration d’une paire rejetée.** Il est donc impossible de rendre honnêtement ces actions réversibles dans l’interface v1 sans élargir l’API.

En conséquence :

- « Ignorer la ligne » demande une confirmation explicite qui explique que la ligne sortira du travail de rapprochement et qu’aucune restauration n’est disponible dans cet écran;
- la vue Ignorées reste consultable afin que l’acte ne ressemble pas à une suppression;
- « Écarter cette proposition » explique que cette paire précise ne sera jamais reproposée;
- aucune notification ne doit afficher « Annuler » si l’action correspondante n’existe pas;
- si la réversibilité d’ignore est une exigence de lancement, le front est **No-Go** jusqu’à une décision backend séparée; cette passe n’invente pas d’endpoint.

### Écart d’attente venant d’un autre outil comptable

Le danger n’est pas seulement une mauvaise correspondance : un comptable peut raisonnablement comprendre « Confirmer » comme « comptabiliser ». Trois signaux cohérents sont nécessaires :

1. titre ou aide de page : « Ce rapprochement atteste une correspondance; il ne comptabilise rien »;
2. rappel au moment de la première confirmation, non enfoui dans des conditions;
3. feedback de succès : « Attestation enregistrée — aucune écriture comptable créée ».

Le terme « attestation » peut être accompagné d’une explication la première fois; il ne doit pas remplacer partout le terme métier attendu « rapprochement bancaire ».

## 6. Accessibilité et bilingue FR/EN

### Revue clavier

- Les trois vues d’état sont un ensemble d’onglets seulement si leur implémentation respecte entièrement le pattern clavier des onglets; sinon, utiliser des liens/boutons de navigation simples.
- Chaque ligne a un contrôle nommé « Afficher la proposition pour [date, montant, devise] » avec état développé/réduit exposé.
- Tab et Maj+Tab atteignent toutes les actions; Entrée et Espace les activent. Aucun raccourci mono-lettre ne doit être la seule façon d’agir.
- Après une mutation réussie qui retire la ligne, le focus va au titre de la prochaine ligne. Si la file devient vide, il va au titre de l’état vide.
- L’action primaire ne se déclenche jamais au simple changement de sélection.
- Les états occupé, succès et erreur sont annoncés sans déplacer brutalement le lecteur d’écran.
- L’ordre visuel et l’ordre DOM restent identiques, y compris si les champs sont présentés en deux colonnes.

### Sémantique lecteur d’écran d’une paire

Une ligne développée forme un groupe nommé, par exemple « Proposition de rapprochement, ligne bancaire du 18 juillet, 1 250 dollars canadiens ». Elle contient deux sous-sections titrées :

1. « Ligne bancaire » avec une liste description/valeur;
2. « Paiement proposé » avec la même structure.

Un troisième groupe « Preuves de correspondance » énonce montant/devise, écart de dates et concordance de référence en texte complet. Les boutons nomment leur objet : « Confirmer cette proposition », « Écarter cette proposition », « Ignorer cette ligne bancaire ». Le statut ne repose ni sur la position, ni sur une icône, ni sur la couleur. Les montants négatifs sont annoncés comme débit/sortie ou avec un signe explicite selon la convention métier retenue; les parenthèses seules ne suffisent pas.

### Pièges de terminologie FR/EN

- **Rapprochement bancaire / Bank reconciliation** : terme principal pour l’activité. Ne pas le remplacer par « lettrage ».
- **Lettrage** : désigne plutôt l’association d’écritures ou de postes ouverts; l’utiliser pour une ligne bancaire créerait une fausse portée comptable.
- **Écriture comptable / Journal entry** : traduire l’objet métier, pas littéralement par “writing”. Le message critique est « Aucune écriture comptable n’est créée / No journal entry is created or posted ».
- **Encaissement** : implique une entrée d’argent. Employer « paiement enregistré / recorded payment » comme nom neutre du candidat tant que l’API peut représenter plus que des encaissements clients.
- **Rapprochée / Matched** qualifie la transaction; **confirmée / Confirmed** qualifie la proposition ou le lien. Ne pas interchanger ces deux statuts.
- **Ignorer / Ignore** doit être distingué d’« écarter la proposition / dismiss this proposal ».
- En français canadien, localiser date et séparateurs de nombre, mais garder le code devise visible (`CAD`, `USD`) pour éviter l’ambiguïté du symbole `$`.

Les libellés français sont souvent plus longs que les anglais. La disposition doit accepter l’expansion sans tronquer l’action ni déplacer le montant. Les traductions doivent être révisées comme terminologie comptable, pas seulement comme chaînes UI.

## 7. Options nommées

### Option A — File unique, preuve développable en ligne — **recommandée**

**Description** : la ligne bancaire est l’unité de la file. La proposition stockée s’ouvre sous la ligne avec comparaison, preuves et actions.

**Pour**

- Ajustement direct au modèle `unmatched/matched/ignored`.
- Faible complexité pour exact montant + devise, paiement seulement, 1:1.
- Bonne visibilité du travail restant et des lignes sans proposition.
- Chemin clavier court sans créer un mode séparé.
- Évolutive vers un détail plus riche tant que la comparaison reste simple.

**Contre**

- Demande un soin particulier à la hauteur des lignes et à la conservation du focus.
- Moins adaptée si plusieurs candidats ou des documents détaillés arrivent.
- Nécessite de limiter le nombre d’expansions simultanées sur les petites surfaces.

### Option B — Workspace à deux volets

**Description** : file de lignes à gauche, proposition sélectionnée et actions à droite.

**Pour**

- Comparaison généreuse et persistante.
- Bonne base pour plusieurs candidats, recherche manuelle ou pièces justificatives.
- La file et la décision restent visibles en même temps sur grand écran.

**Contre**

- Complexité responsive et accessibilité plus élevées.
- Surdimensionné pour le contrat v1.
- Risque d’ambiguïté entre ligne sélectionnée, focus clavier et panneau affiché.
- Peut suggérer des capacités de résolution que l’API ne permet pas.

### Option C — Revue guidée une ligne à la fois

**Description** : l’écran focalise une proposition, puis passe à la suivante après décision.

**Pour**

- Moment de décision net.
- Très bonne lisibilité et faible charge visuelle.
- Cadence clavier potentiellement rapide.

**Contre**

- Cache le contexte de file et les lignes sans proposition.
- Favorise une logique de « vider la pile ».
- Ajoute un mode, une progression et des règles de retour.
- Mauvaise base pour comparer ou remettre plusieurs cas à plus tard.

### Recommandation v1

Retenir **A**. Rejeter B pour le v1 car sa valeur dépend de capacités différées; rejeter C comme architecture principale car l’utilisateur doit pouvoir comprendre et gérer la file, pas seulement franchir une séquence. Une cadence guidée peut être obtenue dans A par la gestion du focus et l’ouverture de la ligne suivante, sans écran distinct.

## 8. Arbitrages difficiles et critères d’acceptation observables

### Arbitrages owner nécessaires

1. **Sécurité versus réversibilité d’ignore**
   Le contrat livré rend ignore consultable mais non réversible. Le owner doit soit accepter une confirmation forte et cette limite v1, soit ouvrir une décision backend avant de promettre « Annuler ».

2. **Recalcul explicite versus fraîcheur apparente**
   L’orientation recommande un recalcul explicite, cohérent avec les propositions persistées et l’audit. Le coût est qu’un nouvel encaissement interne ne modifie pas silencieusement les propositions; l’utilisateur doit relancer l’action.

3. **Densité de file versus clarté de décision**
   La file compacte accélère le balayage; le détail développé ralentit volontairement la confirmation. Le défaut recommandé est résumé compact + une proposition développée à la fois sur écran étroit.

4. **Preuves compréhensibles versus score synthétique**
   L’orientation cache le score numérique et montre les facteurs. Le owner doit confirmer que l’objectif est une décision explicable plutôt qu’un tri présenté comme « confiance ».

5. **Cadence versus confirmation en masse**
   L’orientation exclut le bulk v1. Le owner doit accepter que le rendement soit obtenu par le clavier et la stabilité du focus, non par une attestation de lot.

6. **Emplacement dans la navigation**
   Les sources autorisées ne décrivent pas l’IA du web. L’emplacement et la route doivent attendre la passe de revue de l’implémenté et la synthèse à 3 orientations prévues par le protocole MASTER.

7. **Contrat de route à résoudre avant build UI**
   Le contexte de tâche nomme le filtre `reconciliationStatus` et une route d’unmatch `/banking/reconciliation-links/:id/unmatch`, tandis que `apps/api/src/http/routes/banking.ts` expose le filtre `status` et `/banking/reconciliation/:linkId/unmatch`. Le front ne doit coder ni deviner entre les deux : le contrat autoritatif doit être aligné et testé.

### Critères d’acceptation observables pour l’Option A

1. À l’entrée, une lecture charge les transactions `unmatched` et les suggestions stockées sans appeler `refresh`.
2. Les vues À rapprocher, Rapprochées et Ignorées correspondent exclusivement aux trois états durables de transaction exposés par l’API.
3. Chaque ligne à rapprocher montre au minimum date, libellé, montant signé et code devise; son contrôle d’expansion nomme la ligne sans dépendre de sa position.
4. Une proposition développée distingue « Ligne bancaire » et « Paiement proposé », montre les deux montants/devises et dates, exprime l’écart de dates, puis montre la concordance ou l’absence de concordance de référence à partir des raisons fournies.
5. Aucun pourcentage ni score numérique n’apparaît dans le parcours de décision.
6. « Confirmer » appelle uniquement la mutation du lien stocké; le succès dit explicitement qu’aucune écriture comptable n’a été créée et rend « Défaire » disponible via l’unmatch livré.
7. « Écarter cette proposition » avertit que la paire ne sera plus proposée; après succès la transaction reste dans À rapprocher.
8. « Ignorer la ligne » est séparé des actions de proposition, demande confirmation, déplace la ligne dans Ignorées et n’offre aucun faux Undo.
9. « Recalculer les propositions » est une action de page explicite. Ni ouverture de page, ni lecture de suggestions, ni changement de vue ne la déclenche.
10. Un succès déplace seulement la ligne concernée et place le focus sur la prochaine cible logique; une erreur ou un `409` conserve la ligne, annonce l’échec et permet de recharger.
11. Un utilisateur peut ouvrir la proposition, parcourir les preuves, confirmer/rejeter, puis atteindre la ligne suivante avec Tab, Maj+Tab, Entrée et Espace, sans piège de focus.
12. Avec un lecteur d’écran, chaque paire est annoncée comme un groupe nommé avec deux objets et un groupe de preuves; les statuts et erreurs ne reposent pas sur la couleur.
13. Les chaînes FR et EN distinguent rapprochement, proposition confirmée, transaction rapprochée, ligne ignorée et écriture comptable; `CAD`/`USD` restent visibles dans les deux locales.
14. L’état sans import, l’état sans proposition avant refresh, l’état sans résultat après refresh et l’état « toutes les lignes traitées » sont quatre rendus et messages distincts.
15. Aucun contrôle de l’écran ne suppose recherche manuelle de candidats, factures, split, multi-devise, approbateur secondaire, auto-posting ou endpoint non livré.
16. Avant branchement du front, un test de contrat tranche les deux divergences relevées au point 7 (nom du filtre et chemin d’unmatch), et l’UI utilise une seule forme documentée.

## Preuves et limites de cette passe

**Preuves consultées, volontairement bornées**

- `docs/studies/2026-07-18-reconciliation-persistence-decision.md` : Option A ratifiée; propositions persistées; paiement seulement; égalité exacte montant/devise; 1:1; audit; aucun effet comptable; import immuable; paire rejetée jamais reproposée; mono-acteur.
- `apps/api/src/http/routes/banking.ts` : registre des seules lectures/mutations utilisables, refresh explicitement qualifié d’explicite, suggestions stockées, pagination et erreurs `409`.
- `rules/MASTER.md`, sections « Decision protocol » et « Reporting » : obligation d’une orientation multipasse, d’options, preuves, risques et critères observables.

Cette passe n’a pas lu l’application web, les autres fichiers API, les schémas de réponse ni un écran exécuté. Elle ne peut donc pas ratifier l’emplacement de navigation, la forme exacte des données disponibles pour chaque preuve, le responsive réel ou la terminologie déjà installée. Ce sont des sujets de la passe 2 et de la synthèse, pas des invitations à inventer ici.

## Reporting

### Fait

Passe 1 rédigée avec trois patterns, décision recommandée, flux/états, position anti-bulk, risques, accessibilité/bilingue, options A/B/C et critères observables.

### Publication

`docs/reviews/2026-07-26-banking-worklist-uxdr-pass1-etat-de-lart.md` (versionné depuis le brouillon de travail de la passe)

### A faire

- Passe 2 : revue de l’UI implémentée ou de l’architecture web, séparée de cette orientation.
- Passe 3 : contradiction/synthèse par orientations indépendantes, puis arbitrage owner.
- Alignement du contrat frontend/backend sur les deux divergences de route relevées.

### Attendus

1. **Ou** : futur écran/route web de rapprochement.
   **Action** : conduire la passe 2 contre l’UI en cours d’exécution, le code ou des captures, conformément au protocole.
   **Preco** : tester en priorité l’emplacement de navigation, la densité responsive, le focus après mutation et les libellés FR/EN.
   **Sortie attendue** : observations datées avec preuves visuelles et écarts par rapport aux 16 critères ci-dessus.

2. **Ou** : contrat bancaire entre le front et `apps/api/src/http/routes/banking.ts`.
   **Action** : désigner la forme autoritative du filtre de transactions et de la route unmatch, puis l’acter dans le contrat testé.
   **Preco** : aligner documentation, registre et client avant toute intégration UI.
   **Sortie attendue** : un seul nom de filtre et un seul chemin unmatch passent un test de contrat; aucune route spéculative dans le front.

3. **Ou** : actions Ignore et Reject du workflow.
   **Action** : arbitrer si leur irréversibilité v1 est acceptable.
   **Preco** : accepter la confirmation forte pour v1 seulement si l’absence de restauration est assumée; sinon ouvrir une décision API distincte.
   **Sortie attendue** : Go explicite avec wording irréversible, ou No-Go jusqu’à une mutation de restauration ratifiée.
