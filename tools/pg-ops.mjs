// PostgreSQL dump / restore / census driver for the OpenERP tenant database.
//
// Written for the PostgreSQL 16 -> 18 move, and for ordinary dumps after it.
// Three execution backends share one code path, differing only in how the
// client binaries are reached:
//
//   --target local                   psql/pg_dump/pg_restore on this PATH,
//                                    connecting through a DSN read from an
//                                    environment variable (never from argv).
//   --target docker  --container C   the same binaries inside a running
//                                    container, via `docker exec -i`.
//   --target k8s     --pod P         the same binaries inside the database pod,
//                                    via `kubectl exec -i`.
//
// The exec backends deliberately use the binaries that the PostgreSQL image
// already ships. No new container image is introduced for this job.
//
// Credentials never become argv elements. The local backend splits the DSN into
// the PG* variables libpq reads from the environment. The exec backends let the
// shell inside the container dereference the container's own password variable,
// so the secret never appears in our process table, our logs, or the apiserver
// audit record of the exec.
//
// `--host` / `--port` point the client at a server other than the one that
// hosts it. That is how a cross-version dump is taken correctly: PostgreSQL
// supports a newer pg_dump reading an older server, not the reverse, so the
// 16 -> 18 dump is produced by the 18 client.
//
// Subcommands
//   census    Emit a JSON structural census of a live database.
//   dump      Stream a custom-format (-Fc) archive to a local file.
//   restore   Stream a local custom-format archive into a database.
//   diff      Compare two census files; exit 1 when the structure differs.
//
// The upgrade contract is: census the old server, dump, restore into the new
// server, census again, diff. An empty structural diff means every schema,
// table, column, index, constraint, trigger, row-level-security flag, policy,
// partition, routine, sequence, owner, grant and row count came across, and the
// only reported deltas are the environment ones the upgrade is meant to change.

import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import process from "node:process";

