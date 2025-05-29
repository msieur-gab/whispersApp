/**
 * Humanized UI Management - Shows Kid Names Instead of IDs
 * Handles all DOM manipulation with human-friendly displays
 */

import { showStatus } from '../utils/helpers.js';

export class UIManager {
    constructor() {
        this.elements = {};
        this.initialized = false;
    }

    init() {
        try {
            console.log('🎨 Initializing UI manager...');
            this.cacheElements();
            this.setupUIEventListeners();
            this.initialized = true;
            console.log('✅ UI manager initialized');
        } catch (error) {
            console.error('❌ UI initialization failed:', error);
            throw error;
        }
    }

    cacheElements() {
        const selectors = {
            // Mode and status
            modeIndicator: '#modeIndicator',
            statusMessage: '#statusMessage',
            switchModeBtn: '#switchModeBtn',
            
            // Menu sections
            parentAuthSection: '#parentAuthSection',
            parentLogin: '#parentLogin',
            parentSession: '#parentSession',
            kidsSection: '#kidsSection',
            
            // Forms
            parentNameInput: '#parentNameInput',
            timelineNameInput: '#timelineNameInput',
            newKidName: '#newKidName',
            
            // Content sections
            createSection: '#createSection',
            viewSection: '#viewSection',
            adminSection: '#adminSection',
            targetSelection: '#targetSelection',
            
            // Lists and containers
            kidsList: '#kidsList',
            timelineEntries: '#timelineEntries',
            adminTimelineEntries: '#adminTimelineEntries',
            entryDetail: '#entryDetail',
            
            // Form elements
            entryText: '#entryText',
            imageInput: '#imageInput',
            audioInput: '#audioInput',
            viewerPassword: '#viewerPassword',
            createEntryBtn: '#createEntryBtn',
            entryDateTime: '#entryDateTime'
        };

        for (const [key, selector] of Object.entries(selectors)) {
            this.elements[key] = document.querySelector(selector);
            if (!this.elements[key] && key !== 'statusMessage' && key !== 'modeIndicator' && key !== 'parentAuthSection') {
                console.warn(`UI Element not found during cache: ${selector} (key: ${key})`);
            }
        }
    }

    // HUMANIZED: Helper function to convert kidId to name
    kidIdToName(kidId) {
        if (!window.familyApp || !window.familyApp.state) return kidId;
        
        if (kidId === 'general') return 'General Timeline';
        if (kidId === 'parent') return window.familyApp.state.settings.parentName || 'Parent';
        
        if (typeof kidId === 'string' && kidId.startsWith('kid')) {
            const numericId = parseInt(kidId.replace('kid', ''));
            const kid = window.familyApp.state.kids.find(k => k.id === numericId);
            return kid ? kid.name : kidId;
        }
        
        return kidId;
    }

    // HUMANIZED: Convert array of kidIds to human-readable names
    formatTargetNames(targets) {
        if (!targets || !Array.isArray(targets)) return '';
        
        return targets.map(target => {
            if (target === 'general') {
                const generalName = window.familyApp?.state?.settings?.generalTimelineName || 'Family Timeline';
                return generalName;
            } else if (target.startsWith('kid')) {
                const kidName = this.kidIdToName(target);
                return kidName === target ? target : kidName; // Fallback to kidId if name not found
            }
            return target;
        }).join(', ');
    }

    setupUIEventListeners() {
        // File input change handlers
        if (this.elements.imageInput) {
            this.elements.imageInput.addEventListener('change', (e) => {
                this.handleFileSelection(e, 'image');
            });
        }

        if (this.elements.audioInput) {
            this.elements.audioInput.addEventListener('change', (e) => {
                this.handleFileSelection(e, 'audio');
            });
        }

        // Entry text input handler
        if (this.elements.entryText) {
            this.elements.entryText.addEventListener('input', () => {
                this.updateCreateButtonState();
            });
        }

        // Admin timeline entry clicks
        if (this.elements.adminTimelineEntries) {
            this.elements.adminTimelineEntries.addEventListener('click', (e) => {
                const timelineEntry = e.target.closest('timeline-entry');
                if (timelineEntry) {
                    const entryId = timelineEntry.getAttribute('entry-id');
                    if (entryId) {
                        this.handleAdminEntryClick(parseInt(entryId));
                    }
                }
            });
        }
    }

