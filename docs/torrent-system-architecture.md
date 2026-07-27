# Torrent system architecture

This document defines how the reusable BitTorrent implementation and the
Break My System teaching platform should fit together.

The central rule is:

> The torrent client and tracker must be ordinary, interoperable BitTorrent
> implementations. Break My System observes and controls them through explicit
> boundaries; it does not redefine their protocol behavior.

The first compatibility target is BitTorrent v1 over TCP with HTTP trackers.
Later milestones add common discovery and transport extensions without
requiring a rewrite of the core.

## 1. Goals

### BitTorrent goals

- Parse and create valid BitTorrent v1 metainfo.
- Download and seed both single-file and multi-file torrents.
- Interoperate with existing clients over the standard peer wire protocol.
- Announce to third-party HTTP trackers and accept both compact and dictionary
  peer responses.
- Run a tracker that existing BitTorrent clients can announce to.
- Manage multiple torrents through one client identity and listening port.
- Resume safely by checking data already present on disk.
- Treat all metainfo, tracker responses, peer messages, and file paths as
  untrusted input.
- Leave room for UDP trackers, magnet links, DHT, PEX, uTP, and BitTorrent v2.

### Break My System goals

- Create and control clients in a workspace.
- Show trackers, clients, peers, pieces, rates, and protocol transitions.
- Provide controlled artifacts and official seeders.
- Introduce failures at real I/O boundaries.
- Stream bounded educational events without making UI availability part of
  torrent correctness.
- Allow the same torrent implementation to run as a CLI client, official
  seedbox, hosted workspace engine, or local companion.

## 2. Non-goals for the first interoperable client

- BitTorrent v2 or hybrid torrents.
- DHT, PEX, and magnet-only downloads.
- uTP or peer protocol encryption.
- A production-scale public tracker.
- A general-purpose plugin system.
- One container per torrent.
- Persisting every peer-wire message to the application database.
- Browser WebRTC compatibility.

These may become later milestones. They should not delay a correct v1
tracker-based TCP client.

## 3. What “interoperable” means

The first release is interoperable when all of the following are true:

1. Our client can announce a v1 info hash to a standard HTTP tracker.
2. It can dial a peer returned by that tracker and complete the BEP 3
   handshake.
3. It can download a file from an existing client and verify every piece.
4. An existing client can connect to our listening port and download from us.
5. Our tracker accepts announces from an existing client and returns usable
   peers.
6. One client can listen on one port for multiple torrents and route an
   incoming connection by the handshake info hash.
7. A peer, tracker, disk, or individual torrent failure does not crash all
   other running torrents.

Compatibility should be proven locally against at least one mature client,
such as Transmission or libtorrent, before testing an ordinary public torrent.
Public-network testing must use content that is legal to distribute.

## 4. Protocol compatibility ladder

### Milestone A: BitTorrent v1 foundation

