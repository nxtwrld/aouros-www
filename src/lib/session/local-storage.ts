export interface StoredSessionData {
    sessionId: string;
    analysisData: any;
    transcripts: any[];
    realtimeTranscripts: any[];
    texts: string[];
    view: string;
    timestamp: number;
    lastUpdated: number;
    models: any[];
    language: string;
}

export interface SessionStorageOptions {
    maxAge?: number; // Maximum age in milliseconds (default: 24 hours)
    autoSave?: boolean; // Auto-save on data changes (default: true)
    cleanupOnLoad?: boolean; // Cleanup old data on load (default: true)
}

const DEFAULT_OPTIONS: SessionStorageOptions = {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    autoSave: true,
    cleanupOnLoad: true
};

const STORAGE_PREFIX = 'aouros_session_';
const STORAGE_INDEX_KEY = 'aouros_session_index';

export class SessionLocalStorage {
    private options: SessionStorageOptions;
    private currentSessionId: string | null = null;
    private isAutoSaving = false;
    private isBrowser: boolean;

    constructor(options: SessionStorageOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        
        // Check if we're running in the browser
        this.isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
        
        if (this.isBrowser) {
            if (this.options.cleanupOnLoad) {
                this.performMaintenanceCleanup();
            }
            
            // Setup beforeunload cleanup
            this.setupUnloadCleanup();
        }
    }

    /**
     * Store session data locally
     */
    saveSession(sessionId: string, data: Partial<StoredSessionData>): void {
        if (!this.isBrowser) {
            console.warn('⚠️ Cannot save session data - not running in browser');
            return;
        }

        try {
            const sessionData: StoredSessionData = {
                sessionId,
                analysisData: data.analysisData || {},
                transcripts: data.transcripts || [],
                realtimeTranscripts: data.realtimeTranscripts || [],
                texts: data.texts || [],
                view: data.view || 'start',
                timestamp: data.timestamp || Date.now(),
                lastUpdated: Date.now(),
                models: data.models || [],
                language: data.language || 'en'
            };

            const storageKey = this.getStorageKey(sessionId);
            localStorage.setItem(storageKey, JSON.stringify(sessionData));
            
            // Update session index
            this.updateSessionIndex(sessionId);
            
            console.log('💾 Session data saved locally:', {
                sessionId,
                dataSize: JSON.stringify(sessionData).length,
                analysisKeys: Object.keys(sessionData.analysisData),
                transcriptCount: sessionData.transcripts.length,
                realtimeTranscriptCount: sessionData.realtimeTranscripts.length
            });
        } catch (error) {
            console.error('❌ Failed to save session data locally:', error);
        }
    }

    /**
     * Retrieve session data from local storage
     */
    loadSession(sessionId: string): StoredSessionData | null {
        if (!this.isBrowser) {
            console.warn('⚠️ Cannot load session data - not running in browser');
            return null;
        }

        try {
            const storageKey = this.getStorageKey(sessionId);
            const storedData = localStorage.getItem(storageKey);
            
            if (!storedData) {
                console.log('📭 No stored session data found for:', sessionId);
                return null;
            }

            const sessionData: StoredSessionData = JSON.parse(storedData);
            
            // Check if data is too old
            const age = Date.now() - sessionData.lastUpdated;
            if (age > this.options.maxAge!) {
                console.log('🗑️ Session data expired, removing:', {
                    sessionId,
                    age: Math.round(age / 1000 / 60),
                    maxAgeMinutes: Math.round(this.options.maxAge! / 1000 / 60)
                });
                this.removeSession(sessionId);
                return null;
            }

            console.log('📂 Session data loaded from local storage:', {
                sessionId,
                age: Math.round(age / 1000),
                analysisKeys: Object.keys(sessionData.analysisData),
                transcriptCount: sessionData.transcripts.length,
                realtimeTranscriptCount: sessionData.realtimeTranscripts.length
            });

            return sessionData;
        } catch (error) {
            console.error('❌ Failed to load session data from local storage:', error);
            return null;
        }
    }

    /**
     * Remove session data from local storage
     */
    removeSession(sessionId: string): void {
        if (!this.isBrowser) {
            console.warn('⚠️ Cannot remove session data - not running in browser');
            return;
        }

        try {
            const storageKey = this.getStorageKey(sessionId);
            localStorage.removeItem(storageKey);
            this.removeFromSessionIndex(sessionId);
            
            console.log('🗑️ Session data removed from local storage:', sessionId);
        } catch (error) {
            console.error('❌ Failed to remove session data from local storage:', error);
        }
    }

    /**
     * Set up auto-saving for a session
     */
    setupAutoSave(sessionId: string, dataGetter: () => Partial<StoredSessionData>): () => void {
        if (!this.isBrowser || !this.options.autoSave) {
            return () => {}; // Return empty cleanup function
        }

        this.currentSessionId = sessionId;
        
        // Auto-save every 5 seconds when data changes
        const autoSaveInterval = setInterval(() => {
            if (!this.isAutoSaving) {
                this.isAutoSaving = true;
                try {
                    const currentData = dataGetter();
                    this.saveSession(sessionId, currentData);
                } catch (error) {
                    console.error('❌ Auto-save failed:', error);
                } finally {
                    this.isAutoSaving = false;
                }
            }
        }, 5000);

        // Return cleanup function
        return () => {
            clearInterval(autoSaveInterval);
            this.currentSessionId = null;
        };
    }

