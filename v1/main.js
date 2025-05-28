/**
 * Main Application Entry Point - REFACTORED
 * Orchestrates modules and initializes the Family Timeline app
 */

import { AppState } from './modules/state.js';
import { DatabaseManager } from './modules/database.js';
import { CryptoManager } from './modules/crypto.js'; // Ensure this is the refactored version
import { UIManager } from './modules/ui.js';
import { showStatus } from './utils/helpers.js';

// Import components (unchanged)
import './components/password-checker.js';
import './components/kid-card.js';
import './components/timeline-entry.js';
import './components/modal-dialog.js';

class FamilyTimelineApp {
    constructor() {
        this.state = new AppState();
        this.db = new DatabaseManager(); // Ensure this is the refactored version
        this.crypto = new CryptoManager(); // Ensure this is the refactored version
        this.ui = new UIManager();
        this.initialized = false;
    }

    async init() {
        try {
            console.log('🚀 Initializing Family Timeline App...');
            
            // Initialize modules
            // IMPORTANT: CryptoManager init is now basic, does not load keys by default
            await this.crypto.init(); // Call init for CryptoManager
            await this.db.init();
            await this.state.init(); 
            this.ui.init();
            
            this.setupEventListeners();
            await this.loadInitialData();
            this.ui.updateDisplay();
            
            this.initialized = true;
            showStatus('App loaded successfully!', 'success');
            console.log('✅ App initialization complete');
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            showStatus('Failed to initialize app: ' + error.message, 'error');
        }
    }

    // loadInitialData remains largely the same, focusing on settings and kid profiles
    async loadInitialData() {
        // ... (original implementation)
        try {
            const settings = await this.db.getAppSettings();
            if (settings) this.state.updateSettings(settings);
            
            const kids = await this.db.getKids();
            this.state.setKids(kids);
            
            console.log('📊 Initial data loaded');
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    // setupEventListeners and its sub-setups (menu, auth, kids, settings, state)
    // remain structurally similar. Listener callbacks will be adjusted.
    setupEventListeners() {
        // ... (original structure)
        this.setupMenuListeners();
        this.setupAuthListeners();
        this.setupKidsListeners();
        this.setupSettingsListeners();
        this.setupEntryListeners(); // Will change
        this.setupTimelineListeners(); // Will change
        this.setupStateListeners();
    }

    setupMenuListeners() { /* ... (original implementation) ... */ 
        const menuToggle = document.getElementById('menuToggle');
        const closeMenu = document.getElementById('closeMenu');
        const overlay = document.getElementById('overlay');
        const offCanvas = document.getElementById('offCanvas');
        const openMenu = () => { offCanvas.classList.add('open'); overlay.classList.remove('hidden'); document.body.style.overflow = 'hidden'; };
        const closeMenuHandler = () => { offCanvas.classList.remove('open'); overlay.classList.add('hidden'); document.body.style.overflow = ''; };
        menuToggle?.addEventListener('click', openMenu);
        closeMenu?.addEventListener('click', closeMenuHandler);
        overlay?.addEventListener('click', closeMenuHandler);
    }
    setupAuthListeners() { /* ... (original implementation) ... */ 
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const switchModeBtn = document.getElementById('switchModeBtn');
        loginBtn?.addEventListener('click', async () => this.handleParentLogin());
        logoutBtn?.addEventListener('click', () => this.handleParentLogout());
        switchModeBtn?.addEventListener('click', () => this.handleModeSwitch());
    }
    setupKidsListeners() { /* ... (original implementation) ... */ 
        const addKidBtn = document.getElementById('addKidBtn');
        addKidBtn?.addEventListener('click', async () => this.handleAddKid());
        document.addEventListener('kid-remove', (e) => this.handleRemoveKid(e.detail.kidId));
        document.addEventListener('kid-password-change', (e) => this.handleChangeKidPassword(e.detail.kidId));
    }
    setupSettingsListeners() { /* ... (original implementation) ... */ 
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        saveSettingsBtn?.addEventListener('click', async () => this.handleSaveSettings());
    }
    setupEntryListeners() { /* ... (original implementation, form submit handler changes) ... */ 
        const entryForm = document.getElementById('entryForm');
        entryForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateEntry(); // This handler is significantly refactored
        });
    }
    setupStateListeners() { /* ... (original implementation) ... */ 
        this.state.on('modeChanged', () => this.ui.updateDisplay());
        this.state.on('parentSessionChanged', () => { this.ui.updateDisplay(); this.ui.updateKidsDisplay(); });
        this.state.on('kidsChanged', () => { this.ui.updateKidsDisplay(); this.ui.updateTargetSelection(); });
        this.state.on('settingsChanged', () => this.ui.updateSettingsDisplay());
    }

