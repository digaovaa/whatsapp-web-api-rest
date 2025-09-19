import { Request, Response } from 'express';

let currentWebhookURL: string | null = null;

export class WebhookController {
  public get(_req: Request, res: Response): void {
    res.json({ success: true, data: { WebhookURL: currentWebhookURL } });
  }

  public update(req: Request, res: Response): void {
    const { WebhookURL } = req.body || {};
    if (!WebhookURL) {
      res.status(400).json({ success: false, message: 'Campo obrigatório: WebhookURL' });
      return;
    }
    currentWebhookURL = WebhookURL;
    res.json({ success: true, message: 'Webhook atualizado' });
  }
}

export const webhookController = new WebhookController();


