import express from 'express';
import cors from 'cors';
import routes from './routes';
import logger from './utils/logger';
import { NODE_ENV } from './config/env';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';
import fs from 'fs';

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

// Swagger OpenAPI
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp API',
      version: '1.0.0',
    },
    servers: [
      { url: '/' }
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ],
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve painel web (SPA) em /admin a partir de web/dist (pasta web no root do repo)
const adminDistCandidates = [
  path.resolve(__dirname, '..', 'web', 'dist'),
  path.resolve(__dirname, '..', '..', 'web', 'dist')
];
const adminDist = adminDistCandidates.find((p) => fs.existsSync(p)) || adminDistCandidates[0];
const adminIndex = path.join(adminDist, 'index.html');
// servir assets do Vite
app.use('/assets', express.static(path.join(adminDist, 'assets')));
app.use('/admin/assets', express.static(path.join(adminDist, 'assets')));

app.use('/admin', express.static(adminDist));
// Fallback SPA usando regex (compatível com Express 5, sem path-to-regexp tokens)
app.get(/^\/admin(\/.*)?$/, (req, res) => {
  if (!fs.existsSync(adminIndex)) {
    return res.status(503).json({
      success: false,
      message: 'Admin UI indisponível: build ausente. Rode: npm --prefix web install && npm --prefix web run build'
    });
  }
  return res.sendFile(adminIndex);
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err, method: req.method, url: req.url }, 'Error processing request');
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

export default app;
