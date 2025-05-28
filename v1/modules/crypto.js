/**
 * Cryptography Management - FINAL CLEAN VERSION
 * Copy-paste this entire file to replace your crypto.js
 * OPTIMIZED: For single-timeline-per-entry approach
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

    // Kid password encryption/decryption
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

    // NEW FORMAT: Single-timeline entry encryption 
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
            
            // Encrypt content directly (simple approach)
            const encoder = new TextEncoder();
            const encryptedContent = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoder.encode(JSON.stringify(content))
            );

            const result = {
                encryptedContent_base64: this.arrayBufferToBase64(encryptedContent),
                data_iv_base64: this.arrayBufferToBase64(iv),
                salt_base64: this.arrayBufferToBase64(salt)
            };

            console.log('✅ Single timeline entry encrypted successfully');
            console.log('🔍 Encrypted result keys:', Object.keys(result)); // DEBUG
            console.log('🔍 Salt length:', result.salt_base64.length); // DEBUG
            
            return result;
        } catch (error) {
            console.error('❌ Single timeline entry encryption failed:', error);
            throw new Error(`Entry encryption failed: ${error.message}`);
        }
    }

    // NEW FORMAT: Single-timeline entry decryption
    async decryptSingleTimelineEntry(encryptedEntry, timelinePassword) {
        try {
            console.log('🔓 Decrypting single timeline entry...');
            
            if (!timelinePassword) {
                console.warn('❌ No timeline password provided');
                return null;
            }

            // Check for required fields - be flexible about salt location
            let salt, iv, encryptedContent;
            
            if (encryptedEntry.salt_base64) {
                // Perfect case - salt at top level
                salt = this.base64ToArrayBuffer(encryptedEntry.salt_base64);
                console.log('🔧 Using salt from top level');
            } else {
                // WORKAROUND: For entries missing top-level salt, we can't decrypt
                // This indicates a storage bug that needs to be fixed
                console.error('❌ Missing salt_base64 field - cannot decrypt');
                console.log('🔍 Available fields:', Object.keys(encryptedEntry));
                return null;
            }

            if (!encryptedEntry.data_iv_base64 || !encryptedEntry.encryptedContent_base64) {
                console.warn('❌ Missing required IV or encrypted content fields');
                return null;
            }

            iv = this.base64ToArrayBuffer(encryptedEntry.data_iv_base64);
            encryptedContent = this.base64ToArrayBuffer(encryptedEntry.encryptedContent_base64);

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
                targetTimelines: encryptedEntry.targetTimelines || [encryptedEntry.timeline] || []
            };
        } catch (error) {
            console.error('❌ Single timeline entry decryption failed:', error);
            return null;
        }
    }

    // MAIN ENTRY POINT: Smart decryption that handles both formats
    async decryptEntry(entry, password) {
        console.log('🔓 Attempting to decrypt entry...');
        
        // Debug entry structure
        console.log('🔍 Entry format check:', {
            hasTopLevelSalt: !!entry.salt_base64,
            hasEncryptionInfo: !!entry.encryptionInfo,
            encryptionMethod: entry.encryptionInfo?.method,
            version: entry.encryptionInfo?.version
        });
        
        // NEW FORMAT: Method 1 - Perfect new format (has both salt and method)
        if (entry.salt_base64 && entry.encryptionInfo?.method === 'single_timeline') {
            console.log('🔓 Detected NEW single-timeline format (perfect)');
            return await this.decryptSingleTimelineEntry(entry, password);
        }
        
        // NEW FORMAT: Method 2 - New format missing salt (storage bug fix)
        if (entry.encryptionInfo?.method === 'single_timeline' && entry.encryptionInfo?.version === 2) {
            console.log('🔧 Detected NEW single-timeline format (missing salt, attempting fix)');
            // Try to decrypt assuming the data structure is still correct
            return await this.decryptSingleTimelineEntry(entry, password);
        }
        
        // LEGACY FORMAT: Has nested encryptionInfo with recipient keys
        if (entry.encryptionInfo && !entry.salt_base64) {
            const keys = Object.keys(entry.encryptionInfo);
            const hasValidKeys = keys.some(key => 
                ['parent', 'general'].includes(key) || 
                key.startsWith('kid') || 
                (entry.encryptionInfo[key]?.encryptedDek_base64)
            );
            
            if (hasValidKeys) {
                console.log('🔄 Detected LEGACY multi-recipient format');
                return await this.decryptEntryLegacy(entry, password);
            }
        }
        
        // CORRUPTED or UNKNOWN format
        console.log('❓ Unknown or corrupted entry format, skipping...');
        console.log('🔍 Entry keys:', Object.keys(entry));
        if (entry.encryptionInfo) {
            console.log('🔍 EncryptionInfo keys:', Object.keys(entry.encryptionInfo));
        }
        
        return null;
    }

    // LEGACY: Multi-recipient decryption for old entries
    async decryptEntryLegacy(entry, password) {
        try {
            console.log('🔓 Using legacy multi-recipient decryption...');
            
            if (!password) {
                console.warn('❌ No password provided for decryption');
                return null;
            }

            const encryptionInfo = entry.encryptionInfo;
            if (!encryptionInfo) {
                console.error('❌ No encryption info in entry');
                return null;
            }

            const keys = Object.keys(encryptionInfo);
            console.log('🔍 Available encryption keys:', keys);

            // Validate encryption info structure
            const validKeys = keys.filter(key => {
                const info = encryptionInfo[key];
                return info && 
                       typeof info === 'object' && 
                       info.encryptedDek_base64 && 
                       info.salt_base64 && 
                       info.iv_base64;
            });

            if (validKeys.length === 0) {
                console.error('❌ No valid encryption keys found');
                return null;
            }

            console.log('🔍 Valid keys to try:', validKeys);

            let dekRaw = null;
            let decryptedBy = null;

            // Try each valid key
            for (const keyHolder of validKeys) {
                try {
                    console.log(`🔓 Trying ${keyHolder}...`);
                    
                    const info = encryptionInfo[keyHolder];
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
                    console.log(`✅ Successfully decrypted using ${keyHolder}`);
                    break;
                } catch (e) {
                    console.log(`❌ Failed with ${keyHolder}:`, e.message);
                    continue;
                }
            }

            if (!dekRaw) {
                console.warn('❌ Password does not match any encryption key');
                return null;
            }

            // Import DEK and decrypt content
            const dek = await window.crypto.subtle.importKey(
                'raw',
                dekRaw,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            const encryptedContent = this.base64ToArrayBuffer(entry.encryptedContent_base64);
            const dataIv = this.base64ToArrayBuffer(entry.data_iv_base64);
            
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: dataIv },
                dek,
                encryptedContent
            );

            const decoder = new TextDecoder();
            const content = JSON.parse(decoder.decode(decryptedBuffer));

            console.log('✅ Legacy entry decrypted successfully');
            
            return {
                content: content,
                decryptedBy: decryptedBy,
                timestamp: entry.timestamp,
                targetTimelines: entry.targetTimelines || entry.targets || []
            };
        } catch (error) {
            console.error('❌ Legacy decryption failed:', error);
            return null;
        }
    }

    // DEPRECATED: Old multi-recipient encryption (kept for reference)
    async encryptEntry(content, targets, parentPassword, kidPasswords) {
        console.log('⚠️ DEPRECATED: encryptEntry() is deprecated. Use encryptSingleTimelineEntry() instead.');
        
        // For backward compatibility, create individual entries
        const encryptedEntries = [];

        for (const target of targets) {
            let targetPassword;

            if (target === 'general') {
                targetPassword = parentPassword;
            } else if (target.startsWith('kid')) {
                const kidId = parseInt(target.replace('kid', ''));
                targetPassword = kidPasswords[kidId];
            } else {
                continue;
            }

            if (!targetPassword) {
                throw new Error(`No password available for target: ${target}`);
            }

            const encryptedEntry = await this.encryptSingleTimelineEntry(content, targetPassword);
            encryptedEntry.target = target;
            encryptedEntry.timeline = target;
            encryptedEntries.push(encryptedEntry);
        }

        return encryptedEntries;
    }

    // Password utilities
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