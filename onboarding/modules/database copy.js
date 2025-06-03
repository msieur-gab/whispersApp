/**
 * Fresh Database Manager - Simplified for Onboarding Focus
 * Handles families, users, and basic settings storage
 */

export class DatabaseManager {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.defaultFamilyId = 1;
    }

    async init() {
        try {
            console.log('🗃️ Initializing database...');
            this.db = new Dexie('FamilyTimelineDB');
            
            // Simple schema for fresh start
            this.db.version(1).stores({
                // Families table
                families: '++id, familyCode, createdBy, status, createdAt',
                
                // Users table (parents and kids)
                users: '++id, familyId, type, name, primaryLanguage, *languages, isActive, createdAt',
                
                // Settings table
                settings: 'id'
            });

            await this.db.open();
            this.initialized = true;
            
            // Create default family if none exists
            await this.ensureDefaultFamily();
            
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    // Ensure default family exists for backward compatibility
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
            console.log('🏠 Created default family');
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

    // SETTINGS MANAGEMENT
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
            console.log('💾 App settings saved:', settings);
        } catch (error) {
            console.error('Failed to save app settings:', error);
            throw error;
        }
    }

    // USER MANAGEMENT
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

            // Simple password storage for kids (will enhance with encryption later)
            if (type === 'kid' && password) {
                // For now, store a simple hash - will implement proper encryption later
                userData.passwordHash = await this.simpleHash(password);
                userData.hasPassword = true;
            }

            const userId = await this.db.users.add(userData);
            console.log(`👤 User created: ${name} (ID: ${userId}, Type: ${type})`);
            return userId;
            
        } catch (error) {
            console.error('Failed to create user:', error);
            throw error;
        }
    }

    async getUsers(type = null) {
        try {
            this.ensureInitialized();
            let query = this.db.users
                .where('familyId').equals(this.defaultFamilyId)
                .and(user => user.isActive === 1);
                
            if (type) {
                query = query.and(user => user.type === type);
            }
            
            const users = await query.toArray();
            console.log(`📚 Loaded ${users.length} users${type ? ` of type ${type}` : ''}`);
            return users;
        } catch (error) {
            console.error('Failed to get users:', error);
            return [];
        }
    }

    async getUser(userId) {
        try {
            this.ensureInitialized();
            const user = await this.db.users.get(userId);
            return user && user.isActive ? user : null;
        } catch (error) {
            console.error('Failed to get user:', error);
            return null;
        }
    }

    async updateUser(userId, updateData) {
        try {
            this.ensureInitialized();
            await this.db.users.update(userId, {
                ...updateData,
                updatedAt: new Date().toISOString()
            });
            console.log(`🔄 User updated: ID ${userId}`);
        } catch (error) {
            console.error('Failed to update user:', error);
            throw error;
        }
    }

    async removeUser(userId) {
        try {
            this.ensureInitialized();
            await this.db.users.update(userId, {
                isActive: 0,
                updatedAt: new Date().toISOString()
            });
            console.log(`🗑️ User removed: ID ${userId}`);
        } catch (error) {
            console.error('Failed to remove user:', error);
            throw error;
        }
    }

    // FAMILY MANAGEMENT
    async createFamily({ createdBy, settings = {} }) {
        try {
            this.ensureInitialized();
            const familyCode = this.generateFamilyCode();
            const familyData = {
                familyCode,
                createdBy,
                status: 'active',
                settings: {
                    parentName: settings.parentName || 'Parent',
                    generalTimelineName: settings.generalTimelineName || 'Family Timeline',
                    ...settings
                },
                createdAt: new Date().toISOString()
            };
            
            const familyId = await this.db.families.add(familyData);
            console.log(`🏠 Family created: ${familyCode} (ID: ${familyId})`);
            return familyId;
        } catch (error) {
            console.error('Failed to create family:', error);
            throw error;
        }
    }

    async getFamily(familyId = null) {
        try {
            this.ensureInitialized();
            const id = familyId || this.defaultFamilyId;
            return await this.db.families.get(id);
        } catch (error) {
            console.error('Failed to get family:', error);
            return null;
        }
    }

    // UTILITY METHODS
    generateFamilyCode() {
        return 'FB' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Simple hash function (will replace with proper crypto later)
    async simpleHash(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Verify password against hash
    async verifyPassword(password, hash) {
        const passwordHash = await this.simpleHash(password);
        return passwordHash === hash;
    }

    // DATABASE UTILITIES
    async getStats() {
        try {
            this.ensureInitialized();
            const [totalFamilies, totalUsers] = await Promise.all([
                this.db.families.count(),
                this.db.users.where('isActive').equals(1).count()
            ]);
            
            const stats = {
                totalFamilies,
                totalUsers,
                parentUsers: await this.db.users.where('type').equals('parent').count(),
                kidUsers: await this.db.users.where('type').equals('kid').count()
            };
            
            console.log('📊 Database stats:', stats);
            return stats;
        } catch (error) {
            console.error('Failed to get stats:', error);
            return { totalFamilies: 0, totalUsers: 0, parentUsers: 0, kidUsers: 0 };
        }
    }

    async exportData() {
        try {
            this.ensureInitialized();
            const [families, users, settings] = await Promise.all([
                this.db.families.toArray(),
                this.db.users.where('isActive').equals(1).toArray(),
                this.db.settings.toArray()
            ]);
            
            const exportData = {
                version: 1,
                exportType: 'full_backup',
                exportedAt: new Date().toISOString(),
                families,
                users: users.map(u => ({
                    // Export user data without sensitive password info
                    id: u.id,
                    familyId: u.familyId,
                    type: u.type,
                    name: u.name,
                    primaryLanguage: u.primaryLanguage,
                    languages: u.languages,
                    preferences: u.preferences,
                    isActive: u.isActive,
                    createdAt: u.createdAt,
                    updatedAt: u.updatedAt,
                    hasPassword: u.hasPassword || false
                })),
                settings,
                exportStats: {
                    totalFamilies: families.length,
                    totalUsers: users.length,
                    exportSize: JSON.stringify({ families, users, settings }).length
                }
            };
            
            console.log(`📦 EXPORT: ${users.length} users, ${families.length} families`);
            return exportData;
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    async clearAllData() {
        try {
            this.ensureInitialized();
            await Promise.all([
                this.db.families.clear(),
                this.db.users.clear(),
                this.db.settings.clear()
            ]);
            console.log('🧹 All data cleared from database');
        } catch (error) {
            console.error('Failed to clear data:', error);
            throw error;
        }
    }

    async isHealthy() {
        try {
            this.ensureInitialized();
            await this.db.families.count();
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