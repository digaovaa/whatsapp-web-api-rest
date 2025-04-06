import {Request, Response} from 'express';
import {v4 as uuidv4} from 'uuid';
import {sessionManager} from '../core/sessions/SessionManager';
import logger from '../utils/logger';

export class SessionController {
  public async createSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.body.userId || 'anonymous';
      const sessionId = req.body.sessionId || `session_${uuidv4()}`;

      if (sessionManager.sessionExists(sessionId)) {
        res.status(409).json({
          success: false,
          message: 'Session already exists',
          sessionId
        });
        return;
      }
      
      const sessionInfo = await sessionManager.startSession(userId, sessionId);
      
      res.status(201).json({
        success: true,
        message: 'Session created successfully',
        data: sessionInfo
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create session');
      res.status(500).json({
        success: false,
        message: 'Failed to create session',
        error: (error as Error).message
      });
    }
  }

  public getSession(req: Request, res: Response): void {
    try {
      const { sessionId } = req.params;
      const sessionInfo = sessionManager.getSessionInfo(sessionId);
      
      if (!sessionInfo) {
        res.status(404).json({
          success: false,
          message: 'Session not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: sessionInfo
      });
    } catch (error) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to get session');
      res.status(500).json({
        success: false,
        message: 'Failed to get session',
        error: (error as Error).message
      });
    }
  }

  public getSessionQR(req: Request, res: Response): void {
    try {
      const { sessionId } = req.params;
      const qrCode = sessionManager.getSessionQR(sessionId);
      
      if (!qrCode) {
        res.status(404).json({
          success: false,
          message: 'QR code not available for this session'
        });
        return;
      }
      
      res.json({
        success: true,
        data: {
          sessionId,
          qrCode
        }
      });
    } catch (error) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to get QR code');
      res.status(500).json({
        success: false,
        message: 'Failed to get QR code',
        error: (error as Error).message
      });
    }
  }

  public listUserSessions(req: Request, res: Response): void {
    try {
      const { userId } = req.params;
      const sessions = sessionManager.getUserSessions(userId);
      const sessionInfoList = sessions.map(session => session.info);
      
      res.json({
        success: true,
        data: sessionInfoList
      });
    } catch (error) {
      logger.error({ error, userId: req.params.userId }, 'Failed to list user sessions');
      res.status(500).json({
        success: false,
        message: 'Failed to list sessions',
        error: (error as Error).message
      });
    }
  }

  public async stopSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const success = await sessionManager.stopSession(sessionId);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Session not found or already stopped'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Session stopped successfully'
      });
    } catch (error) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to stop session');
      res.status(500).json({
        success: false,
        message: 'Failed to stop session',
        error: (error as Error).message
      });
    }
  }

  public listAllSessions(req: Request, res: Response): void {
    try {
      const sessions = sessionManager.getAllSessions();
      const sessionInfoList = sessions.map(session => session.info);
      
      res.json({
        success: true,
        data: sessionInfoList
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list all sessions');
      res.status(500).json({
        success: false,
        message: 'Failed to list all sessions',
        error: (error as Error).message
      });
    }
  }
}

export const sessionController = new SessionController();
