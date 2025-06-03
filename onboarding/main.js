/**
 * Fresh Family Timeline App - Main Application
 * Minimal implementation focusing on onboarding and basic mode switching
 */

import { DatabaseManager } from './modules/database.js';
import './components/family-onboarding.js';

class FamilyTimelineApp {
    constructor() {
        this.db = new DatabaseManager();
        this.initialized = false;
        this.onboardingActive = false;
        this.currentMode = null;
        this.familyData = null;
    }

    async init() {
        try {
            console.log('🚀 Initializing Fresh Family Timeline App...');
            
            // Initialize database
            await this.db.init();
            
            // Check if onboarding is needed
            const needsOnboarding = await this.checkOnboardingNeeded();
            
            if (needsOnboarding) {
                console.log('👋 First time setup - showing onboarding');
                await this.showOnboarding();
                return;
            }
            
            // Load existing family data and show mode selection
            await this.loadFamilyData();
            this.showModeSelection();
            
            this.initialized = true;
            console.log('✅ App initialization complete');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showStatus('Failed to initialize app: ' + error.message, 'error');
        }
    }

    // Check if onboarding is needed
    async checkOnboardingNeeded() {
        try {
            const familyCount = await this.db.db.families.count();
            const userCount = await this.db.db.users.count();
            
            return familyCount === 0 || userCount === 0;
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            return true; // If in doubt, show onboarding
        }
    }

    // Show onboarding component
    async showOnboarding() {
        this.onboardingActive = true;
        
        // Create and show onboarding
        const onboarding = document.createElement('family-onboarding');
        document.body.appendChild(onboarding);

        // Listen for onboarding completion
        onboarding.addEventListener('onboarding-complete', (e) => {
            this.handleOnboardingComplete(e.detail);
        });
    }

    // Handle onboarding completion
    async handleOnboardingComplete(familyData) {
        try {
            console.log('🏁 Completing onboarding with family data:', familyData);
            
            this.showStatus('Setting up your family timeline...', 'info');

            // 1. Save app settings
            await this.db.saveAppSettings(familyData.settings);

            // 2. Create parent user
            const parentId = await this.db.createUser({
                type: 'parent',
                name: familyData.parent.name,
                primaryLanguage: familyData.parent.language,
                languages: [familyData.parent.language]
            });

            // 3. Create children users
            for (const child of familyData.children) {
                await this.db.createUser({
                    type: 'kid',
                    name: child.name,
                    password: child.password, // Will be encrypted by createUser
                    primaryLanguage: child.language,
                    languages: [child.language]
                });
            }

            // 4. Store family data for later use
            this.familyData = familyData;

            // 5. Remove onboarding and show mode selection
            this.hideOnboarding();
            this.showModeSelection();

            const childCount = familyData.children.length;
            this.showStatus(
                `🎉 Welcome ${familyData.parent.name}! Your family timeline is ready with ${childCount} ${childCount === 1 ? 'child' : 'children'}.`, 
                'success',
                8000
            );

            console.log('✅ Onboarding completed successfully');

        } catch (error) {
            console.error('❌ Onboarding completion failed:', error);
            this.showStatus('Failed to set up family: ' + error.message, 'error');
            alert('There was an error setting up your family. Please check the information and try again.');
        }
    }

    // Hide onboarding component
    hideOnboarding() {
        this.onboardingActive = false;
        const onboarding = document.querySelector('family-onboarding');
        if (onboarding) {
            onboarding.remove();
        }
    }

    // Load existing family data
    async loadFamilyData() {
        try {
            const settings = await this.db.getAppSettings();
            const users = await this.db.getUsers();
            
            if (settings && users.length > 0) {
                this.familyData = {
                    settings,
                    parent: users.find(u => u.type === 'parent'),
                    children: users.filter(u => u.type === 'kid')
                };
                console.log('📊 Loaded family data:', this.familyData);
            }
        } catch (error) {
            console.error('Failed to load family data:', error);
        }
    }

    // Show mode selection screen
    showModeSelection() {
        const modeScreen = document.getElementById('modeSelectionScreen');
        if (modeScreen) {
            modeScreen.classList.remove('hidden');
        }
        
        this.setupModeSelectionListeners();
    }

    // Setup mode selection event listeners
    setupModeSelectionListeners() {
        const parentModeCard = document.getElementById('selectParentMode');
        const kidModeCard = document.getElementById('selectKidMode');

        parentModeCard?.addEventListener('click', () => {
            this.selectMode('parent');
        });

        kidModeCard?.addEventListener('click', () => {
            this.selectMode('kid');
        });
    }

    // Select mode and show appropriate interface
    selectMode(mode) {
        this.currentMode = mode;
        
        // Hide mode selection screen
        const modeScreen = document.getElementById('modeSelectionScreen');
        if (modeScreen) {
            modeScreen.classList.add('hidden');
        }

        // Show main app
        const mainApp = document.getElementById('mainApp');
        if (mainApp) {
            mainApp.classList.remove('hidden');
        }

        // Update header
        this.updateHeader(mode);

        // Show appropriate content
        this.showModeContent(mode);

        // Setup event listeners for the selected mode
        this.setupModeEventListeners(mode);

        // Show welcome message
        if (mode === 'parent') {
            this.showStatus('👨‍💼 Parent Mode: You can create memories and manage your family timeline', 'info', 5000);
        } else {
            this.showStatus('👧 Kid Mode: Enter your password to view your timeline', 'info', 5000);
        }
    }

