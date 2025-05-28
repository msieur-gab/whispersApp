/**
 * Password Strength Checker Web Component
 * Provides password input with strength validation and generation
 */

class PasswordStrengthChecker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        this._password = '';
        this._isPasswordVisible = false;
        
        // Strength rules
        this.rules = [
            { id: 'length', test: (p) => p.length >= 8, message: '8+ characters' },
            { id: 'uppercase', test: (p) => /[A-Z]/.test(p), message: 'Uppercase letter' },
            { id: 'lowercase', test: (p) => /[a-z]/.test(p), message: 'Lowercase letter' },
            { id: 'number', test: (p) => /\d/.test(p), message: 'Number' },
            { id: 'special', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p), message: 'Special character' }
        ];
        
        this.render();
    }

    static get observedAttributes() {
        return ['placeholder', 'show-generate', 'min-length'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    get password() {
        // Always get current value from input
        const input = this.shadowRoot.querySelector('#passwordInput');
        if (input) {
            this._password = input.value;
        }
        return this._password;
    }

    get placeholder() {
        return this.getAttribute('placeholder') || 'Enter password';
    }

    get showGenerate() {
        return this.getAttribute('show-generate') === 'true';
    }

    get minLength() {
        return parseInt(this.getAttribute('min-length')) || 8;
    }

    clearPassword() {
        const input = this.shadowRoot.querySelector('#passwordInput');
        if (input) {
            input.value = '';
            this._password = '';
            this.checkStrength();
        }
    }

    connectedCallback() {
        this.setupEventListeners();
        this.checkStrength();
    }

    setupEventListeners() {
        const input = this.shadowRoot.querySelector('#passwordInput');
        const toggleBtn = this.shadowRoot.querySelector('#toggleVisibility');
        const generateBtn = this.shadowRoot.querySelector('#generatePassword');

        if (input) {
            input.addEventListener('input', (e) => {
                this._password = e.target.value;
                this.checkStrength();
                this.dispatchPasswordChange();
            });
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generatePassword();
            });
        }
    }

    togglePasswordVisibility() {
        this._isPasswordVisible = !this._isPasswordVisible;
        const input = this.shadowRoot.querySelector('#passwordInput');
        const toggleBtn = this.shadowRoot.querySelector('#toggleVisibility');
        
        if (input) {
            input.type = this._isPasswordVisible ? 'text' : 'password';
        }
        
        if (toggleBtn) {
            toggleBtn.innerHTML = this._isPasswordVisible ? this.getEyeSlashIcon() : this.getEyeIcon();
        }
    }

    generatePassword() {
        const length = Math.max(this.minLength, 12);
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const allChars = lowercase + uppercase + numbers + special;

        // Ensure at least one character from each category
        let password = '';
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += special[Math.floor(Math.random() * special.length)];

        // Fill remaining length
        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // Shuffle the password
        password = password.split('').sort(() => 0.5 - Math.random()).join('');

        // Set the password
        const input = this.shadowRoot.querySelector('#passwordInput');
        if (input) {
            input.value = password;
            this._password = password;
            this.checkStrength();
            this.dispatchPasswordChange();
        }
    }

    checkStrength() {
        const results = this.rules.map(rule => ({
            ...rule,
            passed: rule.test(this._password)
        }));

        const passedCount = results.filter(r => r.passed).length;
        const score = Math.round((passedCount / this.rules.length) * 100);

        this.updateDisplay(results, score);
        this.updateStrengthMeter(score);
    }

    updateDisplay(results, score) {
        const criteriaList = this.shadowRoot.querySelector('#criteria');
        if (!criteriaList) return;

        criteriaList.innerHTML = '';
        
        results.forEach(result => {
            const item = document.createElement('li');
            item.className = result.passed ? 'passed' : 'failed';
            item.innerHTML = `
                <span class="icon">${result.passed ? '✓' : '×'}</span>
                <span class="text">${result.message}</span>
            `;
            criteriaList.appendChild(item);
        });
    }

    updateStrengthMeter(score) {
        const meter = this.shadowRoot.querySelector('#strengthMeter');
        const label = this.shadowRoot.querySelector('#strengthLabel');
        
        if (!meter || !label) return;

        let strength = 'weak';
        let color = '#ef4444';
        
        if (score >= 80) {
            strength = 'strong';
            color = '#22c55e';
        } else if (score >= 60) {
            strength = 'medium';
            color = '#f59e0b';
        }

        meter.style.width = `${score}%`;
        meter.style.backgroundColor = color;
        label.textContent = this._password.length > 0 ? `${strength} (${score}%)` : '';
    }

    dispatchPasswordChange() {
        this.dispatchEvent(new CustomEvent('password-change', {
            detail: { password: this._password },
            bubbles: true
        }));
    }

    getEyeIcon() {
        return `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
        `;
    }

    getEyeSlashIcon() {
        return `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
        `;
    }

    getGenerateIcon() {
        return `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
        `;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: inherit;
                }

                .password-container {
                    position: relative;
                    margin-bottom: 1rem;
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                input[type="password"],
                input[type="text"] {
                    width: 100%;
                    padding: 0.75rem;
                    padding-right: 2.5rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-family: inherit;
                    font-size: 1rem;
                    transition: border-color 0.2s ease;
                }

                input:focus {
                    outline: none;
                    border-color: #333;
                    box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.1);
                }

                .toggle-btn {
                    position: absolute;
                    right: 0.5rem;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.25rem;
                    color: #666;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .toggle-btn:hover {
                    color: #333;
                }

                .generate-btn {
                    display: ${this.showGenerate ? 'flex' : 'none'};
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    width: 100%;
                    padding: 0.5rem;
                    margin-top: 0.5rem;
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.875rem;
                    color: #333;
                    transition: all 0.2s ease;
                }

                .generate-btn:hover {
                    background: #e5e5e5;
                    border-color: #ccc;
                }

                .strength-meter-container {
                    margin-top: 0.5rem;
                }

                .strength-meter {
                    width: 100%;
                    height: 4px;
                    background: #f0f0f0;
                    border-radius: 2px;
                    overflow: hidden;
                }

                .strength-meter-fill {
                    height: 100%;
                    width: 0%;
                    transition: width 0.3s ease, background-color 0.3s ease;
                    border-radius: 2px;
                }

                .strength-label {
                    font-size: 0.75rem;
                    color: #666;
                    margin-top: 0.25rem;
                    text-align: right;
                }

                .criteria-list {
                    list-style: none;
                    padding: 0;
                    margin: 0.5rem 0 0 0;
                    font-size: 0.75rem;
                }

                .criteria-list li {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.125rem 0;
                    transition: color 0.3s ease;
                }

                .criteria-list li.passed {
                    color: #22c55e;
                }

                .criteria-list li.failed {
                    color: #ef4444;
                }

                .criteria-list .icon {
                    width: 12px;
                    text-align: center;
                    font-weight: bold;
                }

                .criteria-list .text {
                    flex: 1;
                }
            </style>

            <div class="password-container">
                <div class="input-wrapper">
                    <input 
                        type="password" 
                        id="passwordInput" 
                        placeholder="${this.placeholder}"
                        autocomplete="new-password"
                    >
                    <button type="button" id="toggleVisibility" class="toggle-btn" title="Toggle password visibility">
                        ${this.getEyeIcon()}
                    </button>
                </div>

                <button type="button" id="generatePassword" class="generate-btn" title="Generate secure password">
                    ${this.getGenerateIcon()}
                    Generate Password
                </button>

                <div class="strength-meter-container">
                    <div class="strength-meter">
                        <div id="strengthMeter" class="strength-meter-fill"></div>
                    </div>
                    <div id="strengthLabel" class="strength-label"></div>
                </div>

                <ul id="criteria" class="criteria-list">
                    <!-- Criteria will be populated by JavaScript -->
                </ul>
            </div>
        `;
    }
}

// Register the custom element
customElements.define('password-strength-checker', PasswordStrengthChecker);

export { PasswordStrengthChecker };