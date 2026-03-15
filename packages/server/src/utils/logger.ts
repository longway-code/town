import pino from 'pino';

// pino's type declarations don't export a callable default in some versions;
// cast to any to call it, which is safe at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinoCreate = pino as any;

export const logger: pino.Logger = pinoCreate({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: process.env['NODE_ENV'] !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
