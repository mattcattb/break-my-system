# Terminal Options

Start with the current command form unless you need a real shell-like terminal.

## Option 1: Command Form

This is what the app uses now.

Good for:

- Redis commands
- HTTP requests
- small protocol experiments
- readable request/response code
- simple reset behavior

Shape:

```txt
textarea/input -> API route -> module runner -> output panel
```

This is the best first version for `break-my-system`.

## Option 2: xterm.js

`xterm.js` is the standard browser terminal emulator. It is used in serious browser IDE and terminal products, and supports ANSI escape sequences, terminal rendering, Unicode, mouse events, and addons such as fit-to-container.

Use it when you want:

- a real terminal emulator
- colored output
- interactive shell-like behavior
- streaming output over WebSockets
- future support for tools like bash, vim, or tmux

Important: `xterm.js` is only the browser terminal. It still needs a backend process, usually connected through a PTY and WebSocket.

Shape:

```txt
xterm.js in browser
  <-> WebSocket
  <-> server PTY/session manager
  <-> process/container/module
```

Do not start here unless command forms feel too limited.

## Option 3: Monaco Editor

Monaco is the editor behind VS Code. It is useful if commands become multi-line scripts or config files.

Good for:

- editing Redis scripts
- writing module config
- editing Dockerfiles or manifests

It is not a terminal replacement.

## Recommendation

For this project:

1. Keep the simple command console now.
2. Add WebSocket streaming when command output needs to update live.
3. Add `xterm.js` later for true terminal sessions.
4. Add Monaco only if you need real file/script editing.
