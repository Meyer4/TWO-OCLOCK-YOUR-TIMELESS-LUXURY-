# syntax=docker/dockerfile:1

# ---- Dependencies (all, for building) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Compile TypeScript to dist/, then drop dev dependencies ----
FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---- Minimal runtime ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/package.json /app/package-lock.json ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1
# Seed (one-off, idempotent): docker compose run --rm api node dist/seed/seed.js
CMD ["node", "dist/index.js"]