    // Timeline listeners might need adjustment depending on how timeline selection is handled UI-wise.
    // For now, we assume `handleLoadTimeline` is adapted.
setupTimelineListeners() {
    const viewerPasswordInput = document.getElementById('viewerPassword');
    const loadTimelineBtn = document.getElementById('loadTimelineBtn');

    if (loadTimelineBtn && viewerPasswordInput) {
        loadTimelineBtn.addEventListener('click', async () => {
            const password = viewerPasswordInput.value;

            if (password.length > 0) {
                showStatus('Attempting to unlock timeline...', 'info');
                // Call handleLoadTimeline with only the password.
                // It will now figure out which timeline this password belongs to.
                await this.handleLoadTimeline(password);
            } else {
                this.ui.clearTimeline();
                showStatus('Please enter a password.', 'error');
            }
        });
    } else {
        console.warn('Timeline viewing elements (password input or load button) not found.');
    }

    // Event listener for timeline entry clicks remains largely the same.
    // It will use the password currently in the viewerPasswordInput.
    document.addEventListener('timeline-entry-click', (e) => {
        const password = viewerPasswordInput.value; // Password for current timeline view
        if (!password) {
            // This case should be less likely if entries are only shown after a successful load.
            showStatus('Password context lost. Please re-load the timeline.', 'warning');
            return;
        }
        this.handleTimelineEntryClick(e.detail.entryId, password);
    });
}


    // Event Handlers
    // handleParentLogin, handleParentLogout, handleModeSwitch, handleAddKid, 
    // handleRemoveKid, handleChangeKidPassword, handleSaveSettings remain largely the same
    // as they deal with parent/kid identities and settings, not entry content encryption logic directly.
    // loadKidPasswordsToSession is still crucial.

