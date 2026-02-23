FROM oven/bun:latest

WORKDIR /app

# Copy the entire monorepo into the container
# This is necessary because the app depends on workspace packages
COPY . .

# Install dependencies for the entire monorepo
RUN bun install

# Build workspace packages in dependency order:
# 1. engine (no internal deps)
# 2. adapter-hono and plugin-cache (both depend on engine)
RUN bun run --cwd packages/engine build
RUN bun run --cwd packages/plugin-cache build
RUN bun run --cwd packages/adapter-hono build

# Set environment to production
ENV NODE_ENV=production

# The app is hardcoded to port 5000 in src/index.ts
EXPOSE 5000/tcp

# Run the app using bun from the correct working directory
ENTRYPOINT [ "bun", "run", "--cwd", "apps/hono-example", "src/index.ts" ]
