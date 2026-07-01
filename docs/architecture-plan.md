# Break My System architecture plan

This project is a small control plane for experimenting with infrastructure systems. The first useful version should feel close to the metal: pick a system, send commands, inspect output, reset state, and learn from what happened.

The control plane should stay thin. The systems being tested should remain real programs with their own processes, ports, protocol behavior, and state.

## 1. Product direction

The MVP should be non-account-based or near-zero-friction.

Use an anonymous browser session first:

- user opens the site
- server creates or accepts an anonymous `sandboxId`
- user picks a system such as `go-redis`
- user sends commands through a simple form
- server routes commands to the right sandbox/system connection
- output is returned and optionally stored
- reset clears that sandbox's system state

Accounts can come later for saved history, private sandboxes, shared labs, teaching flows, and long-running environments.

## 2. Control plane vs actual systems

### Control plane

The control plane is the website and API:

- React/Vite UI
- Hono API
- command forms and later WebSocket streams
- sandbox/session ownership
- system catalog
- command history metadata
- reset/start/stop lifecycle actions
- status and log views

### Actual systems

Actual systems are the things being exercised:

- a Redis-like server
- a toy key-value store
- future queues, databases, caches, networking experiments, or teaching modules

Each system should own its own runtime state. The app database should not become a fake version of Redis or a fake version of the tested system.

## 3. Recommended MVP shape

Start with the smallest real architecture:

```txt
browser
  -> POST /api/systems/:systemId/commands
  -> Hono API
  -> sandbox/session resolver
  -> system runner
  -> TCP connection to local module
  -> response returned to browser
```

Keep the UI as a command form at first. Add WebSockets only when command output needs to stream, when multiple clients need live status, or when the command interaction becomes terminal-like.

## 4. Dependency choices

Current useful dependencies:

- Bun: runtime and task runner
- Hono: API and RPC typing
- React/Vite: web app
- TanStack Router: routing
- React Query: async server state when the UI grows beyond local state
- Drizzle + Postgres: durable app metadata
- Redis client: connect to Redis-like systems or use Redis as platform infrastructure
- Better Auth: keep installed if useful later, but do not force the MVP through login
- WebSocket support: already available through Hono/Bun for later streaming

Likely future dependencies:

- `xterm.js` only if the UI needs full terminal behavior
- Docker SDK or direct Docker CLI only when isolated per-sandbox runtimes become necessary
- a small process manager abstraction only after there are at least two real system runners

Avoid adding a queue, job system, service layer, or broad plugin framework until the first real system is connected.

## 5. Database responsibilities

Postgres should store app metadata and history, not live system internals.

Good Postgres tables later:

- `anonymous_session`
- `system`
- `sandbox`
- `sandbox_system`
- `command_run`
- `reset_run`
- `log_event`

MVP can start smaller:

- keep the system catalog static in code
- issue an anonymous `sandboxId` cookie
- optionally store `command_run`
- skip users/projects until accounts matter

Do not store:

- Redis keys for the tested Redis implementation
- open socket state
- process memory
- full module data unless it is imported/exported as a deliberate snapshot

Redis as platform infrastructure is optional. It is useful for short-lived state, connection presence, rate limits, and pub/sub later. It is not required for the first POST-command MVP.

## 6. Session and sandbox models

There are three practical models to consider.

### Model A: one shared system for everyone

```txt
all browsers -> same API -> same TCP connection or same system instance
```

Pros:

- fastest to build
- good for demos
- simplest reset/start behavior

Cons:

- users can interfere with each other
- reset affects everyone
- command history is noisy
- not good for teaching or reliable experiments

Use this only as a throwaway local demo mode.

### Model B: one database/system, per-user namespace

```txt
browser session A -> shared system -> keys prefixed with sandbox A
browser session B -> shared system -> keys prefixed with sandbox B
```

Pros:

- cheaper than one process per user
- easy to run locally
- okay for simple key-value demos

