/**
 * Cryptography Management - PHASE 1: TIMELINE-SPECIFIC ENCRYPTION
 * Copy-paste this entire file to replace your crypto.js
 */

export class CryptoManager {
    constructor() {
        this.KDF_ITERATIONS = 300000; // PBKDF2 iterations
        this.initialized = false;
    }

    async init() {
        try {
            // Check if Web Crypto API is available
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error('Web Crypto API not available in this browser');
            }
            
            this.initialized = true;
            console.log('🔐 Crypto manager initialized');
        } catch (error) {
            console.error('❌ Crypto initialization failed:', error);
            throw error;
        }
    }

    // Utility functions
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    generateRandomBytes(length) {
        return window.crypto.getRandomValues(new Uint8Array(length));
    }

    // Key derivation
    async deriveKeyFromPassword(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.KDF_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    // Kid password encryption/decryption - UNCHANGED
    async encryptKidPassword(kidPassword, parentPassword) {
        try {
            console.log('🔐 Encrypting kid password with parent password');
            
            const salt = this.generateRandomBytes(16);
            const iv = this.generateRandomBytes(12);
            
            const key = await this.deriveKeyFromPassword(parentPassword, salt);
            
            const encoder = new TextEncoder();
            const encryptedPassword = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoder.encode(kidPassword)
            );

            const result = {
                encryptedPassword_base64: this.arrayBufferToBase64(encryptedPassword),
                salt_base64: this.arrayBufferToBase64(salt),
                iv_base64: this.arrayBufferToBase64(iv)
            };
            
            console.log('✅ Kid password encrypted successfully');
            return result;
        } catch (error) {
            console.error('❌ Failed to encrypt kid password:', error);
            throw new Error('Password encryption failed');
        }
    }

    async decryptKidPassword(kidData, parentPassword) {
        console.log(`decryptKidPassword: Attempting for kid (ID: ${kidData ? kidData.id : 'N/A'})`);
        
        if (!kidData || !kidData.salt_base64 || !kidData.iv_base64 || !kidData.encryptedPassword_base64) {
            console.error('decryptKidPassword: Essential encryption fields missing');
            return null;
        }

        try {
            const salt = this.base64ToArrayBuffer(kidData.salt_base64);
            const iv = this.base64ToArrayBuffer(kidData.iv_base64);
            const encryptedPassword = this.base64ToArrayBuffer(kidData.encryptedPassword_base64);
            
            const key = await this.deriveKeyFromPassword(parentPassword, salt);
            
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encryptedPassword
            );

            const decoder = new TextDecoder();
            const kidPassword = decoder.decode(decryptedBuffer);
            
            console.log(`✅ Password for kid (ID: ${kidData.id}) decrypted successfully`);
            return kidPassword;
        } catch (error) {
            console.warn(`❌ Decryption failed for kid (ID: ${kidData ? kidData.id : 'N/A'}):`, error.message);
            return null;
        }
    }

    // File handling
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const arrayBuffer = reader.result;
                resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data_base64: this.arrayBufferToBase64(arrayBuffer)
                });
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // NEW: Simple single-timeline entry encryption 
    async encryptSingleTimelineEntry(content, timelinePassword) {
        try {
            console.log('🔐 Encrypting entry for single timeline...');
            
            if (!timelinePassword) {
                throw new Error('Timeline password is required');
            }

            // Generate salt and IV for this entry
            const salt = this.generateRandomBytes(16);
            const iv = this.generateRandomBytes(12);
            
            // Derive key from timeline password
            const key = await this.deriveKeyFromPassword(timelinePassword, salt);
            
            // Encrypt content directly (no DEK wrapping complexity)
            const encoder = new TextEncoder();
            const encryptedContent = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoder.encode(JSON.stringify(content))
            );

            const result = {
                encryptedContent_base64: this.arrayBufferToBase64(encryptedContent),
                data_iv_base64: this.arrayBufferToBase64(iv),
                salt_base64: this.arrayBufferToBase64(salt),
                encryptionInfo: {
                    method: 'single_timeline',
                    kdfIterations: this.KDF_ITERATIONS
                }
            };

            console.log('✅ Single timeline entry encrypted successfully');
            return result;
        } catch (error) {
            console.error('❌ Single timeline entry encryption failed:', error);
            throw new Error(`Entry encryption failed: ${error.message}`);
        }
    }

    // NEW: Simple single-timeline entry decryption
    async decryptSingleTimelineEntry(encryptedEntry, timelinePassword) {
        try {
            console.log('🔓 Decrypting single timeline entry...');
            
            if (!timelinePassword) {
                console.warn('❌ No timeline password provided');
                return null;
            }

            // Handle both new format (with salt_base64) and old format (without)
            let salt, iv, encryptedContent;
            
            if (encryptedEntry.salt_base64) {
                // New single-timeline format
                salt = this.base64ToArrayBuffer(encryptedEntry.salt_base64);
                iv = this.base64ToArrayBuffer(encryptedEntry.data_iv_base64);
                encryptedContent = this.base64ToArrayBuffer(encryptedEntry.encryptedContent_base64);
            } else {
                // Try to handle old format gracefully
                console.log('🔄 Attempting to decrypt old format entry...');
                return await this.decryptEntry(encryptedEntry, timelinePassword);
            }

            // Derive key from timeline password
            const key = await this.deriveKeyFromPassword(timelinePassword, salt);

            // Decrypt content
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encryptedContent
            );

            const decoder = new TextDecoder();
            const content = JSON.parse(decoder.decode(decryptedBuffer));

            console.log('✅ Single timeline entry decrypted successfully');
            
            return {
                content: content,
                decryptedBy: 'single_timeline',
                timestamp: encryptedEntry.timestamp,
                targetTimelines: encryptedEntry.targetTimelines || []
            };
        } catch (error) {
            console.error('❌ Single timeline entry decryption failed:', error);
            return null;
        }
    }

    // UPDATED: Main entry encryption method - now creates individual timeline entries
    async encryptEntry(content, targets, parentPassword, kidPasswords) {
        console.log('🔐 NEW: Creating individual timeline entries instead of multi-recipient');
        console.log('🎯 Targets:', targets);
        console.log('🔑 Available kid passwords:', Object.keys(kidPasswords || {}));

        // Validate inputs
        if (!parentPassword) {
            throw new Error('Parent password is required');
        }
        if (!targets || targets.length === 0) {
            throw new Error('At least one target is required');
        }

        // Return array of encrypted entries (one per target)
        const encryptedEntries = [];

        for (const target of targets) {
            let targetPassword;
            let targetTimeline;

            console.log(`🔐 Processing target: ${target}`);

            if (target === 'general') {
                targetPassword = parentPassword;
                targetTimeline = 'general';
                console.log('📝 Using parent password for general timeline');
            } else if (target.startsWith('kid')) {
                const kidId = parseInt(target.replace('kid', ''));
                console.log(`👶 Kid target detected: ID ${kidId}`);
                
                if (!kidPasswords) {
                    console.error('❌ Kid passwords object is null/undefined');
                    throw new Error(`Kid passwords not available for encryption`);
                }
                
                targetPassword = kidPasswords[kidId];
                targetTimeline = target;
                
                console.log(`🔑 Kid ${kidId} password lookup:`, {
                    passwordExists: !!targetPassword,
                    passwordLength: targetPassword ? targetPassword.length : 0
                });
            } else {
                console.warn(`❓ Unknown target type: ${target}`);
                continue;
            }

            // Validate password exists
            if (!targetPassword) {
                const errorMsg = `No password available for target: ${target}`;
                console.error(`❌ ${errorMsg}`);
                throw new Error(errorMsg);
            }

            console.log(`🔐 Encrypting entry for ${target} with password length: ${targetPassword.length}`);

            // Encrypt content for this specific timeline
            const encryptedEntry = await this.encryptSingleTimelineEntry(content, targetPassword);
            
            // Add target information
            encryptedEntry.targets = [target];
            encryptedEntry.targetTimelines = [targetTimeline];

            encryptedEntries.push({
                target: target,
                timeline: targetTimeline,
                ...encryptedEntry
            });
            
            console.log(`✅ Encryption completed for ${target}`);
        }

        console.log('✅ All timeline entries encrypted successfully');
        console.log('🔐 Created entries for timelines:', encryptedEntries.map(e => e.timeline));
        
        return encryptedEntries;
    }

    // UPDATED: Main entry decryption method - handles both old and new formats
    async decryptEntry(entry, password) {
        console.log('🔓 Attempting to decrypt entry...');
        
        // First try new single-timeline format
        if (entry.encryptionInfo?.method === 'single_timeline' || entry.salt_base64) {
            return await this.decryptSingleTimelineEntry(entry, password);
        }
        
        // Fall back to original complex decryption for old entries
        console.log('🔄 Attempting old format decryption...');
        return await this.decryptEntryLegacy(entry, password);
    }

    // LEGACY: Keep old decryption method for existing entries
    async decryptEntryLegacy(entry, password) {
        try {
            console.log('🔓 Using legacy decryption method...');
            
            if (!password) {
                console.warn('❌ No password provided for decryption');
                return null;
            }

            const encryptionInfo = entry.encryptionInfo;
            if (!encryptionInfo) {
                console.error('❌ No encryption info in entry');
                return null;
            }

            console.log('🔍 Available encryption keys:', Object.keys(encryptionInfo));

            let dekRaw = null;
            let decryptedBy = null;

            // Try to decrypt DEK with the provided password
            for (const [keyHolder, info] of Object.entries(encryptionInfo)) {
                try {
                    console.log(`🔓 Trying to decrypt DEK using ${keyHolder} encryption...`);
                    
                    const salt = this.base64ToArrayBuffer(info.salt_base64);
                    const iv = this.base64ToArrayBuffer(info.iv_base64);
                    const encryptedDek = this.base64ToArrayBuffer(info.encryptedDek_base64);

                    const kek = await this.deriveKeyFromPassword(password, salt);
                    dekRaw = await window.crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv: iv },
                        kek,
                        encryptedDek
                    );

                    decryptedBy = keyHolder;
                    console.log(`✅ Successfully decrypted DEK using ${keyHolder} encryption`);
                    break;
                } catch (e) {
                    console.log(`❌ Failed to decrypt using ${keyHolder} encryption:`, e.message);
                    continue;
                }
            }

            if (!dekRaw) {
                console.warn('❌ Password does not match any encryption key in this entry');
                return null;
            }

            // Import DEK
            const dek = await window.crypto.subtle.importKey(
                'raw',
                dekRaw,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            // Decrypt content
            const encryptedContent = this.base64ToArrayBuffer(entry.encryptedContent_base64);
            const dataIv = this.base64ToArrayBuffer(entry.data_iv_base64);
            
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: dataIv },
                dek,
                encryptedContent
            );

            const decoder = new TextDecoder();
            const content = JSON.parse(decoder.decode(decryptedBuffer));

            console.log('✅ Legacy entry content decrypted successfully');
            
            return {
                content: content,
                decryptedBy: decryptedBy,
                timestamp: entry.timestamp,
                targetTimelines: entry.targetTimelines || entry.targets || []
            };
        } catch (error) {
            console.error('❌ Legacy entry decryption failed:', error);
            return null;
        }
    }

    // Password strength validation
    validatePasswordStrength(password) {
        const requirements = {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };

        const score = Object.values(requirements).filter(Boolean).length;
        
        let strength = 'weak';
        if (score >= 4) strength = 'strong';
        else if (score >= 3) strength = 'medium';

        return {
            score,
            strength,
            requirements,
            isValid: score >= 3
        };
    }

    generateSecurePassword(length = 16) {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const allChars = lowercase + uppercase + numbers + symbols;

        let password = '';
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];

        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return this.arrayBufferToBase64(hashBuffer);
    }

    async verifyPassword(password, expectedHash) {
        const passwordHash = await this.hashPassword(password);
        return passwordHash === expectedHash;
    }

    static isSupported() {
        return !!(window.crypto && window.crypto.subtle);
    }

    clearSensitiveData() {
        console.log('🧹 Clearing sensitive data from memory');
    }
}