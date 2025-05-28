/**
 * Modal Dialog Web Component
 * Reusable modal dialog for displaying content
 */

class ModalDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isOpen = false;
        this.render();
    }

    static get observedAttributes() {
        return ['title', 'size'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.updateModal();
        }
    }

    get title() {
        return this.getAttribute('title') || '';
    }

    get size() {
        return this.getAttribute('size') || 'medium'; // small, medium, large, fullscreen
    }

    connectedCallback() {
        this.setupEventListeners();
        this.setupKeyboardHandling();
    }

    disconnectedCallback() {
        this.removeKeyboardHandling();
    }

    setupEventListeners() {
        const overlay = this.shadowRoot.querySelector('.modal-overlay');
        const closeBtn = this.shadowRoot.querySelector('.close-btn');
        const modal = this.shadowRoot.querySelector('.modal');

        // Close on overlay click
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hide();
                }
            });
        }

        // Close on close button click
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Prevent modal content clicks from closing modal
        if (modal) {
            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    setupKeyboardHandling() {
        this.keydownHandler = (e) => {
            if (!this.isOpen) return;

            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.hide();
                    break;
                case 'Tab':
                    this.handleTabKey(e);
                    break;
            }
        };

        document.addEventListener('keydown', this.keydownHandler);
    }

    removeKeyboardHandling() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
    }

    handleTabKey(e) {
        const focusableElements = this.getFocusableElements();
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    getFocusableElements() {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');

        return Array.from(this.shadowRoot.querySelectorAll(focusableSelectors))
            .concat(Array.from(this.querySelectorAll(focusableSelectors)));
    }

    show() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.style.display = 'block';
        
        // Store the currently focused element
        this.previousFocus = document.activeElement;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Add animation class
        requestAnimationFrame(() => {
            this.shadowRoot.querySelector('.modal-overlay').classList.add('show');
        });

        // Focus the modal or first focusable element
        this.focusModal();

        // Dispatch open event
        this.dispatchEvent(new CustomEvent('modal-open', {
            bubbles: true,
            detail: { modal: this }
        }));
    }

    hide() {
        if (!this.isOpen) return;

        this.isOpen = false;
        
        // Remove animation class
        this.shadowRoot.querySelector('.modal-overlay').classList.remove('show');
        
        // Wait for animation to complete
        setTimeout(() => {
            this.style.display = 'none';
            
            // Restore body scroll
            document.body.style.overflow = '';
            
            // Restore focus
            if (this.previousFocus) {
                this.previousFocus.focus();
                this.previousFocus = null;
            }
        }, 300);

        // Dispatch close event
        this.dispatchEvent(new CustomEvent('modal-close', {
            bubbles: true,
            detail: { modal: this }
        }));
    }

    focusModal() {
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        } else {
            this.shadowRoot.querySelector('.modal').focus();
        }
    }

    updateModal() {
        const titleElement = this.shadowRoot.querySelector('.modal-title');
        const modal = this.shadowRoot.querySelector('.modal');
        
        if (titleElement) {
            titleElement.textContent = this.title;
            titleElement.style.display = this.title ? 'block' : 'none';
        }

        if (modal) {
            modal.className = `modal modal-${this.size}`;
        }
    }

    getCloseIcon() {
        return `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        `;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1000;
                    font-family: inherit;
                }

                .modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    padding: 1rem;
                    box-sizing: border-box;
                }

                .modal-overlay.show {
                    opacity: 1;
                }

                .modal {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    position: relative;
                    max-height: 90vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    transform: scale(0.95);
                    transition: transform 0.3s ease;
                }

                .modal-overlay.show .modal {
                    transform: scale(1);
                }

                .modal-small {
                    width: 100%;
                    max-width: 400px;
                }

                .modal-medium {
                    width: 100%;
                    max-width: 600px;
                }

                .modal-large {
                    width: 100%;
                    max-width: 800px;
                }

                .modal-fullscreen {
                    width: 95vw;
                    height: 95vh;
                    max-width: none;
                    max-height: none;
                }

                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                    flex-shrink: 0;
                }

                .modal-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0;
                }

                .close-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 6px;
                    color: #6b7280;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .close-btn:hover {
                    background: #f3f4f6;
                    color: #374151;
                }

                .close-btn:focus {
                    outline: 2px solid #3b82f6;
                    outline-offset: 2px;
                }

                .modal-content {
                    padding: 1.5rem;
                    overflow-y: auto;
                    flex: 1;
                }

                .modal-content::-webkit-scrollbar {
                    width: 8px;
                }

                .modal-content::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }

                .modal-content::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 4px;
                }

                .modal-content::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }

                /* Mobile responsive */
                @media (max-width: 640px) {
                    .modal-overlay {
                        padding: 0.5rem;
                    }

                    .modal-small,
                    .modal-medium,
                    .modal-large {
                        width: 100%;
                        max-width: none;
                    }

                    .modal-fullscreen {
                        width: 100vw;
                        height: 100vh;
                        border-radius: 0;
                    }

                    .modal-header {
                        padding: 1rem;
                    }

                    .modal-content {
                        padding: 1rem;
                    }

                    .modal-title {
                        font-size: 1.125rem;
                    }
                }

                /* Animation for reduced motion */
                @media (prefers-reduced-motion: reduce) {
                    .modal-overlay,
                    .modal {
                        transition: none;
                    }
                }

                /* Focus styles */
                .modal:focus {
                    outline: none;
                }

                /* Ensure modal is accessible */
                .modal[tabindex] {
                    outline: none;
                }
            </style>

            <div class="modal-overlay">
                <div class="modal modal-${this.size}" role="dialog" aria-modal="true" tabindex="-1">
                    <div class="modal-header">
                        <h2 class="modal-title" style="display: ${this.title ? 'block' : 'none'};">
                            ${this.title}
                        </h2>
                        <button type="button" class="close-btn" aria-label="Close modal">
                            ${this.getCloseIcon()}
                        </button>
                    </div>
                    <div class="modal-content">
                        <slot></slot>
                    </div>
                </div>
            </div>
        `;
    }
}

// Register the custom element
customElements.define('modal-dialog', ModalDialog);

export { ModalDialog };