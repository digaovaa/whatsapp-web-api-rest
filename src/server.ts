import express from 'express';
import cors from 'cors';
import routes from './routes';
import logger from './utils/logger';
import { NODE_ENV } from './config/env';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip
  }, 'Incoming request');
  next();
});

app.use(routes);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err, method: req.method, url: req.url }, 'Error processing request');
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: NODE_ENV === 'production' ? undefined : err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

export default app;
