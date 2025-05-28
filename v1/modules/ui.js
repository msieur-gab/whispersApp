/**
 * UI Management
 * Handles all DOM manipulation and user interface updates
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
            targetSelection: '#targetSelection',
            
            // Lists and containers
            kidsList: '#kidsList',
            timelineEntries: '#timelineEntries',
            entryDetail: '#entryDetail',
            
            // Form elements
            entryText: '#entryText',
            imageInput: '#imageInput',
            audioInput: '#audioInput',
            viewerPassword: '#viewerPassword',
            createEntryBtn: '#createEntryBtn'
        };

        for (const [key, selector] of Object.entries(selectors)) {
            this.elements[key] = document.querySelector(selector);
            if (!this.elements[key] && key !== 'statusMessage') {
                console.warn(`Element not found: ${selector}`);
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
    }

    // Main display update method
    updateDisplay() {
        if (!window.familyApp) return;
        
        const state = window.familyApp.state;
        
        this.updateModeDisplay(state);
        this.updateAuthDisplay(state);
        this.updateSectionsVisibility(state);
        this.updateSettingsDisplay(state);
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

        // Kids section - only visible in parent mode when logged in
        if (this.elements.kidsSection) {
            if (isParentMode && isLoggedIn) {
                this.elements.kidsSection.classList.remove('hidden');
            } else {
                this.elements.kidsSection.classList.add('hidden');
            }
        }

        // Create section - only visible in parent mode when logged in
        if (this.elements.createSection) {
            if (isParentMode && isLoggedIn) {
                this.elements.createSection.classList.remove('hidden');
            } else {
                this.elements.createSection.classList.add('hidden');
            }
        }

        // View section is always visible
        if (this.elements.viewSection) {
            this.elements.viewSection.classList.remove('hidden');
        }
    }

    updateSettingsDisplay() {
        if (!window.familyApp || !window.familyApp.state) return;
        
        const state = window.familyApp.state;
        const settings = state.settings;
        
        if (this.elements.parentNameInput && settings.parentName) {
            this.elements.parentNameInput.value = settings.parentName;
        }

        if (this.elements.timelineNameInput && settings.generalTimelineName) {
            this.elements.timelineNameInput.value = settings.generalTimelineName;
        }
    }

    updateKidsDisplay() {
        if (!window.familyApp || !this.elements.kidsList) return;

        const kids = window.familyApp.state.kids;
        const session = window.familyApp.state.parentSession;

        console.log('🎨 Updating kids display. Session passwords:', Object.keys(session.kidPasswords));

        this.elements.kidsList.innerHTML = '';

        if (kids.length === 0) {
            const placeholder = document.createElement('p');
            placeholder.className = 'placeholder-text';
            placeholder.textContent = 'No kids added yet. Add your first kid above!';
            this.elements.kidsList.appendChild(placeholder);
            return;
        }

        kids.forEach(kid => {
            const hasPassword = !!session.kidPasswords[kid.id];
            console.log(`🎨 Kid ${kid.name} (ID: ${kid.id}) has password: ${hasPassword}`);
            
            const kidCard = document.createElement('kid-card');
            kidCard.setAttribute('kid-id', kid.id);
            kidCard.setAttribute('kid-name', kid.name);
            kidCard.setAttribute('has-password', hasPassword ? 'true' : 'false');
            
            this.elements.kidsList.appendChild(kidCard);
        });
    }

    updateTargetSelection() {
        if (!window.familyApp || !this.elements.targetSelection) return;

        const kids = window.familyApp.state.kids;
        const settings = window.familyApp.state.settings;

        // Clear existing targets
        const existingTargets = this.elements.targetSelection.querySelectorAll('.checkbox-item');
        existingTargets.forEach(item => item.remove());

        // Create checkbox container
        let checkboxGroup = this.elements.targetSelection.querySelector('.checkbox-group');
        if (!checkboxGroup) {
            checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';
            this.elements.targetSelection.appendChild(checkboxGroup);
        } else {
            checkboxGroup.innerHTML = '';
        }

        // Add general timeline option
        const generalItem = this.createCheckboxItem('general', settings.generalTimelineName);
        checkboxGroup.appendChild(generalItem);

        // Add kid timeline options
        kids.forEach(kid => {
            const kidItem = this.createCheckboxItem(`kid${kid.id}`, `${kid.name}'s Timeline`);
            checkboxGroup.appendChild(kidItem);
        });

        // Update create button state after targets change
        this.updateCreateButtonState();
    }

    createCheckboxItem(value, label) {
        const item = document.createElement('div');
        item.className = 'checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'target';
        checkbox.value = value;
        checkbox.id = `target-${value}`;

        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', `target-${value}`);
        labelEl.textContent = label;

        // Add event listener for state updates
        checkbox.addEventListener('change', () => {
            this.updateCreateButtonState();
        });

        item.appendChild(checkbox);
        item.appendChild(labelEl);

        return item;
    }

    updateCreateButtonState() {
        if (!this.elements.createEntryBtn || !window.familyApp) return;

        const state = window.familyApp.state;
        const hasContent = this.hasEntryContent();
        const hasTargets = this.hasSelectedTargets();
        const canCreate = state.canCreateEntries();

        const isEnabled = canCreate && hasContent && hasTargets;
        
        this.elements.createEntryBtn.disabled = !isEnabled;
        
        let tooltipText = '';
        if (!canCreate) {
            tooltipText = 'Add kids and login as parent to create entries';
        } else if (!hasContent) {
            tooltipText = 'Please add some content (text, image, or audio)';
        } else if (!hasTargets) {
            tooltipText = 'Please select at least one timeline';
        } else {
            tooltipText = 'Create timeline entry';
        }
        
        this.elements.createEntryBtn.title = tooltipText;
    }

    hasEntryContent() {
        const hasText = this.elements.entryText && this.elements.entryText.value.trim().length > 0;
        const hasImage = this.elements.imageInput && this.elements.imageInput.files.length > 0;
        const hasAudio = this.elements.audioInput && this.elements.audioInput.files.length > 0;
        
        return hasText || hasImage || hasAudio;
    }

    hasSelectedTargets() {
        const checkboxes = document.querySelectorAll('input[name="target"]:checked');
        return checkboxes.length > 0;
    }

    displayTimelineEntries(entries) {
        if (!this.elements.timelineEntries) return;

        this.elements.timelineEntries.innerHTML = '';

        if (entries.length === 0) {
            const placeholder = document.createElement('p');
            placeholder.className = 'placeholder-text';
            placeholder.textContent = 'No entries found with this password.';
            this.elements.timelineEntries.appendChild(placeholder);
            return;
        }

        entries.forEach(entry => {
            const entryElement = document.createElement('timeline-entry');
            entryElement.setAttribute('entry-id', entry.id);
            entryElement.setAttribute('timestamp', entry.timestamp);
            entryElement.setAttribute('preview-text', this.getEntryPreview(entry.decryptedContent));
            entryElement.setAttribute('target-timelines', entry.targetTimelines.join(', '));
            
            this.elements.timelineEntries.appendChild(entryElement);
        });
    }

    getEntryPreview(content) {
        if (!content || !content.content) return 'No preview available';
        
        const entryContent = content.content;
        let preview = '';
        
        if (entryContent.text) {
            preview = entryContent.text.substring(0, 100);
            if (entryContent.text.length > 100) {
                preview += '...';
            }
        } else if (entryContent.image) {
            preview = `📷 Image: ${entryContent.image.name}`;
        } else if (entryContent.audio) {
            preview = `🎵 Audio: ${entryContent.audio.name}`;
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

    showEntryModal(decryptedContent) {
        const modal = document.getElementById('entryModal');
        if (!modal || !this.elements.entryDetail) return;

        // Clear previous content
        this.elements.entryDetail.innerHTML = '';

        // Create entry detail content
        const content = decryptedContent.content;
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'entry-timestamp';
        timestamp.textContent = new Date(decryptedContent.timestamp).toLocaleString();
        this.elements.entryDetail.appendChild(timestamp);

        // Add text content
        if (content.text) {
            const textDiv = document.createElement('div');
            textDiv.className = 'entry-text';
            textDiv.textContent = content.text;
            this.elements.entryDetail.appendChild(textDiv);
        }

        // Add image content
        if (content.image) {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'entry-media';
            const img = document.createElement('img');
            img.src = `data:${content.image.type};base64,${content.image.data_base64}`;
            img.alt = content.image.name;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            imageDiv.appendChild(img);
            this.elements.entryDetail.appendChild(imageDiv);
        }

        // Add audio content
        if (content.audio) {
            const audioDiv = document.createElement('div');
            audioDiv.className = 'entry-media';
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = `data:${content.audio.type};base64,${content.audio.data_base64}`;
            audio.style.width = '100%';
            audioDiv.appendChild(audio);
            this.elements.entryDetail.appendChild(audioDiv);
        }

        // Add metadata
        const metadata = document.createElement('div');
        metadata.className = 'entry-metadata';
        metadata.innerHTML = `
            <small>
                Decrypted via: ${this.getDecryptedByDisplayName(decryptedContent.decryptedBy)}<br>
                Targets: ${decryptedContent.targetTimelines.join(', ')}
            </small>
        `;
        this.elements.entryDetail.appendChild(metadata);

        // Show modal
        modal.show();
    }

    getDecryptedByDisplayName(decryptedBy) {
        if (!window.familyApp) return decryptedBy;

        const state = window.familyApp.state;
        
        switch (decryptedBy) {
            case 'parent':
                return state.settings.parentName;
            case 'general':
                return state.settings.generalTimelineName;
            default:
                if (decryptedBy.startsWith('kid')) {
                    const kidId = parseInt(decryptedBy.replace('kid', ''));
                    const kid = state.kids.find(k => k.id === kidId);
                    return kid ? `${kid.name}'s Timeline` : decryptedBy;
                }
                return decryptedBy;
        }
    }

    handleFileSelection(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        // Show file selection feedback
        const label = event.target.closest('.file-input').querySelector('span');
        const originalText = label.textContent;
        
        label.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
        label.style.color = 'var(--color-success)';
        
        // Reset after a few seconds
        setTimeout(() => {
            label.textContent = originalText;
            label.style.color = '';
        }, 3000);

        // Update create button state
        this.updateCreateButtonState();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Status and notification methods
    showStatus(message, type = 'info', duration = 5000) {
        showStatus(message, type, duration);
    }

    showSuccess(message, duration = 3000) {
        this.showStatus(message, 'success', duration);
    }

    showError(message, duration = 5000) {
        this.showStatus(message, 'error', duration);
    }

    showWarning(message, duration = 4000) {
        this.showStatus(message, 'warning', duration);
    }

    // Animation helpers
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        const fade = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            }
        };
        
        requestAnimationFrame(fade);
    }

    fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity);
        
        const fade = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = startOpacity * (1 - progress);
            
            if (progress >= 1) {
                element.style.display = 'none';
            } else {
                requestAnimationFrame(fade);
            }
        };
        
        requestAnimationFrame(fade);
    }

     getCurrentTimelineSelection() {
        // Option 1: If you have a select dropdown for timelines
        const timelineSelector = document.getElementById('timelineSelector'); // Assuming you add/have an element with this ID
        if (timelineSelector && timelineSelector.value) {
            console.log('UIManager:getCurrentTimelineSelection - Selected from #timelineSelector:', timelineSelector.value);
            return timelineSelector.value;
        }

        // Option 2: If you store the current timeline ID elsewhere in the UI or state managed by UI
        // For example, if you have a data attribute on a container:
        // const timelineViewContainer = document.getElementById('timelineViewContainer');
        // if (timelineViewContainer && timelineViewContainer.dataset.currentTimelineId) {
        //     return timelineViewContainer.dataset.currentTimelineId;
        // }

        // Fallback or default if no specific selection mechanism is found yet
        // In "kid mode", it might default to the kid's own timeline if only one kid is active,
        // or require explicit selection. For now, returning null or a default.
        // console.warn('UIManager:getCurrentTimelineSelection - No specific timeline selector found or no value. Defaulting might be needed or this indicates an incomplete UI setup for timeline viewing.');
        
        // If in kid mode and there's a logged-in kid, you might infer it.
        // However, the password input is generic, so explicit selection is better.
        // For now, let's assume 'general' if nothing else is explicitly selected,
        // as per the OR condition in main.js, but ideally, the UI should make this clear.
        // Returning null will force the 'general' fallback in main.js if no selector is found.
        return null;
    }
    
    // Cleanup method
    cleanup() {
        this.elements = {};
        this.initialized = false;
        console.log('🧹 UI manager cleaned up');
    }
}