    // Main display update method
    updateDisplay() {
        if (!window.familyApp || !window.familyApp.state) {
            console.warn("UIManager: window.familyApp.state not available for updateDisplay.");
            return;
        }
        
        const state = window.familyApp.state;
        
        this.updateModeDisplay(state);
        this.updateAuthDisplay(state);
        this.updateSectionsVisibility(state);
        this.updateSettingsDisplay();
        this.updateCreateButtonState();
    }

    updateModeDisplay(state) {
        const modeText = state.mode === 'parent' ? 'Parent Mode' : 'Kid Mode';
        
        if (this.elements.modeIndicator) {
            this.elements.modeIndicator.textContent = modeText;
        }

        if (this.elements.switchModeBtn) {
            const buttonText = state.mode === 'parent' ? 'Switch to Kid Mode' : 'Switch to Parent Mode';
            this.elements.switchModeBtn.textContent = buttonText;
        }
    }

    updateAuthDisplay(state) {
        if (!this.elements.parentLogin || !this.elements.parentSession) return;

        if (state.parentSession.active) {
            this.elements.parentLogin.classList.add('hidden');
            this.elements.parentSession.classList.remove('hidden');
        } else {
            this.elements.parentLogin.classList.remove('hidden');
            this.elements.parentSession.classList.add('hidden');
        }
    }

    updateSectionsVisibility(state) {
        const isParentMode = state.mode === 'parent';
        const isLoggedIn = state.parentSession.active;

        // Admin section visibility
        if (this.elements.adminSection) {
            const showAdmin = isParentMode && isLoggedIn;
            this.elements.adminSection.classList.toggle('hidden', !showAdmin);
        }

        // Sections within Parent Mode, visibility based on login status
        if (isParentMode) {
            const authSect = document.getElementById('authSection');
            if(authSect) authSect.classList.toggle('hidden', isLoggedIn);

            if (this.elements.kidsSection) {
                this.elements.kidsSection.classList.toggle('hidden', !isLoggedIn);
                if (isLoggedIn) this.updateKidsDisplay();
            }
            if (this.elements.createSection) {
                this.elements.createSection.classList.toggle('hidden', !isLoggedIn);
                if (isLoggedIn) this.updateTargetSelection();
            }
            const settingsSect = document.getElementById('settingsSection');
             if(settingsSect) settingsSect.classList.toggle('hidden', !isLoggedIn);

            const logoutBtn = document.getElementById('logoutBtn');
            if(logoutBtn) logoutBtn.classList.toggle('hidden', !isLoggedIn);

        } else { // Kid Mode - hide parent-specific sections
            if (this.elements.kidsSection) this.elements.kidsSection.classList.add('hidden');
            if (this.elements.createSection) this.elements.createSection.classList.add('hidden');
            if (this.elements.adminSection) this.elements.adminSection.classList.add('hidden');
            const settingsSect = document.getElementById('settingsSection');
            if(settingsSect) settingsSect.classList.add('hidden');
            const logoutBtn = document.getElementById('logoutBtn');
            if(logoutBtn) logoutBtn.classList.add('hidden');
            const authSect = document.getElementById('authSection');
            if(authSect) authSect.classList.add('hidden');
        }

        // View section is always visible
        if (this.elements.viewSection) {
            this.elements.viewSection.classList.remove('hidden');
        }
    }

