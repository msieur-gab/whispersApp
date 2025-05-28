/**
 * Database Management
 * Handles all IndexedDB operations using Dexie
 */

export class DatabaseManager {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    async init() {
        try {
            console.log('🗃️ Initializing database...');
            
            // Initialize Dexie database
            this.db = new Dexie('FamilyTimelineDB');
            
            // Define schema
            this.db.version(1).stores({
                settings: 'id', // App settings
                kids: '++id, name, isActive', // Kid profiles with encrypted passwords
                entries: '++id, timestamp, *targetTimelines' // Timeline entries
            });

            // Open database
            await this.db.open();
            
            this.initialized = true;
            console.log('✅ Database initialized successfully');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    // Settings Management
    async getAppSettings() {
        try {
            this.ensureInitialized();
            const settings = await this.db.settings.get('app');
            return settings ? settings.data : null;
        } catch (error) {
            console.error('Failed to get app settings:', error);
            return null;
        }
    }

    async saveAppSettings(settings) {
        try {
            this.ensureInitialized();
            await this.db.settings.put({
                id: 'app',
                data: settings,
                updatedAt: new Date().toISOString()
            });
            console.log('💾 App settings saved');
        } catch (error) {
            console.error('Failed to save app settings:', error);
            throw error;
        }
    }

    // Kids Management
    async getKids() {
        try {
            this.ensureInitialized();
            const kids = await this.db.kids
                .where('isActive')
                .equals(1)
                .toArray();
            
            console.log(`📚 Loaded ${kids.length} kids from database`);
            return kids;
        } catch (error) {
            console.error('Failed to get kids:', error);
            return [];
        }
    }

    async createKid(kidData) {
        try {
            this.ensureInitialized();
            
            const kid = {
                name: kidData.name,
                isActive: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // Encrypted password data
                encryptedPassword_base64: kidData.encryptedPassword_base64,
                salt_base64: kidData.salt_base64,
                iv_base64: kidData.iv_base64
            };

            const kidId = await this.db.kids.add(kid);
            console.log(`👶 Kid created: ${kidData.name} (ID: ${kidId})`);
            return kidId;
        } catch (error) {
            console.error('Failed to create kid:', error);
            throw error;
        }
    }

    async updateKidPassword(kidId, encryptedData) {
        try {
            this.ensureInitialized();
            
            await this.db.kids.update(kidId, {
                ...encryptedData,
                updatedAt: new Date().toISOString()
            });
            
            console.log(`🔑 Kid password updated: ID ${kidId}`);
        } catch (error) {
            console.error('Failed to update kid password:', error);
            throw error;
        }
    }

    async removeKid(kidId) {
        try {
            this.ensureInitialized();
            
            // Soft delete - mark as inactive
            await this.db.kids.update(kidId, {
                isActive: 0,
                updatedAt: new Date().toISOString()
            });
            
            console.log(`🗑️ Kid removed: ID ${kidId}`);
        } catch (error) {
            console.error('Failed to remove kid:', error);
            throw error;
        }
    }

    async getKid(kidId) {
        try {
            this.ensureInitialized();
            const kid = await this.db.kids.get(kidId);
            return kid && kid.isActive ? kid : null;
        } catch (error) {
            console.error('Failed to get kid:', error);
            return null;
        }
    }

    // Entries Management
    async createEntry(entryData) {
        try {
            this.ensureInitialized();
            
            const entry = {
                timestamp: new Date().toISOString(),
                targetTimelines: entryData.targets || [],
                encryptedContent_base64: entryData.encryptedContent_base64,
                data_iv_base64: entryData.data_iv_base64,
                encryptionInfo: entryData.encryptionInfo,
                createdAt: new Date().toISOString()
            };

            const entryId = await this.db.entries.add(entry);
            console.log(`📝 Entry created: ID ${entryId}`);
            return entryId;
        } catch (error) {
            console.error('Failed to create entry:', error);
            throw error;
        }
    }

    async getEntries(limit = 100) {
        try {
            this.ensureInitialized();
            const entries = await this.db.entries
                .orderBy('timestamp')
                .reverse()
                .limit(limit)
                .toArray();
            
            console.log(`📚 Loaded ${entries.length} entries from database`);
            return entries;
        } catch (error) {
            console.error('Failed to get entries:', error);
            return [];
        }
    }

    async getEntry(entryId) {
        try {
            this.ensureInitialized();
            const entry = await this.db.entries.get(entryId);
            return entry || null;
        } catch (error) {
            console.error('Failed to get entry:', error);
            return null;
        }
    }

    async getEntriesForTimeline(timeline, limit = 50) {
        try {
            this.ensureInitialized();
            const entries = await this.db.entries
                .where('targetTimelines')
                .anyOf([timeline])
                .reverse()
                .limit(limit)
                .toArray();
            
            console.log(`📚 Loaded ${entries.length} entries for timeline: ${timeline}`);
            return entries;
        } catch (error) {
            console.error('Failed to get entries for timeline:', error);
            return [];
        }
    }

    async deleteEntry(entryId) {
        try {
            this.ensureInitialized();
            await this.db.entries.delete(entryId);
            console.log(`🗑️ Entry deleted: ID ${entryId}`);
        } catch (error) {
            console.error('Failed to delete entry:', error);
            throw error;
        }
    }

    // Search functionality
    async searchEntries(query, limit = 20) {
        try {
            this.ensureInitialized();
            
            // Note: This is a simple search. For encrypted content, 
            // we'd need to decrypt and search, which is complex.
            // For now, we search by timestamp and target timelines
            const entries = await this.db.entries
                .orderBy('timestamp')
                .reverse()
                .limit(limit * 2) // Get more to filter
                .toArray();
            
            // Filter by query (basic implementation)
            const filtered = entries.filter(entry => {
                const searchableText = `${entry.timestamp} ${entry.targetTimelines.join(' ')}`;
                return searchableText.toLowerCase().includes(query.toLowerCase());
            }).slice(0, limit);
            
            console.log(`🔍 Search "${query}" returned ${filtered.length} results`);
            return filtered;
        } catch (error) {
            console.error('Failed to search entries:', error);
            return [];
        }
    }

    // Statistics
    async getStats() {
        try {
            this.ensureInitialized();
            
            const [totalEntries, totalKids] = await Promise.all([
                this.db.entries.count(),
                this.db.kids.where('isActive').equals(1).count()
            ]);
            
            const stats = {
                totalEntries,
                totalKids,
                dbSize: await this.estimateDbSize()
            };
            
            console.log('📊 Database stats:', stats);
            return stats;
        } catch (error) {
            console.error('Failed to get stats:', error);
            return { totalEntries: 0, totalKids: 0, dbSize: 0 };
        }
    }

    // Backup and Restore
    async exportData() {
        try {
            this.ensureInitialized();
            
            const [settings, kids, entries] = await Promise.all([
                this.db.settings.toArray(),
                this.db.kids.where('isActive').equals(1).toArray(),
                this.db.entries.toArray()
            ]);
            
            const exportData = {
                version: 1,
                exportedAt: new Date().toISOString(),
                settings,
                kids: kids.map(k => ({
                    ...k,
                    // Include encrypted password data for backup
                    encryptedPassword_base64: k.encryptedPassword_base64,
                    salt_base64: k.salt_base64,
                    iv_base64: k.iv_base64
                })),
                entries
            };
            
            console.log(`📦 Exported ${entries.length} entries and ${kids.length} kids`);
            return exportData;
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    async importData(data) {
        try {
            this.ensureInitialized();
            
            if (!data || data.version !== 1) {
                throw new Error('Invalid or unsupported backup format');
            }
            
            let importedCount = 0;
            
            // Import settings
            if (data.settings) {
                for (const setting of data.settings) {
                    await this.db.settings.put(setting);
                }
            }
            
            // Import kids
            if (data.kids) {
                for (const kid of data.kids) {
                    await this.db.kids.put({
                        ...kid,
                        updatedAt: new Date().toISOString()
                    });
                }
                importedCount += data.kids.length;
            }
            
            // Import entries
            if (data.entries) {
                for (const entry of data.entries) {
                    await this.db.entries.put(entry);
                }
                importedCount += data.entries.length;
            }
            
            console.log(`📥 Imported ${importedCount} items from backup`);
            return importedCount;
        } catch (error) {
            console.error('Failed to import data:', error);
            throw error;
        }
    }

    // Maintenance
    async clearAllData() {
        try {
            this.ensureInitialized();
            
            await Promise.all([
                this.db.settings.clear(),
                this.db.kids.clear(),
                this.db.entries.clear()
            ]);
            
            console.log('🧹 All data cleared from database');
        } catch (error) {
            console.error('Failed to clear data:', error);
            throw error;
        }
    }

    async estimateDbSize() {
        try {
            if (!navigator.storage || !navigator.storage.estimate) {
                return 0;
            }
            
            const estimate = await navigator.storage.estimate();
            return estimate.usage || 0;
        } catch (error) {
            console.error('Failed to estimate database size:', error);
            return 0;
        }
    }

    async compactDatabase() {
        try {
            this.ensureInitialized();
            
            // Remove soft-deleted kids older than 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const deletedKids = await this.db.kids
                .where('isActive')
                .equals(0)
                .and(kid => new Date(kid.updatedAt) < thirtyDaysAgo)
                .toArray();
            
            for (const kid of deletedKids) {
                await this.db.kids.delete(kid.id);
            }
            
            console.log(`🗜️ Database compacted: removed ${deletedKids.length} old entries`);
            return deletedKids.length;
        } catch (error) {
            console.error('Failed to compact database:', error);
            return 0;
        }
    }

    // Utility methods
    ensureInitialized() {
        if (!this.initialized || !this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
    }

    async isHealthy() {
        try {
            this.ensureInitialized();
            // Simple health check - try to count entries
            await this.db.entries.count();
            return true;
        } catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }

    // Close database connection
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initialized = false;
            console.log('🔒 Database connection closed');
        }
    }
}