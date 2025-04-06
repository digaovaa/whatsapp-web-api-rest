import fs from 'fs/promises';
import path from 'path';
import { StorageProvider } from '../../types';

/**
 * Simple file system storage implementation
 */
export class FileSystemStorage implements StorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Make sure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    const fullPath = path.join(this.basePath, dirPath);
    try {
      await fs.access(fullPath);
    } catch (error) {
      await fs.mkdir(fullPath, { recursive: true });
    }
  }

  /**
   * Read data from file
   */
  async read(filePath: string): Promise<any> {
    const fullPath = path.join(this.basePath, filePath);
    try {
      const data = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Write data to file
   */
  async write(filePath: string, data: any): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    const dirPath = path.dirname(fullPath);
    
    // Ensure directory exists
    await this.ensureDirectory(path.relative(this.basePath, dirPath));
    
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Check if file exists
   */
  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file or directory
   */
  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * List files in directory
   */
  async list(dirPath: string): Promise<string[]> {
    const fullPath = path.join(this.basePath, dirPath);
    try {
      return await fs.readdir(fullPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}
