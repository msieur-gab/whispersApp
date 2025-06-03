/**
 * Family Onboarding Component
 * Guided setup for families starting their timeline journey
 * Save as: components/family-onboarding.js
 */

class FamilyOnboarding extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.currentStep = 1;
        this.maxSteps = 4;
        this.familyData = {
            parent: {},
            children: [],
            settings: {}
        };
        this.render();
    }

    connectedCallback() {
        this.setupEventListeners();
        // Validate the current step after initial render
        setTimeout(() => this.validateCurrentStep(), 100);
    }

    setupEventListeners() {
        // Navigation buttons
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.matches('.btn-next')) {
                this.handleNextStep();
            } else if (e.target.matches('.btn-prev')) {
                this.handlePrevStep();
            } else if (e.target.matches('.btn-add-child')) {
                this.addChildForm();
            } else if (e.target.matches('.btn-remove-child')) {
                this.removeChildForm(e.target.dataset.index);
            } else if (e.target.matches('.btn-finish')) {
                this.handleFinishOnboarding();
            }
        });

        // Form validation
        this.shadowRoot.addEventListener('input', (e) => {
            this.validateCurrentStep();
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: inherit;
                }

                .onboarding-container {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow: hidden;
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .onboarding-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 2rem;
                    text-align: center;
                }

                .onboarding-header h1 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.75rem;
                    font-weight: 600;
                }

                .onboarding-header p {
                    margin: 0;
                    opacity: 0.9;
                    font-size: 1rem;
                }

                .progress-bar {
                    height: 4px;
                    background: rgba(255, 255, 255, 0.3);
                    margin-top: 1rem;
                }

                .progress-fill {
                    height: 100%;
                    background: white;
                    border-radius: 2px;
                    transition: width 0.3s ease;
                    width: ${(this.currentStep / this.maxSteps) * 100}%;
                }

                .onboarding-content {
                    padding: 2rem;
                    max-height: 50vh;
                    overflow-y: auto;
                }

                .step {
                    display: none;
                }

                .step.active {
                    display: block;
                    animation: fadeIn 0.3s ease-in-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .step h2 {
                    color: #333;
                    margin-bottom: 1rem;
                    font-size: 1.5rem;
                }

                .step p {
                    color: #666;
                    margin-bottom: 1.5rem;
                    line-height: 1.6;
                }

                .step ul {
                    color: #666;
                    margin-bottom: 1.5rem;
                    padding-left: 1.5rem;
                }

                .step li {
                    margin-bottom: 0.5rem;
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-group label {
                    display: block;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: #333;
                }

                .form-group input,
                .form-group select {
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid #e1e5e9;
                    border-radius: 6px;
                    font-size: 1rem;
                    transition: border-color 0.2s ease;
                }

                .form-group input:focus,
                .form-group select:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .form-group.error input {
                    border-color: #ef4444;
                }

                .form-group small {
                    color: #666;
                    font-size: 0.75rem;
                    margin-top: 0.25rem;
                    display: block;
                }

                .error-message {
                    color: #ef4444;
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                }

                .child-form {
                    background: #f8fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 1.5rem;
                    margin-bottom: 1rem;
                    position: relative;
                }

                .child-form h3 {
                    margin: 0 0 1rem 0;
                    color: #4a5568;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .btn-remove-child {
                    background: #fed7d7;
                    color: #c53030;
                    border: none;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    cursor: pointer;
                }

                .btn-add-child {
                    background: #e6fffa;
                    color: #319795;
                    border: 2px dashed #81e6d9;
                    padding: 1rem;
                    border-radius: 8px;
                    width: 100%;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s ease;
                }

                .btn-add-child:hover {
                    background: #b2f5ea;
                    border-color: #4fd1c7;
                }

                .important-note {
                    background: #fef5e7;
                    border: 2px solid #f6ad55;
                    border-radius: 8px;
                    padding: 1rem;
                    margin: 1rem 0;
                }

                .important-note h4 {
                    color: #c05621;
                    margin: 0 0 0.5rem 0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .important-note p {
                    color: #744210;
                    margin: 0;
                    font-size: 0.875rem;
                    line-height: 1.5;
                }

                .review-section {
                    background: #f8fafc;
                    padding: 1rem;
                    border-radius: 6px;
                    margin-bottom: 1rem;
                    border-left: 4px solid #667eea;
                }

                .review-section h3 {
                    margin-top: 0;
                    color: #4a5568;
                }

                .onboarding-footer {
                    background: #f8fafc;
                    padding: 1.5rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid #e2e8f0;
                }

                .btn {
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                    font-size: 1rem;
                }

                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .btn-primary {
                    background: #667eea;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #5a6fd8;
                    transform: translateY(-1px);
                }

                .btn-secondary {
                    background: #e2e8f0;
                    color: #4a5568;
                }

                .btn-secondary:hover {
                    background: #cbd5e0;
                }

                .step-indicator {
                    color: #718096;
                    font-size: 0.875rem;
                }

                @media (max-width: 640px) {
                    .onboarding-container {
                        width: 95%;
                        margin: 1rem;
                    }

                    .onboarding-header,
                    .onboarding-content,
                    .onboarding-footer {
                        padding: 1.5rem;
                    }

                    .onboarding-header h1 {
                        font-size: 1.5rem;
                    }

                    .onboarding-footer {
                        flex-direction: column;
                        gap: 1rem;
                    }
                }
            </style>

            <div class="onboarding-container">
                <div class="onboarding-header">
                    <h1>Welcome to Family Timeline</h1>
                    <p>Let's set up your family's secure memory timeline</p>
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                </div>

                <div class="onboarding-content">
                    ${this.renderSteps()}
                </div>

                <div class="onboarding-footer">
                    <div class="step-indicator">
                        Step ${this.currentStep} of ${this.maxSteps}
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-secondary btn-prev" ${this.currentStep === 1 ? 'style="visibility: hidden;"' : ''}>
                            Previous
                        </button>
                        <button class="btn btn-primary ${this.currentStep === this.maxSteps ? 'btn-finish' : 'btn-next'}" disabled>
                            ${this.currentStep === this.maxSteps ? 'Start Timeline' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Validate after rendering to enable/disable buttons appropriately
        setTimeout(() => this.validateCurrentStep(), 50);
    }

    renderSteps() {
        return `
            <!-- Step 1: Welcome & Purpose -->
            <div class="step ${this.currentStep === 1 ? 'active' : ''}">
                <h2>🏠 Creating Your Family Timeline</h2>
                <p>Family Timeline helps families stay connected across distances through secure, private messages and memories.</p>
                
                <div class="important-note">
                    <h4>🔒 Your Privacy Matters</h4>
                    <p>All your family's messages and photos are stored only on your device. No one else can read your family's timeline.</p>
                </div>

                <p><strong>You'll be setting up:</strong></p>
                <ul>
                    <li><strong>Parent Account</strong> - To create and manage family memories</li>
                    <li><strong>Children Accounts</strong> - So each child can access their timeline with their own password</li>
                    <li><strong>Multi-language Support</strong> - Messages can be automatically translated</li>
                </ul>

                <p>This setup takes about 3 minutes and only needs to be done once.</p>
            </div>

            <!-- Step 2: Parent Setup -->
            <div class="step ${this.currentStep === 2 ? 'active' : ''}">
                <h2>👤 Parent Account Setup</h2>
                <p>Set up your parent account. You'll use this to create memories and manage your children's accounts.</p>

                <div class="form-group">
                    <label for="parentName">Your Name</label>
                    <input type="text" id="parentName" placeholder="How should children see your name? (e.g., Papa, Mom, Dad)" maxlength="50">
                    <div class="error-message" id="parentNameError"></div>
                </div>

                <div class="form-group">
                    <label for="parentLanguage">Your Primary Language</label>
                    <select id="parentLanguage">
                        <option value="en">English</option>
                        <option value="fr">Français (French)</option>
                        <option value="es">Español (Spanish)</option>
                        <option value="zh">中文 (Chinese)</option>
                        <option value="de">Deutsch (German)</option>
                        <option value="it">Italiano (Italian)</option>
                        <option value="pt">Português (Portuguese)</option>
                        <option value="ar">العربية (Arabic)</option>
                        <option value="ru">Русский (Russian)</option>
                        <option value="ja">日本語 (Japanese)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="masterPassword">Master Password</label>
                    <input type="password" id="masterPassword" placeholder="Choose a strong password (you'll need this to manage the timeline)">
                    <div class="error-message" id="masterPasswordError"></div>
                </div>

                <div class="form-group">
                    <label for="timelineName">Family Timeline Name</label>
                    <input type="text" id="timelineName" placeholder="e.g., 'Our Family Memories', 'Papa & Kids Timeline'" maxlength="100">
                </div>

                <div class="important-note">
                    <h4>⚠️ Important</h4>
                    <p>Your master password protects everything. Make it strong and memorable - you'll need it to create memories and manage accounts.</p>
                </div>
            </div>

            <!-- Step 3: Children Setup -->
            <div class="step ${this.currentStep === 3 ? 'active' : ''}">
                <h2>👶 Children Accounts</h2>
                <p>Set up accounts for each child. They'll use their individual passwords to access their timeline.</p>

                <div id="childrenForms">
                    ${this.renderChildrenForms()}
                </div>

                <button class="btn-add-child" type="button">
                    ➕ Add Another Child
                </button>

                <div class="important-note">
                    <h4>🌐 Language Support</h4>
                    <p>If a child speaks a different language, messages will be automatically translated for them. They can see both the original and translated versions.</p>
                </div>
            </div>

            <!-- Step 4: Review & Finish -->
            <div class="step ${this.currentStep === 4 ? 'active' : ''}">
                <h2>✅ Review Your Family Setup</h2>
                <p>Please review your family timeline configuration:</p>

                <div class="review-section">
                    <h3>Parent Account</h3>
                    <p><strong>Name:</strong> <span id="reviewParentName"></span></p>
                    <p><strong>Language:</strong> <span id="reviewParentLanguage"></span></p>
                    <p><strong>Timeline Name:</strong> <span id="reviewTimelineName"></span></p>
                </div>

                <div class="review-section">
                    <h3>Children Accounts (<span id="reviewChildCount"></span>)</h3>
                    <div id="reviewChildren"></div>
                </div>

                <div class="important-note">
                    <h4>🚀 What happens next?</h4>
                    <p>After clicking "Start Timeline", you'll choose whether to enter Parent Mode (to create memories) or Kid Mode (to view your timeline).</p>
                </div>

                <div class="important-note">
                    <h4>🔄 Need changes later?</h4>
                    <p>You can add more children, change passwords, and update settings anytime from Parent Mode.</p>
                </div>
            </div>
        `;
    }

    renderChildrenForms() {
        if (this.familyData.children.length === 0) {
            // Add first child form by default
            this.familyData.children.push({
                name: '',
                language: 'en',
                password: ''
            });
        }

        return this.familyData.children.map((child, index) => `
            <div class="child-form">
                <h3>
                    Child ${index + 1}
                    ${this.familyData.children.length > 1 ? `
                        <button class="btn-remove-child" data-index="${index}">Remove</button>
                    ` : ''}
                </h3>
                
                <div class="form-group">
                    <label for="childName${index}">Child's Name</label>
                    <input type="text" id="childName${index}" placeholder="What should we call this child?" value="${child.name}" maxlength="50">
                </div>

                <div class="form-group">
                    <label for="childLanguage${index}">Child's Primary Language</label>
                    <select id="childLanguage${index}">
                        <option value="en" ${child.language === 'en' ? 'selected' : ''}>English</option>
                        <option value="fr" ${child.language === 'fr' ? 'selected' : ''}>Français (French)</option>
                        <option value="es" ${child.language === 'es' ? 'selected' : ''}>Español (Spanish)</option>
                        <option value="zh" ${child.language === 'zh' ? 'selected' : ''}>中文 (Chinese)</option>
                        <option value="de" ${child.language === 'de' ? 'selected' : ''}>Deutsch (German)</option>
                        <option value="it" ${child.language === 'it' ? 'selected' : ''}>Italiano (Italian)</option>
                        <option value="pt" ${child.language === 'pt' ? 'selected' : ''}>Português (Portuguese)</option>
                        <option value="ar" ${child.language === 'ar' ? 'selected' : ''}>العربية (Arabic)</option>
                        <option value="ru" ${child.language === 'ru' ? 'selected' : ''}>Русский (Russian)</option>
                        <option value="ja" ${child.language === 'ja' ? 'selected' : ''}>日本語 (Japanese)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="childPassword${index}">Child's Timeline Password</label>
                    <input type="password" id="childPassword${index}" placeholder="Simple password the child can remember" value="${child.password}">
                    <small>This child will use this password to access their timeline</small>
                </div>
            </div>
        `).join('');
    }

    handleNextStep() {
        if (this.validateCurrentStep()) {
            this.saveCurrentStepData();
            if (this.currentStep < this.maxSteps) {
                this.currentStep++;
                this.render();
            }
        }
    }

    handlePrevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.render();
        }
    }

    addChildForm() {
        this.familyData.children.push({
            name: '',
            language: 'en',
            password: ''
        });
        this.render();
    }

    removeChildForm(index) {
        this.familyData.children.splice(parseInt(index), 1);
        this.render();
    }

    validateCurrentStep() {
        let isValid = true;
        const nextBtn = this.shadowRoot.querySelector('.btn-next, .btn-finish');

        switch (this.currentStep) {
            case 1:
                // Welcome step - always valid
                isValid = true;
                break;

            case 2:
                // Parent setup validation
                const parentName = this.shadowRoot.getElementById('parentName')?.value.trim();
                const masterPassword = this.shadowRoot.getElementById('masterPassword')?.value;

                isValid = this.validateField('parentName', parentName, 'Please enter your name') &&
                         this.validateField('masterPassword', masterPassword, 'Please enter a master password', 6);
                break;

            case 3:
                // Children setup validation
                isValid = true;
                this.familyData.children.forEach((child, index) => {
                    const name = this.shadowRoot.getElementById(`childName${index}`)?.value.trim();
                    const password = this.shadowRoot.getElementById(`childPassword${index}`)?.value;

                    if (!name || !password || password.length < 3) {
                        isValid = false;
                    }
                });
                break;

            case 4:
                // Review step - always valid if we got here
                this.updateReviewData();
                isValid = true;
                break;
        }

        if (nextBtn) {
            nextBtn.disabled = !isValid;
        }

        return isValid;
    }

    validateField(fieldId, value, errorMessage, minLength = 1) {
        const field = this.shadowRoot.getElementById(fieldId);
        const errorElement = this.shadowRoot.getElementById(fieldId + 'Error');
        
        const isValid = value && value.length >= minLength;
        
        if (field) {
            field.parentElement.classList.toggle('error', !isValid);
        }
        if (errorElement) {
            errorElement.textContent = isValid ? '' : errorMessage;
        }
        
        return isValid;
    }

    saveCurrentStepData() {
        switch (this.currentStep) {
            case 2:
                // Save parent data
                this.familyData.parent = {
                    name: this.shadowRoot.getElementById('parentName').value.trim(),
                    language: this.shadowRoot.getElementById('parentLanguage').value,
                    password: this.shadowRoot.getElementById('masterPassword').value
                };
                
                this.familyData.settings = {
                    parentName: this.familyData.parent.name,
                    generalTimelineName: this.shadowRoot.getElementById('timelineName').value.trim() || 'Family Timeline'
                };
                break;

            case 3:
                // Save children data
                this.familyData.children = this.familyData.children.map((child, index) => ({
                    name: this.shadowRoot.getElementById(`childName${index}`).value.trim(),
                    language: this.shadowRoot.getElementById(`childLanguage${index}`).value,
                    password: this.shadowRoot.getElementById(`childPassword${index}`).value
                }));
                break;
        }
    }

    updateReviewData() {
        const elements = {
            reviewParentName: this.familyData.parent.name,
            reviewParentLanguage: this.getLanguageName(this.familyData.parent.language),
            reviewTimelineName: this.familyData.settings.generalTimelineName,
            reviewChildCount: this.familyData.children.length
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = this.shadowRoot.getElementById(id);
            if (element) element.textContent = value;
        });

        // Update children review
        const reviewChildren = this.shadowRoot.getElementById('reviewChildren');
        if (reviewChildren) {
            reviewChildren.innerHTML = this.familyData.children.map(child => 
                `<p><strong>${child.name}</strong> - ${this.getLanguageName(child.language)} - Password set ✓</p>`
            ).join('');
        }
    }

    getLanguageName(code) {
        const languages = {
            'en': 'English', 'fr': 'Français', 'es': 'Español', 'zh': '中文',
            'de': 'Deutsch', 'it': 'Italiano', 'pt': 'Português', 'ar': 'العربية',
            'ru': 'Русский', 'ja': '日本語'
        };
        return languages[code] || code;
    }

    async handleFinishOnboarding() {
        try {
            this.saveCurrentStepData();
            
            // Dispatch event with family data
            const event = new CustomEvent('onboarding-complete', {
                detail: this.familyData,
                bubbles: true
            });
            
            this.dispatchEvent(event);
            
        } catch (error) {
            console.error('Onboarding completion error:', error);
            alert('There was an error setting up your family. Please try again.');
        }
    }
}

// Register the component
customElements.define('family-onboarding', FamilyOnboarding);

export { FamilyOnboarding };