/**
 * Main Application Entry Point - FIXED DATABASE FORMAT
 * Orchestrates modules and initializes the Family Timeline app
 * FIXED: Proper timeline-per-entry database storage
 */

import { AppState } from './modules/state.js';
import { DatabaseManager } from './modules/database.js';
import { CryptoManager } from './modules/crypto.js';
import { UIManager } from './modules/ui.js';
import { showStatus } from './utils/helpers.js';

// Import components
import './components/password-checker.js';
import './components/kid-card.js';
import './components/timeline-entry.js';
import './components/modal-dialog.js';

class FamilyTimelineApp {
    constructor() {
        this.state = new AppState();
        this.db = new DatabaseManager();
        this.crypto = new CryptoManager();
        this.ui = new UIManager();
        
        this.initialized = false;
    }

    async init() {
        try {
            console.log('🚀 Initializing Family Timeline App...');
            
            // Initialize modules
            await this.db.init();
            await this.state.init();
            this.ui.init();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Update UI
            this.ui.updateDisplay();
            
            this.initialized = true;
            showStatus('App loaded successfully!', 'success');
            console.log('✅ App initialization complete');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            showStatus('Failed to initialize app: ' + error.message, 'error');
        }
    }

    async loadInitialData() {
        try {
            // Load app settings
            const settings = await this.db.getAppSettings();
            if (settings) {
                this.state.updateSettings(settings);
            }
            
            // Load kid profiles
            const kids = await this.db.getKids();
            this.state.setKids(kids);
            
            console.log('📊 Initial data loaded');
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    setupEventListeners() {
        // Off-canvas menu
        this.setupMenuListeners();
        
        // Parent authentication
        this.setupAuthListeners();
        
        // Kids management
        this.setupKidsListeners();
        
        // Settings
        this.setupSettingsListeners();
        
        // Entry creation
        this.setupEntryListeners();
        
        // Timeline viewing
        this.setupTimelineListeners();
        
        // State change listeners
        this.setupStateListeners();
    }

    setupMenuListeners() {
        const menuToggle = document.getElementById('menuToggle');
        const closeMenu = document.getElementById('closeMenu');
        const overlay = document.getElementById('overlay');
        const offCanvas = document.getElementById('offCanvas');

        const openMenu = () => {
            offCanvas.classList.add('open');
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        };

        const closeMenuHandler = () => {
            offCanvas.classList.remove('open');
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        };

        menuToggle?.addEventListener('click', openMenu);
        closeMenu?.addEventListener('click', closeMenuHandler);
        overlay?.addEventListener('click', closeMenuHandler);
    }

    setupAuthListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const switchModeBtn = document.getElementById('switchModeBtn');

        loginBtn?.addEventListener('click', async () => {
            await this.handleParentLogin();
        });

        logoutBtn?.addEventListener('click', () => {
            this.handleParentLogout();
        });

        switchModeBtn?.addEventListener('click', () => {
            this.handleModeSwitch();
        });
    }

    setupKidsListeners() {
        const addKidBtn = document.getElementById('addKidBtn');

        addKidBtn?.addEventListener('click', async () => {
            await this.handleAddKid();
        });

        // Event delegation for kid card actions
        document.addEventListener('kid-remove', (e) => {
            this.handleRemoveKid(e.detail.kidId);
        });

        document.addEventListener('kid-password-change', (e) => {
            this.handleChangeKidPassword(e.detail.kidId);
        });
    }

    setupSettingsListeners() {
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');

        saveSettingsBtn?.addEventListener('click', async () => {
            await this.handleSaveSettings();
        });
    }

    setupEntryListeners() {
        const entryForm = document.getElementById('entryForm');

        entryForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateEntry();
        });
    }

    setupTimelineListeners() {
        const viewerPassword = document.getElementById('viewerPassword');
        const loadTimelineBtn = document.getElementById('loadTimelineBtn');

        if (loadTimelineBtn) {
            loadTimelineBtn.addEventListener('click', async () => {
                const password = viewerPassword.value;
                if (password) {
                    await this.handleLoadTimeline(password);
                } else {
                    showStatus('Please enter your timeline password', 'error');
                }
            });
        }

        if (viewerPassword) {
            viewerPassword.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    const password = e.target.value;
                    if (password) {
                        await this.handleLoadTimeline(password);
                    } else {
                        showStatus('Please enter your timeline password', 'error');
                    }
                }
            });
        }

        // Event delegation for timeline entry clicks
        document.addEventListener('timeline-entry-click', (e) => {
            this.handleTimelineEntryClick(e.detail.entryId);
        });
    }

    setupStateListeners() {
        // Listen for state changes
        this.state.on('modeChanged', () => {
            this.ui.updateDisplay();
        });

        this.state.on('parentSessionChanged', () => {
            this.ui.updateDisplay();
            this.ui.updateKidsDisplay(); 
        });

        this.state.on('kidsChanged', () => {
            this.ui.updateKidsDisplay();
            this.ui.updateTargetSelection();
        });

        this.state.on('settingsChanged', () => {
            this.ui.updateSettingsDisplay();
        });
    }

    // Event Handlers
    async handleParentLogin() {
        const passwordComponent = document.getElementById('parentPassword');
        if (!passwordComponent) {
            showStatus('Password component not found.', 'error');
            return;
        }
        const password = passwordComponent.password;

        if (!password) {
            showStatus('Please enter your master password', 'error');
            return;
        }

        try {
            const success = await this.state.startParentSession(password); 
            
            if (success) {
                const loadedCount = await this.loadKidPasswordsToSession();
                this.ui.updateKidsDisplay();

                if (loadedCount === 0 && this.state.kids.length > 0) {
                    const reEncrypt = confirm(
                        `Cannot decrypt existing kid passwords with this master password.\n\n` +
                        `This usually happens when:\n` +
                        `• You changed your master password\n` +
                        `• Kids were added with a different master password\n\n` +
                        `Would you like to set new passwords for your kids?\n` +
                        `(This will make their old timeline entries inaccessible)`
                    );
                    if (reEncrypt) {
                        showStatus('Please set new passwords for your kids in the Kids Management section', 'warning', 8000);
                    }
                }
                
                showStatus('Parent session started successfully!', 'success');
                
                if (typeof passwordComponent.clearPassword === 'function') {
                    passwordComponent.clearPassword();
                }
            } else {
                showStatus('Invalid master password', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showStatus('Login failed: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    handleParentLogout() {
        this.state.endParentSession();
        showStatus('Parent session ended', 'success');
    }

    handleModeSwitch() {
        if (this.state.mode === 'kid') {
            this.state.setMode('parent');
            showStatus('Switched to Parent Mode', 'success');
        } else {
            if (this.state.parentSession.active) {
                const confirmLogout = confirm('Logging out will end your parent session. Continue?');
                if (!confirmLogout) return;
            }
            this.state.setMode('kid');
            this.state.endParentSession();
            showStatus('Switched to Kid Mode', 'success');
        }
    }

    async handleAddKid() {
        try {
            const nameInput = document.getElementById('newKidName');
            const passwordComponent = document.getElementById('newKidPassword');
            
            const name = nameInput.value.trim();
            const password = passwordComponent.password;

            if (!name) {
                showStatus('Please enter a name for the kid', 'error');
                return;
            }
            if (!password) {
                showStatus('Please set a password for the kid', 'error');
                return;
            }

            const parentPassword = this.state.parentSession.password;
            if (!parentPassword) {
                showStatus('Parent session not active or password missing. Cannot add kid.', 'error');
                return;
            }
            const encryptedData = await this.crypto.encryptKidPassword(password, parentPassword);

            const kidId = await this.db.createKid({
                name,
                ...encryptedData
            });

            const newKidData = {
                id: kidId,
                name,
                isActive: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...encryptedData
            };
            this.state.addKid(newKidData);
            this.state.setKidPasswordInSession(kidId, password);

            nameInput.value = '';
            passwordComponent.clearPassword();
            showStatus(`${name} added successfully!`, 'success');
        } catch (error) {
            console.error('Add kid error:', error);
            showStatus('Failed to add kid: ' + error.message, 'error');
        }
    }

    async handleRemoveKid(kidId) {
        try {
            const kid = this.state.kids.find(k => k.id === kidId);
            if (!kid) return;

            const confirmRemove = confirm(
                `Remove ${kid.name}? This will make their timeline entries inaccessible unless you re-add them with the same password.`
            );
            if (!confirmRemove) return;

            await this.db.removeKid(kidId);
            this.state.removeKid(kidId);
            
            showStatus(`${kid.name} removed successfully`, 'success');
        } catch (error) {
            console.error('Remove kid error:', error);
            showStatus('Failed to remove kid: ' + error.message, 'error');
        }
    }

    async handleChangeKidPassword(kidId) {
        try {
            const kid = this.state.kids.find(k => k.id === kidId);
            if (!kid) return;

            const newPassword = prompt(`Enter new password for ${kid.name}:`);
            if (!newPassword) return;

            const parentPassword = this.state.parentSession.password;
            if (!parentPassword) {
                showStatus('Parent session not active or password missing. Cannot change kid password.', 'error');
                return;
            }
            const encryptedData = await this.crypto.encryptKidPassword(newPassword, parentPassword);

            await this.db.updateKidPassword(kidId, encryptedData);
            this.state.updateKidPassword(kidId, encryptedData);
            this.state.setKidPasswordInSession(kidId, newPassword);

            showStatus(`Password updated for ${kid.name}!`, 'success');
        } catch (error) {
            console.error('Change password error:', error);
            showStatus('Failed to update password: ' + error.message, 'error');
        }
    }

    async handleSaveSettings() {
        try {
            const parentName = document.getElementById('parentNameInput').value.trim();
            const timelineName = document.getElementById('timelineNameInput').value.trim();

            const settings = {
                parentName: parentName || 'Parent',
                generalTimelineName: timelineName || 'Family Timeline'
            };

            await this.db.saveAppSettings(settings);
            this.state.updateSettings(settings);
            showStatus('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Save settings error:', error);
            showStatus('Failed to save settings: ' + error.message, 'error');
        }
    }

    // FIXED: Proper timeline-per-entry creation
// REPLACE your handleCreateEntry method in main.js with this debug version:

async handleCreateEntry() {
    console.log('📝 Creating individual entries per timeline (DEBUG VERSION)');
    
    try {
        const text = document.getElementById('entryText').value;
        const imageFile = document.getElementById('imageInput').files[0];
        const audioFile = document.getElementById('audioInput').files[0];
        const targets = Array.from(document.querySelectorAll('input[name="target"]:checked'))
            .map(cb => cb.value);

        console.log('📝 Targets selected:', targets);

        if (!text && !imageFile && !audioFile) {
            showStatus('Please provide some content for the entry', 'error');
            return;
        }
        if (targets.length === 0) {
            showStatus('Please select at least one timeline', 'error');
            return;
        }

        const content = { text };
        if (imageFile) content.image = await this.crypto.fileToBase64(imageFile);
        if (audioFile) content.audio = await this.crypto.fileToBase64(audioFile);

        console.log('🔐 Starting encryption for targets:', targets);

        // Process each target individually
        const entryIds = [];
        const baseTimestamp = new Date().toISOString();

        for (const target of targets) {
            let targetPassword;
            let timelineName;

            console.log(`🎯 Processing target: ${target}`);

            if (target === 'general') {
                targetPassword = this.state.parentSession.password;
                timelineName = this.state.settings.generalTimelineName || 'Family Timeline';
            } else if (target.startsWith('kid')) {
                const kidId = parseInt(target.replace('kid', ''));
                targetPassword = this.state.parentSession.kidPasswords[kidId];
                const kid = this.state.kids.find(k => k.id === kidId);
                timelineName = kid ? `${kid.name}'s Timeline` : `Kid ${kidId} Timeline`;
            } else {
                console.warn(`❓ Unknown target type: ${target}`);
                continue;
            }

            if (!targetPassword) {
                console.error(`❌ No password available for target: ${target}`);
                continue;
            }

            console.log(`🔐 Encrypting for ${target} with password length: ${targetPassword.length}`);

            try {
                // Step 1: Encrypt the content
                console.log('🔧 Step 1: Calling encryptSingleTimelineEntry...');
                const encryptedEntry = await this.crypto.encryptSingleTimelineEntry(content, targetPassword);
                
                console.log('🔧 Step 2: Encryption result:', {
                    hasEncryptedContent: !!encryptedEntry.encryptedContent_base64,
                    hasIv: !!encryptedEntry.data_iv_base64,
                    hasSalt: !!encryptedEntry.salt_base64,
                    saltLength: encryptedEntry.salt_base64 ? encryptedEntry.salt_base64.length : 'MISSING'
                });
                
                // Step 2: Create database entry structure
                console.log('🔧 Step 3: Creating database entry structure...');
                const dbEntryData = {
                    // CRITICAL: Copy all encrypted fields
                    encryptedContent_base64: encryptedEntry.encryptedContent_base64,
                    data_iv_base64: encryptedEntry.data_iv_base64,
                    salt_base64: encryptedEntry.salt_base64, // ← MUST be here!
                    
                    // Timeline metadata  
                    targets: [target],
                    targetTimelines: [target],
                    timeline: target,
                    timelineName: timelineName,
                    
                    // Entry metadata
                    timestamp: baseTimestamp,
                    
                    // Format identification
                    encryptionInfo: {
                        method: 'single_timeline',
                        kdfIterations: this.crypto.KDF_ITERATIONS,
                        version: 2
                    }
                };

                console.log('🔧 Step 4: Final database entry to store:', {
                    hasEncryptedContent: !!dbEntryData.encryptedContent_base64,
                    hasIv: !!dbEntryData.data_iv_base64,
                    hasSalt: !!dbEntryData.salt_base64,
                    saltValue: dbEntryData.salt_base64 ? dbEntryData.salt_base64.substring(0, 10) + '...' : 'MISSING!',
                    allKeys: Object.keys(dbEntryData)
                });

                // Step 3: Store in database
                console.log('🔧 Step 5: Storing in database...');
                const entryId = await this.db.createEntry(dbEntryData);
                entryIds.push(entryId);
                
                console.log(`✅ Entry stored for ${timelineName}: ID ${entryId}`);
                
                // Step 4: Verify storage by reading back
                console.log('🔧 Step 6: Verifying storage...');
                const storedEntry = await this.db.getEntry(entryId);
                console.log('🔧 Stored entry verification:', {
                    entryId: storedEntry.id,
                    hasEncryptedContent: !!storedEntry.encryptedContent_base64,
                    hasIv: !!storedEntry.data_iv_base64,
                    hasSalt: !!storedEntry.salt_base64,
                    saltInDb: storedEntry.salt_base64 ? 'YES' : 'NO - MISSING!',
                    allKeysInDb: Object.keys(storedEntry)
                });
                
            } catch (error) {
                console.error(`❌ Failed to create entry for ${target}:`, error);
            }
        }

        if (entryIds.length === 0) {
            showStatus('Failed to create any entries. Check console for details.', 'error');
            return;
        }

        // Clear form
        document.getElementById('entryForm').reset();
        document.querySelectorAll('input[name="target"]').forEach(cb => cb.checked = false);
        this.ui.updateCreateButtonState();

        showStatus(`Entry created successfully! Check console for debug info.`, 'success');
        
    } catch (error) {
        console.error('Create entry error:', error);
        showStatus('Failed to create entry: ' + error.message, 'error');
    }
}

    async handleLoadTimeline(password) {
        try {
            console.log('📚 Loading timeline with password length:', password.length);
            
            const entries = await this.db.getEntries();
            console.log(`📊 Found ${entries.length} total entries in database`);
            
            const accessibleEntries = [];

            for (const entry of entries) {
                try {
                    console.log(`🔓 Attempting to decrypt entry ID ${entry.id}`);
                    const decryptedContent = await this.crypto.decryptEntry(entry, password);
                    if (decryptedContent) {
                        console.log(`✅ Successfully decrypted entry ID ${entry.id}`);
                        accessibleEntries.push({
                            ...entry,
                            decryptedContent
                        });
                    } else {
                        console.log(`❌ Could not decrypt entry ID ${entry.id}`);
                    }
                } catch (error) {
                    console.warn(`Could not decrypt entry ID ${entry.id}:`, error.message);
                    continue;
                }
            }
            
            console.log(`📋 Displaying ${accessibleEntries.length} accessible entries`);
            this.ui.displayTimelineEntries(accessibleEntries);
            
            if (accessibleEntries.length === 0) {
                showStatus('No entries found with this password. Try a different password or create some entries first.', 'warning');
            } else {
                showStatus(`Loaded ${accessibleEntries.length} entries`, 'success');
            }
            
        } catch (error) {
            console.error('Load timeline error:', error);
            showStatus('Failed to load timeline: ' + error.message, 'error');
        }
    }

    async handleTimelineEntryClick(entryId) {
        try {
            const password = document.getElementById('viewerPassword').value;
            if (!password) {
                showStatus('Password required to view entry details', 'error');
                return;
            }

            const entry = await this.db.getEntry(entryId);
            if (!entry) {
                showStatus('Entry not found.', 'error');
                return;
            }
            const decryptedContent = await this.crypto.decryptEntry(entry, password);

            if (decryptedContent) {
                this.ui.showEntryModal(decryptedContent);
            } else {
                showStatus('Cannot decrypt this entry with the current password', 'error');
            }
        } catch (error) {
            console.error('View entry error:', error);
            showStatus('Failed to view entry: ' + error.message, 'error');
        }
    }

    async loadKidPasswordsToSession() {
        if (!this.state.parentSession.active || !this.state.parentSession.password) {
            console.warn('loadKidPasswordsToSession: Parent session not active or master password not set in session. Skipping kid password loading.');
            if (this.state.parentSession.password === null || this.state.parentSession.password === undefined) {
                 console.warn('loadKidPasswordsToSession: Detail - Parent session master password is null or undefined!');
            }
            return 0;
        }
    
        const parentPassword = this.state.parentSession.password;
        const kidPasswords = {};
        let successCount = 0;
    
        console.log('loadKidPasswordsToSession: Starting. Using parent master password of length:', parentPassword.length);
        console.log('loadKidPasswordsToSession: Kids currently in app state (this.state.kids):', this.state.kids.length, JSON.stringify(this.state.kids.map(k => ({id: k.id, name: k.name, hasEncryptedFields: !!k.encryptedPassword_base64}))));
    
        if (!this.state.kids || this.state.kids.length === 0) {
            console.log('loadKidPasswordsToSession: No kids found in state to process.');
            this.state.parentSession.kidPasswords = kidPasswords;
            return 0;
        }

        for (const kid of this.state.kids) {
            console.log(`loadKidPasswordsToSession: Processing kid: ID=${kid.id}, Name=${kid.name}.`);
            console.log(`loadKidPasswordsToSession: Kid data for decryption (from state) - Salt: ${kid.salt_base64 ? 'Exists' : 'MISSING!'}, IV: ${kid.iv_base64 ? 'Exists' : 'MISSING!'}, EncPass: ${kid.encryptedPassword_base64 ? 'Exists' : 'MISSING!'}`);
    
            if (!kid.encryptedPassword_base64 || !kid.salt_base64 || !kid.iv_base64) {
                console.warn(`loadKidPasswordsToSession: Kid ${kid.name} (ID: ${kid.id}) is MISSING one or more necessary encrypted password fields in the state object. Skipping decryption for this kid.`);
                continue;
            }
    
            try {
                const decryptedPassword = await this.crypto.decryptKidPassword(kid, parentPassword);
                if (decryptedPassword) {
                    kidPasswords[kid.id] = decryptedPassword;
                    successCount++;
                    console.log(`loadKidPasswordsToSession: ✅ Successfully decrypted and loaded password for kid ${kid.name} (ID: ${kid.id})`);
                } else {
                    console.warn(`loadKidPasswordsToSession: ❌ Failed to decrypt password for kid ${kid.name} (ID: ${kid.id}). 'decryptKidPassword' returned null (likely wrong parent master password or corrupt data for this kid).`);
                }
            } catch (error) {
                console.error(`loadKidPasswordsToSession: ❌ Error during decryption attempt for kid ${kid.name}:`, error);
            }
        }
    
        this.state.parentSession.kidPasswords = kidPasswords; 
        console.log(`loadKidPasswordsToSession: 🔑 Finished. Loaded ${successCount}/${this.state.kids.length} kid passwords into session. Session kid IDs:`, Object.keys(this.state.parentSession.kidPasswords));
        if (successCount < this.state.kids.length && this.state.kids.length > 0) {
            console.warn("loadKidPasswordsToSession: Not all kid passwords could be loaded. This usually indicates the parent master password used for login doesn't match the one used to encrypt some/all kid passwords.");
        }
        
        return successCount;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new FamilyTimelineApp();
    
    // Make app globally accessible for debugging
    window.familyApp = app;
    
    // Add debug helper
    window.debugApp = () => {
        console.log('🐛 DEBUG APP STATE:');
        console.log('Mode:', app.state.mode);
        console.log('Parent Session Active:', app.state.parentSession.active);
        console.log('Parent Master Password (length):', app.state.parentSession.password ? app.state.parentSession.password.length : 'null/undefined');
        console.log('Kids in State:', app.state.kids.map(k => ({ id: k.id, name: k.name, hasEncryptedFields: !!k.encryptedPassword_base64 })));
        console.log('Session Kid Passwords (IDs):', Object.keys(app.state.parentSession.kidPasswords));
        console.log('Full Session Kid Passwords object (for debugging - careful with actual passwords):', JSON.stringify(app.state.parentSession.kidPasswords));
    };

    // FIXED: Clean database helper for fresh start
    window.clearDatabase = async () => {
        if (confirm('⚠️ This will DELETE ALL timeline entries and kids! Are you sure?')) {
            if (confirm('🚨 LAST WARNING: This cannot be undone. Delete everything?')) {
                try {
                    await app.db.clearAllData();
                    // Reset state
                    app.state.setKids([]);
                    app.state.endParentSession();
                    app.ui.updateDisplay();
                    showStatus('Database cleared successfully! You can start fresh.', 'success');
                    console.log('✅ Database cleared - fresh start available');
                } catch (error) {
                    console.error('Failed to clear database:', error);
                    showStatus('Failed to clear database: ' + error.message, 'error');
                }
            }
        }
    };

    // Testing helper for new format
    window.testNewFormat = async () => {
        if (!window.familyApp || !window.familyApp.state.parentSession.active) {
            console.log('❌ Please login as parent first');
            return;
        }
        
        const content = { text: 'Test entry for NEW FORMAT - ' + new Date().toLocaleString() };
        const password = 'testpassword123';
        
        try {
            console.log('🧪 Testing new single-timeline encryption...');
            
            const encrypted = await window.familyApp.crypto.encryptSingleTimelineEntry(content, password);
            console.log('✅ Encryption successful:', encrypted);
            
            const decrypted = await window.familyApp.crypto.decryptSingleTimelineEntry(encrypted, password);
            console.log('✅ Decryption successful:', decrypted);
            
            if (decrypted.content.text === content.text) {
                console.log('✅ Round-trip test PASSED');
            } else {
                console.log('❌ Round-trip test FAILED');
            }
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    };
    
    await app.init();
});

// Handle unhandled errors
window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error, event.message);
    showStatus('An unexpected error occurred. Check console.', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showStatus('An unexpected promise rejection occurred. Check console.', 'error');
});

export { FamilyTimelineApp };