    // Update header for current mode
    updateHeader(mode) {
        const header = document.querySelector('.header');
        const modeIndicator = document.getElementById('modeIndicator');
        
        if (header) {
            header.className = `header ${mode}-mode`;
        }
        
        if (modeIndicator) {
            modeIndicator.className = `mode-indicator ${mode}-mode`;
            modeIndicator.textContent = mode === 'parent' ? 'Parent Mode' : 'Kid Mode';
        }

        // Setup mode switching
        const switchBtn = document.getElementById('switchModeBtn');
        switchBtn?.addEventListener('click', () => {
            this.switchMode();
        });
    }

    // Show content for selected mode
    showModeContent(mode) {
        // Hide all mode content
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Show selected mode content
        const modeContent = document.getElementById(`${mode}Content`);
        if (modeContent) {
            modeContent.classList.remove('hidden');
        }

        // Populate mode-specific content
        if (mode === 'parent') {
            this.populateParentContent();
        }
    }

    // Populate parent mode content
    populateParentContent() {
        const familyInfo = document.getElementById('familyInfo');
        if (familyInfo && this.familyData) {
            const childCount = this.familyData.children.length;
            familyInfo.innerHTML = `
                <div class="family-summary">
                    <p><strong>Parent:</strong> ${this.familyData.parent?.name || 'Unknown'}</p>
                    <p><strong>Children:</strong> ${childCount} ${childCount === 1 ? 'child' : 'children'}</p>
                    <p><strong>Timeline:</strong> ${this.familyData.settings?.generalTimelineName || 'Family Timeline'}</p>
                </div>
            `;
        }
    }

    // Setup event listeners for current mode
    setupModeEventListeners(mode) {
        if (mode === 'parent') {
            this.setupParentModeListeners();
        } else if (mode === 'kid') {
            this.setupKidModeListeners();
        }
    }

    // Setup parent mode event listeners
    setupParentModeListeners() {
        const showFamilyBtn = document.getElementById('showFamilyDetailsBtn');
        showFamilyBtn?.addEventListener('click', () => {
            this.showFamilyDetails();
        });
    }

    // Setup kid mode event listeners
    setupKidModeListeners() {
        const kidPasswordForm = document.getElementById('kidPasswordForm');
        kidPasswordForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('kidPassword').value.trim();
            if (password) {
                this.loadKidTimeline(password);
            }
        });
    }

    // Show family details modal
    showFamilyDetails() {
        const modal = document.getElementById('familyModal');
        const modalBody = document.getElementById('familyModalBody');
        
        if (modal && modalBody && this.familyData) {
            // Populate modal content
            modalBody.innerHTML = `
                <div class="family-details">
                    <h4>Parent Information</h4>
                    <p><strong>Name:</strong> ${this.familyData.parent?.name || 'Unknown'}</p>
                    <p><strong>Language:</strong> ${this.getLanguageName(this.familyData.parent?.primaryLanguage) || 'Unknown'}</p>
                    
                    <h4>Children (${this.familyData.children.length})</h4>
                    ${this.familyData.children.map(child => `
                        <div class="child-detail">
                            <p><strong>${child.name}</strong></p>
                            <p>Language: ${this.getLanguageName(child.primaryLanguage)}</p>
                            <p>Password: ${child.encryptedPassword_base64 ? '✅ Set' : '❌ Not set'}</p>
                        </div>
                    `).join('')}
                    
                    <h4>Settings</h4>
                    <p><strong>Timeline Name:</strong> ${this.familyData.settings?.generalTimelineName || 'Family Timeline'}</p>
                </div>
            `;
            
            // Show modal
            modal.classList.remove('hidden');
            
            // Setup close button
            const closeBtn = document.getElementById('closeFamilyModal');
            closeBtn?.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }
    }

    // Load kid timeline (placeholder for now)
    async loadKidTimeline(password) {
        const timelineArea = document.getElementById('timelineArea');
        if (timelineArea) {
            timelineArea.innerHTML = '<p>🔍 Searching for your messages...</p>';
            
            // Simulate loading
            setTimeout(() => {
                timelineArea.innerHTML = `
                    <div class="timeline-placeholder">
                        <p>📧 Timeline loading feature coming soon!</p>
                        <p>You entered password: <code>${password}</code></p>
                        <p>Your messages will appear here once the timeline system is implemented.</p>
                    </div>
                `;
            }, 1000);
        }
    }

    // Switch between modes
    switchMode() {
        const newMode = this.currentMode === 'parent' ? 'kid' : 'parent';
        this.selectMode(newMode);
    }

    // Get language name from code
    getLanguageName(code) {
        const languages = {
            'en': 'English', 'fr': 'Français', 'es': 'Español', 'zh': '中文',
            'de': 'Deutsch', 'it': 'Italiano', 'pt': 'Português', 'ar': 'العربية',
            'ru': 'Русский', 'ja': '日本語'
        };
        return languages[code] || code;
    }

    // Show status message
    showStatus(message, type = 'info', duration = 5000) {
        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }

        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        statusElement.classList.remove('hidden');

        if (duration > 0) {
            setTimeout(() => {
                statusElement.classList.add('hidden');
            }, duration);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new FamilyTimelineApp();
    window.familyApp = app;
    
    // Debug helpers
    window.debugApp = () => {
        console.log('🐛 DEBUG APP STATE:');
        console.log('Initialized:', app.initialized);
        console.log('Onboarding Active:', app.onboardingActive);
        console.log('Current Mode:', app.currentMode);
        console.log('Family Data:', app.familyData);
        console.log('Database Available:', !!app.db.db);
    };

    window.resetApp = async () => {
        if (confirm('This will delete ALL data and restart onboarding. Are you sure?')) {
            try {
                await app.db.db.delete();
                location.reload();
            } catch (error) {
                console.error('Reset failed:', error);
                alert('Reset failed. Please refresh the page manually.');
            }
        }
    };
    
    await app.init();
});

export { FamilyTimelineApp };