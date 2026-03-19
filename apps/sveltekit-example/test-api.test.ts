import { beforeAll, afterAll, test, expect } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

let serverProcess: ChildProcess;

beforeAll(async () => {
  // Start the server
  serverProcess = spawn('bun', ['run', 'dev'], { detached: true });
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));
});

afterAll(() => {
  if (serverProcess && serverProcess.pid) {
    process.kill(-serverProcess.pid);
  }
});

test('API tests', async () => {
  const url = 'http://localhost:5173/api/data';

  // 1. Guest Discovery
  const r1 = await fetch(`${url}/_tables`);
  expect(r1.status).toBe(200);
  expect(await r1.json()).toEqual([]);

  // 2. Admin Discovery
  const r2 = await fetch(`${url}/_tables`, {
    headers: { Authorization: 'Bearer admin-token' }
  });
  expect(r2.status).toBe(200);
  expect(await r2.json()).toEqual(['tenants', 'users', 'products']);

  // 3. Member Users
  const r3 = await fetch(`${url}/users`, {
    headers: { Authorization: 'Bearer member-token' }
  });
  expect(r3.status).toBe(200);
  const data3 = await r3.json();
  expect(data3.data.length).toBe(10); // Seed creates 10 per tenant

  // 4. Products Filter
  const r4 = await fetch(`${url}/products?filter[is_archived]=false`, {
    headers: { Authorization: 'Bearer member-token' }
  });
  expect(r4.status).toBe(200);
  const data4 = await r4.json();
  expect(data4.data.length).toBeGreaterThan(0);
}, 30000); // Give enough timeout for fetching
