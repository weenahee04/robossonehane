import { serve } from '@hono/node-server';
import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { initMqtt } from './services/mqtt.js';
import { initWebSocket } from './services/websocket.js';

export { createApp } from './app.js';

export function startServer() {
  const app = createApp();
  const port = Number(process.env.PORT) || 3001;

  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`ROBOSS API running on http://localhost:${info.port}`);
  });

  initMqtt();
  initWebSocket(server as ReturnType<typeof import('http').createServer>);

  return server;
}

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (entryUrl && import.meta.url === entryUrl) {
  startServer();
}

export default createApp();
