import logger from '../utils/logger';
import { messagesRepository } from '../core/repositories/MessagesRepository';

class MessageCleanupService {
  private static instance: MessageCleanupService;
  private timer: NodeJS.Timeout | null = null;

  static getInstance(): MessageCleanupService {
    if (!MessageCleanupService.instance) {
      MessageCleanupService.instance = new MessageCleanupService();
    }
    return MessageCleanupService.instance;
  }

  start(): void {
    if (this.timer) return;
    // roda uma vez por dia
    this.timer = setInterval(() => {
      void this.cleanup();
    }, 24 * 60 * 60 * 1000);

    // primeira execução após 30s do start
    setTimeout(() => { void this.cleanup(); }, 30_000);
  }

  async cleanup(): Promise<void> {
    try {
      const deleted = await messagesRepository.deleteOlderThan(15);
      if (deleted > 0) {
        logger.info({ deleted }, 'MessageCleanup: mensagens antigas removidas');
      }
    } catch (error) {
      logger.error({ error }, 'MessageCleanup: falha ao remover mensagens antigas');
    }
  }
}

export const messageCleanupService = MessageCleanupService.getInstance();


