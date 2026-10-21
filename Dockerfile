# Stage 1: Base & Dependencies
FROM node:22-alpine AS base

WORKDIR /app

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Sane build & runtime environment defaults
ENV NUXT_TELEMETRY_DISABLED=1

# Copy dependency manifests
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Install project dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Stage 2: Development target (for local compose)
FROM base AS dev

ENV NODE_ENV=development \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_PUBLIC_API_BASE=http://localhost:8080/api/v1

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]

# Stage 3: Production Builder
FROM base AS builder

ENV NODE_ENV=production \
    NUXT_TELEMETRY_DISABLED=1

# Copy application source code
COPY . .

# Build production bundle (.output)
RUN pnpm build

# Stage 4: Minimal Production Runtime (Default final stage for Cloud Build / production)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_TELEMETRY_DISABLED=1

# Copy pre-compiled Nitro server bundle and static assets from builder
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