    async handleParentLogin() { /* ... (original implementation, no change to its own logic) ... */ 
        const passwordComponent = document.getElementById('parentPassword');
        if (!passwordComponent) { showStatus('Password component not found.', 'error'); return; }
        const password = passwordComponent.password;
        if (!password) { showStatus('Please enter your master password', 'error'); return; }
        try {
            const success = await this.state.startParentSession(password);
            if (success) {
                const loadedCount = await this.loadKidPasswordsToSession();
                console.log('handleParentLogin: AFTER loadKidPasswordsToSession. Session kidPasswords:', JSON.stringify(this.state.parentSession.kidPasswords), 'Loaded count:', loadedCount);
                this.ui.updateKidsDisplay();
                if (loadedCount === 0 && this.state.kids.length > 0) {
                    // ... (original re-encrypt confirm logic)
                }
                showStatus('Parent session started successfully!', 'success');
                if (typeof passwordComponent.clearPassword === 'function') passwordComponent.clearPassword();
            } else {
                showStatus('Invalid master password', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showStatus('Login failed: ' + (error.message || 'Unknown error'), 'error');
        }
        console.log('handleParentLogin: AT EXIT. Session kidPasswords:', JSON.stringify(this.state.parentSession.kidPasswords), 'Parent session active:', this.state.parentSession.active);
    }
    handleParentLogout() { /* ... (original implementation) ... */ 
         this.state.endParentSession(); showStatus('Parent session ended', 'success');
    }
    handleModeSwitch() { /* ... (original implementation) ... */ 
        if (this.state.mode === 'kid') {
            this.state.setMode('parent'); showStatus('Switched to Parent Mode', 'success');
        } else {
            if (this.state.parentSession.active) {
                const confirmLogout = confirm('Logging out will end your parent session. Continue?');
                if (!confirmLogout) return;
            }
            this.state.setMode('kid'); this.state.endParentSession(); showStatus('Switched to Kid Mode', 'success');
        }
    }
    async handleAddKid() { /* ... (original implementation, uses crypto.encryptKidPassword correctly) ... */ 
        try {
            const nameInput = document.getElementById('newKidName');
            const passwordComponent = document.getElementById('newKidPassword');
            const name = nameInput.value.trim();
            const password = passwordComponent.password;
            if (!name || !password) { showStatus('Name and password required.', 'error'); return; }
            const parentPassword = this.state.parentSession.password;
            if (!parentPassword) { showStatus('Parent session not active.', 'error'); return; }
            const encryptedData = await this.crypto.encryptKidPassword(password, parentPassword);
            const kidId = await this.db.createKid({ name, ...encryptedData });
            const newKidData = { id: kidId, name, isActive: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...encryptedData };
            this.state.addKid(newKidData);
            this.state.setKidPasswordInSession(kidId, password);
            nameInput.value = ''; passwordComponent.clearPassword();
            showStatus(`${name} added successfully!`, 'success');
        } catch (error) { console.error('Add kid error:', error); showStatus('Failed to add kid: ' + error.message, 'error'); }
    }
    async handleRemoveKid(kidId) { /* ... (original implementation) ... */ 
        try {
            const kid = this.state.kids.find(k => k.id === kidId);
            if (!kid) return;
            const confirmRemove = confirm(`Remove ${kid.name}? This may make their timeline entries inaccessible if not backed up or re-added with the same password.`);
            if (!confirmRemove) return;
            await this.db.removeKid(kidId); this.state.removeKid(kidId);
            showStatus(`${kid.name} removed successfully`, 'success');
        } catch (error) { console.error('Remove kid error:', error); showStatus('Failed to remove kid: ' + error.message, 'error'); }
    }
    async handleChangeKidPassword(kidId) { /* ... (original implementation, uses crypto.encryptKidPassword correctly) ... */ 
        try {
            const kid = this.state.kids.find(k => k.id === kidId);
            if (!kid) return;
            const newPassword = prompt(`Enter new password for ${kid.name}:`);
            if (!newPassword) return;
            const parentPassword = this.state.parentSession.password;
            if (!parentPassword) { showStatus('Parent session not active.', 'error'); return; }
            const encryptedData = await this.crypto.encryptKidPassword(newPassword, parentPassword);
            await this.db.updateKidPassword(kidId, encryptedData);
            this.state.updateKidPassword(kidId, encryptedData);
            this.state.setKidPasswordInSession(kidId, newPassword);
            showStatus(`Password updated for ${kid.name}!`, 'success');
        } catch (error) { console.error('Change password error:', error); showStatus('Failed to update password: ' + error.message, 'error'); }
    }
    async handleSaveSettings() { /* ... (original implementation) ... */ 
        try {
            const parentName = document.getElementById('parentNameInput').value.trim();
            const timelineName = document.getElementById('timelineNameInput').value.trim();
            const settings = { parentName: parentName || 'Parent', generalTimelineName: timelineName || 'Family Timeline' };
            await this.db.saveAppSettings(settings); this.state.updateSettings(settings);
            showStatus('Settings saved successfully!', 'success');
        } catch (error) { console.error('Save settings error:', error); showStatus('Failed to save settings: ' + error.message, 'error'); }
    }

    /**
     * REFACTORED: Creates timeline entries.
     * For each selected target timeline, it encrypts the content with that
     * timeline's specific password and creates a separate database entry.
     */
    async handleCreateEntry() {
        console.log('handleCreateEntry (Refactored): Starting...');
        try {
            const text = document.getElementById('entryText').value;
            const imageFile = document.getElementById('imageInput').files[0];
            const audioFile = document.getElementById('audioInput').files[0];
            const targetTimelineIds = Array.from(document.querySelectorAll('input[name="target"]:checked'))
                .map(cb => cb.value); // e.g., ['general', 'kid1', 'kid2']

            if (!text && !imageFile && !audioFile) {
                showStatus('Please provide some content for the entry', 'error');
                return;
            }
            if (targetTimelineIds.length === 0) {
                showStatus('Please select at least one timeline', 'error');
                return;
            }

            const content = { text };
            if (imageFile) content.image = await this.crypto.fileToBase64(imageFile);
            if (audioFile) content.audio = await this.crypto.fileToBase64(audioFile);

            let entriesCreatedCount = 0;
            for (const targetId of targetTimelineIds) {
                let timelinePassword;
                if (targetId === 'general') {
                    timelinePassword = this.state.parentSession.password;
                } else if (targetId.startsWith('kid')) {
                    const kidIdNum = parseInt(targetId.replace('kid', ''));
                    timelinePassword = this.state.parentSession.kidPasswords[kidIdNum];
                } else {
                    console.warn(`Unknown target type: ${targetId}, skipping.`);
                    continue;
                }

                if (!timelinePassword) {
                    const kid = targetId.startsWith('kid') ? this.state.kids.find(k => k.id === parseInt(targetId.replace('kid', ''))) : null;
                    const targetName = kid ? kid.name : targetId;
                    showStatus(`Cannot create entry for ${targetName}: Password not available. Please re-login or check kid password setup.`, 'error', 8000);
                    continue; // Skip this target, try others
                }

                try {
                    // Encrypt content specifically for this timeline
                    const encryptedDataForTimeline = await this.crypto.encryptEntry(content, timelinePassword);
                    
                    // Create a distinct database entry for this timeline
                    await this.db.createEntry({
                        ...encryptedDataForTimeline, // Contains encryptedContent_base64, salt_base64, iv_base64
                        targetTimeline: targetId     // The specific timeline this entry is for
                    });
                    entriesCreatedCount++;
                } catch (encError) {
                    console.error(`Failed to encrypt/save entry for target ${targetId}:`, encError);
                    showStatus(`Error creating entry for ${targetId}: ${encError.message}`, 'error');
                }
            }

            if (entriesCreatedCount > 0) {
                showStatus(`${entriesCreatedCount} timeline entr${entriesCreatedCount > 1 ? 'ies' : 'y'} created successfully!`, 'success');
                document.getElementById('entryForm').reset();
                document.querySelectorAll('input[name="target"]').forEach(cb => cb.checked = false);
                this.ui.updateCreateButtonState();
            } else if (targetTimelineIds.length > 0) {
                 showStatus('Entry creation failed for all selected timelines. See console for details.', 'error');
            }

        } catch (error) {
            console.error('Create entry main error:', error);
            showStatus('Failed to create entry: ' + error.message, 'error');
        }
    }

    /**
     * REFACTORED: Loads and displays entries for a specific timeline using its password.
     */
async handleLoadTimeline(password) {
    try {
        let foundTimelineId = null;
        let accessibleEntries = [];
        let successfullyDecryptedSomething = false;

        // 1. Try the "General" timeline first
        console.log(`🔍 Trying to decrypt 'general' timeline with the provided password.`);
        const generalTimelineId = 'general';
        // Fetch a small number of recent entries for 'general' to test decryption
        const generalEntriesToTest = await this.db.getEntriesForTimeline(generalTimelineId, 5); 

        for (const entry of generalEntriesToTest) {
            const decryptedContent = await this.crypto.decryptEntry(entry, password);
            if (decryptedContent) {
                console.log(`✅ Password matches 'general' timeline (based on entry ID: ${entry.id})`);
                foundTimelineId = generalTimelineId;
                successfullyDecryptedSomething = true;
                break; // Found the timeline
            }
        }

        // 2. If not found, try each kid's timeline
        if (!successfullyDecryptedSomething) {
            const kids = this.state.kids; // Get kids from AppState
            if (kids && kids.length > 0) {
                for (const kid of kids) {
                    const kidTimelineId = `kid${kid.id}`;
                    console.log(`🔍 Trying to decrypt '${kidTimelineId}' (${kid.name}) with the provided password.`);
                    // Fetch a small number of recent entries for this kid to test decryption
                    const kidEntriesToTest = await this.db.getEntriesForTimeline(kidTimelineId, 5);

                    for (const entry of kidEntriesToTest) {
                        const decryptedContent = await this.crypto.decryptEntry(entry, password);
                        if (decryptedContent) {
                            console.log(`✅ Password matches '${kidTimelineId}' (${kid.name}) (based on entry ID: ${entry.id})`);
                            foundTimelineId = kidTimelineId;
                            successfullyDecryptedSomething = true;
                            break; // Found the kid's timeline
                        }
                    }
                    if (successfullyDecryptedSomething) {
                        break; // Found the timeline, no need to check other kids
                    }
                }
            }
        }

        // 3. If a timeline was identified, load all its entries and decrypt them
        if (foundTimelineId) {
            console.log(`🔓 Loading all entries for identified timeline: ${foundTimelineId}`);
            const allEntriesForFoundTimeline = await this.db.getEntriesForTimeline(foundTimelineId); // Get all entries

            for (const entry of allEntriesForFoundTimeline) {
                const decryptedEntryData = await this.crypto.decryptEntry(entry, password);
                if (decryptedEntryData) {
                    accessibleEntries.push({
                        ...entry,
                        decryptedContent: decryptedEntryData.content,
                    });
                } else {
                    // This shouldn't happen often if the initial test pass identified the timeline correctly,
                    // but good to log if an individual entry fails.
                    console.warn(`Could not decrypt entry ID ${entry.id} from confirmed timeline ${foundTimelineId}. Data might be corrupted or an anomaly.`);
                }
            }
            
            if (accessibleEntries.length > 0) {
                this.ui.displayTimelineEntries(accessibleEntries, foundTimelineId);
                showStatus(`Timeline for ${foundTimelineId} loaded successfully.`, 'success');
                // Optionally, store the successfully used password and foundTimelineId in AppState
                // if you need to refer to the "active viewing session".
                // this.state.setActiveTimelineView(foundTimelineId, password);
            } else if (generalEntriesToTest.length > 0 && foundTimelineId === generalTimelineId || 
                       (this.state.kids.find(k => `kid${k.id}` === foundTimelineId) && (await this.db.getEntriesForTimeline(foundTimelineId,1)).length > 0) ) {
                // Timeline was identified, but no entries could be decrypted (or no entries exist)
                 this.ui.clearTimeline(); // Clear any previous entries
                 this.ui.displayTimelineEntries([], foundTimelineId); // Show an empty state for this timeline
                 showStatus(`No viewable entries found for ${foundTimelineId}, or timeline is empty.`, 'info');
            }


        } else {
            this.ui.clearTimeline();
            showStatus('Incorrect password or no timeline found matching this password.', 'error');
        }

    } catch (error) {
        console.error('Error during timeline loading by password discovery:', error);
        this.ui.clearTimeline();
        showStatus('Failed to load timeline: ' + error.message, 'error');
    }
}

    /**
     * REFACTORED: Handles click on a timeline entry, decrypts with the provided password
     * (assumed to be the password for the timeline the entry belongs to).
     */
    async handleTimelineEntryClick(entryId, passwordForTimeline) { // Password needs to be passed or retrieved
        try {
            if (!passwordForTimeline) {
                showStatus('Password required to view entry details. Please ensure the timeline password is active.', 'error');
                const viewerPasswordInput = document.getElementById('viewerPassword');
                if (viewerPasswordInput) viewerPasswordInput.focus();
                return;
            }

            const entryFromDB = await this.db.getEntry(entryId);
            if (!entryFromDB) {
                showStatus('Entry not found.', 'error');
                return;
            }
            
            // `entryFromDB` contains encryptedContent_base64, salt_base64, iv_base64
            // The `passwordForTimeline` is the one used to view the current timeline,
            // so it should be the correct one for this entry.
            const decryptedEntryData = await this.crypto.decryptEntry(entryFromDB, passwordForTimeline);

            if (decryptedEntryData) {
                // Pass the full entry from DB (for id, timestamp) and the decrypted content separately
                this.ui.showEntryModal({
                    ...entryFromDB, // includes id, timestamp, targetTimeline, etc.
                    content: decryptedEntryData.content // the actual decrypted payload
                });
            } else {
                showStatus('Cannot decrypt this entry with the current timeline password.', 'error');
            }
        } catch (error) {
            console.error('View entry error:', error);
            showStatus('Failed to view entry: ' + error.message, 'error');
        }
    }

    // loadKidPasswordsToSession remains crucial and its internal logic is unchanged.
    async loadKidPasswordsToSession() {
        // ... (original implementation, ensure it uses the refactored crypto.decryptKidPassword if that changed, though it seems it did not need to)
        if (!this.state.parentSession.active || !this.state.parentSession.password) {
            console.warn('loadKidPasswordsToSession: Parent session not active or master password not set. Skipping.');
            return 0;
        }
        const parentPassword = this.state.parentSession.password;
        const kidPasswords = {}; let successCount = 0;
        console.log('loadKidPasswordsToSession: Starting. Kids in state:', this.state.kids.length);
        if (!this.state.kids || this.state.kids.length === 0) {
            this.state.parentSession.kidPasswords = kidPasswords; return 0;
        }
        for (const kid of this.state.kids) {
            console.log(`loadKidPasswordsToSession: Processing kid: ID=${kid.id}, Name=${kid.name}.`);
            if (!kid.encryptedPassword_base64 || !kid.salt_base64 || !kid.iv_base64) {
                console.warn(`loadKidPasswordsToSession: Kid ${kid.name} (ID: ${kid.id}) missing encrypted fields. Skipping.`);
                continue;
            }
            try {
                const decryptedPassword = await this.crypto.decryptKidPassword(kid, parentPassword);
                if (decryptedPassword) {
                    kidPasswords[kid.id] = decryptedPassword; successCount++;
                    console.log(`loadKidPasswordsToSession: ✅ Decrypted password for kid ${kid.name}`);
                } else {
                    console.warn(`loadKidPasswordsToSession: ❌ Failed to decrypt password for kid ${kid.name}.`);
                }
            } catch (error) {
                console.error(`loadKidPasswordsToSession: ❌ Error for kid ${kid.name}:`, error);
            }
        }
        this.state.parentSession.kidPasswords = kidPasswords;
        console.log(`loadKidPasswordsToSession: 🔑 Finished. Loaded ${successCount}/${this.state.kids.length} kid passwords. Session kid IDs:`, Object.keys(this.state.parentSession.kidPasswords));
        if (successCount < this.state.kids.length && this.state.kids.length > 0) {
            console.warn("loadKidPasswordsToSession: Not all kid passwords loaded. Parent master password might not match encryption password for some kids.");
        }
        return successCount;
    }
}

// App initialization and global error handlers (DOMContentLoaded, error, unhandledrejection)
// remain unchanged.
document.addEventListener('DOMContentLoaded', async () => {
    const app = new FamilyTimelineApp();
    window.familyApp = app; // For debugging
    window.debugApp = () => { /* ... (original debugApp implementation) ... */ 
        console.log('🐛 DEBUG APP STATE:');
        console.log('Mode:', app.state.mode);
        console.log('Parent Session Active:', app.state.parentSession.active);
        console.log('Parent Master Password (length):', app.state.parentSession.password ? app.state.parentSession.password.length : 'null/undefined');
        console.log('Kids in State:', app.state.kids.map(k => ({ id: k.id, name: k.name, hasEncryptedFields: !!k.encryptedPassword_base64 })));
        console.log('Session Kid Passwords (IDs):', Object.keys(app.state.parentSession.kidPasswords));
        // console.log('Full Session Kid Passwords object (for debugging - careful with actual passwords):', JSON.stringify(app.state.parentSession.kidPasswords));
    };
    await app.init();
});

window.addEventListener('error', (event) => { /* ... (original implementation) ... */ 
    console.error('Unhandled error:', event.error, event.message); showStatus('An unexpected error occurred. Check console.', 'error');
});
window.addEventListener('unhandledrejection', (event) => { /* ... (original implementation) ... */ 
    console.error('Unhandled promise rejection:', event.reason); showStatus('An unexpected promise rejection occurred. Check console.', 'error');
});

export { FamilyTimelineApp };