Cons:

- requires namespace discipline in every command
- does not work cleanly for arbitrary protocols
- reset means deleting only prefixed state
- users still share CPU/memory/failure modes

Use this only for systems where namespacing is natural and enforced by the runner.

### Model C: one system instance per anonymous sandbox

```txt
browser session A -> sandbox A -> process/container A -> TCP connection A
browser session B -> sandbox B -> process/container B -> TCP connection B
```

Pros:

- clean mental model
- reset is simple
- users do not corrupt each other's state
- works for more than Redis
- best foundation for future teaching/lab flows

Cons:

- more runtime management
- needs cleanup/TTL
- eventually needs Docker or a process supervisor

Recommended default after the mock runner. Start with local processes if Docker feels too heavy, but design the API around a sandbox having its own system instance.

## 7. TCP connection strategy

Do not expose raw TCP directly to the browser. Keep the browser talking HTTP or WebSocket to the Hono server. Let the server own TCP connections to systems.

For MVP:

```txt
each command opens TCP -> sends command -> reads response -> closes TCP
```

This is simple and enough for Redis-style request/response commands.

Next step:

```txt
sandboxId + systemId -> pooled or persistent TCP connection
```

This helps when a protocol has connection state, subscriptions, transactions, or interactive behavior.

Later WebSocket mode:

```txt
browser WebSocket
  -> server session
  -> sandbox connection manager
  -> persistent TCP/process stream
```

Use WebSockets for streaming and interactive sessions. Do not use them just because they are available.

## 8. Command grouping

Support command groups before building a terminal.

Useful command modes:

- single command: `PING`
- batch command: multiple lines run in order
- script/preset: named examples like "basic SET/GET"
- reset + run: clear state, then run a command group

For a Redis-like system, a textarea can support one command per line:

```txt
SET name matty
GET name
DEL name
GET name
```

The server should return structured results:

```txt
[
  { command: "SET name matty", output: "OK", exitCode: 0 },
  { command: "GET name", output: "matty", exitCode: 0 }
]
```

That gives you useful UX without committing to terminal emulation.

## 9. Minimal backend concepts

Keep these concepts small and local at first:

- `system`: static metadata for a module
- `sandbox`: anonymous session-owned environment
- `runner`: code that can start/reset/command a system
- `connection`: server-owned TCP/process handle
- `commandRun`: persisted command result, optional in first pass

Avoid a generic service/plugin hierarchy until there are multiple real systems with repeated behavior.

## 10. Suggested first real implementation

Build in this order:

1. Keep the static system catalog.
2. Add anonymous `sandboxId` cookie middleware.
3. Add a `sandbox_system` concept in memory first.
4. Replace `runMockCommand` for `go-redis` with a tiny TCP client.
5. Support one command per request.
6. Add reset for the sandbox's `go-redis` instance.
7. Add multiline batch execution.
8. Persist command history only after the real runner works.
9. Add WebSocket streaming only after there is output worth streaming.

## 11. Open decisions

Decisions to make soon:

- Is the first real `go-redis` instance a long-running local process, Docker container, or manually started external process?
- Does reset restart the process, flush state through protocol commands, or delete a data directory?
- Should anonymous sandboxes expire after 30 minutes, 2 hours, or one day?
- Should the first shared demo mode be allowed, or should every browser get a private sandbox immediately?
- Should command history live only in the browser at first, or be saved server-side for debugging?

## 12. Recommended answer for now

Use one anonymous sandbox per browser session, and one system instance per sandbox once the real runner exists.

Before that, keep the current mock runner and shape the API around the future model:

```txt
anonymous browser session
  -> sandboxId cookie
  -> selected system
  -> command or command group
  -> runner
  -> TCP/process/container
  -> structured output
```

That keeps the site raw and low-friction while avoiding the biggest trap: building a shared global system where users constantly step on each other and reset each other's work.