    updateSettingsDisplay() {
        if (!window.familyApp || !window.familyApp.state) {
             console.warn("UIManager: window.familyApp.state not available for updateSettingsDisplay.");
            return;
        }
        
        const settings = window.familyApp.state.settings;
        
        if (this.elements.parentNameInput && settings.parentName !== undefined) {
            this.elements.parentNameInput.value = settings.parentName;
        }

        if (this.elements.timelineNameInput && settings.generalTimelineName !== undefined) {
            this.elements.timelineNameInput.value = settings.generalTimelineName;
        }
        
        document.querySelectorAll('.parent-name-display').forEach(el => el.textContent = settings.parentName || 'Parent');
        document.querySelectorAll('.general-timeline-name-display').forEach(el => el.textContent = settings.generalTimelineName || 'Family Timeline');
    }

    updateKidsDisplay() {
        if (!window.familyApp || !window.familyApp.state || !this.elements.kidsList) {
            if (this.elements.kidsList) this.elements.kidsList.innerHTML = "<p>Error loading kids data.</p>";
            console.warn("UIManager: window.familyApp.state or kidsList element not available for updateKidsDisplay.");
            return;
        }

        const state = window.familyApp.state;
        const kids = state.kids;
        const parentSessionActive = state.parentSession.active;

        console.log('🎨 Updating kids display. Parent session active:', parentSessionActive, 'Session passwords for kid IDs:', Object.keys(state.parentSession.kidPasswords || {}));

        this.elements.kidsList.innerHTML = '';

        const kidsNoKidsMsg = document.getElementById('kidsNoKids');

        if (kids.length === 0) {
            if (kidsNoKidsMsg) {
                kidsNoKidsMsg.classList.remove('hidden');
            } else {
                const placeholder = document.createElement('p');
                placeholder.className = 'placeholder-text';
                placeholder.textContent = 'No kids added yet. Add your first kid above!';
                this.elements.kidsList.appendChild(placeholder);
            }
            return;
        }
        if (kidsNoKidsMsg) kidsNoKidsMsg.classList.add('hidden');

        kids.forEach(kid => {
            const hasPasswordSetup = !!kid.encryptedPassword_base64;
            
            const kidCard = document.createElement('kid-card');
            kidCard.setAttribute('kid-id', kid.id.toString());
            kidCard.setAttribute('kid-name', kid.name);
            kidCard.setAttribute('has-password', hasPasswordSetup.toString());
            
            if (parentSessionActive) {
                kidCard.setAttribute('parent-mode', 'true');
            } else {
                kidCard.setAttribute('parent-mode', 'false');
            }
            console.log(`🎨 Kid ${kid.name} (ID: ${kid.id}) attributes set: has-password=${hasPasswordSetup}, parent-mode=${parentSessionActive}`);

            this.elements.kidsList.appendChild(kidCard);
        });
    }

    updateTargetSelection() {
        if (!window.familyApp || !window.familyApp.state || !this.elements.targetSelection) {
             console.warn("UIManager: window.familyApp.state or targetSelection element not available for updateTargetSelection.");
            return;
        }

        const state = window.familyApp.state;
        const kids = state.kids;
        const settings = state.settings;
        const sessionKidPasswords = state.parentSession.kidPasswords || {};

        this.elements.targetSelection.innerHTML = '';
        
        // Add general timeline option - HUMANIZED: Show actual timeline name
        const generalName = settings.generalTimelineName || 'Family Timeline';
        const generalItem = this.createCheckboxItem('general', generalName, false);
        this.elements.targetSelection.appendChild(generalItem);

        // Add kid timeline options - HUMANIZED: Show kid names
        kids.forEach(kid => {
            if (kid.isActive) {
                const kidPasswordInSession = !!sessionKidPasswords[kid.id];
                const isDisabled = !kidPasswordInSession;
                const kidIdKey = `kid${kid.id}`;
                
                // HUMANIZED: Use kid's actual name instead of "kid1", "kid2"
                const displayName = `${kid.name}'s Timeline${isDisabled ? ' (🔒)' : ''}`;
                const title = isDisabled ? `Password not currently loaded for ${kid.name}. Parent should re-login or update this kid's password.` : "";
                
                const kidItem = this.createCheckboxItem(kidIdKey, displayName, isDisabled, title);
                this.elements.targetSelection.appendChild(kidItem);
            }
        });

        this.updateCreateButtonState();
    }

