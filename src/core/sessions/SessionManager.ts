import { ActiveSession, SessionInfo, SessionStatus } from '../types';
import { EventEmitter } from '../events/EventEmitter';
import { SessionFactory } from './SessionFactory';
import NodeCache from 'node-cache';
import logger from '../../utils/logger';

/**
 * Manages WhatsApp sessions
 */
export class SessionManager {
  // Singleton instance
  private static instance: SessionManager;
  
  // Cache for active sessions
  private sessions: NodeCache;
  
  // Session factory for creating new sessions
  private sessionFactory: SessionFactory;

  private constructor() {
    this.sessions = new NodeCache({
      checkperiod: 300,
      useClones: false
    });
    
    this.sessionFactory = new SessionFactory();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Start a new session
   */
  public async startSession(userId: string, sessionId: string): Promise<SessionInfo> {
    try {
      // Create session info with initial status
      const sessionInfo: SessionInfo = {
        id: sessionId,
        userId,
        status: SessionStatus.STARTING,
        createdAt: new Date(),
        lastUsed: new Date()
      };

      // Create a new session
      const socket = await this.sessionFactory.createSession(sessionId, (qrCode) => {
        // Handle QR code updates
        sessionInfo.qr = qrCode;
        sessionInfo.status = SessionStatus.SCANNING_QR;
        
        // Emit QR update event
        EventEmitter.emitQR({
          sessionId,
          qr: qrCode
        });
        
        // Emit session status update
        EventEmitter.emitSessionUpdate({
          sessionId,
          status: SessionStatus.SCANNING_QR
        });
      });

      // Store the active session
      const activeSession: ActiveSession = {
        socket,
        info: sessionInfo
      };
      
      this.sessions.set(sessionId, activeSession);
      
      return sessionInfo;
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to start session');
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get<ActiveSession>(sessionId);
  }

  /**
   * Get session info by ID
   */
  public getSessionInfo(sessionId: string): SessionInfo | undefined {
    const session = this.getSession(sessionId);
    return session?.info;
  }

  /**
   * Get all sessions
   */
  public getAllSessions(): ActiveSession[] {
    return Object.values(this.sessions.mget<ActiveSession>(this.sessions.keys()));
  }

  /**
   * Get all sessions for a specific user
   */
  public getUserSessions(userId: string): ActiveSession[] {
    return this.getAllSessions().filter(session => session.info.userId === userId);
  }

  /**
   * Stop and remove a session
   */
  public async stopSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.getSession(sessionId);
      if (!session) {
        return false;
      }

      // Remove the session from memory
      this.sessions.del(sessionId);
      
      // Close the WhatsApp connection
      session.socket.end(new Error('Session stopped by user'));
      
      // Delete the session from database
      await this.sessionFactory.removeSession(sessionId);
      
      // Emit session stopped event
      EventEmitter.emitSessionUpdate({
        sessionId,
        status: SessionStatus.STOPPED
      });
      
      return true;
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to stop session');
      return false;
    }
  }

  /**
   * Update session status
   */
  public updateSessionStatus(sessionId: string, status: SessionStatus): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.info.status = status;
      session.info.lastUsed = new Date();
      
      // Emit session update event
      EventEmitter.emitSessionUpdate({
        sessionId,
        status
      });
    }
  }

  /**
   * Get current QR code for a session
   */
  public getSessionQR(sessionId: string): string | null | undefined {
    return this.getSessionInfo(sessionId)?.qr;
  }
  
  /**
   * Check if a session exists
   */
  public sessionExists(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}

export const sessionManager = SessionManager.getInstance();
