# break-my-system

`break-my-system` is a small web control plane for experimenting with infrastructure systems I build from scratch.

The first version is intentionally simple:

- a Bun/Hono API
- a React web client
- a static list of systems
- a mock command runner
- a reset endpoint shape
- notes for later terminal behavior

The goal is to make the first real module, such as `go-redis`, easy to plug in without hiding the flow behind too many abstractions.

## Project Shape

```txt
packages/
  server/     Hono API, auth/db scaffolding, systems API
  web/        React client and command console

docs/
  terminal-options.md
```

## Main Flow

```txt
web console
  -> POST /api/systems/:id/commands
  -> server mock runner for now
  -> command output shown in the console
```

The real version can swap the mock runner for:

```txt
server
  -> module control API
  -> module TCP protocol
  -> Docker/container runner
```

## Run Locally

```bash
cp .env.example .env
bun install
bun run infra:up
bun run db:migrate
bun run dev
```

Default URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- Systems: `http://localhost:3000/api/systems`

If local Postgres or Redis ports are already taken, change `POSTGRES_PORT`, `REDIS_PORT`, `DATABASE_URL`, and `REDIS_URL` in `.env`.

The web app calls relative `/api` and `/ws` URLs. Vite forwards those requests to
`API_PROXY_TARGET` (default: `http://localhost:3000`), so local development does
not need CORS configuration.

## Railway

Deploy the web and server as separate services. The web start command serves the
production build and can proxy `/api` and `/ws` to the server over Railway's
private network; set its `API_PROXY_TARGET` to the server's private URL. Leave
`VITE_API_URL` and `VITE_WS_URL` unset when using that proxy. If the browser must
call the API's public domain directly instead, set both variables at web build
time and set the server's `CORS_ORIGINS` to the web's public origin.

The Redis image listens on port `6479`, so the server needs a `REDIS_URL` using
the Redis service's private domain and that port. The Redis image must include a
`linux/amd64` manifest for Railway.

`bun run dev` also runs `infra:up`, so once dependencies are installed and the
database has been migrated, one command starts Docker, the API, and the web app.

## Where To Work First

- API systems route: `packages/server/src/systems/systems.controller.ts`
- Web console: `packages/web/src/features/systems/SystemsConsole.tsx`
- Home page: `packages/web/src/routes/index.tsx`

## Next Good Steps

1. Add a `modules/` folder for local checkouts or git submodules.
2. Add a `go-redis` manifest with ports and reset behavior.
3. Replace `runMockCommand` with a tiny client that talks to `go-redis`.
4. Add command history persistence only after the first real module works.
5. Use `xterm.js` only when the app needs full terminal behavior.

## Planning Notes

A more detailed architecture and product planning outline is available in [docs/architecture-plan.md](docs/architecture-plan.md).
