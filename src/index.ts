import dotenv from 'dotenv';
import app from './server';
import logger from './utils/logger';
import {sessionRestoreService} from './core/sessions/SessionRestoreService';
import "./services/WebhookService";

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await sessionRestoreService.restoreAllSessions();

        app.listen(PORT, () => {
            logger.info(`WhatsApp API server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error({error}, 'Failed to start server');
        process.exit(1);
    }
};

void startServer();

process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
    // Optionally, gracefully shut down or restart
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
});