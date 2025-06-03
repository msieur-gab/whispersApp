/**
 * Simplified Enhanced Database - Base64 Media + Inline Translations
 * Works with your existing crypto.fileToBase64() approach
 * Perfect for legal exports and cross-platform portability
 */

export class DatabaseManager {
    constructor(cryptoManager) {
        this.db = null;
        this.initialized = false;
        this.crypto = cryptoManager;
        this.defaultFamilyId = 1;
    }

    async init() {
        try {
            console.log('🗃️ Initializing enhanced database...');
            this.db = new Dexie('FamilyTimelineDB');
            
            // SIMPLIFIED SCHEMA - No separate media table, keep base64 inline
            this.db.version(3).stores({
                // NEW: Families table (for future multi-family support)
                families: '++id, familyCode, createdBy, status, createdAt',
                
                // ENHANCED: Users table (replaces kids table)
                users: '++id, familyId, type, name, primaryLanguage, *languages, isActive, createdAt',
                
                // ENHANCED: Entries with inline translations + base64 media
                entries: '++id, familyId, timestamp, authorId, *recipientIds, originalLanguage, createdAt',
                
                // EXISTING: Settings (unchanged)
                settings: 'id'
            });

            await this.db.open();
            this.initialized = true;
            console.log('✅ Enhanced database initialized');
            
            // Create default family for backward compatibility
            await this.ensureDefaultFamily();
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    // Create default family if none exists (backward compatibility)
    async ensureDefaultFamily() {
        const familyCount = await this.db.families.count();
        if (familyCount === 0) {
            this.defaultFamilyId = await this.db.families.add({
                familyCode: 'DEFAULT',
                createdBy: 'system',
                status: 'active',
                settings: {
                    parentName: 'Parent',
                    generalTimelineName: 'Family Timeline'
                },
                createdAt: new Date().toISOString()
            });
            console.log('🏠 Created default family for backward compatibility');
        } else {
            const defaultFamily = await this.db.families.orderBy('id').first();
            this.defaultFamilyId = defaultFamily.id;
        }
    }

    ensureInitialized() {
        if (!this.initialized || !this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
    }

    // SETTINGS MANAGEMENT (unchanged from your current code)
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

    // ENHANCED USER MANAGEMENT (replaces kids management)
    async createUser({ 
        familyId = null, 
        type, 
        name, 
        password = null, 
        primaryLanguage = 'en', 
        languages = [] 
    }) {
        try {
            this.ensureInitialized();
            const finalFamilyId = familyId || this.defaultFamilyId;
            
            const userData = {
                familyId: finalFamilyId,
                type, // 'parent' or 'kid'
                name,
                primaryLanguage,
                languages: languages.length > 0 ? languages : [primaryLanguage],
                preferences: {
                    autoTranslate: type === 'kid',
                    showOriginalText: true,
                    translationProvider: 'google'
                },
                isActive: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Handle password encryption for kids (same as your current logic)
            if (type === 'kid' && password) {
                const parentPassword = this.getParentSessionPassword();
                if (!parentPassword) {
                    throw new Error('Parent session required to create kid');
                }
                
                const encryptedData = await this.crypto.encryptKidPassword(password, parentPassword);
                Object.assign(userData, encryptedData);
            }

            const userId = await this.db.users.add(userData);
            console.log(`👤 User created: ${name} (ID: ${userId}, Type: ${type})`);
            return userId;
            
        } catch (error) {
            console.error('Failed to create user:', error);
            throw error;
        }
    }

    // BACKWARD COMPATIBILITY: Keep existing kids methods
    async getKids() {
        try {
            this.ensureInitialized();
            const users = await this.db.users
                .where('familyId').equals(this.defaultFamilyId)
                .and(user => user.type === 'kid' && user.isActive === 1)
                .toArray();
            console.log(`📚 Loaded ${users.length} kids from database`);
            return users;
        } catch (error) {
            console.error('Failed to get kids:', error);
            return [];
        }
    }

    async createKid(kidData) {
        try {
            this.ensureInitialized();
            const kid = {
                familyId: this.defaultFamilyId,
                type: 'kid',
                name: kidData.name,
                primaryLanguage: kidData.primaryLanguage || 'en',
                languages: kidData.languages || [kidData.primaryLanguage || 'en'],
                preferences: {
                    autoTranslate: true,
                    showOriginalText: true
                },
                isActive: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                encryptedPassword_base64: kidData.encryptedPassword_base64,
                salt_base64: kidData.salt_base64,
                iv_base64: kidData.iv_base64
            };
            
            const kidId = await this.db.users.add(kid);
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
            await this.db.users.update(kidId, {
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
            await this.db.users.update(kidId, {
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
            const kid = await this.db.users.get(kidId);
            return kid && kid.isActive ? kid : null;
        } catch (error) {
            console.error('Failed to get kid:', error);
            return null;
        }
    }

    // ENHANCED ENTRIES with inline translations + BASE64 MEDIA (your approach!)
    async createEntry(entryData) {
        try {
            this.ensureInitialized();
            
            // Get parent user as author (for backward compatibility)
            const parentUser = await this.getParentUser();
            const authorId = parentUser ? parentUser.id : null;
            
            // Convert old targets format to user IDs
            const recipientIds = await this.convertTargetsToUserIds(entryData.targets || []);
            
            // Determine languages needed for translation
            const targetLanguages = await this.getTargetLanguages(recipientIds);
            
            // Use custom timestamp if provided, otherwise current time
            const timestamp = entryData.customTimestamp || new Date().toISOString();
            
            // Prepare entry content - WORKS WITH YOUR EXISTING CRYPTO HANDLING
            const entryContent = {
                originalText: entryData.text || '',
                translations: {},
                lastTranslated: null
            };

            // Keep your existing media handling (base64)
            if (entryData.encryptedContent_base64) {
                // Your existing encrypted content approach
                entryContent.encryptedData = {
                    encryptedContent_base64: entryData.encryptedContent_base64,
                    data_iv_base64: entryData.data_iv_base64,
                    encryptionInfo: entryData.encryptionInfo
                };
            } else {
                // Direct content approach (for new features)
                const content = JSON.parse(entryData.text || '{}');
                if (content.image) entryContent.image = content.image; // Your base64 image
                if (content.audio) entryContent.audio = content.audio; // Your base64 audio
            }

            // Auto-translate if we have target languages
            if (targetLanguages.length > 0 && entryContent.originalText) {
                await this.addInlineTranslations(entryContent, 'en', targetLanguages);
            }

            // Prepare entry data
            const entry = {
                familyId: this.defaultFamilyId,
                timestamp: timestamp,
                authorId: authorId,
                recipientIds: recipientIds,
                originalLanguage: 'en', // Default for backward compatibility
                
                // INLINE CONTENT with translations and base64 media
                content: entryContent,
                
                // Backward compatibility fields
                targetTimelines: entryData.targets || [],
                encryptedContent_base64: entryData.encryptedContent_base64,
                data_iv_base64: entryData.data_iv_base64,
                encryptionInfo: entryData.encryptionInfo,
                
                createdAt: new Date().toISOString()
            };

            const entryId = await this.db.entries.add(entry);
            
            console.log(`📝 Entry created: ID ${entryId}${entryData.customTimestamp ? ' with custom timestamp' : ''}`);
            return entryId;
            
        } catch (error) {
            console.error('Failed to create entry:', error);
            throw error;
        }
    }

    // AUTO-TRANSLATION: Add translations inline to content
    async addInlineTranslations(content, fromLanguage, targetLanguages) {
        for (const targetLang of targetLanguages) {
            if (targetLang !== fromLanguage && content.originalText) {
                try {
                    const translation = await this.translateText(content.originalText, fromLanguage, targetLang);
                    if (translation) {
                        content.translations[targetLang] = {
                            text: translation,
                            translatedAt: new Date().toISOString(),
                            provider: 'google',
                            confidence: 0.85
                        };
                    }
                } catch (error) {
                    console.error(`Translation failed ${fromLanguage} → ${targetLang}:`, error);
                    content.translations[targetLang] = {
                        text: null,
                        error: error.message,
                        translatedAt: new Date().toISOString()
                    };
                }
            }
        }
        content.lastTranslated = new Date().toISOString();
    }

    // TRANSLATION API INTEGRATION
    async translateText(text, fromLang, toLang) {
        // TODO: Replace with actual translation API call
        console.log(`🌐 Translating "${text}" from ${fromLang} to ${toLang}`);
        return `[${toLang.toUpperCase()}] ${text}`;
    }

    // BACKWARD COMPATIBILITY: Keep existing entries methods
    async getEntries(limit = 100) {
        try {
            this.ensureInitialized();
            // Fix: Use sortBy after where, then reverse manually
            const entries = await this.db.entries
                .where('familyId').equals(this.defaultFamilyId)
                .sortBy('timestamp');
            
            // Reverse and limit manually
            const sortedEntries = entries.reverse().slice(0, limit);
            
            console.log(`📚 Loaded ${sortedEntries.length} entries from database`);
            
            // Add translation helper methods to each entry
            return sortedEntries.map(entry => ({
                ...entry,
                // Helper methods for accessing translations
                getTranslation: (language) => entry.content?.translations?.[language]?.text,
                getAvailableLanguages: () => Object.keys(entry.content?.translations || {}),
                hasTranslation: (language) => !!(entry.content?.translations?.[language]?.text)
            }));
        } catch (error) {
            console.error('Failed to get entries:', error);
            return [];
        }
    }

    async getEntry(entryId) {
        try {
            this.ensureInitialized();
            const entry = await this.db.entries.get(entryId);
            if (!entry) return null;
            
            // Add translation helper methods
            return {
                ...entry,
                getTranslation: (language) => entry.content?.translations?.[language]?.text,
                getAvailableLanguages: () => Object.keys(entry.content?.translations || {}),
                hasTranslation: (language) => !!(entry.content?.translations?.[language]?.text)
            };
        } catch (error) {
            console.error('Failed to get entry:', error);
            return null;
        }
    }

    async getEntriesForTimeline(timeline, limit = 50) {
        try {
            this.ensureInitialized();
            // Fix: Use sortBy after where/anyOf
            const entries = await this.db.entries
                .where('targetTimelines')
                .anyOf([timeline])
                .sortBy('timestamp');
            
            // Reverse and limit manually
            const sortedEntries = entries.reverse().slice(0, limit);
            console.log(`📚 Loaded ${sortedEntries.length} entries for timeline: ${timeline}`);
            return sortedEntries;
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

    // UTILITY METHODS
    async getParentUser() {
        return await this.db.users
            .where('familyId').equals(this.defaultFamilyId)
            .and(user => user.type === 'parent' && user.isActive === 1)
            .first();
    }

    async convertTargetsToUserIds(targets) {
        // Convert old targets like ['general', 'kid1', 'kid2'] to actual user IDs
        const userIds = [];
        
        for (const target of targets) {
            if (target === 'general') {
                const parentUser = await this.getParentUser();
                if (parentUser) userIds.push(parentUser.id);
            } else if (target.startsWith('kid')) {
                const kidNumber = parseInt(target.replace('kid', ''));
                // Find kid by their position/number (this is a simplified approach)
                const kids = await this.getKids();
                if (kids[kidNumber - 1]) {
                    userIds.push(kids[kidNumber - 1].id);
                }
            }
        }
        
        return userIds;
    }

    async getTargetLanguages(recipientIds) {
        if (recipientIds.length === 0) return [];
        
        const users = await this.db.users.where('id').anyOf(recipientIds).toArray();
        const languages = new Set();
        
        users.forEach(user => {
            if (user.languages) {
                user.languages.forEach(lang => languages.add(lang));
            } else if (user.primaryLanguage) {
                languages.add(user.primaryLanguage);
            }
        });
        
        return Array.from(languages);
    }

    getParentSessionPassword() {
        return window.familyApp?.state?.parentSession?.password || null;
    }

    // PERFECT EXPORT with BASE64 MEDIA - Everything in one JSON file!
    async exportKidTimeline(kidIdKey, kidName) {
        this.ensureInitialized();
        console.log(`📦 Exporting complete timeline for ${kidName} (key: ${kidIdKey})`);

        const entriesForKid = await this.db.entries
            .where('targetTimelines')
            .anyOf([kidIdKey])
            .toArray();
        
        console.log(`Found ${entriesForKid.length} entries for ${kidName} - ALL MEDIA INCLUDED as base64!`);

        const exportData = {
            version: 3,
            exportType: 'kid_timeline',
            exportedAt: new Date().toISOString(),
            timelineOwnerName: kidName,
            timelineKidIdKey: kidIdKey,
            
            // Complete entries with inline translations and base64 media
            entries: entriesForKid.map(entry => ({
                id: entry.id,
                timestamp: entry.timestamp,
                originalLanguage: entry.originalLanguage,
                
                // EVERYTHING included inline:
                content: {
                    originalText: entry.content?.originalText || '',
                    translations: entry.content?.translations || {},
                    // Base64 media included directly:
                    image: entry.content?.image, // Your base64 image data
                    audio: entry.content?.audio, // Your base64 audio data
                    // Encrypted data if present:
                    encryptedData: entry.content?.encryptedData
                },
                
                // Backward compatibility:
                targetTimelines: entry.targetTimelines,
                encryptedContent_base64: entry.encryptedContent_base64,
                data_iv_base64: entry.data_iv_base64,
                encryptionInfo: entry.encryptionInfo,
                createdAt: entry.createdAt
            })),
            
            // Export metadata:
            exportStats: {
                totalEntries: entriesForKid.length,
                entriesWithMedia: entriesForKid.filter(e => e.content?.image || e.content?.audio).length,
                entriesWithTranslations: entriesForKid.filter(e => e.content?.translations && Object.keys(e.content.translations).length > 0).length,
                languages: this.getLanguagesInEntries(entriesForKid)
            }
        };
        
        console.log(`📦 Export complete: ${exportData.entries.length} entries with all media as base64`);
        return exportData;
    }

    getLanguagesInEntries(entries) {
        const languages = new Set(['en']); // Default
        entries.forEach(entry => {
            if (entry.originalLanguage) languages.add(entry.originalLanguage);
            if (entry.content?.translations) {
                Object.keys(entry.content.translations).forEach(lang => languages.add(lang));
            }
        });
        return Array.from(languages);
    }

    // EXPORT ALL DATA (complete backup)
    async exportData() {
        try {
            this.ensureInitialized();
            const [families, users, entries, settings] = await Promise.all([
                this.db.families.toArray(),
                this.db.users.where('isActive').equals(1).toArray(),
                this.db.entries.toArray(),
                this.db.settings.toArray()
            ]);
            
            const exportData = {
                version: 3,
                exportType: 'full_backup',
                exportedAt: new Date().toISOString(),
                families,
                users: users.map(u => ({
                    id: u.id, name: u.name, type: u.type, primaryLanguage: u.primaryLanguage,
                    languages: u.languages, isActive: u.isActive, createdAt: u.createdAt,
                    encryptedPassword_base64: u.encryptedPassword_base64,
                    salt_base64: u.salt_base64, iv_base64: u.iv_base64
                })),
                entries, // Complete entries with all base64 media
                settings,
                exportStats: {
                    totalFamilies: families.length,
                    totalUsers: users.length,
                    totalEntries: entries.length,
                    totalMediaFiles: entries.filter(e => e.content?.image || e.content?.audio).length
                }
            };
            
            console.log(`📦 FULL EXPORT: ${entries.length} entries, ${users.length} users - ALL MEDIA INCLUDED`);
            return exportData;
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    // IMPORT with base64 media support
    async importKidTimeline(dataToImport, providedPassword) {
        this.ensureInitialized();
        
        if (!dataToImport || !dataToImport.entries) {
            throw new Error('Invalid backup format for import.');
        }

        let importedCount = 0;
        let failedCount = 0;

        console.log(`📥 Importing ${dataToImport.entries.length} entries with base64 media...`);

        for (const entryFromFile of dataToImport.entries) {
            try {
                const entryToStore = {
                    familyId: this.defaultFamilyId,
                    timestamp: entryFromFile.timestamp || new Date().toISOString(),
                    authorId: entryFromFile.authorId || null,
                    recipientIds: entryFromFile.recipientIds || [],
                    originalLanguage: entryFromFile.originalLanguage || 'en',
                    
                    // Complete content with translations and base64 media:
                    content: entryFromFile.content || { 
                        originalText: entryFromFile.text || '', 
                        translations: {} 
                    },
                    
                    // Backward compatibility:
                    targetTimelines: entryFromFile.targetTimelines || [],
                    encryptedContent_base64: entryFromFile.encryptedContent_base64,
                    data_iv_base64: entryFromFile.data_iv_base64,
                    encryptionInfo: entryFromFile.encryptionInfo,
                    createdAt: entryFromFile.createdAt || new Date().toISOString()
                };
                
                await this.db.entries.add(entryToStore);
                importedCount++;
            } catch (error) {
                console.error(`Error importing entry:`, error);
                failedCount++;
            }
        }
        
        console.log(`📥 Import complete: ${importedCount} entries imported, ${failedCount} failed - ALL MEDIA RESTORED`);
        return { importedCount, failedCount };
    }

    // STATS
    async getStats() {
        try {
            this.ensureInitialized();
            const [totalEntries, totalUsers, entries] = await Promise.all([
                this.db.entries.count(),
                this.db.users.where('isActive').equals(1).count(),
                this.db.entries.orderBy('timestamp').toArray()
            ]);
            
            const oldestEntry = entries.length > 0 ? entries[0] : null;
            const newestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
            
            const stats = {
                totalEntries,
                totalUsers,
                oldestEntry: oldestEntry ? oldestEntry.timestamp : null,
                newestEntry: newestEntry ? newestEntry.timestamp : null
            };
            return stats;
        } catch (error) {
            console.error('Failed to get stats:', error);
            return { totalEntries: 0, totalUsers: 0 };
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