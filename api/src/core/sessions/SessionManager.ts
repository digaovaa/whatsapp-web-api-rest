import { ActiveSession, SessionInfo, SessionStatus } from '../types';
import { EventEmitter } from '../events/EventEmitter';
import { SessionFactory } from './SessionFactory';
import NodeCache from 'node-cache';
import logger from '../../utils/logger';


export class SessionManager {
  private static instance: SessionManager;
  private sessions: NodeCache;
  private sessionFactory: SessionFactory;

  private constructor() {
    this.sessions = new NodeCache({
      checkperiod: 300,
      useClones: false
    });
    
    this.sessionFactory = new SessionFactory();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public async startSession(userId: string, sessionId: string): Promise<SessionInfo> {
    try {
      const sessionInfo: SessionInfo = {
        id: sessionId,
        userId,
        status: SessionStatus.STARTING,
        createdAt: new Date(),
        lastUsed: new Date()
      };

      const socket = await this.sessionFactory.createSession(sessionInfo, (qrCode) => {
        sessionInfo.qr = qrCode;
        sessionInfo.status = SessionStatus.SCANNING_QR;
        
        EventEmitter.emitQR({
          sessionId,
          qr: qrCode
        });
        
        EventEmitter.emitSessionUpdate({
          sessionId,
          status: SessionStatus.SCANNING_QR
        });
      });

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

  public getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get<ActiveSession>(sessionId);
  }

  public getSessionInfo(sessionId: string): SessionInfo | undefined {
    const session = this.getSession(sessionId);
    return session?.info;
  }

  public getAllSessions(): ActiveSession[] {
    return Object.values(this.sessions.mget<ActiveSession>(this.sessions.keys()));
  }

  public getUserSessions(userId: string): ActiveSession[] {
    return this.getAllSessions().filter(session => session.info.userId === userId);
  }

  public async stopSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.getSession(sessionId);
      if (!session) {
        return false;
      }

      this.sessions.del(sessionId);
      session.socket.end(new Error('Session stopped by user'));
      await this.sessionFactory.removeSession(sessionId);
      
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

  public updateSessionStatus(sessionId: string, status: SessionStatus): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.info.status = status;
      session.info.lastUsed = new Date();
      
      EventEmitter.emitSessionUpdate({
        sessionId,
        status
      });
    }
  }

  public getSessionQR(sessionId: string): string | null | undefined {
    return this.getSessionInfo(sessionId)?.qr;
  }

  public sessionExists(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}

export const sessionManager = SessionManager.getInstance();
