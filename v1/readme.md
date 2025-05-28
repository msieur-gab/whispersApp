# Family Timeline & Memories

A modular, secure family timeline app for creating and sharing memories with kids. Features dynamic kid management, encrypted passwords, and a clean mobile-first interface.

## 📁 Folder Structure

```
family-timeline/
├── index.html                 # Main HTML file
├── styles.css                 # CSS styles (no framework dependency)
├── main.js                    # App initialization & orchestration
├── README.md                  # This file
├── modules/
│   ├── state.js              # App state management with observer pattern
│   ├── database.js           # IndexedDB operations using Dexie
│   ├── crypto.js             # Encryption/decryption utilities
│   └── ui.js                 # UI updates & DOM manipulation
├── components/
│   ├── password-checker.js   # Password strength web component
│   ├── kid-card.js          # Kid profile display component
│   ├── timeline-entry.js    # Timeline entry display component
│   └── modal-dialog.js      # Reusable modal component
└── utils/
    └── helpers.js           # Utility functions
```

## 🚀 Quick Start

1. **Download all files** and place them in the exact folder structure shown above
2. **Open `index.html`** in a modern web browser (Chrome, Firefox, Safari, Edge)
3. **Start using the app** - no build process required!

## ✨ Key Features

### 🔐 **Security**
- All kid passwords encrypted with parent's master password
- Timeline entries encrypted per recipient
- No passwords stored in plaintext
- Uses Web Crypto API for strong encryption

### 👶 **Dynamic Kids Management**
- Add unlimited kids with custom names
- Each kid gets their own encrypted timeline password
- Passwords persist between browser sessions
- Easy add/remove/change password functionality

### 📱 **Mobile-First Design**
- Responsive layout works on all devices
- Off-canvas menu for settings and management
- Touch-friendly interface
- Clean black/white/gray design

### 🏗️ **Modular Architecture**
- No circular dependencies
- Web components for reusable UI
- Event-driven communication
- Easy to maintain and extend

## 🎯 How It Works

### **Parent Mode**
1. Switch to Parent Mode from the menu
2. Login with your master password
3. Add kids with names and passwords
4. Create timeline entries for specific kids
5. All kid passwords load automatically after login

### **Kid Mode** 
1. Kids enter their individual timeline password
2. View only entries created for them
3. Cannot access other kids' content
4. Cannot create new entries

### **Password System**
- **Parent Master Password**: Unlocks everything, encrypts kid passwords
- **Kid Timeline Passwords**: Individual access to their timeline only
- **General Timeline**: Uses parent password for family-wide content

## 🔧 Technical Details

### **No Build Process**
- Uses ES6 modules with native browser imports
- No webpack, bundlers, or compilation needed
- Works directly in modern browsers

### **Storage**
- IndexedDB for encrypted timeline entries
- Local storage for app settings (names only)
- No external dependencies except Dexie for database

### **Browser Support**
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+
- Requires Web Crypto API support

## 📋 Usage Guide

### **Initial Setup**
1. Open the app in your browser
2. Click the hamburger menu (☰) to open settings
3. Set your parent name and general timeline name
4. Switch to Parent Mode and set your master password

### **Adding Kids**
1. In Parent Mode, login with your master password
2. In the menu, go to "Kids Management"
3. Enter kid's name and set their timeline password
4. Click "Add Kid" - password is automatically encrypted and stored

### **Creating Memories**
1. In Parent Mode (logged in), use the main interface
2. Write text, add images/audio (optional)
3. Select which kids should receive the memory
4. Click "Create Entry" - automatically encrypted for each recipient

### **Viewing Timelines**
1. Enter your timeline password in the main view
2. Accessible entries appear automatically
3. Click any entry to view full details with media
4. Works in both Parent and Kid modes

## 🔐 Security Notes

- **Master Password**: Choose a strong password - it protects everything
- **Kid Passwords**: Can be simpler but should be memorable for kids
- **Data**: Everything stays in your browser, nothing sent to servers
- **Backup**: Export your data regularly from the settings menu

## 🛠️ Development

### **File Dependencies**
```
main.js
├── modules/state.js
├── modules/database.js  
├── modules/crypto.js
├── modules/ui.js
│   └── components/* (web components)
└── utils/helpers.js
```

### **Adding Features**
1. **New Components**: Add to `components/` folder
2. **New Utilities**: Add to `utils/helpers.js`
3. **State Changes**: Modify `modules/state.js`
4. **UI Updates**: Modify `modules/ui.js`

### **Event System**
- Uses browser's native event system
- Custom events bubble up from components
- State changes trigger UI updates via observer pattern

## 🐛 Troubleshooting

### **App Won't Load**
- Check browser console for errors
- Ensure all files are in correct folder structure
- Try a different modern browser

### **Can't Decrypt Entries**
- Verify you're using the correct password
- Check if parent session is active (for parent password access)
- Ensure kid passwords were set correctly

### **Database Issues**
- Clear browser data and restart
- Check if IndexedDB is available in your browser
- Try incognito/private mode

## 🔄 Backup & Restore

### **Export Data**
1. Go to Parent Mode → Settings → Data Management
2. Click "Export All Data"
3. Save the JSON file safely

### **Import Data**
1. Go to Parent Mode → Settings → Data Management  
2. Select your backup JSON file
3. Click "Import Data"

## 📄 License

This project is open source. Feel free to modify and use for your family!

## 🤝 Contributing

This is a single-file family project, but suggestions and improvements are welcome!

---

**Made with ❤️ for families who want to keep their memories safe and private.**