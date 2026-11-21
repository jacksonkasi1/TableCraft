// ** import core packages
import assert from 'node:assert/strict';
import { createExpressMiddleware } from '@tablecraft/adapter-express';
import { createClient } from '@tablecraft/client';
import { defineTable } from '@tablecraft/engine';
import { memoryProvider, withCache } from '@tablecraft/plugin-cache';
import { redisProvider } from '@tablecraft/plugin-cache/redis';
import { upstashProvider } from '@tablecraft/plugin-cache/upstash';

assert.equal(typeof defineTable, 'function');
assert.equal(typeof createExpressMiddleware, 'function');
assert.equal(typeof createClient, 'function');
assert.equal(typeof withCache, 'function');
assert.equal(typeof memoryProvider, 'function');
assert.equal(typeof redisProvider, 'function');
assert.equal(typeof upstashProvider, 'function');

console.log(`Node ${process.version} loaded the engine, Express adapter, client, and cache exports`);