    createCheckboxItem(value, labelText, isDisabled = false, title = '') {
        const item = document.createElement('div');
        item.className = 'checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'target';
        checkbox.value = value;
        checkbox.id = `target-${value}`;
        if (isDisabled) {
            checkbox.disabled = true;
        }
        if (title) {
            item.title = title;
        }

        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', `target-${value}`);
        labelEl.textContent = labelText;
        if(isDisabled) {
            labelEl.style.opacity = "0.6";
        }

        checkbox.addEventListener('change', () => {
            this.updateCreateButtonState();
        });

        item.appendChild(checkbox);
        item.appendChild(labelEl);
        return item;
    }

    updateCreateButtonState() {
        if (!this.elements.createEntryBtn || !window.familyApp || !window.familyApp.state) {
            if(this.elements.createEntryBtn) this.elements.createEntryBtn.disabled = true;
            return;
        }

        const state = window.familyApp.state;
        const hasContent = this.hasEntryContent();
        const hasTargets = this.hasSelectedTargets();
        const parentSessionActive = state.parentSession.active;

        const isEnabled = parentSessionActive && hasContent && hasTargets;
        
        this.elements.createEntryBtn.disabled = !isEnabled;
        
        let tooltipText = '';
        if (!parentSessionActive) {
            tooltipText = 'Login as parent to create entries.';
        } else if (!hasContent) {
            tooltipText = 'Please add some content (text, image, or audio).';
        } else if (!hasTargets) {
            tooltipText = 'Please select at least one target timeline.';
        } else {
            tooltipText = 'Create timeline entry.';
        }
        this.elements.createEntryBtn.title = tooltipText;
    }

    hasEntryContent() {
        const hasText = this.elements.entryText && this.elements.entryText.value.trim().length > 0;
        const hasImage = this.elements.imageInput && this.elements.imageInput.files && this.elements.imageInput.files.length > 0;
        const hasAudio = this.elements.audioInput && this.elements.audioInput.files && this.elements.audioInput.files.length > 0;
        return hasText || hasImage || hasAudio;
    }

    hasSelectedTargets() {
        const targetContainer = this.elements.targetSelection || document;
        const checkboxes = targetContainer.querySelectorAll('input[name="target"]:checked');
        return checkboxes.length > 0;
    }

    displayTimelineEntries(entries) {
        if (!this.elements.timelineEntries) return;
        this.elements.timelineEntries.innerHTML = '';

        if (!entries || entries.length === 0) {
            const placeholder = document.createElement('p');
            placeholder.className = 'placeholder-text';
            placeholder.textContent = 'No entries found with this password, or timeline is empty.';
            this.elements.timelineEntries.appendChild(placeholder);
            return;
        }

        entries.forEach(entry => {
            if (entry.decryptedContent && entry.decryptedContent.content) {
                const entryElement = document.createElement('timeline-entry');
                entryElement.entryData = entry; 
                entryElement.setAttribute('entry-id', entry.id);
                entryElement.setAttribute('timestamp', entry.timestamp);
                entryElement.setAttribute('preview-text', this.getEntryPreview(entry.decryptedContent));
                
                // HUMANIZED: Show names instead of kidIds
                const humanizedTargets = this.formatTargetNames(entry.targetTimelines || []);
                entryElement.setAttribute('target-timelines', humanizedTargets);
                
                const hasImage = !!(entry.decryptedContent.content.image);
                const hasAudio = !!(entry.decryptedContent.content.audio);
                entryElement.setAttribute('has-image', hasImage.toString());
                entryElement.setAttribute('has-audio', hasAudio.toString());
                
                this.elements.timelineEntries.appendChild(entryElement);
            } else {
                console.warn("Skipping entry in displayTimelineEntries, missing decryptedContent or its content sub-property:", entry);
            }
        });
    }