// ---------------------------------------------------------------------------
// Census SQL
// ---------------------------------------------------------------------------
// One statement, one JSON document.
//
// Row counts go through query_to_xml so that counting stays pure SQL: no
// plpgsql block, no second round trip, nothing left behind on the server.
//
// Counts are only meaningful when the connected role bypasses row-level
// security. Our tables carry `force row level security`, which applies to the
// table owner as well, so a role without BYPASSRLS would silently count the
// rows its policies let it see. The environment block records that capability
// and `rows_trustworthy` states whether the counts can be compared at all.
const CENSUS_SQL = `
with
  role_info as (
    select r.rolname, r.rolsuper, r.rolbypassrls
      from pg_roles r where r.rolname = current_user
  ),
  relations as (
    select c.oid, n.nspname as schema, c.relname as name, c.relkind as kind,
           c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
           c.relpersistence as persistence,
           pg_get_userbyid(c.relowner) as owner,
           coalesce(c.relacl::text, '') as acl,
           (select pn.nspname || '.' || pc.relname
              from pg_inherits i
              join pg_class pc on pc.oid = i.inhparent
              join pg_namespace pn on pn.oid = pc.relnamespace
             where i.inhrelid = c.oid) as parent
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where c.relkind in ('r', 'p')
       and n.nspname not in ('pg_catalog', 'information_schema')
       and n.nspname not like 'pg\\_toast%'
  ),
  countable as (
    select r.schema, r.name,
           (xpath('/row/c/text()',
                  query_to_xml(format('select count(*) as c from %I.%I', r.schema, r.name),
                               false, true, '')))[1]::text::bigint as n_rows
      from relations r
     where r.kind = 'r'
  ),
  tables as (
    select jsonb_agg(jsonb_build_object(
             'schema', r.schema, 'name', r.name, 'kind', r.kind,
             'rls_enabled', r.rls_enabled, 'rls_forced', r.rls_forced,
             'persistence', r.persistence, 'parent', r.parent,
             'owner', r.owner, 'acl', r.acl,
             'rows', c.n_rows
           ) order by r.schema, r.name) as v
      from relations r
      left join countable c on c.schema = r.schema and c.name = r.name
  ),
  columns as (
    select jsonb_agg(jsonb_build_object(
             'table', r.schema || '.' || r.name,
             'name', a.attname, 'ordinal', a.attnum,
             'type', format_type(a.atttypid, a.atttypmod),
             'notnull', a.attnotnull,
             'identity', a.attidentity, 'generated', a.attgenerated,
             'default', pg_get_expr(ad.adbin, ad.adrelid),
             'collation', co.collname
           ) order by r.schema, r.name, a.attnum) as v
      from relations r
      join pg_attribute a on a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
      left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
      left join pg_collation co on co.oid = a.attcollation
  ),
  indexes as (
    select jsonb_agg(jsonb_build_object(
             'table', r.schema || '.' || r.name, 'name', ic.relname,
             'definition', pg_get_indexdef(i.indexrelid)
           ) order by r.schema, r.name, ic.relname) as v
      from relations r
      join pg_index i on i.indrelid = r.oid
      join pg_class ic on ic.oid = i.indexrelid
  ),
  constraints as (
    select jsonb_agg(jsonb_build_object(
             'table', r.schema || '.' || r.name, 'name', con.conname,
             'type', con.contype, 'definition', pg_get_constraintdef(con.oid)
           ) order by r.schema, r.name, con.conname) as v
      from relations r
      join pg_constraint con on con.conrelid = r.oid
      -- PostgreSQL 18 materialises NOT NULL as pg_constraint rows of type 'n';
      -- earlier majors carry the same fact only in pg_attribute.attnotnull.
      -- Excluding them here removes 558 phantom additions from a 16 -> 18 diff
      -- without losing coverage: columns[].notnull is the version-stable
      -- source for exactly the same constraint.
     where con.contype <> 'n'
  ),
  triggers as (
    select jsonb_agg(jsonb_build_object(
             'table', r.schema || '.' || r.name, 'name', t.tgname,
             'definition', pg_get_triggerdef(t.oid)
           ) order by r.schema, r.name, t.tgname) as v
      from relations r
      join pg_trigger t on t.tgrelid = r.oid and not t.tgisinternal
  ),
  policies as (
    select jsonb_agg(jsonb_build_object(
             'table', p.schemaname || '.' || p.tablename, 'name', p.policyname,
             'permissive', p.permissive, 'roles', p.roles::text,
             'command', p.cmd, 'using', p.qual, 'check', p.with_check
           ) order by p.schemaname, p.tablename, p.policyname) as v
      from pg_policies p
  ),
  routines as (
    select jsonb_agg(jsonb_build_object(
             'schema', n.nspname, 'name', p.proname, 'kind', p.prokind,
             'language', l.lanname,
             'arguments', pg_get_function_identity_arguments(p.oid),
             'returns', pg_get_function_result(p.oid)
           ) order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) as v
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      left join pg_language l on l.oid = p.prolang
     where n.nspname not in ('pg_catalog', 'information_schema')
       -- Routines an extension owns follow that extension's version, not our
       -- migrations: pgcrypto 1.4 adds fips_mode() that 1.3 does not have.
       -- They are reported under environment.extension_objects instead, where
       -- a delta is information rather than a failure.
       and not exists (
         select 1 from pg_depend d
          where d.objid = p.oid and d.classid = 'pg_proc'::regclass and d.deptype = 'e'
       )
  ),
  extension_objects as (
    select jsonb_agg(jsonb_build_object(
             'extension', e.extname, 'schema', n.nspname, 'name', p.proname,
             'arguments', pg_get_function_identity_arguments(p.oid)
           ) order by e.extname, n.nspname, p.proname) as v
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_depend d on d.objid = p.oid and d.classid = 'pg_proc'::regclass and d.deptype = 'e'
      join pg_extension e on e.oid = d.refobjid
  ),
  sequences as (
    select jsonb_agg(jsonb_build_object(
             'schema', sequence_schema, 'name', sequence_name, 'type', data_type
           ) order by sequence_schema, sequence_name) as v
      from information_schema.sequences
     where sequence_schema not in ('pg_catalog', 'information_schema')
  ),
  extensions as (
    select jsonb_agg(jsonb_build_object('name', extname, 'version', extversion)
                     order by extname) as v
      from pg_extension
  ),
  -- Roles are cluster-level, not database-level, so a database dump carries
  -- none of them while the schema's functions are owned by nologin service
  -- roles. They belong in the structure block: a missing role is a functional
  -- break, not an environment delta. Server-provided pg_* roles are excluded
  -- because their set legitimately grows between major versions.
  roles as (
    select jsonb_agg(jsonb_build_object(
             'name', r.rolname, 'canlogin', r.rolcanlogin,
             'superuser', r.rolsuper, 'bypassrls', r.rolbypassrls,
             'createrole', r.rolcreaterole, 'createdb', r.rolcreatedb,
             'inherit', r.rolinherit, 'replication', r.rolreplication,
             'memberof', (select coalesce(jsonb_agg(g.rolname order by g.rolname), '[]'::jsonb)
                            from pg_auth_members m
                            join pg_roles g on g.oid = m.roleid
                           where m.member = r.oid)
           ) order by r.rolname) as v
      from pg_roles r
     where r.rolname not like 'pg\\_%'
  ),
  schemas as (
    select jsonb_agg(nspname order by nspname) as v
      from pg_namespace
     where nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
       and nspname not like 'pg\\_temp%'
       and nspname not like 'pg\\_toast%'
  ),
  -- The ledger's id + checksum are the applied migration set. applied_at is
  -- deliberately excluded: it is a timestamp, it legitimately differs, and
  -- including it would make every diff noisy.
  migrations as (
    select case when exists (
             select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where c.relname = '_openerp_migrations' and n.nspname = 'public'
           ) then (
             select (xpath('/row/c/text()',
                           query_to_xml(
                             'select string_agg(id || '' '' || checksum, E''\\n'' order by id) as c
                                from public._openerp_migrations',
                             false, true, '')))[1]::text
           ) else null end as v
  ),
  db as (
    select jsonb_build_object(
             'name', d.datname,
             'encoding', pg_encoding_to_char(d.encoding),
             'collate', d.datcollate, 'ctype', d.datctype,
             'locale_provider', d.datlocprovider::text
           ) as v
      from pg_database d where d.datname = current_database()
  )
select jsonb_build_object(
  'environment', jsonb_build_object(
    'server_version', current_setting('server_version'),
    'server_version_num', current_setting('server_version_num'),
    'database', (select v from db),
    'role', (select jsonb_build_object('name', rolname, 'superuser', rolsuper,
                                       'bypassrls', rolbypassrls) from role_info),
    'rows_trustworthy', (
      select (r.rolsuper or r.rolbypassrls)
             or not exists (select 1 from relations where rls_forced)
        from role_info r
    ),
    'extensions', coalesce((select v from extensions), '[]'::jsonb),
    'extension_objects', coalesce((select v from extension_objects), '[]'::jsonb)
  ),
  'structure', jsonb_build_object(
    'roles', coalesce((select v from roles), '[]'::jsonb),
    'schemas', coalesce((select v from schemas), '[]'::jsonb),
    'tables', coalesce((select v from tables), '[]'::jsonb),
    'columns', coalesce((select v from columns), '[]'::jsonb),
    'indexes', coalesce((select v from indexes), '[]'::jsonb),
    'constraints', coalesce((select v from constraints), '[]'::jsonb),
    'triggers', coalesce((select v from triggers), '[]'::jsonb),
    'policies', coalesce((select v from policies), '[]'::jsonb),
    'routines', coalesce((select v from routines), '[]'::jsonb),
    'sequences', coalesce((select v from sequences), '[]'::jsonb),
    'migrations', (select v from migrations)
  )
)::text
`;

