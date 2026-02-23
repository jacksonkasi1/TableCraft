FROM oven/bun:1.1 as base
WORKDIR /app

# Install dependencies into temp directory
# This will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY apps/hono-example/package.json /temp/dev/apps/hono-example/
COPY packages/engine/package.json /temp/dev/packages/engine/
COPY packages/adapter-hono/package.json /temp/dev/packages/adapter-hono/
COPY packages/plugin-cache/package.json /temp/dev/packages/plugin-cache/

RUN cd /temp/dev && bun install --frozen-lockfile

# Copy node_modules from temp directory
# Then copy all source files and build
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [Optional] Tests & build
ENV NODE_ENV=production
# RUN bun test --cwd apps/hono-example

# Final image
FROM base AS release
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=prerelease /app/apps/hono-example apps/hono-example
COPY --from=prerelease /app/packages packages
COPY --from=prerelease /app/package.json .

# Create a simple entrypoint script to handle migrations or seeding if needed
USER bun
EXPOSE 5000/tcp
ENTRYPOINT [ "bun", "run", "--cwd", "apps/hono-example", "src/index.ts" ]
