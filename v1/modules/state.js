/**
 * App State Management
 * Handles application state with observer pattern for reactive updates
 */

export class AppState {
    constructor() {
        this.state = {
            mode: 'kid', // 'kid' or 'parent'
            settings: {
                parentName: 'Parent',
                generalTimelineName: 'Family Timeline'
            },
            kids: [],
            parentSession: {
                active: false,
                password: null,
                kidPasswords: {} // { kidId: password }
            }
        };
        
        this.listeners = new Map();
        this.initialized = false;
        // ADDED LOG
        console.log('AppState: CONSTRUCTOR finished. Initial kidPasswords:', JSON.stringify(this.state.parentSession.kidPasswords));
    }

    async init() {
        console.log('🔄 Initializing app state...');
        // Load settings & kids typically handled by main.js calling setters after DB load
        this.initialized = true;
        // console.log('✅ App state initialized'); // Your original init had this commented out or removed, respecting that.
    }

    // Event System (Observer Pattern)
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
            // Your original file had a check to delete the event set if empty, I'll keep that logic if it was there
            // Assuming it was like this from your provided uploaded:state.js for consistency:
             if (this.listeners.get(event).size === 0) {
                 this.listeners.delete(event);
             }
        }
    }

    emit(event, data = null) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Getters (as per your uploaded:state.js structure)
    get mode() {
        return this.state.mode;
    }

    get settings() {
        return this.state.settings;
    }

    get kids() {
        return this.state.kids;
    }

    get parentSession() {
        return this.state.parentSession;
    }

    // Setters / Mutators (as per your uploaded:state.js structure)
    setMode(newMode) {
        if (this.state.mode !== newMode) {
            this.state.mode = newMode;
            console.log(`🔄 Mode changed to: ${this.state.mode}`);
            this.emit('modeChanged', this.state.mode);
        }
    }

    updateSettings(newSettings) {
        this.state.settings = { ...this.state.settings, ...newSettings };
        console.log('⚙️ App settings updated:', this.state.settings);
        this.emit('settingsChanged', this.state.settings);
    }

    setKids(kidsArray) {
        this.state.kids = Array.isArray(kidsArray) ? kidsArray : [];
        console.log(`👶 Kids set in state: ${this.state.kids.length} kids`);
        this.emit('kidsChanged', this.state.kids);
    }

    addKid(kid) {
        // Basic validation for kid object might be good here
        this.state.kids.push(kid);
        console.log(`👶 Kid added to state: ${kid.name} (ID: ${kid.id})`);
        this.emit('kidsChanged', this.state.kids);
    }

    removeKid(kidId) {
        const initialLength = this.state.kids.length;
        this.state.kids = this.state.kids.filter(k => k.id !== kidId);
        
        if (this.state.parentSession.kidPasswords && this.state.parentSession.kidPasswords[kidId]) {
            delete this.state.parentSession.kidPasswords[kidId];
            console.log(`🔑 Removed password for kid ${kidId} from session`);
        }
        
        if (this.state.kids.length < initialLength) {
            console.log(`🗑️ Kid removed from state: ID ${kidId}`);
            this.emit('kidsChanged', this.state.kids);
        }
    }

    updateKidPassword(kidId, encryptedData) {
        const kidIndex = this.state.kids.findIndex(k => k.id === kidId);
        if (kidIndex !== -1) {
            this.state.kids[kidIndex] = {
                ...this.state.kids[kidIndex],
                ...encryptedData, // This contains new encrypted pass, salt, iv
                updatedAt: new Date().toISOString()
            };
            console.log(`🔑 Kid password data updated in state for ID ${kidId}`);
            this.emit('kidsChanged', this.state.kids);
        }
    }

    // Parent Session Management
    async startParentSession(password) {
        // ADDED LOG
        console.log('AppState: startParentSession CALLED. Current kidPasswords BEFORE reset:', JSON.stringify(this.state.parentSession.kidPasswords));
        
        // Validate password (example - your main.js handles empty check)
        // this.validateParentPassword(password); // Assuming you might add validation - kept from your file

        this.state.parentSession.active = true;
        this.state.parentSession.password = password;
        this.state.parentSession.kidPasswords = {}; // Reset kidPasswords
        // ADDED LOG
        console.log('AppState: startParentSession - kidPasswords RESET to {}. Parent session active:', this.state.parentSession.active);
        
        this.emit('parentSessionChanged', { ...this.state.parentSession }); // Emit a copy
        return true; // Indicate success
    }

    endParentSession() {
        // ADDED LOG
        console.log('AppState: endParentSession CALLED. Current kidPasswords BEFORE reset:', JSON.stringify(this.state.parentSession.kidPasswords));
        
        this.state.parentSession.active = false;
        this.state.parentSession.password = null;
        this.state.parentSession.kidPasswords = {}; // Clear kidPasswords
        // ADDED LOG
        console.log('AppState: endParentSession - kidPasswords RESET to {}. Parent session active:', this.state.parentSession.active);
        
        this.emit('parentSessionChanged', { ...this.state.parentSession }); // Emit a copy
    }

    // This method is called by main.js when a new kid is added OR password changed
    // It stores the CLEARTEXT password in the current session.
    setKidPasswordInSession(kidId, password) {
        // ADDED LOG
        console.log('AppState: setKidPasswordInSession CALLED for kidId:', kidId);
        if (!this.state.parentSession.kidPasswords) {
            // ADDED LOG
            console.warn('AppState: setKidPasswordInSession - this.state.parentSession.kidPasswords was null/undefined, re-initializing to {}.');
            this.state.parentSession.kidPasswords = {};
        }
        this.state.parentSession.kidPasswords[kidId] = password;
        // ADDED LOG
        console.log('AppState: setKidPasswordInSession - kidPasswords updated. All session kid IDs:', Object.keys(this.state.parentSession.kidPasswords));
    }

    // --- METHOD ADDED TO FIX THE ERROR ---
    canCreateEntries() {
        if (this.state.mode !== 'parent' || !this.state.parentSession.active) {
            return false;
        }
        // If parent is logged in, allow creation attempt.
        // Specific checks for kid passwords for targets happen in main.js handleCreateEntry.
        return true;
    }
    // --- END METHOD ADDED ---

    // Validation examples (retained from your uploaded:state.js)
    validateKidName(name) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error('Kid name cannot be empty');
        }
        if (name.length > 50) { 
            throw new Error('Kid name is too long');
        }

        const trimmedName = name.trim();
        const existingKid = this.state.kids.find(k => 
            k.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (existingKid) {
            throw new Error('A kid with this name already exists');
        }

        return trimmedName;
    }

    validateParentPassword(password) {
        if (!password || typeof password !== 'string' || password.length < 8) {
            throw new Error('Parent password must be at least 8 characters long');
        }
        return password;
    }

    validateKidPassword(password) {
        if (!password || typeof password !== 'string' || password.length < 6) {
            throw new Error('Kid password must be at least 6 characters long');
        }
        return password;
    }

    // Export/Import State (retained from your uploaded:state.js)
    exportSettings() {
        return {
            settings: { ...this.state.settings },
            kids: this.state.kids.map(k => ({
                id: k.id,
                name: k.name,
                // Note: We don't export encrypted passwords for security
            }))
        };
    }

    importSettings(data) {
        if (data.settings) {
            this.updateSettings(data.settings);
        }
        
        // Note: Kids would need to be re-added with passwords
        // We don't import encrypted passwords for security reasons
        console.log('⚠️ Settings imported. Kids will need to be re-added with passwords.');
    }
}