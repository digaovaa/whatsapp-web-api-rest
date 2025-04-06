import { BaileysClass } from './BaileysClass';
import { StorageProvider, SessionData } from '../types';
import path from 'path';
import pino from 'pino';

const logger = pino({ level: 'info' });

/**
 * Manager for multiple Baileys instances
 */
export class BaileysManager {
  private instances: Map<string, BaileysClass> = new Map();
  private storage: StorageProvider;
  private readonly sessionsPath = 'sessions';
  private readonly sessionsFile = 'sessions.json';

  constructor(storage: StorageProvider) {
    this.storage = storage;
  }

  /**
   * Initialize the manager and restore any saved sessions
   */
  public async initialize(): Promise<string[]> {
    const restoredSessions: string[] = [];
    
    try {
      // Check if sessions file exists
      const exists = await this.storage.exists(path.join(this.sessionsPath, this.sessionsFile));
      
      if (!exists) {
        await this.storage.write(path.join(this.sessionsPath, this.sessionsFile), []);
        return restoredSessions;
      }
      
      // Read sessions file
      const sessions = await this.storage.read(path.join(this.sessionsPath, this.sessionsFile)) || [];
      
      // Restore each session
      for (const session of sessions) {
        try {
          await this.restoreSession(session);
          restoredSessions.push(session.key);
        } catch (error) {
          logger.error({ error }, `Failed to restore session ${session.key}`);
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to initialize BaileysManager');
    }
    
    return restoredSessions;
  }
  
  /**
   * Create a new session
   */
  public async createSession(sessionData: Omit<SessionData, 'createdAt' | 'updatedAt'>): Promise<BaileysClass> {
    // Check if session exists
    if (this.instances.has(sessionData.key)) {
      throw new Error(`Session ${sessionData.key} already exists`);
    }
    
    // Create full session data
    const fullSessionData: SessionData = {
      ...sessionData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create the instance
    await this.createBaileysInstance(fullSessionData);
    
    // Save the session data
    await this.saveSession(fullSessionData);
    
    return this.instances.get(sessionData.key)!;
  }
  
  /**
   * Get a session
   */
  public getSession(key: string): BaileysClass | undefined {
    return this.instances.get(key);
  }
  
  /**
   * Delete a session
   */
  public async deleteSession(key: string): Promise<boolean> {
    try {
      const instance = this.instances.get(key);
      
      if (!instance) {
        return false;
      }
      
      // Remove the instance
      this.instances.delete(key);
      
      // Delete the session data
      const sessions = await this.getSessionList();
      const filteredSessions = sessions.filter(session => session.key !== key);
      await this.storage.write(path.join(this.sessionsPath, this.sessionsFile), filteredSessions);
      
      // Delete the session directory
      await this.storage.delete(path.join(this.sessionsPath, key));
      
      return true;
    } catch (error) {
      logger.error({ error }, `Failed to delete session ${key}`);
      return false;
    }
  }
  
  /**
   * List all sessions
   */
  public async getSessions(): Promise<SessionData[]> {
    try {
      return await this.getSessionList();
    } catch (error) {
      logger.error({ error }, 'Failed to get sessions');
      return [];
    }
  }
  
  /**
   * Private helper to create a Baileys instance
   */
  private async createBaileysInstance(sessionData: SessionData): Promise<BaileysClass> {
    const instance = new BaileysClass({
      name: sessionData.key,
      dir: path.join(this.sessionsPath, '/'),
    });
    
    await instance.initBailey();
    
    this.instances.set(sessionData.key, instance);
    return instance;
  }
  
  /**
   * Restore a session
   */
  private async restoreSession(sessionData: SessionData): Promise<void> {
    await this.createBaileysInstance(sessionData);
  }
  
  /**
   * Save session data
   */
  private async saveSession(sessionData: SessionData): Promise<void> {
    try {
      const sessions = await this.getSessionList();
      
      // Check if session already exists
      const index = sessions.findIndex(session => session.key === sessionData.key);
      
      if (index !== -1) {
        // Update existing session
        sessions[index] = {
          ...sessionData,
          updatedAt: new Date()
        };
      } else {
        // Add new session
        sessions.push(sessionData);
      }
      
      // Save to storage
      await this.storage.write(path.join(this.sessionsPath, this.sessionsFile), sessions);
    } catch (error) {
      logger.error({ error }, `Failed to save session ${sessionData.key}`);
      throw error;
    }
  }
  
  /**
   * Get list of sessions
   */
  private async getSessionList(): Promise<SessionData[]> {
    return await this.storage.read(path.join(this.sessionsPath, this.sessionsFile)) || [];
  }
}
