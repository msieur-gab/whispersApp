/**
 * Main Application Entry Point
 * Orchestrates modules and initializes the Family Timeline app
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
        this.crypto = new CryptoManager();
        this.db = new DatabaseManager(this.crypto); // Pass crypto instance
        this.ui = new UIManager;
        this.initialized = false;
    }

    async init() {
        try {
            console.log('🚀 Initializing Family Timeline App...');
            // Assuming CryptoManager doesn't have an async init itself, or it's self-contained.
            // await this.crypto.init(); // If it had one
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

    async loadInitialData() {
        try {
            const settings = await this.db.getAppSettings();
            if (settings) {
                this.state.updateSettings(settings);
            }
            const kids = await this.db.getKids();
            this.state.setKids(kids);
            console.log('📊 Initial data loaded');
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    setupEventListeners() {
        this.setupMenuListeners();
        this.setupAuthListeners();
        this.setupKidsListeners();
        this.setupSettingsListeners();
        this.setupEntryListeners();
        this.setupTimelineListeners();
        this.setupStateListeners();

// Listener for the new Import Button in the "View Timeline" section (Kid/General View)
    const importViewButton = document.getElementById('importTimelineViewBtn');
    importViewButton?.addEventListener('click', () => {
        this.handleTriggerImportTimeline(); // Reuses the existing generic import handler
    });

    // Listener for the new Import Button in the Parent Settings Panel
    const importParentButton = document.getElementById('importTimelineParentBtn');
    importParentButton?.addEventListener('click', () => {
        this.handleTriggerImportTimeline(); // Also reuses the existing generic import handler
    });

        // Example: If you add an import button with ID "importTimelineBtn_SETTINGS"
        const importBtnSettings = document.getElementById('importTimelineBtn_SETTINGS');
        importBtnSettings?.addEventListener('click', () => this.handleTriggerImportTimeline());

        // Export listeners might be better handled via event delegation if they are on dynamic kid cards
        // For example, in setupKidsListeners:
        // document.getElementById('kidsListContainer').addEventListener('click', (e) => {
        //     if (e.target.classList.contains('export-kid-button')) {
        //         const kidId = parseInt(e.target.dataset.kidId);
        //         const kidName = e.target.dataset.kidName;
        //         if (kidId && kidName) {
        //            this.handleTriggerExportKidTimeline(kidId, kidName);
        //         }
        //     }
        // });
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
        loginBtn?.addEventListener('click', () => this.handleParentLogin());
        logoutBtn?.addEventListener('click', () => this.handleParentLogout());
        switchModeBtn?.addEventListener('click', () => this.handleModeSwitch());
    }

    setupKidsListeners() {
        const addKidBtn = document.getElementById('addKidBtn');
        addKidBtn?.addEventListener('click', () => this.handleAddKid());

        // Event delegation for kid card actions
        document.addEventListener('kid-remove', (e) => {
            this.handleRemoveKid(e.detail.kidId);
        });
        document.addEventListener('kid-password-change', (e) => {
            this.handleChangeKidPassword(e.detail.kidId);
        });
        // Example for export trigger from a kid card (assumes kid-card dispatches this event)
        document.addEventListener('export-kid-timeline', (e) => {
            const { kidId, kidName } = e.detail; // kidId is numeric
            if (kidId && kidName) {
                this.handleTriggerExportKidTimeline(kidId, kidName);
            } else {
                console.error("Export event missing kidId or kidName", e.detail);
                showStatus("Could not export: missing kid information.", "error");
            }
        });
    }

    setupSettingsListeners() {
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        saveSettingsBtn?.addEventListener('click', () => this.handleSaveSettings());
        
        // If you have a general import button in settings (not kid-specific)
        const generalImportButton = document.getElementById('generalImportButton');
        generalImportButton?.addEventListener('click', () => this.handleTriggerImportTimeline());
    }

    setupEntryListeners() {
        const entryForm = document.getElementById('entryForm');
        entryForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateEntry();
        });
    }

    setupTimelineListeners() {
        const viewerPasswordInput = document.getElementById('viewerPassword');
        viewerPasswordInput?.addEventListener('input', (e) => {
            const password = e.target.value;
            if (password.length > 0) {
                this.handleLoadTimeline(password);
            } else {
                this.ui.clearTimeline();
            }
        });
        document.addEventListener('timeline-entry-click', (e) => {
            this.handleTimelineEntryClick(e.detail.entryId);
        });
    }

    setupStateListeners() {
        this.state.on('modeChanged', () => this.ui.updateDisplay());
        this.state.on('parentSessionChanged', () => {
            this.ui.updateDisplay();
            this.ui.updateKidsDisplay();
        });
        this.state.on('kidsChanged', () => {
            this.ui.updateKidsDisplay();
            this.ui.updateTargetSelection();
        });
        this.state.on('settingsChanged', () => this.ui.updateSettingsDisplay());
    }

    async handleParentLogin() {
        const passwordComponent = document.getElementById('parentPassword');
        if (!passwordComponent) {
            showStatus('Password component not found.', 'error'); return;
        }
        const password = passwordComponent.password;
        if (!password) {
            showStatus('Please enter your master password', 'error'); return;
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
        const viewerPasswordInput = document.getElementById('viewerPassword');
        if (viewerPasswordInput) viewerPasswordInput.value = '';
        this.ui.clearTimeline();
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

            if (!name) { showStatus('Please enter a name for the kid', 'error'); return; }
            if (!password) { showStatus('Please set a password for the kid', 'error'); return; }

            const parentPassword = this.state.parentSession.password;
            if (!parentPassword) {
                showStatus('Parent session not active or password missing. Cannot add kid.', 'error'); return;
            }
            const encryptedData = await this.crypto.encryptKidPassword(password, parentPassword);
            const kidId = await this.db.createKid({ name, ...encryptedData });
            const newKidData = {
                id: kidId, name, isActive: 1, createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(), ...encryptedData
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
                `Remove ${kid.name}? This will make their timeline entries inaccessible unless you re-add them with the same password or restore from a backup.`
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
            // Add password strength validation if desired:
            // const strength = this.crypto.validatePasswordStrength(newPassword);
            // if (!strength.isValid) { showStatus(`Password is too weak. ${Object.entries(strength.requirements).filter(([_,v]) => !v).map(([k,_])=>k).join(', ')}`, 'error'); return; }

            const parentPassword = this.state.parentSession.password;
            if (!parentPassword) {
                showStatus('Parent session not active or password missing. Cannot change kid password.', 'error'); return;
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

    async handleCreateEntry() {
        try {
            const text = document.getElementById('entryText').value;
            const imageFile = document.getElementById('imageInput').files[0];
            const audioFile = document.getElementById('audioInput').files[0];
            const targets = Array.from(document.querySelectorAll('input[name="target"]:checked')).map(cb => cb.value);

            if (!text && !imageFile && !audioFile) { showStatus('Please provide some content for the entry', 'error'); return; }
            if (targets.length === 0) { showStatus('Please select at least one timeline', 'error'); return; }

            const kidTargets = targets.filter(t => t.startsWith('kid'));
            const missingPasswords = kidTargets.filter(target => {
                const kidNumericId = parseInt(target.replace('kid', ''));
                return !this.state.parentSession.kidPasswords[kidNumericId];
            });

            if (missingPasswords.length > 0) {
                const missingNames = missingPasswords.map(target => {
                    const kidNumericId = parseInt(target.replace('kid', ''));
                    const kid = this.state.kids.find(k => k.id === kidNumericId);
                    return kid ? kid.name : target;
                }).join(', ');
                showStatus(`Cannot create entry: Missing passwords for ${missingNames}. Please re-login or update passwords.`, 'error', 8000);
                return;
            }

            const content = { text };
            if (imageFile) content.image = await this.crypto.fileToBase64(imageFile);
            if (audioFile) content.audio = await this.crypto.fileToBase64(audioFile);

            const encryptedEntry = await this.crypto.encryptEntry(
                content, targets, this.state.parentSession.password, this.state.parentSession.kidPasswords
            );
            await this.db.createEntry(encryptedEntry);
            document.getElementById('entryForm').reset();
            document.querySelectorAll('input[name="target"]').forEach(cb => cb.checked = false);
            this.ui.updateCreateButtonState();
            showStatus(`Entry created successfully!`, 'success');
        } catch (error) {
            console.error('Create entry error:', error);
            showStatus('Failed to create entry: ' + error.message, 'error');
        }
    }

    async handleLoadTimeline(password) {
        try {
            const entries = await this.db.getEntries();
            const accessibleEntries = [];
            for (const entry of entries) {
                try {
                    const decryptedContent = await this.crypto.decryptEntry(entry, password);
                    if (decryptedContent) {
                        accessibleEntries.push({ ...entry, decryptedContent });
                    }
                } catch (error) {
                    console.warn(`Could not decrypt entry ID ${entry.id} with the provided password.`, error.message);
                }
            }
            this.ui.displayTimelineEntries(accessibleEntries);
        } catch (error) {
            console.error('Load timeline error:', error);
            showStatus('Failed to load timeline: ' + error.message, 'error');
        }
    }

    async handleTimelineEntryClick(entryId) {
        try {
            const password = document.getElementById('viewerPassword').value;
            if (!password) { showStatus('Password required to view entry details', 'error'); return; }
            const entry = await this.db.getEntry(entryId);
            if (!entry) { showStatus('Entry not found.', 'error'); return; }
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
            console.warn('loadKidPasswordsToSession: Parent session not active or master password not set.');
            this.state.parentSession.kidPasswords = {}; // Ensure it's an empty object
            return 0;
        }
        const parentPassword = this.state.parentSession.password;
        const kidPasswords = {};
        let successCount = 0;

        if (!this.state.kids || this.state.kids.length === 0) {
            console.log('loadKidPasswordsToSession: No kids found in state.');
            this.state.parentSession.kidPasswords = kidPasswords;
            return 0;
        }
        for (const kid of this.state.kids) {
            if (!kid.encryptedPassword_base64 || !kid.salt_base64 || !kid.iv_base64) {
                console.warn(`loadKidPasswordsToSession: Kid ${kid.name} (ID: ${kid.id}) missing encrypted fields.`);
                continue;
            }
            try {
                const decryptedPassword = await this.crypto.decryptKidPassword(kid, parentPassword);
                if (decryptedPassword) {
                    kidPasswords[kid.id] = decryptedPassword; // Key is numeric ID
                    successCount++;
                } else {
                    console.warn(`loadKidPasswordsToSession: Failed to decrypt password for kid ${kid.name} (ID: ${kid.id}).`);
                }
            } catch (error) {
                console.error(`loadKidPasswordsToSession: Error for kid ${kid.name} (ID: ${kid.id}):`, error);
            }
        }
        this.state.parentSession.kidPasswords = kidPasswords;
        console.log(`loadKidPasswordsToSession: Loaded ${successCount}/${this.state.kids.length} kid passwords. IDs:`, Object.keys(this.state.parentSession.kidPasswords));
        if (successCount < this.state.kids.length && this.state.kids.length > 0) {
            console.warn("loadKidPasswordsToSession: Not all kid passwords could be loaded.");
        }
        return successCount;
    }

    async handleTriggerExportKidTimeline(kidNumericId, kidName) {
        const kidIdKey = `kid${kidNumericId}`;
        try {
            showStatus(`Exporting timeline for ${kidName}...`, 'info');
            const exportedData = await this.db.exportKidTimeline(kidIdKey, kidName);
            const jsonData = JSON.stringify(exportedData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeKidName = kidName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '');
            a.download = `timeline_${safeKidName}_${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showStatus(`Timeline for ${kidName} exported successfully!`, 'success');
        } catch (error) {
            console.error(`Failed to export timeline for ${kidName}:`, error);
            showStatus(`Export failed for ${kidName}: ${error.message}`, 'error');
        }
    }

    async handleTriggerImportTimeline() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const password = prompt('Enter the password for this timeline (kid\'s password or parent master password):');
            if (password === null) return;
            if (!password) {
                showStatus('Password is required to import the timeline.', 'error'); return;
            }
            try {
                showStatus('Importing timeline...', 'info');
                const fileContent = await file.text();
                const dataToImport = JSON.parse(fileContent);
                const result = await this.db.importKidTimeline(dataToImport, password);
                showStatus(`Import complete: ${result.importedCount} entries imported, ${result.failedCount} failed. Refreshing data...`, 'success', 5000);
                await this.loadInitialData();
                const currentViewerPassword = document.getElementById('viewerPassword')?.value;
                if (currentViewerPassword) {
                    await this.handleLoadTimeline(currentViewerPassword);
                } else {
                     showStatus("Timeline imported. Enter password in viewer to see entries if in Kid Mode.", "info");
                }
            } catch (error) {
                console.error('Failed to import timeline:', error);
                showStatus(`Import failed: ${error.message}`, 'error');
            }
        };
        fileInput.click();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new FamilyTimelineApp();
    window.familyApp = app;
    window.debugApp = () => {
        console.log('🐛 DEBUG APP STATE:');
        console.log('Mode:', app.state.mode);
        console.log('Parent Session Active:', app.state.parentSession.active);
        console.log('Parent Master Password (length):', app.state.parentSession.password ? app.state.parentSession.password.length : 'null/undefined');
        const kidsInState = app.state.kids.map(k => ({ id: k.id, name: k.name, keyInEncryptionInfo: `kid${k.id}`, hasEncryptedFields: !!k.encryptedPassword_base64 }));
        console.log('Kids in State:', JSON.stringify(kidsInState, null, 2));
        console.log('Session Kid Passwords (Numeric IDs as keys):', Object.keys(app.state.parentSession.kidPasswords));
        // For deeper debug, uncomment carefully:
        // console.log('Full Session Kid Passwords object:', JSON.stringify(app.state.parentSession.kidPasswords));
        console.log('Database instance:', app.db.db ? 'Available' : 'Not available');
        console.log('Crypto instance in DB:', app.db.crypto ? 'Available' : 'Not available');
    };
    await app.init();
});

window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error, event.message);
    showStatus('An unexpected error occurred. Check console.', 'error');
});
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showStatus('An unexpected promise rejection occurred. Check console.', 'error');
});

export { FamilyTimelineApp };