    // Display admin entries with enhanced styling
    displayAdminEntries(entries) {
        if (!this.elements.adminTimelineEntries) return;
        this.elements.adminTimelineEntries.innerHTML = '';

        if (!entries || entries.length === 0) {
            const placeholder = document.createElement('p');
            placeholder.className = 'placeholder-text';
            placeholder.textContent = 'No entries found or all entries are encrypted with different passwords.';
            this.elements.adminTimelineEntries.appendChild(placeholder);
            return;
        }

        console.log(`📋 Displaying ${entries.length} entries in admin view`);

        entries.forEach(entry => {
            if (entry.decryptedContent && entry.decryptedContent.content) {
                const entryElement = document.createElement('timeline-entry');
                entryElement.entryData = entry;
                entryElement.setAttribute('entry-id', entry.id);
                entryElement.setAttribute('timestamp', entry.timestamp);
                entryElement.setAttribute('preview-text', this.getEntryPreview(entry.decryptedContent));
                
                // HUMANIZED: Enhanced admin display with names instead of IDs
                const humanizedTargets = this.formatTargetNames(entry.targetTimelines || []);
                const decryptedByName = this.getDecryptedByDisplayName(entry.decryptedContent.decryptedBy || 'unknown');
                entryElement.setAttribute('target-timelines', `👥 ${humanizedTargets} | 🔑 ${decryptedByName}`);
                
                const hasImage = !!(entry.decryptedContent.content.image);
                const hasAudio = !!(entry.decryptedContent.content.audio);
                entryElement.setAttribute('has-image', hasImage.toString());
                entryElement.setAttribute('has-audio', hasAudio.toString());
                
                // Add admin styling class
                entryElement.classList.add('admin-entry');
                
                this.elements.adminTimelineEntries.appendChild(entryElement);
            }
        });
    }

    // Clear admin timeline
    clearAdminTimeline() {
        if (this.elements.adminTimelineEntries) {
            this.elements.adminTimelineEntries.innerHTML = '<p class="placeholder-text">Admin view cleared.</p>';
        }
    }

    getEntryPreview(decryptedContentObject) {
        if (!decryptedContentObject || !decryptedContentObject.content) return 'No preview available';
        
        const entryMainContent = decryptedContentObject.content;
        let preview = '';
        
        if (entryMainContent.text) {
            preview = entryMainContent.text.substring(0, 100);
            if (entryMainContent.text.length > 100) preview += '...';
        } else if (entryMainContent.image) {
            preview = `🖼️ Image: ${entryMainContent.image.name || 'image file'}`;
        } else if (entryMainContent.audio) {
            preview = `🎵 Audio: ${entryMainContent.audio.name || 'audio file'}`;
        } else {
            preview = 'No preview available';
        }
        return preview;
    }

    clearTimeline() {
        if (this.elements.timelineEntries) {
            this.elements.timelineEntries.innerHTML = '<p class="placeholder-text">Enter your password to view your timeline entries.</p>';
        }
    }

