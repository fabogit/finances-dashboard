# Lean Node.js image
FROM node:26.13.1-alpine

# Set work dir in the container
WORKDIR /app

# Install python3, make and g++ needed to compile the native module
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Node 25 and later no longer bundle Corepack: install it at a pinned version,
# then enable pnpm through it, at the version pinned by packageManager
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g corepack@0.36.0 && corepack enable && corepack install

RUN pnpm install --frozen-lockfile
COPY . .

RUN pnpm prisma generate

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma generate && pnpm prisma db push --accept-data-loss && pnpm prisma db seed && pnpm exec nest start --watch --config nest-cli.docker.json"]