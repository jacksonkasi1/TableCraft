FROM oven/bun:latest

WORKDIR /app

# Copy the entire monorepo into the container
# This is necessary because the app depends on workspace packages
COPY . .

# Install dependencies for the entire monorepo
# Do not use --frozen-lockfile to avoid lockfile version mismatch errors
RUN bun install

# Set environment to production
ENV NODE_ENV=production

# The app is hardcoded to port 5000 in src/index.ts
EXPOSE 5000/tcp

# Run the app using bun from the correct working directory
ENTRYPOINT [ "bun", "run", "--cwd", "apps/hono-example", "src/index.ts" ]
