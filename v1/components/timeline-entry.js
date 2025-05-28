/**
 * Timeline Entry Web Component
 * Displays a timeline entry with preview and click handling
 */

// For debugging: Confirm module execution
console.log('timeline-entry.js: Module execution started');

class TimelineEntry extends HTMLElement {
    constructor() {
        super(); // Must be the first call
        this.attachShadow({ mode: 'open' });

        // Constructor uses simplified content.
        // The full render will happen via attributeChangedCallback or connectedCallback.
        try {
            this.shadowRoot.innerHTML = '<p style="padding: 10px; border: 1px solid green; color: green;">TimelineEntry: Constructor placeholder. Full content will render shortly.</p>';
            console.log('TimelineEntry CONSTRUCTOR (Diagnostic): Simplified setup executed.');
        } catch (e) {
            console.error('TimelineEntry CONSTRUCTOR (Diagnostic): Error during simplified setup:', e);
        }
    }

    static get observedAttributes() {
        return ['entry-id', 'timestamp', 'preview-text', 'target-timelines', 'has-image', 'has-audio'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            console.log(`TimelineEntry: Attribute '${name}' changed from '${oldValue}' to '${newValue}'. Triggering full render.`);
            if (typeof this.render === 'function') {
                this.render();
            } else {
                // This log helps if render is still not a function after fixing syntax errors
                console.error('TimelineEntry ERROR in attributeChangedCallback: this.render is not a function!', this);
            }
        }
    }