Implement the core behavior from
[BEP 3](https://www.bittorrent.org/beps/bep_0003.html):

- Canonical bencoding validation.
- SHA-1 info hash from the exact encoded `info` dictionary.
- Single-file and multi-file metainfo.
- HTTP tracker announces with binary-safe `info_hash` and `peer_id`.
- `started`, periodic, `completed`, and best-effort `stopped` announces.
- TCP peer handshake and reserved bytes.
- Keepalive, choke, unchoke, interested, not interested, have, bitfield,
  request, piece, and cancel messages.
- 16 KiB block requests.
- Pipelined requests.
- Piece hash verification before data becomes available for upload.
- Uploading and downloading over the same symmetrical peer connection.
- Connection, message, and inactivity deadlines.

Implement both tracker peer-list representations from
[BEP 23](https://www.bittorrent.org/beps/bep_0023.html):

- Dictionary peer lists.
- Six-byte compact IPv4 peer lists.

The `compact` request flag is advisory. A compatible client must accept either
response representation.

### Milestone B: useful tracker-based client

- Multi-file storage spanning file boundaries.
- Safe path normalization and traversal prevention.
- Resume by verifying existing pieces.
- Rarest-first piece selection after an initial random piece.
- Endgame duplicate requests and cancellation.
- Upload slot limits and optimistic unchoking.
- Periodic tracker re-announcement using each tracker’s returned interval.
- Multi-tracker tiers from
  [BEP 12](https://www.bittorrent.org/beps/bep_0012.html).
- Private-torrent behavior from
  [BEP 27](https://www.bittorrent.org/beps/bep_0027.html).

Private torrents must never use DHT, PEX, local peer discovery, or peers
obtained outside the permitted private tracker.

### Milestone C: common public discovery

- UDP tracker client and server behavior from
  [BEP 15](https://www.bittorrent.org/beps/bep_0015.html).
- Extension handshake from
  [BEP 10](https://www.bittorrent.org/beps/bep_0010.html).
- Peer metadata transfer and magnet links from
  [BEP 9](https://www.bittorrent.org/beps/bep_0009.html).
- DHT node and trackerless peer discovery from
  [BEP 5](https://www.bittorrent.org/beps/bep_0005.html).
- Peer exchange from
  [BEP 11](https://www.bittorrent.org/beps/bep_0011.html).

These are independent peer sources. They should all produce candidates for the
same connection manager rather than implementing separate download engines.

### Milestone D: modern protocol coverage

- IPv6 peer and tracker representations.
- Web seeds, beginning with
  [BEP 19](https://www.bittorrent.org/beps/bep_0019.html).
- uTP where deployment and testing justify it.
- Fast extension behavior.
- BitTorrent v2 and hybrid torrents from
  [BEP 52](https://www.bittorrent.org/beps/bep_0052.html).

V2 changes metainfo, hashing, storage alignment, and peer messages. It should
follow a stable v1 multi-file implementation rather than being mixed into the
initial design.

## 5. Target module organization

The target packages correspond to real protocol or ownership boundaries:

```text
systems/go-torrent/
├── bencode/
│   └── canonical encoder and bounded decoder
├── metainfo/
│   └── .torrent parsing, creation, hashes, file layout
├── peerwire/
│   └── handshake, messages, extension negotiation
├── tracker/
│   └── announce types, HTTP client, HTTP server
├── torrent/
│   └── client, torrent session, peer lifecycle, scheduling, storage
└── cmd/
    ├── torrent/
    │   └── inspect, download, seed
    ├── torrentd/
    │   └── long-running multi-client engine
    └── trackerd/
        └── standalone tracker process
```

This is a target, not a request for a big-bang file move. Code should be
extracted only when the corresponding behavior is being implemented or changed.

### Dependency direction

```text
bencode
   ↑
metainfo       peerwire       tracker
      \           |           /
       \          |          /
              torrent
                 ↑
          commands/daemons
```

Protocol packages must not import the engine. The engine composes protocol
capabilities. Executables configure and run the engine.

Break My System packages must not be imported anywhere under
`systems/go-torrent`.

## 6. Core runtime ownership

### Client

`Client` represents one BitTorrent client identity:

```text
Client
├── peer ID
├── listening endpoint
├── inbound accept loop
├── torrent sessions keyed by info hash
├── connection limits
├── dialer
└── event sink
```

The client owns the shared listening socket. For an incoming connection it:

1. Reads the peer handshake.
2. Looks up the torrent session by info hash.
3. Rejects unknown info hashes.
4. Responds using the same info hash and client peer ID.
5. Transfers the connection to that torrent session.

This is how several torrents share one listening port.

### Torrent session

`Torrent` owns one swarm’s mutable state:

```text
Torrent
├── immutable metainfo and file layout
├── local piece state
├── connected peers
├── pending block requests
├── piece scheduler
├── tracker schedule
├── uploaded/downloaded counters
└── completion state
```

It does not own a TCP listener or generate an independent client peer ID.

### Peer

`Peer` owns one connection:

```text
Peer
├── net.Conn
├── remote peer ID
├── remote piece bitfield
├── choke/interest state
├── negotiated extensions
├── read loop
└── bounded write queue
```

Closing one peer must release its pending requests back to the torrent
scheduler.

### Storage

Storage maps global torrent offsets to one or more files. The first useful
capabilities are:

- Read a requested verified block.
- Write a completed verified piece.
- Determine which pieces already exist after restart.
- Close all owned files.

The engine should use standard `io.ReaderAt`/`io.WriterAt`-style capabilities
where possible. A custom interface is justified only when multi-file mapping
and lifecycle cannot be expressed clearly with standard interfaces.

## 7. Concurrency model

Prefer explicit ownership over locks scattered through protocol code.

```text
Client accept loop
    └── reads handshake and routes connection

Peer read loop
    └── decodes messages and sends peer events

Peer write loop
    └── serializes a bounded outgoing queue

Torrent event loop
    └── sole owner of torrent maps, scheduling, and counters
```

Rules:

- One goroutine owns each mutable map.
- No network read loop mutates torrent state directly.
- No UI or telemetry consumer can block the torrent event loop.
- Every goroutine has a cancellation path and a known owner.
- Queue sizes are bounded.
- Closing a channel is performed by its producer/owner.
- `go test -race ./...` is part of the normal verification path.

### Cancellation tree

```text
process context
└── client context
    ├── listener
    └── torrent context
        ├── tracker loop
        └── peer context
            ├── reader
            └── writer
```

Stopping a torrent must not stop the client or other torrents. Stopping the
client cancels all of its torrents.

## 8. Tracker architecture

One tracker process manages many swarms:

```text
info hash
└── peer ID
    ├── observed address and announced port
    ├── last seen
    ├── uploaded/downloaded/left
    └── seeder or leecher status
```

The HTTP tracker must:

- Validate and bound all query parameters.
- Use the request’s observed address by default rather than trusting an
  arbitrary advertised IP.
- Add/update peers on announces.
- Remove peers on `stopped` and expire stale entries.
- Exclude the announcing peer from its returned peer list.
- Return the configured interval.
- Support dictionary and compact IPv4 responses.
- Return bencoded failure reasons.
- Keep swarms isolated by exact binary info hash.
- Enforce per-address and per-swarm limits.

The initial tracker state can remain in memory. Durability is not needed for
correctness because peers re-announce and entries expire.

The BMS artifact catalog and the tracker are different systems:

- The catalog answers: “Which artifact or lesson can I choose?”
- The tracker answers: “Which peers currently participate in this info hash?”

## 9. Executable applications

### `torrent`

A user-facing CLI and interoperability tool:

```text
torrent inspect file.torrent
torrent download file.torrent --output ./downloads
torrent seed file.torrent --data ./downloads
```

It should use the same client library as hosted clients and official seeders.

### `torrentd`

A long-running process that manages clients and torrents:

```text
CreateClient
DeleteClient
AddTorrent
StartTorrent
PauseTorrent
RemoveTorrent
GetSnapshot
SubscribeEvents
```

The first daemon protocol may be a small private HTTP/JSON API. It is a real
cross-language boundary, so explicit versioned request, response, snapshot, and
event schemas are appropriate.

### `trackerd`

A standalone tracker using the `tracker` package. It should be usable without
Break My System.

### Official seedbox

An official BMS seeder is not a fourth implementation. It is `torrentd` running
with trusted artifacts already present and verified.

## 10. Break My System boundary

```text
Browser
    │ Hono RPC / WebSocket
    ▼
BMS API
├── authentication and workspace ownership
├── artifact catalog and lesson rules
├── quotas and TTL
├── torrentd adapter
├── current-state projection
└── bounded educational event stream
    │
    ▼
torrentd
```

The BMS database owns:

- workspace and user metadata
- artifact catalog entries
- lesson progress and unlocks
- desired client/torrent configuration

It does not own:

- open sockets
- peer-wire state
- live request queues
- piece buffers
- tracker swarm membership

## 11. Observability contract

The engine exposes both current state and changes:

### Snapshot

- Client identity and listening endpoint.
- Torrent progress and role.
- Connected peer summaries.
- Piece availability and verification state.
- Current transfer rates and totals.
- Tracker status and next announce.

### Semantic events

- Client started/stopped.
- Torrent added/started/paused/completed.
- Tracker announce started/succeeded/failed.
- Peer discovered/connected/handshaken/disconnected.
- Peer choke and interest transitions.
- Piece requested/received/verified/rejected.
- Upload started/completed.

Raw block and peer-wire messages can be far too frequent for the UI. The
adapter should aggregate or sample them into bounded educational events.

The browser reconnect sequence is:

1. Fetch a fresh snapshot.
2. Render the graph.
3. Subscribe from the snapshot’s sequence number.
4. Refetch if an event gap is detected.

## 12. Fault injection boundary

Break My System faults should act through real boundaries:

- Close a selected peer connection.
- Pause or stop a peer process/container.
- Wrap a connection with latency, loss, or bandwidth limits.
- Limit disk space.
- Return a malformed response from a lab tracker.
- Corrupt a block before the ordinary verification path receives it.

Do not place BMS conditionals inside normal protocol decisions. The core should
react to faults exactly as it would on the public network.

## 13. Security and resource invariants

- Bencoded strings, nesting, tracker bodies, peer messages, and metadata all
  have explicit limits.
- Torrent paths never escape the selected download root.
- Absolute paths, `.` components, `..` components, empty components, and
  platform-reserved names are sanitized or rejected.
- A piece is never advertised or served before successful hash verification.
- Requests outside the torrent’s valid piece/block ranges are rejected.
- Unexpected piece data is bounded and does not silently enter storage.
- Tracker URLs are subject to an allowlist in controlled BMS workspaces to
  prevent SSRF.
- Peer and pending-request counts are bounded per torrent and client.
- Telemetry queues are bounded and may drop low-value events rather than block
  the protocol.
- SHA-1 piece verification establishes consistency with v1 metainfo, not trust
  in the publisher or safety of the content.

## 14. Test strategy

### Protocol tests

- Golden bencoding and metainfo examples.
- Short-read and short-write protocol tests.
- Round trips for every peer message.
- Rejection of invalid lengths, IDs, ranges, and bitfields.
- Fuzz bencoding, metainfo, tracker responses, handshakes, and peer messages.

### Engine behavior tests

- Correct choke/interest transitions.
- Request-window bounds.
- Pending requests released after disconnect/choke.
- Hash mismatch never marks a piece complete.
- Multi-file reads/writes spanning file boundaries.
- Resume finds valid pieces and rejects damaged ones.
- One client routes two incoming info hashes to two torrent sessions.
- Unknown info hashes do not stop the listener.
- Cancellation leaves no peer or listener goroutines running.

### Local integration tests

Run real loopback sockets and temporary directories:

```text
our tracker
├── our seeder
└── our leecher
```

Verify:

- tracker discovery
- complete byte-for-byte download
- seeding after completion
- interrupted peer recovery
- periodic and completed announces
- restart and resume

### External interoperability tests

These may be slower/manual at first:

1. Existing client seeds; our client downloads.
2. Our client seeds; existing client downloads.
3. Existing client announces to our tracker.
4. Our client announces to an established local tracker.
5. Capture a session with Wireshark when a protocol disagreement is unclear.

Tests must use generated fixtures or content that is intentionally
redistributable.

## 15. Migration from the current code

The current package is a useful vertical prototype, not a failed design. It
already contains:

- bounded/canonical bencoding work
- v1 single-file metainfo parsing
- HTTP tracker client behavior
- peer handshake and base messages
- piece verification and random-access writes
- peer and torrent event loops
- initial inbound listening and tracker server sketches

Known gaps that shape the migration:

- `Torrent` currently generates the peer ID and owns the listening port.
- Multi-file metainfo is rejected.
- The CLI download command is not implemented.
- The tracker server constructor and handler are incomplete.
- Tracker announces are not yet a periodic lifecycle.
- Piece selection, endgame, and choking policies are incomplete.
- Public semantic snapshots/events do not yet exist.

### No big-bang reorganization

Use this sequence:

1. Add characterization tests around working parsing, tracker-client, peer-wire,
   and piece behavior.
2. Introduce `Client` inside the existing `torrent` package.
3. Move listener and peer ID ownership from `Torrent` to `Client`.
4. Prove handshake routing for two torrent sessions.
5. Complete one v1 single-file seed-to-download loop.
6. Complete the HTTP tracker server.
7. Add multi-file layout and safe storage.
8. Extract packages only while changing the behavior they own.
9. Add snapshots and semantic events.
10. Build `torrentd`, then connect BMS.

## 16. First implementation slice

The next code change should be only the client ownership boundary.

Acceptance criteria:

- `Client` owns one peer ID and one TCP listener.
- A client can register two torrent sessions by info hash.
- An incoming handshake is routed to the matching session.
- An unknown info hash is rejected without stopping the listener.
- Stopping one torrent does not stop the client.
- Canceling the client closes the listener and all owned sessions.
- Focused tests pass under `go test -race ./...`.

Do not add BMS routes, JSON events, package moves, DHT, or container
orchestration in this slice.

## 17. Decisions made by this outline

- BitTorrent v1 comes before v2.
- TCP comes before uTP.
- HTTP trackers come before UDP trackers and DHT.
- A client, not a torrent session, owns peer identity and the listener.
- One tracker process supports many info hashes.
- Official seeders reuse the ordinary torrent client.
- Product artifact discovery is separate from BitTorrent peer discovery.
- BMS integrations depend on the torrent engine; the torrent engine never
  depends on BMS.
- Snapshots describe current truth; events explain transitions.
- Faults are injected at I/O and process boundaries.
- Package extraction follows proven behavior instead of preceding it.
