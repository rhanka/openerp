# Inventaire PII Plaid au repos — G6

État : 2026-07-30. Cet inventaire couvre le code et les manifestes présents dans
ce dépôt. Il ne rouvre pas la décision de résidence du cluster : le stockage
PostgreSQL primaire est le stockage canadien déjà établi pour G6. Le connecteur
actuel ne contacte que `https://sandbox.plaid.com`; les exemples et tests sont
synthétiques.

## Règle de périmètre

Une réponse Plaid n'est jamais une charge utile de journalisation. Les données
normalisées ne peuvent être durables que dans PostgreSQL Canada-résident, via
l'import déjà normalisé de l'API. Le connecteur ne donne aucune voie de
persistance pour un jeton, un curseur ou le JSON brut du fournisseur.

| Emplacement concret | Données Plaid pouvant y arriver | Réglage retenu et preuve applicative |
| --- | --- | --- |
| `bank_accounts` et `bank_transactions`, migration [`apps/api/src/db/migrations/0041_banking_reconciliation.sql`](../../apps/api/src/db/migrations/0041_banking_reconciliation.sql) | La forme normalisée : références fournisseur, nom de compte/institution, montant, date, libellé, marchand et catégorie. `plaid_sandbox` est le seul fournisseur Plaid admis par le schéma actuel. Ni jeton, ni curseur, ni réponse brute. | **resident-Canada**. L'API n'accepte que les clés du contrat normalisé dans [`apps/api/src/reconciliation/banking-persistence.ts`](../../apps/api/src/reconciliation/banking-persistence.ts); `banking-persistence.test.ts` rejette `rawPayload`, `access_token`, numéro de compte et `mask` avant toute écriture. |
| `audit_events`, migration [`0001_foundation.sql`](../../apps/api/src/db/migrations/0001_foundation.sql), écriture dans [`banking-persistence.ts`](../../apps/api/src/reconciliation/banking-persistence.ts) | Pour un import, seulement `provider` et `providerTransactionRef` dans `after_summary`; les événements de réconciliation portent des UUID, score et statuts. | **no-body**. `recordBankingAudit` ne transmet jamais compte, montant, libellé, jeton, curseur ou payload fournisseur. Ces lignes PostgreSQL sont elles aussi Canada-résidentes. |
| `idempotency_records`, migration [`0002_canon_entities.sql`](../../apps/api/src/db/migrations/0002_canon_entities.sql), dépôt [`foundation/idempotency.ts`](../../apps/api/src/foundation/idempotency.ts) | Un hash SHA-256 de requête/réponse et une clé; jamais le corps de requête/réponse. La chaîne canonique n'existe qu'en mémoire pendant le calcul du hash. | **TTL** de 24 h dans [`http/idempotency-middleware.ts`](../../apps/api/src/http/idempotency-middleware.ts), avec `purgeExpiredIdempotencyRecords`. Le test `idempotency.test.ts` prouve à la fois l'absence des marqueurs synthétiques dans la ligne et la purge à l'expiration. |
| Cache de provider [`packages/bank-connector/src/providers/plaid-sandbox.ts`](../../packages/bank-connector/src/providers/plaid-sandbox.ts) | Seulement `cachedAccessToken` et le nom d'institution dans la fermeture d'une instance de provider; aucun corps de réponse, aucun fichier, Redis ou table. | **no-body** au repos : c'est une mémoire de processus par tenant, éliminée quand l'instance est collectée; le test d'isolation `packages/bank-connector/test/isolation.test.ts` vérifie qu'elle n'est ni globale ni partagée entre tenants. |
| File de jobs `jobs`, migration [`0005_jobs.sql`](../../apps/api/src/db/migrations/0005_jobs.sql), et worker | La table autorise un `payload` JSON générique, mais aucun appel de `packages/bank-connector`, `banking-persistence.ts` ou route bancaire n'y enfile de donnée. | **no-body** pour le flux bancaire actuel : aucune arête Plaid → jobs n'existe. Toute future tâche bancaire doit passer par la même revue d'inventaire avant d'utiliser `payload` ou `last_error`. |
| Rejeu/DLQ de webhooks sortants `webhook_deliveries`, migration [`0033_webhook_endpoints_deliveries.sql`](../../apps/api/src/db/migrations/0033_webhook_endpoints_deliveries.sql) | Il n'existe pas de webhook entrant Plaid ni de DLQ Plaid. Un audit bancaire peut créer une livraison sortante, dont le `payload` ne contient que type d'événement, IDs, organisation et horodatage; `error_detail` est un code d'échec. | **no-body**. [`webhook-signer.ts`](../../apps/api/src/webhook/webhook-signer.ts) construit une allowlist de six clés. `webhook-pii-guardrails.test.ts` échoue si une donnée fournisseur est ajoutée au payload rejouable. |
| Journaux applicatifs du processus MCP : [`packages/bank-connector/src/mcp-server.ts`](../../packages/bank-connector/src/mcp-server.ts) | Uniquement événement, fournisseur, endpoint et code d'erreur Plaid; jamais `error_message` ni JSON de réponse. L'API et le worker n'importent pas le provider Plaid; leurs journaux ne sont donc pas un chemin Plaid actuel. | **redaction**. [`plaid-pii.ts`](../../packages/bank-connector/src/providers/plaid-pii.ts) masque récursivement jetons, IDs fournisseur, numéros de compte/routage, PAN, nom officiel, nom et masque. `plaid-pii-guardrails.test.ts` injecte une erreur fournisseur contenant PAN, nom et numéro synthétiques et prouve leur absence du message et de l'enregistrement de journal. |
| Traces/APM : champs `trace_id`/`otel_span_id` de [`0008_agentic_entities.sql`](../../apps/api/src/db/migrations/0008_agentic_entities.sql) | Aucun SDK APM/OTel ni exporteur n'est configuré dans `apps/api/src`, `apps/worker/src` ou `packages/bank-connector/src`; les colonnes existantes ne reçoivent pas de payload bancaire. | **no-body**. L'absence de client traceur sur le chemin bancaire est vérifiée à l'exploration; une future instrumentation de ce chemin doit exporter seulement les mêmes métadonnées que `connectorFailureLogRecord`. |
| Vidages de crash applicatifs | Aucun mécanisme de dump, gestionnaire `uncaughtException`, Sentry ou agent de capture n'est configuré dans les trois répertoires explorés. La mémoire du provider peut toutefois contenir temporairement un jeton ou une réponse pendant l'appel. | **redaction** côté code pour les erreurs Plaid; la désactivation/suppression des core dumps relève de l'exploitation, détaillée ci-dessous. |
| Journaux de proxy/acès | Aucun corps Plaid ne passe par les routes HTTP d'OpenERP : le provider appelle Plaid depuis son processus. Les manifests [`infra/k8s/base/ingress.yaml`](../../infra/k8s/base/ingress.yaml) ne configurent pas de format ou rétention de logs d'accès. | **no-body** requis du proxy : l'application ne peut pas imposer la politique du contrôleur Traefik ni de son collecteur. |
| Sortie normalisée du connecteur : [`mapPlaidAccount` et `mapPlaidTransaction`](../../packages/bank-connector/src/providers/plaid-sandbox.ts) puis MCP [`mcp-server.ts`](../../packages/bank-connector/src/mcp-server.ts) | Objets normalisés (références opaques, libellé, montant, date, catégorie). Ils sont en mémoire/stdio; le processus ne les écrit pas. Les champs bruts comme `access_token`, `account_number`, `routing_number`, `official_name` et `mask` sont absents. | **no-body** pour le JSON fournisseur brut. `plaid-pii-guardrails.test.ts` vérifie l'absence de ces clés et des valeurs synthétiques du compte/nom dans la sortie. Si un appelant persiste cette sortie, il devient son propre emplacement de traitement. |

