/**
 * Kid Card Web Component
 * Displays kid profile information with management actions
 */

class KidCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }

    static get observedAttributes() {
        return ['kid-id', 'kid-name', 'has-password'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    get kidId() {
        return parseInt(this.getAttribute('kid-id')) || 0;
    }

    get kidName() {
        return this.getAttribute('kid-name') || 'Unknown Kid';
    }

    get hasPassword() {
        return this.getAttribute('has-password') === 'true';
    }

    connectedCallback() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const changePasswordBtn = this.shadowRoot.querySelector('#changePasswordBtn');
        const removeBtn = this.shadowRoot.querySelector('#removeBtn');

        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                this.dispatchCustomEvent('kid-password-change', {
                    kidId: this.kidId,
                    kidName: this.kidName
                });
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.dispatchCustomEvent('kid-remove', {
                    kidId: this.kidId,
                    kidName: this.kidName
                });
            });
        }
    }

    dispatchCustomEvent(eventType, detail) {
        const event = new CustomEvent(eventType, {
            detail,
            bubbles: true,
            cancelable: true
        });
        this.dispatchEvent(event);
    }

    getStatusIcon() {
        if (this.hasPassword) {
            return `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                </svg>
            `;
        } else {
            return `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
            `;
        }
    }

    getEditIcon() {
        return `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
        `;
    }

    getRemoveIcon() {
        return `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="m23,6-2,14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2L3,6"/>
                <path d="m8,6V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
        `;
    }

    render() {
        const statusColor = this.hasPassword ? '#22c55e' : '#f59e0b';
        const statusText = this.hasPassword ? 'Password Set' : 'No Password';
        const cardClass = this.hasPassword ? 'has-password' : 'no-password';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: inherit;
                }

                .kid-card {
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    background: white;
                    transition: all 0.2s ease;
                    position: relative;
                }

                .kid-card:hover {
                    border-color: #9ca3af;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .kid-card.has-password {
                    border-color: #22c55e;
                    background-color: rgba(34, 197, 94, 0.02);
                }

                .kid-card.no-password {
                    border-color: #f59e0b;
                    background-color: rgba(245, 158, 11, 0.02);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.75rem;
                }

                .kid-info {
                    flex: 1;
                }

                .kid-name {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0 0 0.5rem 0;
                }

                .kid-status {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    color: ${statusColor};
                    font-weight: 500;
                }

                .actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    background: white;
                    color: #374151;
                    font-size: 0.75rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-decoration: none;
                }

                .btn:hover {
                    background: #f9fafb;
                    border-color: #9ca3af;
                }

                .btn-primary {
                    background: #3b82f6;
                    color: white;
                    border-color: #3b82f6;
                }

                .btn-primary:hover {
                    background: #2563eb;
                    border-color: #2563eb;
                }

                .btn-danger {
                    background: #ef4444;
                    color: white;
                    border-color: #ef4444;
                }

                .btn-danger:hover {
                    background: #dc2626;
                    border-color: #dc2626;
                }

                .kid-details {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-top: 0.5rem;
                    padding-top: 0.5rem;
                    border-top: 1px solid #f3f4f6;
                }

                .detail-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.25rem;
                }

                .detail-item:last-child {
                    margin-bottom: 0;
                }

                @media (max-width: 480px) {
                    .card-header {
                        flex-direction: column;
                        gap: 0.75rem;
                    }

                    .actions {
                        width: 100%;
                        justify-content: stretch;
                    }

                    .btn {
                        flex: 1;
                        justify-content: center;
                    }
                }
            </style>

            <div class="kid-card ${cardClass}">
                <div class="card-header">
                    <div class="kid-info">
                        <h3 class="kid-name">${this.kidName}</h3>
                        <div class="kid-status">
                            ${this.getStatusIcon()}
                            <span>${statusText}</span>
                        </div>
                    </div>
                    <div class="actions">
                        <button 
                            type="button" 
                            id="changePasswordBtn" 
                            class="btn btn-primary"
                            title="${this.hasPassword ? 'Change password' : 'Set password'}"
                        >
                            ${this.getEditIcon()}
                            ${this.hasPassword ? 'Change' : 'Set'} Password
                        </button>
                        <button 
                            type="button" 
                            id="removeBtn" 
                            class="btn btn-danger"
                            title="Remove kid"
                        >
                            ${this.getRemoveIcon()}
                            Remove
                        </button>
                    </div>
                </div>
                
                <div class="kid-details">
                    <div class="detail-item">
                        <span>Kid ID:</span>
                        <span>#${this.kidId}</span>
                    </div>
                    <div class="detail-item">
                        <span>Timeline Access:</span>
                        <span>${this.hasPassword ? 'Available' : 'Pending Setup'}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

// Register the custom element
customElements.define('kid-card', KidCard);

export { KidCard };