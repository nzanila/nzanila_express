# 🔴 Credential exposure — action required

**Status:** live credentials are readable in a public GitHub repo. Nothing here is fixed until
**you** rotate them in the Supabase dashboard. Everything an assistant can do has been done.

Repo: `https://github.com/nzanila/nzanila_express.git` — **PUBLIC**

## What leaked

| File | Secret | On public origin since |
|---|---|---|
| `scripts/setup-supabase.js` | `service_role` JWT | `7a2f6f1` — 2026-08-31 |
| `scripts/run-migration.js` | `service_role` JWT | `bbd627e` — 2026-09-01 |
| `scripts/setup-supabase-direct.js` | Postgres **database password** | `7a2f6f1` — 2026-08-31 |
| `artifacts/api-server/.dev.vars` | `service_role` JWT (**the key the live worker uses**) | `4e5ab46` |

Project ref: `pvjztlwjuccmiggorwps`

**Why this is severe:** `service_role` bypasses row-level security entirely — full read/write on
every table: users, phone numbers, orders, stores. The JWTs do not expire until **2036**
(`exp = 2103694112`), so waiting them out is not an option. Public GitHub is continuously
scraped for exactly this pattern; assume the keys are compromised.

**Two distinct secrets, two separate rotations.** Rolling the `service_role` key does **not**
change the database password, and vice versa. Both must be rotated.

## Do this, in order

### 1. Rotate (only you can — Supabase dashboard)
- **Settings → API → roll `service_role`**
- **Settings → Database → reset database password**

### 2. Immediately re-set the worker secret

Rotating breaks the deployed API instantly — `nzanila-api-server` authenticates with that key on
every request. Have this ready to paste the moment the new key exists:

```bash
cd ~/nzanila_express/artifacts/api-server
npx wrangler secret put SUPABASE_SERVICE_KEY     # paste the NEW key
```

Then update `artifacts/api-server/.dev.vars` locally with the new values.

### 3. Stop tracking the secret file

`.dev.vars` is currently tracked. This keeps the local file and only stops tracking it:

```bash
cd ~/nzanila_express
git rm --cached artifacts/api-server/.dev.vars
git commit -m "chore: stop tracking .dev.vars; secrets move to env"
```

> Not done automatically: three Claude sessions have uncommitted work in this tree, and staging
> changes for you would land in someone else's commit.

### 4. Scrub history (optional, only after rotating)

Removing the files does **not** help on its own — the values remain in history and may already be
cloned or indexed. Rotation is what actually protects you. If you also want history clean:

```bash
pip install git-filter-repo
cd ~/nzanila_express
git filter-repo --invert-paths \
  --path scripts/setup-supabase.js \
  --path scripts/run-migration.js \
  --path scripts/setup-supabase-direct.js \
  --path artifacts/api-server/.dev.vars
git push --force --all
```

> ⚠️ Rewrites history and requires a force-push. Coordinate first — other sessions hold
> uncommitted work and a rewrite lands on all of them at once. **Do not run this while they
> are mid-task.**

## Already done for you

- Credentials stripped from all three scripts; they now read `process.env` and exit with a clear
  message if unset (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_DB_URL`).
- `.gitignore` extended: `.dev.vars`, `*.dev.vars`, `.env`, `.env.*`.
- Verified no credential literals remain in `scripts/*.js`.

## Also worth knowing

`scripts/run-migration.js` is dead code — it calls an `exec_sql` RPC that does not exist in this
project, so every migration it claimed to apply has silently failed. Consider deleting it.
