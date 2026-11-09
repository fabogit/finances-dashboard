# Lean Node.js image
FROM node:24.22.2-alpine

# Set work dir in the container
WORKDIR /app

# Install python3, make and g++ needed to compile the native module
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Enable pnpm through Corepack, at the version pinned by packageManager
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack install

RUN pnpm install --frozen-lockfile
COPY . .

RUN pnpm prisma generate

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma generate && pnpm prisma db push --accept-data-loss && pnpm prisma db seed && pnpm exec nest start --watch --config nest-cli.docker.json"]