// A short preflight used before a dump: pg_dump sets row_security = off and
// refuses to proceed when policies would apply, so a role that cannot bypass
// RLS produces either a hard failure or, with --enable-row-security, a
// partial dump that looks successful. Better to say so first.
const PREFLIGHT_SQL = `
select (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where c.relforcerowsecurity and n.nspname not in ('pg_catalog','information_schema'))::text
       || ' ' || (select (rolsuper or rolbypassrls)::text from pg_roles where rolname = current_user)
       || ' ' || current_setting('server_version_num')
`;

// ---------------------------------------------------------------------------
// Argument handling
// ---------------------------------------------------------------------------
export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = {};
  const positional = [];
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) {
      opts[key] = true;
    } else {
      opts[key] = next;
      i += 1;
    }
  }
  return { command, opts, positional };
}

class UsageError extends Error {}

function fail(message) {
  throw new UsageError(message);
}

function str(value, name) {
  if (value === undefined || value === true) fail(`${name} requires a value`);
  return String(value);
}

// ---------------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------------
// `connArgs` are the connection flags appended to every client invocation.
// They carry no secret: a host, a port, a role name and a database name.
export function buildConnArgs(opts) {
  const args = [];
  if (opts.host) args.push("-h", str(opts.host, "--host"));
  if (opts.port) args.push("-p", str(opts.port, "--port"));
  if (opts.user) args.push("-U", str(opts.user, "--user"));
  if (opts.database) args.push("-d", str(opts.database, "--database"));
  return args;
}

