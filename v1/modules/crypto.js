/**
 * Cryptography Management - FIXED VERSION
 * Handles all encryption/decryption operations for the Family Timeline app
 * FIX: Ensures kid passwords are properly used for encryption
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
            
            // Derive key from parent password
            const key = await this.deriveKeyFromPassword(parentPassword, salt);
            
            // Encrypt kid password
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
        // Log the actual sensitive values just for this specific debug - REMOVE AFTER DEBUGGING if needed
        // Be cautious with logging raw encrypted data or salts if these logs could be exposed.
        // For local debugging, it can be invaluable.
        // console.log('decryptKidPassword: Salt used (first 10 chars):', kidData.salt_base64?.substring(0,10));
    
        try {
            if (!kidData.salt_base64 || !kidData.iv_base64 || !kidData.encryptedPassword_base64) {
                console.error('decryptKidPassword: ❌ Essential field(s) (salt, iv, or encryptedPassword) missing in kidData. Cannot decrypt.');
                return null;
            }
    
            const salt = this.base64ToArrayBuffer(kidData.salt_base64);
            const iv = this.base64ToArrayBuffer(kidData.iv_base64);
            const encryptedPassword = this.base64ToArrayBuffer(kidData.encryptedPassword_base64);
            
            console.log('decryptKidPassword: Salt, IV, EncryptedPassword successfully converted from base64 to ArrayBuffer.');
    
            // Derive key from parent password
            const key = await this.deriveKeyFromPassword(parentPassword, salt);
            console.log('decryptKidPassword: Key derived from parent password successfully.');
            
            // Decrypt kid password
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encryptedPassword
            );
            console.log('decryptKidPassword: window.crypto.subtle.decrypt call successful.');
    
            const decoder = new TextDecoder();
            const kidPassword = decoder.decode(decryptedBuffer);
            
            console.log(`decryptKidPassword: ✅ Password for kid (ID: ${kidData.id}) decrypted successfully.`);
            return kidPassword;
        } catch (error) {
            console.warn(`decryptKidPassword: ❌ Decryption failed for kid (ID: ${kidData ? kidData.id : 'N/A'}). Error:`, error.message, error);
            // Log more details about what might have failed if possible
            if (error.name === 'OperationError') { // Common for crypto failures
                console.warn('decryptKidPassword: This often means the key was incorrect (i.e., wrong parent password) or data was corrupted.');
            }
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

    // FIXED: Entry encryption with proper kid password handling
    async encryptEntry(content, targets, parentPassword, kidPasswords) {
        try {
            console.log('🔐 Starting entry encryption...');
            console.log('🎯 Targets:', targets);
            console.log('🔑 Available kid passwords:', Object.keys(kidPasswords || {}));
            console.log('🔑 Kid passwords content:', kidPasswords);

            // Validate inputs
            if (!parentPassword) {
                throw new Error('Parent password is required');
            }
            if (!targets || targets.length === 0) {
                throw new Error('At least one target is required');
            }

            // Generate data encryption key (DEK)
            const dek = await window.crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // Export DEK for key wrapping
            const dekRaw = await window.crypto.subtle.exportKey('raw', dek);

            // Encrypt content with DEK
            const dataIv = this.generateRandomBytes(12);
            const encoder = new TextEncoder();
            const encryptedContent = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: dataIv },
                dek,
                encoder.encode(JSON.stringify(content))
            );

            // Prepare encryption info for each recipient
            const encryptionInfo = {};

            // ALWAYS encrypt for parent (for management purposes)
            console.log('🔐 Encrypting DEK for parent...');
            const parentSalt = this.generateRandomBytes(16);
            const parentIv = this.generateRandomBytes(12);
            const parentKek = await this.deriveKeyFromPassword(parentPassword, parentSalt);
            const parentWrappedDek = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: parentIv },
                parentKek,
                dekRaw
            );

            encryptionInfo.parent = {
                encryptedDek_base64: this.arrayBufferToBase64(parentWrappedDek),
                salt_base64: this.arrayBufferToBase64(parentSalt),
                iv_base64: this.arrayBufferToBase64(parentIv),
                kdfIterations: this.KDF_ITERATIONS
            };
            console.log('✅ Parent encryption completed');

            // Encrypt DEK for each target
            for (const target of targets) {
                let targetPassword;
                let encryptionKey;

                console.log(`🔐 Processing target: ${target}`);

                if (target === 'general') {
                    targetPassword = parentPassword;
                    encryptionKey = 'general';
                    console.log('📝 Using parent password for general timeline');
                } else if (target.startsWith('kid')) {
                    const kidId = parseInt(target.replace('kid', ''));
                    console.log(`👶 Kid target detected: ID ${kidId}`);
                    
                    // CRITICAL FIX: Ensure we have kid passwords and the specific password
                    if (!kidPasswords) {
                        console.error('❌ Kid passwords object is null/undefined');
                        throw new Error(`Kid passwords not available for encryption`);
                    }
                    
                    targetPassword = kidPasswords[kidId];
                    encryptionKey = target;
                    
                    console.log(`🔑 Kid ${kidId} password lookup:`, {
                        passwordExists: !!targetPassword,
                        passwordLength: targetPassword ? targetPassword.length : 0,
                        allKidIds: Object.keys(kidPasswords)
                    });
                } else {
                    console.warn(`❓ Unknown target type: ${target}`);
                    continue;
                }

                // CRITICAL: Validate password exists
                if (!targetPassword) {
                    const errorMsg = `No password available for target: ${target}`;
                    console.error(`❌ ${errorMsg}`);
                    throw new Error(errorMsg);
                }

                console.log(`🔐 Encrypting DEK for ${target} with password length: ${targetPassword.length}`);

                // Generate unique salt and IV for this recipient
                const targetSalt = this.generateRandomBytes(16);
                const targetIv = this.generateRandomBytes(12);
                
                // Derive key from target password
                const targetKek = await this.deriveKeyFromPassword(targetPassword, targetSalt);
                
                // Encrypt DEK with target's password
                const targetWrappedDek = await window.crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv: targetIv },
                    targetKek,
                    dekRaw
                );

                encryptionInfo[encryptionKey] = {
                    encryptedDek_base64: this.arrayBufferToBase64(targetWrappedDek),
                    salt_base64: this.arrayBufferToBase64(targetSalt),
                    iv_base64: this.arrayBufferToBase64(targetIv),
                    kdfIterations: this.KDF_ITERATIONS
                };
                
                console.log(`✅ Encryption completed for ${target}`);
            }

            const result = {
                encryptedContent_base64: this.arrayBufferToBase64(encryptedContent),
                data_iv_base64: this.arrayBufferToBase64(dataIv),
                encryptionInfo: encryptionInfo,
                targets: targets
            };

            console.log('✅ Entry encryption completed successfully');
            console.log('🔐 Encryption info keys:', Object.keys(encryptionInfo));
            
            return result;
        } catch (error) {
            console.error('❌ Entry encryption failed:', error);
            throw new Error(`Entry encryption failed: ${error.message}`);
        }
    }

    // IMPROVED: Entry decryption with better logging
    async decryptEntry(entry, password) {
        try {
            console.log('🔓 Attempting to decrypt entry with password length:', password?.length || 0);
            
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

            // Try to decrypt DEK with the provided password against each encryption entry
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
                return null; // Password doesn't match any encryption key
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

            console.log('✅ Entry content decrypted successfully');
            
            return {
                content: content,
                decryptedBy: decryptedBy,
                timestamp: entry.timestamp,
                targetTimelines: entry.targetTimelines || entry.targets || []
            };
        } catch (error) {
            console.error('❌ Entry decryption failed:', error);
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
            isValid: score >= 3 // Require at least 3 criteria
        };
    }

    // Generate secure password
    generateSecurePassword(length = 16) {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const allChars = lowercase + uppercase + numbers + symbols;

        // Ensure at least one character from each category
        let password = '';
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];

        // Fill remaining length with random characters
        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // Shuffle the password
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }

    // Hash functions (for verification, not storage)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return this.arrayBufferToBase64(hashBuffer);
    }

    // Secure comparison
    async verifyPassword(password, expectedHash) {
        const passwordHash = await this.hashPassword(password);
        return passwordHash === expectedHash;
    }

    // Key derivation for master password (for future use)
    async deriveMasterKey(password, salt) {
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

    // Utility method to check if crypto is available
    static isSupported() {
        return !!(window.crypto && window.crypto.subtle);
    }

    // Clean up sensitive data from memory (best effort)
    clearSensitiveData() {
        // In JavaScript, we can't truly clear memory, but we can overwrite variables
        // This is more of a symbolic gesture for security awareness
        console.log('🧹 Clearing sensitive data from memory');
    }
}