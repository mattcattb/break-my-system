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
docker compose up -d
bun run db:migrate
bun run dev
```

Default URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- Systems: `http://localhost:3000/api/systems`

If local Postgres or Redis ports are already taken, change `POSTGRES_PORT`, `REDIS_PORT`, `DATABASE_URL`, and `REDIS_URL` in `.env`.

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
