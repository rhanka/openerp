# Objective loop — remplacement Wave dans OpenERP

Date: 2026-07-10  
Loop h2a: `loop-mrf59g1p` (`openerp-wave-replacement`)  
Statut: en cours, double-run obligatoire avec Wave/UFile.

## Cap conducteur

Remplacer Wave sans rupture par lots réversibles:

1. **P0 — reprise historique Wave**: importer/exporter, comparer, ne rien basculer.
2. **P1 — facturation ERP**: PDF bilingue, email, récurrence schedulée, puis Wave lecture seule pour factures.
3. **P2 — banque/rapprochement**: OFX/CSV d'abord, Plaid sandbox read-only mono-tenant ensuite.
4. **P3 — dépenses/taxes/clôture**: reçus, intrants TPS/TVQ, période de taxes, états financiers.
5. **P4 — dossier fiscal**: T2125/TP-80 prêt-à-saisir UFile; aucune télétransmission.

## Résultat de reprise du 2026-07-10

- `main` est aligné avec `origin/main`: aucun commit non poussé.
- Le dernier export Wave déclenché a bien livré un lien par courriel, mais le lien S3 signé est déjà expiré (`ExpiredToken`).
- Aucune donnée réelle Wave ne doit être commitée; scratch local uniquement sous `tmp/wave-export/`.
- Wave requiert une session login dans le navigateur courant; ne pas manipuler le mot de passe utilisateur. Régénérer l'export côté Wave dès que la session humaine est disponible, puis télécharger immédiatement.

## Délégation / subagents

Le runtime courant n'expose pas l'outil Claude Code `Agent`/`TaskCreate`. Délégation effective utilisée:

- sous-tâche locale **schema-audit**: inventaire migrations/services billing/accounting produit dans `tmp/wave-export/schema-audit.txt`;
- sous-tâche locale **invoice-ui-audit**: inventaire parité UI/API facture produit dans `tmp/wave-export/invoice-ui-audit.txt`;
- h2a inbox architecte: réponse reçue et ackée sur bank-connector.

À relancer avec vrais subagents dès que l'outil est disponible:

| Subagent | Mission | Livrable |
|---|---|---|
| `wave-p0-import` | Concevoir/implémenter importeur de l'archive Wave sans données réelles; fixtures synthétiques seulement | parser + tests + rapport d'écart |
| `invoice-parity` | Comparer Wave facture vs UI/API OpenERP; lister gaps PDF/email/récurrence/paiement | PR P1 ou backlog chiffré |
| `bank-reconcile` | OFX/CSV AccèsD + FDX normalisé + matching paiement/facture mono-tenant | PR P2a derrière feature flag |
| `tax-close` | Périodes TPS/TVQ, intrants, sommaire FPZ-500 prêt-à-saisir | spec + migrations P3 |

## Gates architecte reçus via h2a

Décision architecte 2026-07-10:

- Le bank-connector est une **instance du broker universel**, pas un service plateforme autonome.
- C0 sandbox est validé; C1 est **GO seulement read-only mono-tenant**.
- Autorisé maintenant: `ofx-upload`, Plaid sandbox token mémoire, surface MCP read-only, UI rapprochement.
- Bloqué jusqu'à gates: Plaid prod, custody persistée multi-org, cross-org/mutualisé, access tokens persistés.
- Gates obligatoires avant vraie donnée financière cross-org: ARCH-11, ToS-D0 fail-closed, DPA/Loi 25, authenticité webhooks, audit data-egress.

## P0 Wave — source of truth

État live constaté dans `2026-07-06-finances-ca-wave-ufile-desjardins.md`:

- Wave plan **PRO**: API GraphQL possible pour clients/factures/produits.
- Data Export réel: `Export all transactions` en Excel/CSV + `Export all receipts` ZIP.
- La page Data Export ne fournit pas directement clients/factures; stratégie P0:
  - transactions/GL via Data Export CSV;
  - clients/factures/produits via GraphQL PRO ou listes;
  - reçus via ZIP;
  - rapport d'écart balances par compte = 0,00 $ à la date de coupure.

## Backlog immédiat réversible

### Lot P0-A — squelette import Wave (sans secrets/données)

- Définir formats d'entrée tolérants: CSV transactions Wave, ZIP reçus, GraphQL snapshots clients/factures/produits.
- Normaliser vers staging append-only `wave_import_*` ou fichiers NDJSON locaux avant écriture métier.
- Calculer un `sourceHash` par ligne/document pour idempotence.
- Produire un rapport: comptes inconnus, clients inconnus, factures incomplètes, écritures déséquilibrées, écart de balance.
- Tests uniquement avec fixtures synthétiques.

### Lot P1-A — facture parité Wave

- PDF bilingue FR/EN avec numéros TPS/TVQ, lignes, taxes, total, balance due.
- Envoi email audité, idempotent, sans mutation silencieuse de facture émise.
- Scheduler récurrence branché sur jobs existants.
- Critère sortie: un cycle mensuel réel ERP émission→encaissement, zéro nouvelle facture Wave le mois suivant.

### Lot P2-A — OFX/CSV AccèsD mono-tenant

- Import manuel sans custody, hash FITID/montant/date/libellé.
- Matching paiement↔transaction; dépenses plus tard.
- Aucune donnée bancaire réelle dans fixtures.

## Procédure export Wave à faire dès session humaine

1. Ouvrir `https://accounting.waveapps.com/settings/export/21295030/`.
2. Lancer `Export all transactions` en CSV.
3. Lancer `Export all receipts` en ZIP.
4. Dès réception email, télécharger les liens immédiatement dans `tmp/wave-export/`.
5. Calculer uniquement des métadonnées non sensibles si besoin (`sha256`, noms de fichiers, tailles); ne pas committer les archives.

## Critères de sécurité repo

- Ne jamais committer `tmp/wave-export/`, exports Wave, PDFs reçus, factures réelles, access tokens, cookies, liens S3 signés.
- Les commits doivent contenir uniquement: docs, importeurs génériques, fixtures synthétiques, tests, schémas staging.
- Toute décision de bascule Wave off reste humaine.
