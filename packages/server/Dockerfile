FROM oven/bun:1.3.13-debian AS wad-builder

WORKDIR /build/wad
RUN apt-get update \
  && apt-get install --yes --no-install-recommends g++ make \
  && rm -rf /var/lib/apt/lists/*
COPY packages/server/native/wad/Makefile packages/server/native/wad/wadctl.cpp ./
RUN make

FROM oven/bun:1.3.13-debian AS builder

WORKDIR /app
COPY package.json bun.lock ./
COPY packages/server/package.json packages/server/package.json
COPY packages/web/package.json packages/web/package.json
RUN bun install --frozen-lockfile

COPY packages/server packages/server
WORKDIR /app/packages/server
RUN bun build src/index.ts --outdir dist --target bun

FROM oven/bun:1.3.13-debian

WORKDIR /app
ENV NODE_ENV=production
ENV WADCTL_PATH=/usr/local/bin/wadctl
ENV WAD_DATA_DIR=/tmp/break-my-system/wads

COPY --from=wad-builder /build/wad/wadctl /usr/local/bin/wadctl
COPY --from=builder /app/packages/server/dist ./dist

EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
