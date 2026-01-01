# Lean Node.js image
FROM node:24-alpine

# Set work dir in the container
WORKDIR /app

# Enable pnpm using Corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

# Usa pnpm per avviare lo script
CMD ["pnpm", "run", "start:dev"]