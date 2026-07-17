FROM debian:bookworm-slim AS wad-builder

WORKDIR /src
RUN apt-get update \
  && apt-get install --yes --no-install-recommends g++ make \
  && rm -rf /var/lib/apt/lists/*
COPY systems/wad-filesystem/Makefile ./
COPY systems/wad-filesystem/libWad ./libWad
COPY systems/wad-filesystem/wadsvr ./wadsvr
RUN make

FROM oven/bun:1.3.13-debian AS app-builder

WORKDIR /app
COPY package.json bun.lock ./
COPY packages/server/package.json packages/server/package.json
COPY packages/web/package.json packages/web/package.json
RUN bun install --frozen-lockfile

COPY packages/server packages/server
WORKDIR /app/packages/server
RUN bun build src/index.ts --outdir dist --target bun

FROM oven/bun:1.3.13-debian

USER root
WORKDIR /app
RUN apt-get update \
  && apt-get install --yes --no-install-recommends netcat-openbsd tini \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --home-dir /nonexistent --shell /usr/sbin/nologin wadapp \
  && mkdir -p /data/wads \
  && chown -R wadapp:wadapp /data/wads

COPY --from=wad-builder /src/wadsrv-bin /usr/local/bin/wadsrv
COPY --from=app-builder /app/packages/server/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000
ENV WAD_HOST=127.0.0.1
ENV WAD_PORT=7373
ENV WAD_LISTEN_PORT=7373
ENV WAD_DATA_DIR=/data/wads
ENV WAD_MAX_WRITE_BYTES=26214400

EXPOSE 3000

USER wadapp

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD nc -z 127.0.0.1 "$WAD_PORT" \
    && bun -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3000') + '/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "-g", "--"]
CMD ["sh", "-c", "wadsrv & exec bun run dist/index.js"]