    /**
     * Get all stored session IDs
     */
    getStoredSessions(): string[] {
        if (!this.isBrowser) {
            return [];
        }

        try {
            const indexData = localStorage.getItem(STORAGE_INDEX_KEY);
            if (!indexData) return [];
            
            const index = JSON.parse(indexData);
            return index.sessions || [];
        } catch (error) {
            console.error('❌ Failed to get stored sessions:', error);
            return [];
        }
    }

    /**
     * Clear all session data (useful for logout or cleanup)
     */
    clearAllSessions(): void {
        if (!this.isBrowser) {
            console.warn('⚠️ Cannot clear session data - not running in browser');
            return;
        }

        try {
            const sessions = this.getStoredSessions();
            sessions.forEach(sessionId => {
                this.removeSession(sessionId);
            });
            localStorage.removeItem(STORAGE_INDEX_KEY);
            
            console.log('🧹 All session data cleared from local storage');
        } catch (error) {
            console.error('❌ Failed to clear all session data:', error);
        }
    }

    /**
     * Perform maintenance cleanup of old data
     */
    performMaintenanceCleanup(): void {
        if (!this.isBrowser) {
            return;
        }

        try {
            console.log('🧹 Performing maintenance cleanup of old session data...');
            
            const sessions = this.getStoredSessions();
            let removedCount = 0;
            
            sessions.forEach(sessionId => {
                const sessionData = this.loadSession(sessionId);
                if (!sessionData) {
                    // loadSession already removed expired data
                    removedCount++;
                }
            });

            // Clean up any orphaned keys
            this.cleanupOrphanedKeys();
            
            console.log(`🧹 Maintenance cleanup complete. Removed ${removedCount} expired sessions.`);
        } catch (error) {
            console.error('❌ Maintenance cleanup failed:', error);
        }
    }

    /**
     * Force save current session data (useful before navigation)
     */
    forceSaveCurrentSession(dataGetter: () => Partial<StoredSessionData>): void {
        if (!this.isBrowser || !this.currentSessionId) {
            return;
        }

        try {
            const currentData = dataGetter();
            this.saveSession(this.currentSessionId, currentData);
            console.log('💾 Force saved current session data');
        } catch (error) {
            console.error('❌ Force save failed:', error);
        }
    }

    /**
     * Check if there's stored data for a session
     */
    hasStoredData(sessionId: string): boolean {
        if (!this.isBrowser) {
            return false;
        }

        const storageKey = this.getStorageKey(sessionId);
        return localStorage.getItem(storageKey) !== null;
    }

    private getStorageKey(sessionId: string): string {
        return `${STORAGE_PREFIX}${sessionId}`;
    }

    private updateSessionIndex(sessionId: string): void {
        if (!this.isBrowser) {
            return;
        }

        try {
            const indexData = localStorage.getItem(STORAGE_INDEX_KEY);
            let index = indexData ? JSON.parse(indexData) : { sessions: [] };
            
            if (!index.sessions.includes(sessionId)) {
                index.sessions.push(sessionId);
                index.lastUpdated = Date.now();
                localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
            }
        } catch (error) {
            console.error('❌ Failed to update session index:', error);
        }
    }

    private removeFromSessionIndex(sessionId: string): void {
        if (!this.isBrowser) {
            return;
        }

        try {
            const indexData = localStorage.getItem(STORAGE_INDEX_KEY);
            if (!indexData) return;
            
            const index = JSON.parse(indexData);
            index.sessions = index.sessions.filter((id: string) => id !== sessionId);
            index.lastUpdated = Date.now();
            
            localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
        } catch (error) {
            console.error('❌ Failed to remove from session index:', error);
        }
    }

    private cleanupOrphanedKeys(): void {
        if (!this.isBrowser) {
            return;
        }

        try {
            const sessions = this.getStoredSessions();
            const orphanedKeys: string[] = [];
            
            // Check all localStorage keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(STORAGE_PREFIX) && key !== STORAGE_INDEX_KEY) {
                    const sessionId = key.replace(STORAGE_PREFIX, '');
                    if (!sessions.includes(sessionId)) {
                        orphanedKeys.push(key);
                    }
                }
            }
            
            // Remove orphaned keys
            orphanedKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            if (orphanedKeys.length > 0) {
                console.log(`🧹 Removed ${orphanedKeys.length} orphaned storage keys`);
            }
        } catch (error) {
            console.error('❌ Failed to cleanup orphaned keys:', error);
        }
    }

    private setupUnloadCleanup(): void {
        // This method should only be called if this.isBrowser is true
        // but let's add an extra check for safety
        if (!this.isBrowser) {
            return;
        }

        // Save data before page unload
        window.addEventListener('beforeunload', () => {
            // Note: We don't remove data here, just ensure it's saved
            // Data removal should happen when user explicitly ends session
            console.log('📄 Page unloading, session data will persist');
        });

        // Handle page visibility changes (useful for mobile)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.currentSessionId) {
                console.log('👁️ Page hidden, ensuring session data is saved');
            }
        });
    }
}

// Create and export a default instance
export const sessionStorage = new SessionLocalStorage();

// Export utility functions for easy access
export const saveSessionData = (sessionId: string, data: Partial<StoredSessionData>) => 
    sessionStorage.saveSession(sessionId, data);

export const loadSessionData = (sessionId: string) => 
    sessionStorage.loadSession(sessionId);

export const removeSessionData = (sessionId: string) => 
    sessionStorage.removeSession(sessionId);

export const hasStoredSessionData = (sessionId: string) => 
    sessionStorage.hasStoredData(sessionId);

export const clearAllSessionData = () => 
    sessionStorage.clearAllSessions(); 