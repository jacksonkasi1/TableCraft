<script lang="ts">
  let response = '';
  let endpoint = '/api/data/_tables';
  let token = 'Bearer admin-token';

  async function testApi() {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'Authorization': token
        }
      });
      
      const isJson = res.headers.get('content-type')?.includes('json');
      const data = isJson ? await res.json() : await res.text();
      
      response = JSON.stringify({
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        data
      }, null, 2);
    } catch (err) {
      response = String(err);
    }
  }
</script>

<h1>SvelteKit TableCraft Example</h1>

<div class="controls">
  <div>
    <label for="endpoint">Endpoint:</label>
    <input id="endpoint" bind:value={endpoint} style="width: 300px;" />
  </div>
  
  <div>
    <label for="token">Auth Token:</label>
    <select id="token" bind:value={token}>
      <option value="Bearer admin-token">Admin (sees all)</option>
      <option value="Bearer member-token">Member (Tenant 1 only)</option>
      <option value="">No Auth (Guest)</option>
    </select>
  </div>
  
  <button on:click={testApi}>Test API</button>
</div>

<div class="quick-links">
  <button on:click={() => endpoint = '/api/data/_tables'}>Discover Tables</button>
  <button on:click={() => endpoint = '/api/data/users'}>Get Users</button>
  <button on:click={() => endpoint = '/api/data/users/_meta'}>Users Meta</button>
  <button on:click={() => endpoint = '/api/data/products'}>Get Products</button>
</div>

<pre>{response}</pre>

<style>
  .controls, .quick-links {
    margin-bottom: 1rem;
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  pre {
    background: #f4f4f4;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
  }
</style>
