# ---------------------------------------------------------------------------
# CaseADVO — production image.
#
# Multi-stage: deps -> build -> runtime. The runtime stage carries no compiler
# and no dev dependencies, runs as a non-root user, and includes a healthcheck.
#
# The database is SQLite via Node's built-in node:sqlite (ADR-002), so the image
# needs no database server and no native compilation. The data directory is a
# volume so the ingested corpus survives container replacement.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/ingestion/package.json packages/ingestion/
# npm workspaces need every manifest present before install.
RUN npm ci --omit=dev --ignore-scripts || npm install --omit=dev --ignore-scripts

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/ingestion/package.json packages/ingestion/
RUN npm ci --ignore-scripts || npm install --ignore-scripts
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build with a throwaway database so prerendering has a schema to read.
RUN DATABASE_PATH=/tmp/build.db node -e "\
  const {applySchema}=await import('./packages/db/src/client.ts');\
  applySchema({fresh:true});" --input-type=module \
  && DATABASE_PATH=/tmp/build.db npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/app/data/lexhall.db
RUN addgroup -S lexhall && adduser -S lexhall -G lexhall \
    && apk add --no-cache curl
COPY --from=build --chown=lexhall:lexhall /app/node_modules ./node_modules
COPY --from=build --chown=lexhall:lexhall /app/apps/web/.next ./apps/web/.next
COPY --from=build --chown=lexhall:lexhall /app/apps/web/public ./apps/web/public
COPY --from=build --chown=lexhall:lexhall /app/apps/web/package.json ./apps/web/
COPY --from=build --chown=lexhall:lexhall /app/apps/web/next.config.ts ./apps/web/
COPY --from=build --chown=lexhall:lexhall /app/packages ./packages
COPY --from=build --chown=lexhall:lexhall /app/package.json ./
# The reviewed judicial-statistics extract the ingest script reads at boot.
# Only the structured artifact ships — raw crawl HTML stays out of the image.
COPY --from=build --chown=lexhall:lexhall /app/research/ecourts/structured ./research/ecourts/structured
# The real, already-ingested corpus (62,946 professionals), baked in at a
# path outside the /app/data volume — never written to directly. On a fresh
# volume (no persistent disk attached, or a first-ever deploy) the entrypoint
# copies it into place; a previously-populated persistent volume is left
# alone. Ships the platform with real data on day one instead of the
# schema-only "run ingest yourself" state, while still letting a real
# deployment's own ingested volume take over once one exists.
COPY --chown=lexhall:lexhall data/lexhall.db /app/data-seed/lexhall.db
COPY --chown=lexhall:lexhall docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/data && chown -R lexhall:lexhall /app/data
USER lexhall
EXPOSE 3000
VOLUME ["/app/data"]
# Liveness AND readiness in one probe: /api/health reports database reachability
# and corpus size, so an empty database is visibly not-ready rather than "up".
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=4 \
  CMD curl -fsS http://127.0.0.1:3000/api/health | grep -qE '"status":"(ok|degraded)"' || exit 1
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "start", "--workspace=@lexhall/web"]
