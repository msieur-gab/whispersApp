/**
 * Enhanced Database Management - Added Custom Timestamp Support
 * Handles all IndexedDB operations using Dexie
 */

export class DatabaseManager {
    constructor(cryptoManager) {
        this.db = null;
        this.initialized = false;
        this.crypto = cryptoManager;
        if (!this.crypto) {
            console.warn("CryptoManager instance was not provided to DatabaseManager at construction. Some operations like import/export might fail.");
        }
    }

    async init() {
        try {
            console.log('🗃️ Initializing database...');
            this.db = new Dexie('FamilyTimelineDB');
            this.db.version(2.1).stores({
                settings: 'id',
                kids: '++id, name, isActive',
                entries: '++id, timestamp, *targetTimelines'
            });
            await this.db.open();
            this.initialized = true;
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    ensureInitialized() {
        if (!this.initialized || !this.db) {
            throw new Error('Database not initialized. Call init() first.');
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

    // ENHANCED: Entries Management with Custom Timestamps
    async createEntry(entryData) {
        try {
            this.ensureInitialized();
            
            // NEW: Use custom timestamp if provided, otherwise current time
            const timestamp = entryData.customTimestamp || new Date().toISOString();
            
            const entry = {
                timestamp: timestamp, // ENHANCED: Custom timestamp support
                targetTimelines: entryData.targets || [],
                encryptedContent_base64: entryData.encryptedContent_base64,
                data_iv_base64: entryData.data_iv_base64,
                encryptionInfo: entryData.encryptionInfo,
                createdAt: new Date().toISOString() // Keep original creation time for auditing
            };
            
            const entryId = await this.db.entries.add(entry);
            
            // NEW: Enhanced logging for custom timestamps
            if (entryData.customTimestamp) {
                console.log(`📝 Entry created with custom timestamp: ID ${entryId}, timestamp: ${timestamp}`);
            } else {
                console.log(`📝 Entry created: ID ${entryId}`);
            }
            
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

    // NEW: Get entries within date range
    async getEntriesByDateRange(startDate, endDate, limit = 100) {
        try {
            this.ensureInitialized();
            const start = new Date(startDate).toISOString();
            const end = new Date(endDate).toISOString();
            
            const entries = await this.db.entries
                .where('timestamp')
                .between(start, end, true, true)
                .reverse()
                .limit(limit)
                .toArray();
            
            console.log(`📚 Loaded ${entries.length} entries between ${startDate} and ${endDate}`);
            return entries;
        } catch (error) {
            console.error('Failed to get entries by date range:', error);
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

    async searchEntries(query, limit = 20) {
        try {
            this.ensureInitialized();
            const entries = await this.db.entries
                .orderBy('timestamp')
                .reverse()
                .limit(limit * 2)
                .toArray();
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

    async getStats() {
        try {
            this.ensureInitialized();
            const [totalEntries, totalKids, oldestEntry, newestEntry] = await Promise.all([
                this.db.entries.count(),
                this.db.kids.where('isActive').equals(1).count(),
                this.db.entries.orderBy('timestamp').first(),
                this.db.entries.orderBy('timestamp').last()
            ]);
            
            const stats = {
                totalEntries,
                totalKids,
                dbSize: await this.estimateDbSize(),
                oldestEntry: oldestEntry ? oldestEntry.timestamp : null,
                newestEntry: newestEntry ? newestEntry.timestamp : null
            };
            console.log('📊 Database stats:', stats);
            return stats;
        } catch (error) {
            console.error('Failed to get stats:', error);
            return { totalEntries: 0, totalKids: 0, dbSize: 0 };
        }
    }

    async exportKidTimeline(kidIdKey, kidName) {
        this.ensureInitialized();
        if (!this.crypto) {
            console.error("CryptoManager not available in DatabaseManager for exportKidTimeline.");
            throw new Error("CryptoManager not available for export.");
        }
        console.log(`📦 Attempting to export timeline for ${kidName} (key: ${kidIdKey})`);

        const entriesForKid = await this.db.entries
            .where('targetTimelines')
            .anyOf([kidIdKey])
            .toArray();
        console.log(`Found ${entriesForKid.length} entries for ${kidName}.`);

        const processedEntries = entriesForKid.map(entry => {
            const filteredEncryptionInfo = {};
            if (entry.encryptionInfo) {
                if (entry.encryptionInfo.parent) {
                    filteredEncryptionInfo.parent = entry.encryptionInfo.parent;
                }
                if (entry.encryptionInfo[kidIdKey]) {
                    filteredEncryptionInfo[kidIdKey] = entry.encryptionInfo[kidIdKey];
                } else {
                    console.warn(`Entry ${entry.id} targeted ${kidIdKey}, but specific encryption info for this key is missing.`);
                }
            }
            return {
                id: entry.id,
                timestamp: entry.timestamp,
                encryptedContent_base64: entry.encryptedContent_base64,
                data_iv_base64: entry.data_iv_base64,
                encryptionInfo: filteredEncryptionInfo,
                targetTimelines: entry.targetTimelines,
                createdAt: entry.createdAt
            };
        });

        const exportData = {
            version: 2,
            exportedAt: new Date().toISOString(),
            timelineOwnerName: kidName,
            timelineKidIdKey: kidIdKey,
            entries: processedEntries
        };
        console.log(`📦 Export data prepared for ${kidName} with ${processedEntries.length} entries.`);
        return exportData;
    }

    async importKidTimeline(dataToImport, providedPassword) {
        this.ensureInitialized();
        if (!this.crypto) {
            console.error("CryptoManager not available in DatabaseManager for importKidTimeline.");
            throw new Error("CryptoManager not available for import.");
        }

        if (!dataToImport || !dataToImport.entries || (dataToImport.version !== 1 && dataToImport.version !== 2)) {
            throw new Error('Invalid or unsupported backup format for import.');
        }

        let importedCount = 0;
        let failedCount = 0;
        const importedEntryIds = [];
        console.log(`📥 Starting import of ${dataToImport.entries.length} entries for ${dataToImport.timelineOwnerName || 'timeline data'}.`);

        for (const entryFromFile of dataToImport.entries) {
            try {
                const decryptedResult = await this.crypto.decryptEntry(entryFromFile, providedPassword);
                if (decryptedResult && decryptedResult.content) {
                    const entryToStore = {
                        timestamp: entryFromFile.timestamp || new Date().toISOString(),
                        targetTimelines: entryFromFile.targetTimelines || [dataToImport.timelineKidIdKey || 'general'],
                        encryptedContent_base64: entryFromFile.encryptedContent_base64,
                        data_iv_base64: entryFromFile.data_iv_base64,
                        encryptionInfo: entryFromFile.encryptionInfo,
                        createdAt: entryFromFile.createdAt || new Date().toISOString()
                    };
                    const newEntryId = await this.db.entries.add(entryToStore);
                    importedEntryIds.push(newEntryId);
                    importedCount++;
                } else {
                    console.warn(`Failed to decrypt entry (ID from file: ${entryFromFile.id || 'N/A'}) with the provided password. Skipping.`);
                    failedCount++;
                }
            } catch (error) {
                console.error(`Error processing entry (ID from file: ${entryFromFile.id || 'N/A'}) during import:`, error);
                failedCount++;
            }
        }
        console.log(`📥 Import finished. Successfully imported ${importedCount} entries. Failed to import/decrypt ${failedCount} entries.`);
        return { importedCount, failedCount, importedEntryIds };
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
                version: 1,
                exportedAt: new Date().toISOString(),
                settings,
                kids: kids.map(k => ({
                    id: k.id, name: k.name, isActive: k.isActive, createdAt: k.createdAt, updatedAt: k.updatedAt,
                    encryptedPassword_base64: k.encryptedPassword_base64,
                    salt_base64: k.salt_base64, iv_base64: k.iv_base64
                })),
                entries
            };
            console.log(`📦 FULL EXPORT: Exported ${entries.length} entries and ${kids.length} kids`);
            return exportData;
        } catch (error) {
            console.error('Failed to export full data:', error);
            throw error;
        }
    }

    async importData(data) {
        try {
            this.ensureInitialized();
            if (!data || (data.version !== 1 && data.version !== 2) ) {
                 throw new Error('Invalid or unsupported backup format for full import.');
            }
            let importedItemsCount = 0;
            let entriesImported = 0;
            let kidsImported = 0;

            if (data.settings) {
                for (const setting of data.settings) { await this.db.settings.put(setting); }
                importedItemsCount += (data.settings.length || 0);
            }
            if (data.kids) {
                for (const kid of data.kids) { await this.db.kids.put(kid); }
                kidsImported = data.kids.length;
                importedItemsCount += kidsImported;
            }
            if (data.entries) {
                for (const entry of data.entries) { await this.db.entries.put(entry); }
                entriesImported = data.entries.length;
                importedItemsCount += entriesImported;
            }
            console.log(`📥 FULL IMPORT: Imported ${importedItemsCount} total items (${kidsImported} kids, ${entriesImported} entries).`);
            return { importedItemsCount, kidsImported, entriesImported };
        } catch (error) {
            console.error('Failed to import full data:', error);
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
            if (!navigator.storage || !navigator.storage.estimate) { return 0; }
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
            for (const kid of deletedKids) { await this.db.kids.delete(kid.id); }
            console.log(`🗜️ Database compacted: removed ${deletedKids.length} old inactive kid entries`);
            return deletedKids.length;
        } catch (error) {
            console.error('Failed to compact database:', error);
            return 0;
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