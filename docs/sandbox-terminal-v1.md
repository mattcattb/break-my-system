# Sandbox + Terminal V1

Simple setup: one sandbox owns one terminal. React Query owns server state. Mutations request transitions.

```mermaid
flowchart TD
  Route["/redis/sandbox/:sandboxId"] --> SandboxClient["createSandboxClient(sandboxId)"]

  SandboxClient --> SandboxQuery["useQuery: sandbox"]
  SandboxClient --> TerminalQuery["useQuery: terminal"]

  SandboxQuery --> SandboxState["Sandbox server state"]
  TerminalQuery --> TerminalState["Terminal server state"]

  TerminalState --> Idle["idle"]
  TerminalState --> Connecting["connecting"]
  TerminalState --> Connected["connected"]
  TerminalState --> Disconnected["disconnected"]
  TerminalState --> Error["error"]

  ConnectButton["Connect button"] --> ConnectMutation["useMutation: connect terminal"]
  ConnectMutation --> PendingConnect["mutation pending: button loading"]
  ConnectMutation --> InvalidateTerminal["invalidate terminal query"]
  InvalidateTerminal --> TerminalQuery

  CommandInput["Command input"] --> SendCommandMutation["useMutation: send command"]
  SendCommandMutation --> PendingCommand["mutation pending: command loading"]
  SendCommandMutation --> CommandResult["latest command response"]

  Connected --> CanSend["can send command"]
  Idle --> CanConnect["can connect"]
  Disconnected --> CanConnect
  Connecting --> CannotSend["cannot send yet"]
  Error --> CanConnect
```

```mermaid
stateDiagram-v2
  [*] --> idle

  idle --> connecting: connectTerminal()
  disconnected --> connecting: connectTerminal()
  error --> connecting: retry connectTerminal()

  connecting --> connected: server reports ready
  connecting --> error: server reports failure

  connected --> disconnected: disconnect / close
  connected --> error: connection fails

  disconnected --> [*]: sandbox closes
  error --> [*]: sandbox closes
```

## Ownership

```mermaid
flowchart LR
  ReactState["React local state"] --> CommandDraft["current command text"]
  ReactState --> SelectedTerminal["selected terminal id later"]

  ReactQuery["TanStack Query"] --> SandboxData["sandbox data"]
  ReactQuery --> TerminalData["terminal state"]
  ReactQuery --> CommandHistoryLater["command history later, if server-owned"]

  MutationState["Mutation state"] --> ButtonLoading["connect/send/delete loading"]
  MutationState --> LatestResponse["latest command response"]
```

## V1 Rules

- URL param owns `sandboxId`.
- `createSandboxClient(sandboxId)` attaches `X-Sandbox-Id`.
- Terminal status comes from query data, not mutation state.
- Mutation pending state is only immediate UI feedback.
- After connect/delete, invalidate terminal query.
- Command input stays local React state.
- Command history stays local until the backend stores history.

