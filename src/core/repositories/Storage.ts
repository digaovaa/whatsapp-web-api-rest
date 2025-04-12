import { Bucket, Storage } from '@google-cloud/storage';
import path from 'path';
import logger from '../../utils/logger';

export type GoogleStorageResponse = {
    success: boolean;
    publicUrl?: string;
    fileInfo?: any;
    error?: string;
};

class GoogleStorageService {
    private readonly storage: Storage;
    private readonly bucketName: string;
    private readonly bucket: Bucket;

    constructor() {
        const serviceAccount = path.resolve(__dirname, 'service_account.json');
        this.storage = new Storage({keyFilename: serviceAccount});
        this.bucketName = "chatbot-ai-public";
        this.bucket = this.storage.bucket(this.bucketName);
    }

    async uploadFile(filePath: string, destinationPath: string | null = null): Promise<GoogleStorageResponse> {
        try {
            const destination = destinationPath || path.basename(filePath);

            const [file] = await this.bucket.upload(filePath, {
                destination: destination,
            });

            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${destination}`;

            logger.info('File uploaded successfully:', publicUrl);

            return {
                success: true,
                publicUrl,
                fileInfo: file.metadata
            };
        } catch (error) {
            if (error instanceof Error) {
                return {
                    success: false,
                    error: (error as Error).message
                };
            }

            return { success: false, error: 'Unknown error occurred' };
        }
    }

    async getFilePublicUrl(filename: string): Promise<GoogleStorageResponse> {
        try {
            const file = this.bucket.file(filename);
            const [exists] = await file.exists();

            if (!exists) {
                return {
                    success: false,
                    error: 'File does not exist'
                };
            }

            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filename}`;

            return {
                success: true,
                publicUrl
            };
        } catch (error) {
            console.error('Error getting file URL:', error);
            return {
                success: false,
                error: (error instanceof Error) ? error.message : 'Unknown error occurred'
            };
        }
    }

    async deleteFile(filename: string): Promise<GoogleStorageResponse> {
        try {
            const file = this.bucket.file(filename);
            const [exists] = await file.exists();

            if (!exists) {
                return {
                    success: false,
                    error: 'File does not exist'
                };
            }

            await file.delete();

            return { success: true };
        } catch (error) {
            console.error('Error deleting file:', error);
            return {
                success: false,
                error: (error instanceof Error) ? error.message : 'Unknown error occurred'
            };
        }
    }
}

export const storage = new GoogleStorageService();