/**
 * Database Management - REFACTORED
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
            this.db = new Dexie('FamilyTimelineDB');

            // Define schema versions in ascending order.
            // Version 1: Define the original schema.
            // If your app never had a v1 with the old 'entries' structure,
            // you could start with version(1) having the new schema.
            // However, if there's a possibility of upgrading from an older structure:
            this.db.version(1).stores({
                settings: 'id',
                kids: '++id, name, isActive',
                // Assuming v1 had the old entry structure (if it existed):
                entries: '++id, timestamp, *targetTimelines, encryptionInfo, data_iv_base64, encryptedContent_base64'
            });

            // Version 2: Defines the new schema for entries and how to upgrade from v1.
            this.db.version(2).stores({
                // settings and kids tables are carried over from v1 schema if not redefined.
                // We only need to define the schema for 'entries' as it's changing.
                entries: '++id, timestamp, targetTimeline, salt_base64, iv_base64, encryptedContent_base64'
            }).upgrade(tx => {
                // This function is called when a database with version < 2 is opened.
                console.log("Upgrading database from an older version to version 2...");
                // If migrating data is necessary, it would happen here.
                // For example, if 'entries' table existed with v1 schema:
                // Potentially: return tx.table('entries').clear(); // to remove old incompatible entries
                // Or, attempt a more complex data migration.
                // Since you mentioned "rebuilding the db", this upgrade path might be less
                // critical for your immediate testing if the DB is deleted, but it's essential for
                // existing users who would have a v1 database.
                console.log("Entries table schema is now: ++id, timestamp, targetTimeline, salt_base64, iv_base64, encryptedContent_base64");
            });

            // Higher versions would go here, e.g.:
            // this.db.version(3).stores({...}).upgrade(...);

            await this.db.open();
            this.initialized = true;
            const currentVersion = this.db.verno;
            console.log(`✅ Database initialized successfully. Effective database version: ${currentVersion}`);
            
            // Sanity check for the 'entries' table and its expected index
            if (this.db.entries && typeof this.db.entries.where === 'function') {
                console.log("✅ Sanity check: 'this.db.entries.where' is a function. Table object seems okay.");
            } else {
                console.error("❌ Sanity check failed: 'this.db.entries.where' is not a function. Schema issue likely persists.");
            }

        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            if (error.name === "SchemaError") {
                console.error("❌ Dexie SchemaError: Problem with versions/stores definition.", error.message, error.stack);
            } else if (error.name === "OpenFailedError") {
                console.error("❌ Dexie OpenFailedError: Database could not be opened.", error.message, error.stack);
            } else {
                console.error("❌ Other error during DB init:", error.message, error.stack);
            }
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    // Settings Management (getAppSettings, saveAppSettings) unchanged.
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

    // Kids Management (getKids, createKid, updateKidPassword, removeKid, getKid) unchanged.
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

    async createEntry(entryData) {
        try {
            this.ensureInitialized();
            const entry = {
                timestamp: new Date().toISOString(),
                targetTimeline: entryData.targetTimeline,
                encryptedContent_base64: entryData.encryptedContent_base64,
                salt_base64: entryData.salt_base64,
                iv_base64: entryData.iv_base64,
                createdAt: new Date().toISOString()
            };
            const entryId = await this.db.entries.add(entry);
            console.log(`📝 Entry created for timeline ${entryData.targetTimeline}: ID ${entryId}`);
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
            console.log(`📚 Loaded ${entries.length} entries from database (all timelines)`);
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
    
    async getEntriesForTimeline(timelineId, limit = 50) {
        try {
            this.ensureInitialized(); // This is where database.js:244 was mentioned in stack trace
            console.log(`Attempting to get entries for timeline: '${timelineId}'`);
            if (!this.db.entries) {
                console.error("`this.db.entries` is not defined or accessible. Schema issue?");
                throw new Error("Entries table is not available in the database.");
            }
            const entries = await this.db.entries
                .where('targetTimeline') // This requires 'targetTimeline' to be an index in the current schema
                .equals(timelineId) 
                .orderBy('timestamp')
                .reverse()
                .limit(limit)
                .toArray();
            console.log(`📚 Loaded ${entries.length} entries for timeline: ${timelineId}`);
            return entries;
        } catch (error) {
            console.error(`Failed to get entries for timeline ${timelineId}:`, error.name, error.message, error.stack);
            // Re-throw or handle as appropriate for your application's error flow
            throw error; 
        }
    }

    async deleteEntry(entryId) {
        try {
            this.ensureInitialized();
            await this.db.entries.delete(entryId);
            console.log(`🗑️ Entry deleted: ID ${entryId}`);
        } catch (error)
        {
            console.error('Failed to delete entry:', error);
            throw error;
        }
    }

    async searchEntries(query, currentTimelineId, passwordForTimeline, limit = 20) {
        console.warn("searchEntries needs review: Searching encrypted content is complex. This is a placeholder.");
        try {
            this.ensureInitialized();
             if (!currentTimelineId || !passwordForTimeline) {
                console.log("Search requires a timeline context and password to decrypt.");
                return [];
            }
            // Placeholder: actual search would require decryption and then filtering.
            return [];
        } catch (error) {
            console.error('Failed to search entries:', error);
            return [];
        }
    }

    async getStats() {
        try {
            this.ensureInitialized();
            const [totalEntries, totalKids] = await Promise.all([
                this.db.entries.count(),
                this.db.kids.where('isActive').equals(1).count()
            ]);
            const stats = { totalEntries, totalKids, dbSize: await this.estimateDbSize() };
            console.log('📊 Database stats:', stats);
            return stats;
        } catch (error) {
            console.error('Failed to get stats:', error);
            return { totalEntries: 0, totalKids: 0, dbSize: 0 };
        }
    }

    async exportData() {
        try {
            this.ensureInitialized();
            const [settings, kids, entries] = await Promise.all([
                this.db.settings.toArray(),
                this.db.kids.where('isActive').equals(1).toArray(),
                this.db.entries.toArray()
            ]);
            const exportData = {
                version: 2,
                exportedAt: new Date().toISOString(),
                settings,
                kids: kids.map(k => ({
                    ...k,
                    encryptedPassword_base64: k.encryptedPassword_base64,
                    salt_base64: k.salt_base64,
                    iv_base64: k.iv_base_64
                })),
                entries
            };
            console.log(`📦 Exported ${entries.length} entries and ${kids.length} kids (v2 format)`);
            return exportData;
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    async importData(data) {
        try {
            this.ensureInitialized();
            if (!data || (data.version !== 1 && data.version !== 2)) {
                throw new Error('Invalid or unsupported backup format. Expected v1 or v2.');
            }
            let importedSettingsCount = 0;
            let importedKidsCount = 0;
            let importedEntriesCount = 0;
            await this.db.transaction('rw', this.db.settings, this.db.kids, this.db.entries, async () => {
                if (data.settings) {
                    for (const setting of data.settings) {
                        await this.db.settings.put(setting);
                        importedSettingsCount++;
                    }
                }
                if (data.kids) {
                    for (const kid of data.kids) {
                        await this.db.kids.put({ ...kid, updatedAt: new Date().toISOString() });
                        importedKidsCount++;
                    }
                }
                if (data.entries) {
                    if (data.version === 2) {
                        for (const entry of data.entries) {
                            if (entry.salt_base64 && entry.iv_base64 && entry.targetTimeline) {
                                await this.db.entries.put(entry);
                                importedEntriesCount++;
                            } else {
                                console.warn("Skipping entry during import due to missing fields for v2 format:", entry.id || "Unknown ID");
                            }
                        }
                    } else if (data.version === 1) {
                        console.warn("Importing v1 entries. These may not be usable with the new crypto model.");
                    }
                }
            });
            console.log(`📥 Import complete: ${importedSettingsCount} settings, ${importedKidsCount} kids, ${importedEntriesCount} entries.`);
            return { settings: importedSettingsCount, kids: importedKidsCount, entries: importedEntriesCount };
        } catch (error) {
            console.error('Failed to import data:', error);
            throw error;
        }
    }

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
            if (!navigator.storage || !navigator.storage.estimate) return 0;
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
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const deletedKids = await this.db.kids
                .where('isActive').equals(0)
                .and(kid => new Date(kid.updatedAt) < thirtyDaysAgo)
                .toArray();
            for (const kid of deletedKids) {
                await this.db.kids.delete(kid.id);
            }
            console.log(`🗜️ Database compacted: removed ${deletedKids.length} old kid entries`);
            return deletedKids.length;
        } catch (error) {
            console.error('Failed to compact database:', error);
            return 0;
        }
    }

    ensureInitialized() {
        if (!this.initialized || !this.db) {
            console.error("ensureInitialized check failed: initialized =", this.initialized, ", db exists =", !!this.db);
            throw new Error('Database not initialized. Call init() first.');
        }
    }

    async isHealthy() {
        try {
            this.ensureInitialized();
            await this.db.entries.count();
            return true;
        } catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }

    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initialized = false;
            console.log('🔒 Database connection closed');
        }
    }
}