Les valeurs métier normalisées (montants, libellés, références) restent des
données financières personnelles : l'inventaire ne les qualifie pas de données
anonymes. Leur conservation, suppression à la révocation et durées par classe
de champ restent les travaux de G7.

## Hors de notre main

| Emplacement externe | Propriétaire | Garantie attendue |
| --- | --- | --- |
| Egress Sentropic qui réalisera l'ingest Plaid US de production | Architecte/équipe egress Sentropic | Ne jamais écrire le corps Plaid dans disque, cache durable, file de rejeu, trace ou dump; limiter les journaux aux métadonnées, appliquer la redaction et tester ce contrat dans le dépôt de l'egress. |
| Collecteur de stdout/stderr, APM et éventuels sidecars du cluster | Exploitation k8s/observabilité | Ne pas capturer les corps HTTP; appliquer redaction, contrôle d'accès et rétention compatible avec la résidence Canada. Aucun exporteur tiers n'est configuré par ce dépôt aujourd'hui. |
| Traefik/ingress et journaux d'accès | Équipe plateforme/ingress | Ne jamais journaliser request/response bodies, y compris en mode debug; limiter aux métadonnées d'accès et conserver au Canada. |
| Core dumps, snapshots et sauvegardes de volumes/PVC PostgreSQL | Équipe k8s/déploiement et sauvegardes | Désactiver ou purger/scrubber les core dumps du processus egress; conserver snapshots et backups du stockage PostgreSQL uniquement au Canada, avec contrôle d'accès et rétention. |
| Client MCP ou système appelant qui reçoit les objets normalisés via stdio | Propriétaire du client/intégration | Ne pas persister ni téléverser la sortie normalisée hors de son périmètre approuvé; si elle devient durable, créer son inventaire, sa rétention et son contrôle de résidence. |

## Tests exécutoires

- `packages/bank-connector/test/plaid-pii-guardrails.test.ts` : erreur fournisseur
  sans corps dans le journal, redaction récursive, sortie normalisée sans champs
  bruts.
- `apps/api/test/foundation/banking-persistence.test.ts` : l'API rejette les
  champs fournisseur avant toute écriture.
- `apps/api/test/foundation/idempotency.test.ts` : hashes uniquement et purge
  du store à son TTL.
- `apps/api/test/foundation/webhook-pii-guardrails.test.ts` : payload de rejouage
  de webhook limité à l'allowlist de métadonnées.