// Splitting the DSN into PG* variables keeps the connection string — password
// included — out of every argv while still letting libpq connect.
export function dsnAsEnv(dsn) {
  let url;
  try {
    url = new URL(dsn);
  } catch {
    // A key=value conninfo string rather than a URL: libpq accepts it whole
    // through PGDATABASE.
    return { PGDATABASE: dsn };
  }
  const env = {};
  if (url.hostname) env.PGHOST = decodeURIComponent(url.hostname);
  if (url.port) env.PGPORT = url.port;
  if (url.username) env.PGUSER = decodeURIComponent(url.username);
  if (url.password) env.PGPASSWORD = decodeURIComponent(url.password);
  const db = url.pathname.replace(/^\//, "");
  if (db) env.PGDATABASE = decodeURIComponent(db);
  const sslmode = url.searchParams.get("sslmode");
  if (sslmode) env.PGSSLMODE = sslmode;
  return env;
}

export function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

// Builds the `sh -c` body run inside a container. The password is read from the
// container's own environment by name, so the value is never part of what we
// spawn. Returns the command string.
export function execInnerCommand(tool, args, { passwordEnv }) {
  return [
    `PGPASSWORD="$${passwordEnv}"`,
    tool,
    ...args.map(shellQuote)
  ].join(" ");
}

export function makeBackend(opts) {
  const target = opts.target ?? "local";
  const connArgs = buildConnArgs(opts);

  if (target === "local") {
    const dsnEnv = opts["dsn-env"] ? str(opts["dsn-env"], "--dsn-env") : "OPENERP_DATABASE_URL";
    const dsn = process.env[dsnEnv];
    if (!dsn) fail(`environment variable ${dsnEnv} is empty; it must hold the DSN`);
    return {
      kind: "local",
      describe: () => `local client, DSN from ${dsnEnv}`,
      spawnSpec: (tool, args) => ({
        file: tool,
        argv: [...connArgs, ...args],
        env: { ...process.env, PGCONNECT_TIMEOUT: "10", ...dsnAsEnv(dsn) }
      })
    };
  }

  const passwordEnv = opts["password-env"] ? str(opts["password-env"], "--password-env") : "POSTGRES_PASSWORD";

  if (target === "docker") {
    const container = str(opts.container ?? fail("--container is required with --target docker"), "--container");
    return {
      kind: "docker",
      describe: () => `docker exec ${container}`,
      spawnSpec: (tool, args) => ({
        file: "docker",
        argv: ["exec", "-i", container, "sh", "-c", execInnerCommand(tool, [...connArgs, ...args], { passwordEnv })],
        env: process.env
      })
    };
  }

  if (target === "k8s") {
    const namespace = str(opts.namespace ?? fail("--namespace is required with --target k8s"), "--namespace");
    const pod = str(opts.pod ?? fail("--pod is required with --target k8s"), "--pod");
    const context = opts.context ? str(opts.context, "--context") : null;
    const container = opts.container ? str(opts.container, "--container") : "postgres";
    return {
      kind: "k8s",
      describe: () => `kubectl exec ${pod} in ${namespace}${context ? ` (context ${context})` : ""}`,
      spawnSpec: (tool, args) => ({
        file: "kubectl",
        argv: [
          ...(context ? ["--context", context] : []),
          "-n", namespace,
          "exec", "-i", pod, "-c", container, "--",
          "sh", "-c", execInnerCommand(tool, [...connArgs, ...args], { passwordEnv })
        ],
        env: process.env
      })
    };
  }

  return fail(`unknown --target ${target}; expected local, docker or k8s`);
}

// ---------------------------------------------------------------------------
// Process plumbing
// ---------------------------------------------------------------------------
function run(spec, { stdin, stdout, label }) {
  return new Promise((resolve, reject) => {
    const child = spawn(spec.file, spec.argv, {
      env: spec.env,
      stdio: [stdin ? "pipe" : "ignore", "pipe", "pipe"]
    });
    const errChunks = [];
    const outChunks = [];
    const pumps = [];
    child.stderr.on("data", (c) => errChunks.push(c));
    if (stdin) pumps.push(pipeline(stdin, child.stdin));
    if (stdout) pumps.push(pipeline(child.stdout, stdout));
    else child.stdout.on("data", (c) => outChunks.push(c));
    child.on("error", reject);
    child.on("close", async (code) => {
      let pumpError = null;
      try {
        await Promise.all(pumps);
      } catch (err) {
        pumpError = err;
      }
      const stderrText = Buffer.concat(errChunks).toString("utf8");
      if (code !== 0) {
        reject(new Error(`${label} exited ${code}\n${stderrText.trim()}`));
        return;
      }
      if (pumpError) {
        reject(pumpError);
        return;
      }
      resolve({ stdout: Buffer.concat(outChunks), stderr: stderrText });
    });
  });
}

async function psqlScalar(backend, sql, label) {
  const spec = backend.spawnSpec("psql", ["-At", "-q", "-v", "ON_ERROR_STOP=1", "-f", "-"]);
  const result = await run(spec, { stdin: Readable.from([Buffer.from(sql, "utf8")]), label });
  return result.stdout.toString("utf8").trim();
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
async function cmdCensus(opts) {
  const backend = makeBackend(opts);
  const text = await psqlScalar(backend, CENSUS_SQL, "psql (census)");
  if (!text) throw new Error("census returned no output");
  const census = JSON.parse(text);
  const payload = `${JSON.stringify(census, null, 2)}\n`;
  const s = census.structure;
  const summary =
    `  server      ${census.environment.server_version}\n` +
    `  role        ${census.environment.role.name}` +
      ` (superuser=${census.environment.role.superuser}, bypassrls=${census.environment.role.bypassrls})\n` +
    `  locale      ${census.environment.database.collate} / provider ${census.environment.database.locale_provider}\n` +
    `  tables      ${s.tables.length} (${s.tables.filter((t) => t.kind === "p").length} partitioned,` +
      ` ${s.tables.filter((t) => t.parent).length} partitions)\n` +
    `  forced RLS  ${s.tables.filter((t) => t.rls_forced).length}\n` +
    `  policies    ${s.policies.length}\n` +
    `  triggers    ${s.triggers.length}\n` +
    `  indexes     ${s.indexes.length}\n` +
    `  constraints ${s.constraints.length}\n` +
    `  rows        ${s.tables.reduce((a, t) => a + Number(t.rows ?? 0), 0)}` +
      `${census.environment.rows_trustworthy ? "" : "  (NOT trustworthy: role cannot bypass forced RLS)"}\n`;
  if (opts.out && opts.out !== true) {
    writeFileSync(str(opts.out, "--out"), payload);
    process.stderr.write(`census written to ${opts.out}\n${summary}`);
  } else {
    process.stdout.write(payload);
    process.stderr.write(summary);
  }
}

async function cmdDump(opts) {
  const backend = makeBackend(opts);
  const out = str(opts.out ?? fail("--out <file> is required for dump"), "--out");

  // Preflight. A dump taken by a role that cannot bypass forced RLS is either
  // a hard failure or a silently partial archive; neither belongs in an
  // upgrade. --force proceeds anyway, for a deliberate partial export.
  const [forcedCount, canBypass, serverNum] = (
    await psqlScalar(backend, PREFLIGHT_SQL, "psql (preflight)")
  ).split(" ");
  if (Number(forcedCount) > 0 && canBypass !== "true" && !opts.force) {
    fail(
      `${forcedCount} tables carry force row level security and role cannot bypass it; ` +
        `pg_dump would fail or under-dump. Connect as a role with BYPASSRLS (or the ` +
        `cluster superuser), or pass --force to accept a partial dump.`
    );
  }

  // -Fc is the custom format: compressed, selectively restorable, and readable
  // by any pg_restore of the same or a newer major version. That forward
  // compatibility is what makes a 16 -> 18 restore legitimate.
  //
  // Owners and grants are kept by default: an upgrade that drops them is not a
  // faithful move, and the census diff is what proves they survived.
  const args = ["-Fc", "--verbose"];
  if (opts["no-owner"]) args.push("--no-owner");
  if (opts["no-privileges"]) args.push("--no-privileges");
  if (opts.schema) args.push("--schema", str(opts.schema, "--schema"));

  const spec = backend.spawnSpec("pg_dump", args);
  const hash = createHash("sha256");
  const tee = new Transform({
    transform(chunk, _enc, cb) {
      hash.update(chunk);
      cb(null, chunk);
    }
  });
  const written = pipeline(tee, createWriteStream(out));
  const result = await run(spec, { stdout: tee, label: "pg_dump" });
  await written;
  const size = statSync(out).size;
  if (size === 0) throw new Error("dump is empty");
  process.stderr.write(
    `dump written to ${out}\n` +
      `  via         ${backend.describe()}\n` +
      `  server      ${serverNum}\n` +
      `  bytes       ${size}\n` +
      `  sha256      ${hash.digest("hex")}\n`
  );
  if (opts.verbose) process.stderr.write(result.stderr);
}

// pg_dumpall emits the cluster-level objects a database dump cannot carry:
// roles and their memberships. Migrations 0003 and 0042 create the nologin
// service roles `openerp_app` and `openerp_auth_system`, and functions are
// owned by them, so a restore without the globals aborts on the first
// `ALTER FUNCTION ... OWNER TO`.
//
// --no-role-passwords keeps password hashes out of the artifact. The service
// roles are nologin and have none, the login role already exists on any target
// worth restoring into, and an artifact that carries no secret is one fewer
// thing to protect.
async function cmdGlobalsDump(opts) {
  const out = str(opts.out ?? fail("--out <file> is required for globals-dump"), "--out");
  // pg_dumpall reads -d as a full connection string, not a database name, and
  // names its maintenance database with -l instead. Build the backend without
  // a database so the shared connection flags stay valid here.
  const backend = makeBackend({ ...opts, database: undefined });
  const maintenance = opts.database ? ["-l", str(opts.database, "--database")] : [];
  const spec = backend.spawnSpec("pg_dumpall", [...maintenance, "--globals-only", "--no-role-passwords"]);
  const result = await run(spec, { label: "pg_dumpall" });
  const sql = result.stdout.toString("utf8");
  if (!sql.includes("CREATE ROLE")) throw new Error("globals dump contains no CREATE ROLE");
  writeFileSync(out, sql);
  const created = [...sql.matchAll(/^CREATE ROLE (\S+);/gm)].map((m) => m[1]);
  process.stderr.write(
    `globals written to ${out}\n` +
      `  via         ${backend.describe()}\n` +
      `  roles       ${created.join(", ")}\n`
  );
}

// Applied without ON_ERROR_STOP on purpose: the target cluster already has its
// own login role, so `CREATE ROLE` for it must be allowed to fail without
// taking the rest down. Tolerating that error is safe only because the proof
// of success is the census diff afterwards, not this command's exit code.
async function cmdGlobalsRestore(opts) {
  const backend = makeBackend(opts);
  const file = str(opts.in ?? fail("--in <file> is required for globals-restore"), "--in");
  const sql = readFileSync(file, "utf8");
  const spec = backend.spawnSpec("psql", ["-q", "-f", "-"]);
  const result = await run(spec, {
    stdin: Readable.from([Buffer.from(sql, "utf8")]),
    label: "psql (globals)"
  });
  // psql prefixes each diagnostic with the source and line, as in
  // `psql:<stdin>:15: ERROR:  role "openerp" already exists`, so the marker is
  // matched anywhere on the line. Anchoring it at the start silently counted
  // every error as zero and turned a failed run into a reported success.
  const errors = result.stderr.split("\n").filter((l) => /\bERROR:/.test(l));
  const tolerated = errors.filter((l) => /already exists/.test(l));
  const fatal = errors.filter((l) => !/already exists/.test(l));
  process.stderr.write(
    `globals from ${file} applied via ${backend.describe()}\n` +
      `  tolerated   ${tolerated.length} (already exists)\n` +
      `  other       ${fatal.length}\n`
  );
  for (const line of fatal) process.stderr.write(`  ${line}\n`);
  if (fatal.length) throw new Error("globals restore reported errors other than 'already exists'");
}

async function cmdRestore(opts) {
  const backend = makeBackend(opts);
  const file = str(opts.in ?? fail("--in <file> is required for restore"), "--in");
  const size = statSync(file).size;
  if (size === 0) fail(`${file} is empty`);
  // --exit-on-error turns a partial restore into a failure instead of a
  // half-populated database that reports success.
  // Owners and grants are preserved by default, symmetrically with dump: a
  // major-version upgrade keeps the same roles, and the census diff is what
  // proves ownership survived. --no-owner is for restoring into a cluster that
  // does not have the original roles.
  const args = ["--verbose", "--exit-on-error"];
  if (opts["no-owner"]) args.push("--no-owner");
  if (opts["no-privileges"]) args.push("--no-privileges");
  if (opts.clean) args.push("--clean", "--if-exists");
  if (opts["single-transaction"]) args.push("--single-transaction");
  const spec = backend.spawnSpec("pg_restore", args);
  const result = await run(spec, { stdin: createReadStream(file), label: "pg_restore" });
  process.stderr.write(`restore of ${file} (${size} bytes) completed via ${backend.describe()}\n`);
  if (opts.verbose) process.stderr.write(result.stderr);
}

// ---------------------------------------------------------------------------
// Census diff
// ---------------------------------------------------------------------------
// `structure` must match exactly: that is the upgrade's acceptance criterion.
// `environment` is expected to change — a new server version is the point — so
// its deltas are reported and never counted as failures.
// Privilege letters by the major version that introduced them. A newer server
// widens the owner's implicit grant, so the same untouched table reads
// `arwdDxt` on 16 and `arwdDxtm` on 18. Comparing across versions therefore
// means comparing in the older server's vocabulary: letters that did not exist
// there are dropped from both sides. What gets dropped is reported, never
// silently assumed away.
const PRIVILEGE_INTRODUCED_IN = { m: 170000 };

export function normalizeAcl(acl, floorVersionNum) {
  if (!acl) return acl;
  const dropped = new Set();
  for (const [letter, since] of Object.entries(PRIVILEGE_INTRODUCED_IN)) {
    if (floorVersionNum < since) dropped.add(letter);
  }
  if (!dropped.size) return acl;
  // An ACL item is grantee=privileges/grantor, with the grantee empty for
  // PUBLIC. Only the privilege field is rewritten.
  const normalized = acl.replace(/([^={,]*)=([^/]*)\/(\w*)/g, (_m, grantee, privs, grantor) => {
    const kept = [...privs].filter((c) => !dropped.has(c)).join("");
    return `${grantee}=${kept}/${grantor}`;
  });
  return normalized;
}

function normalizeStructure(structure, floorVersionNum) {
  const copy = JSON.parse(JSON.stringify(structure));
  for (const table of copy.tables ?? []) {
    table.acl = normalizeAcl(table.acl, floorVersionNum);
  }
  return copy;
}

export function diffCensus(before, after) {
  const versions = [before, after]
    .map((c) => Number(c.environment?.server_version_num ?? 0))
    .filter((n) => n > 0);
  const floor = versions.length ? Math.min(...versions) : 0;
  const notes = [];
  const dropped = Object.entries(PRIVILEGE_INTRODUCED_IN)
    .filter(([, since]) => floor < since)
    .map(([letter]) => letter);
  if (dropped.length) {
    notes.push(
      `compared in the privilege vocabulary of server ${floor}: ACL letters ` +
        `${dropped.join(", ")} dropped from both sides`
    );
  }
  const structural = [];
  walk(normalizeStructure(before.structure, floor), normalizeStructure(after.structure, floor), "structure", structural);
  const environmental = [];
  walk(before.environment, after.environment, "environment", environmental);
  return { structural, environmental, notes };
}

function walk(a, b, path, out) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const key = (x) => JSON.stringify(x);
    const inA = new Map(a.map((x) => [key(x), x]));
    const inB = new Map(b.map((x) => [key(x), x]));
    for (const [k, v] of inA) if (!inB.has(k)) out.push({ path, side: "missing in after", value: v });
    for (const [k, v] of inB) if (!inA.has(k)) out.push({ path, side: "added in after", value: v });
    return;
  }
  if (isObject(a) && isObject(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      walk(a[k], b[k], `${path}.${k}`, out);
    }
    return;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path, before: a, after: b });
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function cmdDiff(positional) {
  const [beforePath, afterPath] = positional;
  if (!beforePath || !afterPath) fail("diff takes two census files: diff <before.json> <after.json>");
  const before = JSON.parse(readFileSync(beforePath, "utf8"));
  const after = JSON.parse(readFileSync(afterPath, "utf8"));
  const { structural, environmental, notes } = diffCensus(before, after);
  for (const note of notes) process.stdout.write(`note: ${note}\n`);
  if (notes.length) process.stdout.write("\n");
  if (environmental.length) {
    process.stdout.write("environment deltas (expected on a version change):\n");
    for (const d of environmental) {
      const from = JSON.stringify("before" in d ? d.before : d.value);
      const to = JSON.stringify("after" in d ? d.after : undefined);
      process.stdout.write(`  ${d.path}${d.side ? ` [${d.side}]` : ""}: ${from} -> ${to}\n`);
    }
    process.stdout.write("\n");
  }
  if (!structural.length) {
    process.stdout.write(`structure identical: ${beforePath} == ${afterPath}\n`);
    return 0;
  }
  process.stdout.write(`structural differences: ${structural.length}\n`);
  for (const d of structural.slice(0, 200)) {
    const detail = d.side ? JSON.stringify(d.value) : JSON.stringify({ before: d.before, after: d.after });
    process.stdout.write(`  ${d.path}${d.side ? ` [${d.side}]` : ""} ${detail}\n`);
  }
  if (structural.length > 200) process.stdout.write(`  ... ${structural.length - 200} more\n`);
  return 1;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
const USAGE = `pg-ops — PostgreSQL dump / restore / census for the OpenERP tenant database

  node tools/pg-ops.mjs census  [backend] [--out FILE]
  node tools/pg-ops.mjs dump    [backend] --out FILE [--no-owner] [--no-privileges] [--force]
  node tools/pg-ops.mjs restore [backend] --in FILE [--clean] [--single-transaction]
                                          [--no-owner] [--no-privileges]
  node tools/pg-ops.mjs globals-dump    [backend] --out FILE
  node tools/pg-ops.mjs globals-restore [backend] --in FILE
  node tools/pg-ops.mjs diff    BEFORE.json AFTER.json

  backend, one of
    --target local  [--dsn-env NAME]        default NAME: OPENERP_DATABASE_URL
    --target docker --container NAME
    --target k8s    --namespace NS --pod POD [--context CTX] [--container postgres]

  connection flags, valid with every backend
    --host H --port P --user U --database D
    --password-env NAME                     in-container variable holding the
                                            password (default POSTGRES_PASSWORD)

  --host/--port let a newer client reach an older server, which is the supported
  direction for a cross-version dump: run the 18 client against the 16 server.
`;

export async function main(argv) {
  const { command, opts, positional } = parseArgs(argv);
  switch (command) {
    case "census":
      await cmdCensus(opts);
      return 0;
    case "dump":
      await cmdDump(opts);
      return 0;
    case "restore":
      await cmdRestore(opts);
      return 0;
    case "globals-dump":
      await cmdGlobalsDump(opts);
      return 0;
    case "globals-restore":
      await cmdGlobalsRestore(opts);
      return 0;
    case "diff":
      return cmdDiff(positional);
    default:
      process.stdout.write(USAGE);
      return command ? 2 : 0;
  }
}

// Importing this module for its exported helpers must not run the CLI.
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entry === import.meta.url) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code ?? 0),
    (err) => {
      process.stderr.write(`pg-ops: ${err.message}\n`);
      process.exit(err instanceof UsageError ? 2 : 1);
    }
  );
}
