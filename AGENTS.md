# Nzanila Express - AGENTS.md

A B2B wholesale marketplace monorepo using npm workspaces.

## Project Structure

```
nzanila_express/
├── package.json          # Root workspace config, scripts, overrides
├── .npmrc                # npm configuration
├── tsconfig.base.json    # Shared TypeScript config
├── tsconfig.json         # Root project references
├── pnpm-workspace.yaml   # REMOVED (replaced by npm workspaces)
├── lib/
│   ├── db/               # Drizzle ORM schema + Supabase Postgres connection
│   ├── api-zod/          # Zod validation schemas (generated from OpenAPI)
│   ├── api-client-react/ # React Query hooks (generated from OpenAPI)
│   └── api-spec/         # OpenAPI spec + Orval codegen config
├── artifacts/
│   ├── api-server/       # Express 5 API server (esbuild bundle)
│   ├── global-marketplace/  # React 19 frontend (Vite)
│   └── mockup-sandbox/   # Mockup/preview app
└── scripts/              # Dev scripts
```

## Key Commands

```bash
npm install              # Install all dependencies
npm run build            # Build all packages (tsc + esbuild)
npm run typecheck        # Typecheck all packages
npm run dev              # Start API + frontend dev servers
npm run codegen          # Regenerate API client from OpenAPI spec
npm run dev:api          # Start only the API server (from dist)
npm run dev:web          # Start only the frontend dev server
```

## Common Tasks

### Running the API server standalone
```bash
node artifacts/api-server/build.mjs   # Build the API server
PORT=5000 node --env-file=.env --enable-source-maps ./artifacts/api-server/dist/index.mjs
```

### Running the frontend dev server
```bash
npm run dev:web --workspace=@workspace/global-marketplace
```

### Typechecking a single package
```bash
npm run typecheck --workspace=@workspace/api-server
```

## Environment Variables

- `DATABASE_URL`: Supabase Postgres connection string (stored in `.env`)
- `SUPPLIER_ID`: Default supplier ID for demo routes (default: `1`)
- `PORT`: API server port (default: `5000`)
- `PORT_WEB`: Frontend port (default: `5173`)
- `BASE_PATH`: Frontend base path (default: `/`)
- `NODE_ENV`: Set to `development` for dev mode

## Package Dependencies

Workspace packages use `file:../...` protocol for internal dependencies:
- `@workspace/api-zod` and `@workspace/db` are linked from `artifacts/api-server`
- `@workspace/api-client-react` is linked from `artifacts/global-marketplace`

## Notes

- Uses npm workspaces
- TypeScript project references for incremental builds
- esbuild for API server bundling (CJS bundle with ESM output)
- Vite for frontend dev server and builds
- Orval for OpenAPI code generation
- Supabase (PostgreSQL) for database — schema in `supabase/migrations/`, seed data in migrations
- Supabase project ref: `pvjztlwjuccmiggorwps`
- Start server: `node --env-file=.env --enable-source-maps ./artifacts/api-server/dist/index.mjs`
