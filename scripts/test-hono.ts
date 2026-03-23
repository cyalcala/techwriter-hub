import { Hono } from 'hono';

const api = new Hono();
api.get('/feed', (c) => c.text('feed found'));

const app = new Hono();
app.route('/api/control', api);

async function test() {
  const res = await app.request('/api/control/feed');
  console.log('Path: /api/control/feed, Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);

  const res2 = await app.request('/feed');
  console.log('Path: /feed, Status:', res2.status);
}

test();
