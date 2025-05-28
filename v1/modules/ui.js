/**
 * UI Management
 * Handles all DOM manipulation and user interface updates
 */

import { showStatus } from '../utils/helpers.js';

export class UIManager {
    constructor() {
        this.elements = {};
        this.initialized = false;
        // No appState is passed via constructor in your version,
        // methods rely on window.familyApp.state
    }

    init() {
        try {
            console.log('🎨 Initializing UI manager...'); // Corrected emoji if it was a display issue
            
            // Cache DOM elements
            this.cacheElements();
            
            // Set up UI event listeners
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
            parentAuthSection: '#parentAuthSection', // Not used in updateSectionsVisibility directly by this name
            parentLogin: '#parentLogin',
            parentSession: '#parentSession',
            kidsSection: '#kidsSection',
            
            // Forms
            parentNameInput: '#parentNameInput',
            timelineNameInput: '#timelineNameInput',
            newKidName: '#newKidName', // Used for direct access if needed, not in a specific method here
            
            // Content sections
            createSection: '#createSection',
            viewSection: '#viewSection',
            targetSelection: '#targetSelection', // Container for checkboxes
            
            // Lists and containers
            kidsList: '#kidsList',
            timelineEntries: '#timelineEntries',
            entryDetail: '#entryDetail', // For modal content
            
            // Form elements
            entryText: '#entryText',
            imageInput: '#imageInput',
            audioInput: '#audioInput',
            viewerPassword: '#viewerPassword',
            createEntryBtn: '#createEntryBtn'
            // Add other elements like closeModal, entryModal if managed here
        };

        for (const [key, selector] of Object.entries(selectors)) {
            this.elements[key] = document.querySelector(selector);
            if (!this.elements[key] && key !== 'statusMessage' && key !== 'modeIndicator' && key !== 'parentAuthSection') { // Adjusted warning
                console.warn(`UI Element not found during cache: ${selector} (key: ${key})`);
            }
        }
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
        
        // Example: If modal close button is part of general UI managed here
        const closeModalBtn = document.getElementById('closeModal'); // Assuming ID
        const entryModalElement = document.getElementById('entryModal'); // Assuming ID
        if (closeModalBtn && entryModalElement) {
            closeModalBtn.addEventListener('click', () => entryModalElement.classList.add('hidden'));
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
        this.updateSectionsVisibility(state); // This will call updateKidsDisplay implicitly if structure demands
        this.updateSettingsDisplay(); // Uses window.familyApp.state internally
        this.updateCreateButtonState(); // Uses window.familyApp.state internally
        // this.updateKidsDisplay(); // Call explicitly if not covered by updateSectionsVisibility logic
        // this.updateTargetSelection(); // Call explicitly if needed at this stage
    }

    updateModeDisplay(state) { // state is passed
        const modeText = state.mode === 'parent' ? 'Parent Mode' : 'Kid Mode';
        
        if (this.elements.modeIndicator) {
            this.elements.modeIndicator.textContent = modeText;
        }

        if (this.elements.switchModeBtn) {
            const buttonText = state.mode === 'parent' ? 'Switch to Kid Mode' : 'Switch to Parent Mode';
            this.elements.switchModeBtn.textContent = buttonText;
        }
    }

    updateAuthDisplay(state) { // state is passed
        if (!this.elements.parentLogin || !this.elements.parentSession) return;

        if (state.parentSession.active) {
            this.elements.parentLogin.classList.add('hidden');
            this.elements.parentSession.classList.remove('hidden');
        } else {
            this.elements.parentLogin.classList.remove('hidden');
            this.elements.parentSession.classList.add('hidden');
        }
    }

    updateSectionsVisibility(state) { // state is passed
        const isParentMode = state.mode === 'parent';
        const isLoggedIn = state.parentSession.active;

        // Main content sections based on mode
        const parentModeContent = document.getElementById('parentModeContent');
        const kidModeContent = document.getElementById('kidModeContent');

        if(parentModeContent) parentModeContent.classList.toggle('hidden', !isParentMode);
        if(kidModeContent) kidModeContent.classList.toggle('hidden', isParentMode);


        // Sections within Parent Mode, visibility based on login status
        if (isParentMode) {
            const authSect = document.getElementById('authSection'); // Re-query if not cached or if needed
            if(authSect) authSect.classList.toggle('hidden', isLoggedIn);

            if (this.elements.kidsSection) {
                this.elements.kidsSection.classList.toggle('hidden', !isLoggedIn);
                if (isLoggedIn) this.updateKidsDisplay(); // Update kids list when section is visible
            }
            if (this.elements.createSection) {
                this.elements.createSection.classList.toggle('hidden', !isLoggedIn);
                if (isLoggedIn) this.updateTargetSelection(); // Update targets when section is visible
            }
            const settingsSect = document.getElementById('settingsSection'); // Assuming ID
             if(settingsSect) settingsSect.classList.toggle('hidden', !isLoggedIn);

            const logoutBtn = document.getElementById('logoutBtn'); // Assuming ID
            if(logoutBtn) logoutBtn.classList.toggle('hidden', !isLoggedIn);

        } else { // Kid Mode - hide parent-specific sections if they aren't already
            if (this.elements.kidsSection) this.elements.kidsSection.classList.add('hidden');
            if (this.elements.createSection) this.elements.createSection.classList.add('hidden');
            const settingsSect = document.getElementById('settingsSection');
            if(settingsSect) settingsSect.classList.add('hidden');
            const logoutBtn = document.getElementById('logoutBtn');
            if(logoutBtn) logoutBtn.classList.add('hidden');
            const authSect = document.getElementById('authSection');
            if(authSect) authSect.classList.add('hidden');
        }


        // View section (timeline viewer) is generally always potentially visible
        // Its content changes based on password input.
        if (this.elements.viewSection) {
            this.elements.viewSection.classList.remove('hidden'); // Or manage its overall visibility differently
        }
    }

    updateSettingsDisplay() {
        if (!window.familyApp || !window.familyApp.state) {
             console.warn("UIManager: window.familyApp.state not available for updateSettingsDisplay.");
            return;
        }
        
        const settings = window.familyApp.state.settings;
        
        if (this.elements.parentNameInput && settings.parentName !== undefined) { // Check for undefined
            this.elements.parentNameInput.value = settings.parentName;
        }

        if (this.elements.timelineNameInput && settings.generalTimelineName !== undefined) { // Check for undefined
            this.elements.timelineNameInput.value = settings.generalTimelineName;
        }
        
        // Update displays for parent name and timeline name (if you have them)
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
        const parentSessionActive = state.parentSession.active; // Get parent session status

        console.log('🎨 Updating kids display. Parent session active:', parentSessionActive, 'Session passwords for kid IDs:', Object.keys(state.parentSession.kidPasswords || {}));

        this.elements.kidsList.innerHTML = ''; // Clear existing

        const kidsNoKidsMsg = document.getElementById('kidsNoKids'); // Assuming this ID exists for the message

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
            // 'hasPassword' attribute on kid-card refers to whether a password was *ever set up* for the kid.
            const hasPasswordSetup = !!kid.encryptedPassword_base64;
            // console.log(`🎨 Kid ${kid.name} (ID: ${kid.id}) has password setup: ${hasPasswordSetup}`); // Your original log line
            
            const kidCard = document.createElement('kid-card');
            kidCard.setAttribute('kid-id', kid.id.toString());
            kidCard.setAttribute('kid-name', kid.name);
            kidCard.setAttribute('has-password', hasPasswordSetup.toString());
            
            // --- THIS IS THE KEY MODIFICATION ---
            // Set the parent-mode attribute based on parent's login status
            if (parentSessionActive) {
                kidCard.setAttribute('parent-mode', 'true');
            } else {
                kidCard.setAttribute('parent-mode', 'false');
            }
            // --- END OF KEY MODIFICATION ---
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


        // Clear existing targets
        this.elements.targetSelection.innerHTML = ''; // Simpler clear

        // Create checkbox container (if you want to re-add .checkbox-group structure)
        // const checkboxGroup = document.createElement('div');
        // checkboxGroup.className = 'checkbox-group';
        // this.elements.targetSelection.appendChild(checkboxGroup);
        // For simplicity, appending directly to targetSelection
        
        // Add general timeline option
        const generalItem = this.createCheckboxItem('general', settings.generalTimelineName || 'Family Timeline', false); // Not disabled by default
        this.elements.targetSelection.appendChild(generalItem);

        // Add kid timeline options
        kids.forEach(kid => {
            if (kid.isActive) { // Only show active kids
                const kidPasswordInSession = !!sessionKidPasswords[kid.id];
                const isDisabled = !kidPasswordInSession;
                const title = isDisabled ? "Password not currently loaded for this kid. Parent should re-login or update this kid's password." : "";
                // Value for checkbox is "kid" + numeric ID, e.g. "kid1"
                const kidItem = this.createCheckboxItem(`kid${kid.id}`, `${kid.name}'s Timeline ${isDisabled ? '(🔒)' : ''}`, isDisabled, title);
                this.elements.targetSelection.appendChild(kidItem);
            }
        });

        this.updateCreateButtonState();
    }

    createCheckboxItem(value, labelText, isDisabled = false, title = '') { // Added isDisabled and title
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
            item.title = title; // Set title on the container div for better hover
        }


        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', `target-${value}`);
        labelEl.textContent = labelText;
        if(isDisabled) {
            labelEl.style.opacity = "0.6"; // Visually indicate disabled
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
        
        // canCreateEntries checks if parent is logged in and in parent mode.
        // However, entry creation section visibility is already handled by updateSectionsVisibility.
        // So, if this button is visible, we assume parent is logged in and in parent mode.
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
        // Query within the specific container if targetSelection is accurate
        const targetContainer = this.elements.targetSelection || document;
        const checkboxes = targetContainer.querySelectorAll('input[name="target"]:checked');
        return checkboxes.length > 0;
    }

    displayTimelineEntries(entries) {
        if (!this.elements.timelineEntries) return;
        this.elements.timelineEntries.innerHTML = '';

        if (!entries || entries.length === 0) { // Added !entries check
            const placeholder = document.createElement('p');
            placeholder.className = 'placeholder-text';
            placeholder.textContent = 'No entries found with this password, or timeline is empty.';
            this.elements.timelineEntries.appendChild(placeholder);
            return;
        }

        entries.forEach(entry => {
            // Ensure decryptedContent exists and has its own 'content' property
            if (entry.decryptedContent && entry.decryptedContent.content) {
                const entryElement = document.createElement('timeline-entry');
                // Pass the whole entry which includes original ID, timestamp, targets AND decryptedContent
                entryElement.entryData = entry; 
                // Attributes for simpler display if timeline-entry component uses them:
                entryElement.setAttribute('entry-id', entry.id); // Assuming entry has an id from DB
                entryElement.setAttribute('timestamp', entry.timestamp);
                entryElement.setAttribute('preview-text', this.getEntryPreview(entry.decryptedContent));
                entryElement.setAttribute('target-timelines', (entry.targetTimelines || []).join(', '));
                this.elements.timelineEntries.appendChild(entryElement);
            } else {
                console.warn("Skipping entry in displayTimelineEntries, missing decryptedContent or its content sub-property:", entry);
            }
        });
    }

    getEntryPreview(decryptedContentObject) { // Parameter is the object containing 'content', 'decryptedBy' etc.
        if (!decryptedContentObject || !decryptedContentObject.content) return 'No preview available';
        
        const entryMainContent = decryptedContentObject.content; // Actual content is here
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

    showEntryModal(decryptedEntryData) { // Parameter is the object from decryptEntry
        const modal = document.getElementById('entryModal'); // Assuming this ID exists
        const modalContentTarget = document.getElementById('entryModalContent'); // Assuming this ID exists for content

        if (!modal || !modalContentTarget || !decryptedEntryData || !decryptedEntryData.content) {
             console.error("Modal elements or decrypted content not found for showEntryModal.", decryptedEntryData);
            return;
        }
        
        const content = decryptedEntryData.content; // The actual text, image, audio data
        let html = `<div class="modal-header"><h3>Entry Details</h3></div>`;
        html += `<div class="modal-body">`;
        html += `<p class="meta"><strong>Date:</strong> ${new Date(decryptedEntryData.timestamp).toLocaleString()}</p>`;
        html += `<p class="meta"><strong>Targets:</strong> ${(decryptedEntryData.targetTimelines || []).join(', ')}</p>`;
        html += `<p class="meta"><strong>Decrypted by:</strong> ${this.getDecryptedByDisplayName(decryptedEntryData.decryptedBy)}</p><hr class="modal-hr">`;
        
        if (content.text) {
            html += `<div class.modal-text-content"><p>${content.text.replace(/\n/g, '<br>')}</p></div>`;
        }
        if (content.image && content.image.data_base64) {
            html += `<div class="modal-media"><img src="data:${content.image.type};base64,${content.image.data_base64}" alt="${content.image.name || 'Image content'}" style="max-width: 100%; height: auto; margin-top: 10px; border-radius: 4px;"></div>`;
        }
        if (content.audio && content.audio.data_base64) {
            html += `<div class="modal-media"><audio controls src="data:${content.audio.type};base64,${content.audio.data_base64}" style="width: 100%; margin-top: 10px;"></audio></div>`;
        }
        html += `</div>`; // End modal-body
        
        modalContentTarget.innerHTML = html;
        modal.classList.remove('hidden'); // Show the modal
        modal.showModal ? modal.showModal() : modal.classList.remove('hidden'); // For <dialog> element
    }

    getDecryptedByDisplayName(decryptedBy) {
        if (!window.familyApp || !window.familyApp.state) return decryptedBy;
        const state = window.familyApp.state;
        
        switch (decryptedBy) {
            case 'parent':
                return state.settings.parentName || 'Parent';
            case 'general':
                return state.settings.generalTimelineName || 'General';
            default:
                if (typeof decryptedBy === 'string' && decryptedBy.startsWith('kid')) {
                    const kidId = parseInt(decryptedBy.replace('kid', ''));
                    const kid = state.kids.find(k => k.id === kidId);
                    return kid ? `${kid.name}'s Timeline` : decryptedBy;
                }
                return decryptedBy;
        }
    }

    handleFileSelection(event, type) { // type is 'image' or 'audio'
        const fileInput = event.target;
        const file = fileInput.files[0];
        // Find the associated label, assuming a structure like <label class="file-input"><span>Choose..</span><input type="file"></label>
        let feedbackLabel = fileInput.previousElementSibling; // If span is direct sibling
        if (feedbackLabel && feedbackLabel.tagName !== 'SPAN') { // Or if label wraps input
            feedbackLabel = fileInput.closest('label')?.querySelector('span.file-name-feedback'); // More specific
        }


        if (!file) {
            if(feedbackLabel) feedbackLabel.textContent = feedbackLabel.dataset.defaultText || `Choose ${type}...`;
            this.updateCreateButtonState();
            return;
        }
        
        if (feedbackLabel) {
            if(!feedbackLabel.dataset.defaultText) feedbackLabel.dataset.defaultText = feedbackLabel.textContent; // Store default
            feedbackLabel.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
            feedbackLabel.style.color = 'var(--primary-color)'; // Or your success color
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
        // Uses the global showStatus from helpers.js
        showStatus(message, type, duration);
    }

    showSuccess(message, duration = 3000) { this.showStatus(message, 'success', duration); }
    showError(message, duration = 5000) { this.showStatus(message, 'error', duration); }
    showWarning(message, duration = 4000) { this.showStatus(message, 'warning', duration); }

    fadeIn(element, duration = 300) { /* ... your existing fadeIn ... */ }
    fadeOut(element, duration = 300) { /* ... your existing fadeOut ... */ }

    cleanup() {
        this.elements = {};
        this.initialized = false;
        console.log('🧹 UI manager cleaned up'); // Corrected emoji
    }
}