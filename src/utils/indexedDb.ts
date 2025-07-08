/**
 * IndexedDB utility for persisting media files
 * Handles storage, retrieval, and deletion of captured photos and videos
 */

export interface StoredMediaData {
  id: string;
  type: 'photo' | 'video';
  blob: Blob;
  timestamp: number;
  filename: string;
  geminiAnalysis?: {
    result: string;
    prompt: string;
    timestamp: number;
    isProcessing?: boolean;
    error?: string;
  };
}

export class MediaDatabase {
  private dbName = 'CameraAppMedia';
  private dbVersion = 1;
  private storeName = 'media';
  private db: IDBDatabase | null = null;

  /**
   * Initialize and open the IndexedDB database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id',
            autoIncrement: false 
          });
          
          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          
          console.log('IndexedDB object store created');
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  /**
   * Store media data in IndexedDB
   */
  async storeMedia(mediaData: StoredMediaData): Promise<string> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.put(mediaData);
      
      request.onsuccess = () => {
        console.log('Media stored in IndexedDB:', mediaData.id);
        resolve(mediaData.id);
      };
      
      request.onerror = () => {
        console.error('Failed to store media in IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Retrieve all stored media from IndexedDB
   */
  async getAllMedia(): Promise<StoredMediaData[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const media = request.result as StoredMediaData[];
        console.log(`Retrieved ${media.length} media items from IndexedDB`);
        resolve(media);
      };
      
      request.onerror = () => {
        console.error('Failed to retrieve media from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete specific media item from IndexedDB
   */
  async deleteMedia(id: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('Media deleted from IndexedDB:', id);
        resolve();
      };
      
      request.onerror = () => {
        console.error('Failed to delete media from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all media from IndexedDB
   */
  async clearAllMedia(): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('All media cleared from IndexedDB');
        resolve();
      };
      
      request.onerror = () => {
        console.error('Failed to clear media from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{ count: number; estimatedSize: number }> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const countRequest = store.count();
      const getAllRequest = store.getAll();
      
      let count = 0;
      let estimatedSize = 0;
      
      countRequest.onsuccess = () => {
        count = countRequest.result;
      };
      
      getAllRequest.onsuccess = () => {
        const allMedia = getAllRequest.result as StoredMediaData[];
        estimatedSize = allMedia.reduce((total, media) => total + media.blob.size, 0);
        
        console.log(`Storage stats: ${count} items, ~${(estimatedSize / 1024 / 1024).toFixed(2)}MB`);
        resolve({ count, estimatedSize });
      };
      
      getAllRequest.onerror = () => {
        reject(getAllRequest.error);
      };
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('IndexedDB connection closed');
    }
  }
}

// Create singleton instance
export const mediaDatabase = new MediaDatabase();

// Initialize database when module loads
mediaDatabase.init().catch(error => {
  console.error('Failed to initialize media database:', error);
});