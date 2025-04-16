import pino from 'pino';
import { logLevel } from '../config/env';

const logger = pino({
  level: logLevel || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

export default logger;