    // Original render method - called by attributeChangedCallback or connectedCallback
    render() {
        console.log('TimelineEntry: Full render method executed.');
        const formattedDate = this.formatDate(this.timestamp);
        const mediaIcons = this.getMediaIcons();
        const hasMedia = this.hasImage || this.hasAudio;

        // Template literal for HTML structure.
        // No backslashes are needed for line continuation here.
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: inherit;
                }
                .timeline-entry {
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 0.75rem;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                }
                .timeline-entry:hover {
                    border-color: #3b82f6;
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
                    transform: translateY(-1px);
                }
                .timeline-entry:focus {
                    outline: 2px solid #3b82f6;
                    outline-offset: 2px;
                }
                .entry-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.75rem;
                    gap: 1rem;
                }
                .entry-date {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #3b82f6;
                    flex-shrink: 0;
                }
                .entry-indicators {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #6b7280;
                    flex-shrink: 0;
                }
                .media-icons {
                    display: flex;
                    gap: 0.25rem;
                    align-items: center;
                }
                .chevron-icon {
                    color: #9ca3af;
                    transition: transform 0.2s ease;
                }
                .timeline-entry:hover .chevron-icon {
                    transform: translateX(2px);
                    color: #3b82f6;
                }
                .entry-preview {
                    color: #374151;
                    font-size: 0.875rem;
                    line-height: 1.5;
                    margin-bottom: 0.75rem;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .entry-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.75rem;
                    color: #6b7280;
                    border-top: 1px solid #f3f4f6;
                    padding-top: 0.5rem;
                }
                .target-timelines {
                    flex: 1;
                }
                .entry-id {
                    font-family: monospace;
                    background: #f3f4f6;
                    padding: 0.125rem 0.375rem;
                    border-radius: 3px;
                    font-size: 0.6875rem;
                }
                .media-badge {
                    display: ${hasMedia ? 'inline-flex' : 'none'};
                    align-items: center;
                    gap: 0.25rem;
                    background: #eff6ff;
                    color: #1d4ed8;
                    padding: 0.25rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.6875rem;
                    font-weight: 500;
                    position: absolute;
                    top: 0.75rem;
                    right: 0.75rem;
                }
                @media (max-width: 480px) {
                    .timeline-entry { padding: 0.75rem; margin-bottom: 0.5rem; }
                    .entry-header { flex-direction: column; gap: 0.5rem; align-items: flex-start; }
                    .entry-footer { flex-direction: column; gap: 0.5rem; align-items: flex-start; }
                    .media-badge { position: static; align-self: flex-end; margin-top: 0.5rem; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .timeline-entry, .chevron-icon { transition: none; }
                    .timeline-entry:hover { transform: none; }
                }
            </style>

            <div class="timeline-entry" tabindex="0" role="button" aria-label="View timeline entry details">
                ${hasMedia ? `
                    <div class="media-badge">
                        ${mediaIcons}
                        Media
                    </div>
                ` : ''}
                <div class="entry-header">
                    <div class="entry-date">${formattedDate}</div>
                    <div class="entry-indicators">
                        <div class="chevron-icon">
                            ${this.getChevronIcon()}
                        </div>
                    </div>
                </div>
                <div class="entry-preview">
                    ${this.previewText}
                </div>
                <div class="entry-footer">
                    <div class="target-timelines">
                        <strong>Timelines:</strong> ${this.targetTimelines}
                    </div>
                    <div class="entry-id">
                        #${this.entryId}
                    </div>
                </div>
            </div>
        `;

        // It seems you might intend for the host element itself to have these attributes.
        // If the .timeline-entry div inside the shadow DOM is the interactive element,
        // these might not be needed on the host, or handled differently.
        // For now, keeping them as you had.
        this.setAttribute('tabindex', '0');
        this.setAttribute('role', 'button');
    }

    // --- Helper methods ---
    get entryId() {
        return parseInt(this.getAttribute('entry-id')) || 0;
    }

    get timestamp() {
        return this.getAttribute('timestamp') || '';
    }

    get previewText() {
        return this.getAttribute('preview-text') || 'No preview available';
    }

    get targetTimelines() {
        return this.getAttribute('target-timelines') || '';
    }

    get hasImage() {
        return this.getAttribute('has-image') === 'true';
    }

    get hasAudio() {
        return this.getAttribute('has-audio') === 'true';
    }

    connectedCallback() {
        this.setupEventListeners();
        if (this.isConnected) {
            let initiallyHasAttributes = false;
            for (const attr of TimelineEntry.observedAttributes) {
                if (this.hasAttribute(attr)) {
                    initiallyHasAttributes = true;
                    break;
                }
            }
            if (initiallyHasAttributes) {
                console.log('TimelineEntry: connectedCallback ensuring render for existing attributes.');
                if (typeof this.render === 'function') {
                    this.render();
                } else {
                    console.error('TimelineEntry ERROR in connectedCallback: this.render is not a function!', this);
                }
            }
        }
    }

    setupEventListeners() {
        this.addEventListener('click', () => {
            this.dispatchCustomEvent('timeline-entry-click', {
                entryId: this.entryId,
                timestamp: this.timestamp
            });
        });

        this.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // It's more direct to dispatch the event here rather than simulating a click,
                // or if you intend the click handler's logic to run, `this.click()` is fine
                // but ensure the clickable element is the host or handle appropriately.
                // Simulating a click on the host:
                this.click();
            }
        });
    }

    dispatchCustomEvent(eventType, detail) {
        const event = new CustomEvent(eventType, {
            detail,
            bubbles: true,
            cancelable: true
        });
        this.dispatchEvent(event);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                return `${diffDays} days ago`;
            } else {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
        } catch (error) {
            console.error('TimelineEntry: Error formatting date:', error);
            return dateString;
        }
    }

    getMediaIcons() {
        let icons = '';
        if (this.hasImage) {
            icons += `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                </svg>
            `;
        }
        if (this.hasAudio) { // Corrected from _this.hasAudio to this.hasAudio
            icons += `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="m19.07 4.93-1.41 1.41A7.5 7.5 0 0 1 19 12a7.5 7.5 0 0 1-1.34 5.66l1.41 1.41A9.5 9.5 0 0 0 21 12a9.5 9.5 0 0 0-1.93-7.07z"/>
                    <path d="m15.54 8.46-1.41 1.41A3.5 3.5 0 0 1 15 12a3.5 3.5 0 0 1-.87 2.13l1.41 1.41A5.5 5.5 0 0 0 17 12a5.5 5.5 0 0 0-1.46-4.54z"/>
                </svg>
            `;
        }
        return icons;
    }

    getChevronIcon() {
        return `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9,18 15,12 9,6"/>
            </svg>
        `;
    }
}

// User's existing logs for confirming definition - these are fine
console.log('timeline-entry.js: About to define custom element timeline-entry');
customElements.define('timeline-entry', TimelineEntry);
console.log('timeline-entry.js: Custom element timeline-entry defined');

export { TimelineEntry };