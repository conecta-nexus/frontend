FROM node:22-alpine

WORKDIR /app

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Environment defaults for containerized Nuxt
ENV HOST=0.0.0.0 \
    PORT=3000 \
    NODE_ENV=development

# Copy package manifests for dependency layer caching
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Install project dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy application source code
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]