    showEntryModal(decryptedEntryData) {
        const modal = document.getElementById('entryModal');
        const modalContentTarget = document.getElementById('entryDetail');

        if (!modal || !modalContentTarget || !decryptedEntryData || !decryptedEntryData.content) {
             console.error("Modal elements or decrypted content not found for showEntryModal.", decryptedEntryData);
            return;
        }
        
        const content = decryptedEntryData.content;
        let html = `<div class="modal-header"><h3>Entry Details</h3></div>`;
        html += `<div class="modal-body">`;
        html += `<p class="meta"><strong>Date:</strong> ${new Date(decryptedEntryData.timestamp).toLocaleString()}</p>`;
        
        // HUMANIZED: Show names instead of kidIds in modal
        const humanizedTargets = this.formatTargetNames(decryptedEntryData.targetTimelines || []);
        html += `<p class="meta"><strong>Targets:</strong> ${humanizedTargets}</p>`;
        
        const decryptedByName = this.getDecryptedByDisplayName(decryptedEntryData.decryptedBy);
        html += `<p class="meta"><strong>Decrypted by:</strong> ${decryptedByName}</p><hr class="modal-hr">`;
        
        if (content.text) {
            html += `<div class="modal-text-content"><p>${content.text.replace(/\n/g, '<br>')}</p></div>`;
        }
        if (content.image && content.image.data_base64) {
            html += `<div class="modal-media"><img src="data:${content.image.type};base64,${content.image.data_base64}" alt="${content.image.name || 'Image content'}" style="max-width: 100%; height: auto; margin-top: 10px; border-radius: 4px;"></div>`;
        }
        if (content.audio && content.audio.data_base64) {
            html += `<div class="modal-media"><audio controls src="data:${content.audio.type};base64,${content.audio.data_base64}" style="width: 100%; margin-top: 10px;"></audio></div>`;
        }
        html += `</div>`;
        
        modalContentTarget.innerHTML = html;
        
        if (typeof modal.show === 'function') {
            modal.show();
        } else {
            modal.classList.remove('hidden');
            modal.style.display = 'block';
        }
    }

    // Handle admin entry clicks
    handleAdminEntryClick(entryId) {
        if (window.familyApp && typeof window.familyApp.handleTimelineEntryClick === 'function') {
            window.familyApp.handleTimelineEntryClick(entryId);
        }
    }

    // HUMANIZED: Enhanced function to show names instead of kidIds
    getDecryptedByDisplayName(decryptedBy) {
        if (!window.familyApp || !window.familyApp.state) return decryptedBy;
        const state = window.familyApp.state;
        
        switch (decryptedBy) {
            case 'parent':
                return state.settings.parentName || 'Parent';
            case 'general':
                return state.settings.generalTimelineName || 'General Timeline';
            default:
                if (typeof decryptedBy === 'string' && decryptedBy.startsWith('kid')) {
                    const kidId = parseInt(decryptedBy.replace('kid', ''));
                    const kid = state.kids.find(k => k.id === kidId);
                    return kid ? `${kid.name}'s Timeline` : decryptedBy;
                }
                return decryptedBy;
        }
    }

    handleFileSelection(event, type) {
        const fileInput = event.target;
        const file = fileInput.files[0];
        let feedbackLabel = fileInput.previousElementSibling;
        if (feedbackLabel && feedbackLabel.tagName !== 'SPAN') {
            feedbackLabel = fileInput.closest('label')?.querySelector('span.file-name-feedback');
        }

        if (!file) {
            if(feedbackLabel) feedbackLabel.textContent = feedbackLabel.dataset.defaultText || `Choose ${type}...`;
            this.updateCreateButtonState();
            return;
        }
        
        if (feedbackLabel) {
            if(!feedbackLabel.dataset.defaultText) feedbackLabel.dataset.defaultText = feedbackLabel.textContent;
            feedbackLabel.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
            feedbackLabel.style.color = 'var(--primary-color)';
        }
        this.updateCreateButtonState();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showStatus(message, type = 'info', duration = 5000) {
        showStatus(message, type, duration);
    }

    showSuccess(message, duration = 3000) { this.showStatus(message, 'success', duration); }
    showError(message, duration = 5000) { this.showStatus(message, 'error', duration); }
    showWarning(message, duration = 4000) { this.showStatus(message, 'warning', duration); }

    cleanup() {
        this.elements = {};
        this.initialized = false;
        console.log('🧹 UI manager cleaned up');
    }
}