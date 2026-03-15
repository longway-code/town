import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import type { WsEvent } from '@town/shared';
import { globalBus } from '../simulation/EventBus.js';
import { logger } from '../utils/logger.js';

export class WsServer {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
      this.clients.add(ws);
      logger.info({ clientCount: this.clients.size }, 'WS client connected');

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info({ clientCount: this.clients.size }, 'WS client disconnected');
      });

      ws.on('error', (err) => {
        logger.warn({ err }, 'WS client error');
        this.clients.delete(ws);
      });

    });

    this.registerBusHandlers();
    logger.info('WS server initialized');
  }

  private registerBusHandlers(): void {
    const events: WsEvent['type'][] = [
      'sim:tick', 'sim:state', 'agent:moved', 'agent:action',
      'agent:dialogue', 'agent:reflection', 'sim:error',
    ];
    for (const type of events) {
      globalBus.on(type, (payload) => {
        this.broadcast({ type, payload } as WsEvent);
      });
    }
  }

  broadcast(event: WsEvent): void {
    const data = JSON.stringify(event);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data, (err) => {
          if (err) this.clients.delete(ws);
        });
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}
