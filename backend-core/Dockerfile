# Lean Node.js image
FROM node:24-alpine

# Set work dir in the container
WORKDIR /app

# Enable pnpm using Corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install python3, make and g++ needed to compile the native module
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm dlx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "pnpm dlx prisma db push && pnpm run start:dev"]