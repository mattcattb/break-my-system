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

systems/
  go-redis/       Independent Go Redis repository (submodule)
  plc-runtime/    Independent PLCProject repository (submodule)
  wad-filesystem/ Independent Wad-Fuse-Filesystem repository (submodule)

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
git submodule update --init --recursive
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

Run `bun run infra:up` before `bun run dev`; the development script starts the
API and web app, while Docker infrastructure is managed separately.

The WAD API talks to the C++ TCP service at `WAD_HOST:WAD_PORT`. Both processes
must use the same `WAD_DATA_DIR`; Docker Compose mounts that directory into the
WAD container automatically.

For a production-style API deployment with Postgres, Redis, and the WAD service:

```bash
docker compose --profile production up -d --build
```

## Docker Hub and Railway

The production server image contains both the Bun API and the C++ WAD daemon.
They communicate over `127.0.0.1:7373` and share `/data/wads` inside one
container, so Railway does not need to share a filesystem between services.
Only the HTTP API port is exposed.

Build and test the same image Railway will run:

```bash
docker build -f packages/server/Dockerfile -t break-my-system-api:local .
docker run --rm -p 3000:3000 \
  -e REDIS_URL=redis://host.docker.internal:26379 \
  break-my-system-api:local
```

Publish a versioned multi-platform image to Docker Hub:

```bash
docker login
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f packages/server/Dockerfile \
  -t YOUR_DOCKERHUB_USER/break-my-system-api:0.1.0 \
  -t YOUR_DOCKERHUB_USER/break-my-system-api:latest \
  --push .
```

Docker Hub stores the built image, not the Dockerfile itself. Prefer a public
repository unless the Railway plan supports private registry credentials.

On Railway:

1. Add a Redis service to the existing project.
2. Add a service from the Docker image
   `YOUR_DOCKERHUB_USER/break-my-system-api:0.1.0`.
3. Set `REDIS_URL` using a reference to the Redis service.
4. Generate a public domain for the API service.
5. Point the web service's `VITE_API_URL` at that API domain and rebuild it.

Do not create a second Railway WAD service. The daemon is already inside the
API image. Railway supplies the public `PORT`; the internal WAD daemon uses
`WAD_LISTEN_PORT=7373` and is not publicly exposed.

Uploads currently belong to short-lived in-memory workspaces. A Railway volume
is therefore optional and does not make workspaces survive an API restart until
workspace metadata is persisted. If a volume is added later, mount it at
`/data/wads`. Railway documents a permissions caveat for images that run as a
non-root user with attached volumes; set `RAILWAY_RUN_UID=0` on this service if
the mounted volume is not writable by the image's `wadapp` user.

## Where To Work First

- API systems route: `packages/server/src/systems/systems.controller.ts`
- Web console: `packages/web/src/features/systems/SystemsConsole.tsx`
- Home page: `packages/web/src/routes/index.tsx`

## Next Good Steps

1. Add a `go-redis` manifest with ports and reset behavior.
2. Replace `runMockCommand` with a tiny client that talks to `go-redis`.
3. Add command history persistence only after the first real module works.
4. Use `xterm.js` only when the app needs full terminal behavior.

## System Repositories

The systems remain independent GitHub repositories. Break My System pins a
known-compatible commit of each repository through Git submodules.

Clone everything together with:

```bash
git clone --recurse-submodules https://github.com/mattcattb/break-my-system.git
```

After pulling a Break My System change, synchronize the checked-out systems:

```bash
git submodule update --init --recursive
```

Make and commit system changes inside the corresponding `systems/*` directory,
push that repository first, then commit the updated submodule pointer in Break
My System. Local sibling clones are not required.

## Planning Notes

A more detailed architecture and product planning outline is available in [docs/architecture-plan.md](docs/architecture-plan.md).
