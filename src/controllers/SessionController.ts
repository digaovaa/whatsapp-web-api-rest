import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sessionManager } from '../core/sessions/SessionManager';
import { SessionStatus } from '../core/types';
import logger from '../utils/logger';

/**
 * Controller for managing WhatsApp sessions
 */
export class SessionController {
  /**
   * Create a new WhatsApp session
   */
  public async createSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.body.userId || 'anonymous';
      
      // Generate a unique session ID if not provided
      const sessionId = req.body.sessionId || `session_${uuidv4()}`;
      
      // Check if session already exists
      if (sessionManager.sessionExists(sessionId)) {
        res.status(409).json({
          success: false,
          message: 'Session already exists',
          sessionId
        });
        return;
      }
      
      // Start the session
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

  /**
   * Get session info
   */
  public getSession(req: Request, res: Response): void {
    try {
      const { sessionId } = req.params;
      
      // Get session info
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

  /**
   * Get QR code for a session
   */
  public getSessionQR(req: Request, res: Response): void {
    try {
      const { sessionId } = req.params;
      
      // Get session QR code
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

  /**
   * List all sessions for a user
   */
  public listUserSessions(req: Request, res: Response): void {
    try {
      const { userId } = req.params;
      
      // Get all sessions for the user
      const sessions = sessionManager.getUserSessions(userId);
      
      // Map to session info only (exclude socket)
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

  /**
   * Stop and remove a session
   */
  public async stopSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      // Stop the session
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

  /**
   * List all active sessions (admin only)
   */
  public listAllSessions(req: Request, res: Response): void {
    try {
      // Get all sessions
      const sessions = sessionManager.getAllSessions();
      
      // Map to session info only (exclude socket)
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

// Export controller instance
export const sessionController = new SessionController();
