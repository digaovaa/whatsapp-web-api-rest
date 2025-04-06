import dotenv from 'dotenv';
import app from './server';
import logger from './utils/logger';
import { sessionRestoreService } from './core/sessions/SessionRestoreService';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await sessionRestoreService.restoreAllSessions();
    
    app.listen(PORT, () => {
      logger.info(`WhatsApp API server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

void startServer();