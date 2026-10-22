# syntax=docker/dockerfile:1

# ---- Dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build (standalone output for a small runtime image) ----
FROM node:22-alpine AS build
WORKDIR /app
# NEXT_PUBLIC_* values are inlined at build time, so they are build arguments.
ARG API_INTERNAL_URL=http://api:4000
ARG NEXT_PUBLIC_SITE_URL=http://localhost
ARG NEXT_PUBLIC_STORE_NAME="Timeless Luxury Two O'Clock"
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ARG NEXT_PUBLIC_HERO_VIDEO_URL=
ENV API_INTERNAL_URL="${API_INTERNAL_URL}" \
    NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL}" \
    NEXT_PUBLIC_STORE_NAME="${NEXT_PUBLIC_STORE_NAME}" \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}" \
    NEXT_PUBLIC_HERO_VIDEO_URL="${NEXT_PUBLIC_HERO_VIDEO_URL}" \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Runtime ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
