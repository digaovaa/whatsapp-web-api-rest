import app from './server';
import logger from './utils/logger';
import {sessionRestoreService} from './core/sessions/SessionRestoreService';
import "./services/WebhookService";
import { port } from './config/env';
import { initializeDatabase } from './core/database/init';

const startServer = async () => {
    try {
        await initializeDatabase();
        await sessionRestoreService.restoreAllSessions();

        app.listen(port, () => {
            logger.info(`WhatsApp API server running on port ${port}`);
        });
        
    } catch (error) {
        logger.error({error}, 'Failed to start server');
        process.exit(1);
    }
};

startServer();

process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
});