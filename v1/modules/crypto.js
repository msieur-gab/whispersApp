/**
 * Cryptography Management - REFACTORED VERSION
 * Handles all encryption/decryption operations for the Family Timeline app
 * REFACTOR: Encrypts entries directly with the target timeline's password.
 */

export class CryptoManager {
    constructor() {
        this.KDF_ITERATIONS = 300000; // PBKDF2 iterations
        this.initialized = false;
    }

    async init() {
        try {
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

    // Utility functions (arrayBufferToBase64, base64ToArrayBuffer, generateRandomBytes)
    // remain unchanged.

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


    // Key derivation (deriveKeyFromPassword) remains unchanged.
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

    // Kid password encryption/decryption (encryptKidPassword, decryptKidPassword)
    // remain unchanged as they handle the kid's primary password encryption, not entries.
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
        // ... (original implementation)
        console.log(`decryptKidPassword: Attempting for kid (ID from kidData: ${kidData ? kidData.id : 'N/A'}). Parent password length: ${parentPassword ? parentPassword.length : 'N/A'}`);
        if (!kidData) {
            console.error('decryptKidPassword: Received null or undefined kidData.');
            return null;
        }
        console.log('decryptKidPassword: kidData received:', JSON.stringify({
            id: kidData.id,
            name: kidData.name,
            encryptedPassword_base64_exists: !!kidData.encryptedPassword_base64,
            salt_base64_exists: !!kidData.salt_base64,
            iv_base64_exists: !!kidData.iv_base64,
        }));
    
        try {
            if (!kidData.salt_base64 || !kidData.iv_base64 || !kidData.encryptedPassword_base64) {
                console.error('decryptKidPassword: ❌ Essential field(s) (salt, iv, or encryptedPassword) missing in kidData. Cannot decrypt.');
                return null;
            }
    
            const salt = this.base64ToArrayBuffer(kidData.salt_base64);
            const iv = this.base64ToArrayBuffer(kidData.iv_base64);
            const encryptedPassword = this.base64ToArrayBuffer(kidData.encryptedPassword_base64);
            
            console.log('decryptKidPassword: Salt, IV, EncryptedPassword successfully converted from base64 to ArrayBuffer.');
    
            const key = await this.deriveKeyFromPassword(parentPassword, salt);
            console.log('decryptKidPassword: Key derived from parent password successfully.');
            
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encryptedPassword
            );
            console.log('decryptKidPassword: window.crypto.subtle.decrypt call successful.');
    
            const decoder = new TextDecoder();
            const kidPasswordDecrypted = decoder.decode(decryptedBuffer); // Renamed to avoid confusion with parentPassword
            
            console.log(`decryptKidPassword: ✅ Password for kid (ID: ${kidData.id}) decrypted successfully.`);
            return kidPasswordDecrypted;
        } catch (error) {
            console.warn(`decryptKidPassword: ❌ Decryption failed for kid (ID: ${kidData ? kidData.id : 'N/A'}). Error:`, error.message, error);
            if (error.name === 'OperationError') {
                console.warn('decryptKidPassword: This often means the key was incorrect (i.e., wrong parent password) or data was corrupted.');
            }
            return null;
        }
    }


    // File handling (fileToBase64) remains unchanged.
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

    /**
     * REFACTORED: Encrypts entry content directly with the timeline-specific password.
     * Each entry is encrypted for a single target timeline.
     */
    async encryptEntry(content, timelinePassword) {
        try {
            console.log('🔐 Starting direct entry encryption...');

            if (!timelinePassword) {
                throw new Error('Timeline password is required for encryption');
            }

            const salt = this.generateRandomBytes(16);
            const iv = this.generateRandomBytes(12);

            const key = await this.deriveKeyFromPassword(timelinePassword, salt);

            const encoder = new TextEncoder();
            const encryptedContent = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoder.encode(JSON.stringify(content))
            );

            const result = {
                encryptedContent_base64: this.arrayBufferToBase64(encryptedContent),
                salt_base64: this.arrayBufferToBase64(salt),
                iv_base64: this.arrayBufferToBase64(iv), // Was data_iv_base64, harmonizing to iv_base64
                kdfIterations: this.KDF_ITERATIONS // Good to keep for future flexibility
            };

            console.log('✅ Entry direct encryption completed successfully');
            return result;
        } catch (error) {
            console.error('❌ Entry direct encryption failed:', error);
            throw new Error(`Entry encryption failed: ${error.message}`);
        }
    }

    /**
     * REFACTORED: Decrypts entry content directly using the provided password.
     * Assumes the entry was encrypted for a single timeline.
     */
    async decryptEntry(entry, password) {
        try {
            console.log('🔓 Attempting direct entry decryption...');
            
            if (!password) {
                console.warn('❌ No password provided for decryption');
                return null;
            }

            if (!entry.encryptedContent_base64 || !entry.salt_base64 || !entry.iv_base64) { // Harmonized to iv_base64
                console.error('❌ Essential encrypted data (content, salt, or iv) missing in entry');
                return null;
            }

            const salt = this.base64ToArrayBuffer(entry.salt_base64);
            const iv = this.base64ToArrayBuffer(entry.iv_base64); // Harmonized
            const encryptedContent = this.base64ToArrayBuffer(entry.encryptedContent_base64);

            const key = await this.deriveKeyFromPassword(password, salt);
            
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encryptedContent
            );

            const decoder = new TextDecoder();
            const content = JSON.parse(decoder.decode(decryptedBuffer));

            console.log('✅ Entry content decrypted successfully (direct)');
            
            // The structure of the returned object can be simplified or adjusted as needed.
            // Keeping timestamp and targetTimelines if they are still part of the 'entry' object passed in.
            return {
                content: content,
                // If `entry` still contains these from the DB, pass them along.
                // `decryptedBy` is no longer relevant in this model.
                timestamp: entry.timestamp, 
                targetTimeline: entry.targetTimeline // Assuming DB stores a single targetTimeline now
            };

        } catch (error) {
            // More specific error logging for decryption failure
            if (error.name === 'OperationError') {
                 console.warn('❌ Direct entry decryption failed: OperationError. This often means the provided password was incorrect or the data is corrupted.', error.message);
            } else {
                 console.error('❌ Direct entry decryption failed:', error);
            }
            return null;
        }
    }

    // Password strength validation (validatePasswordStrength) remains unchanged.
    validatePasswordStrength(password) {
        // ... (original implementation)
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
        return { score, strength, requirements, isValid: score >= 3 };
    }

    // Generate secure password (generateSecurePassword) remains unchanged.
    generateSecurePassword(length = 16) {
        // ... (original implementation)
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

    // Hash functions (hashPassword, verifyPassword) remain unchanged.
    async hashPassword(password) {
        // ... (original implementation)
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return this.arrayBufferToBase64(hashBuffer);
    }

    async verifyPassword(password, expectedHash) {
        // ... (original implementation)
        const passwordHash = await this.hashPassword(password);
        return passwordHash === expectedHash;
    }


    // deriveMasterKey, isSupported, clearSensitiveData remain unchanged.
    async deriveMasterKey(password, salt) {
        // ... (original implementation)
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
            false,
            ['encrypt', 'decrypt']
        );
    }

    static isSupported() {
        return !!(window.crypto && window.crypto.subtle);
    }

    clearSensitiveData() {
        console.log('🧹 Clearing sensitive data from memory');
    }
}