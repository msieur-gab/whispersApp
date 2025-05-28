/**
 * Utility Helper Functions
 * Common utilities used throughout the Family Timeline app
 */

// Status message management
let statusTimeout = null;

export function showStatus(message, type = 'info', duration = 5000) {
    const statusElement = document.getElementById('statusMessage');
    if (!statusElement) {
        console.warn('Status element not found, falling back to console:', message);
        if (type === 'error') {
            console.error(message);
        } else {
            console.log(message);
        }
        return;
    }

    // Clear existing timeout
    if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
    }

    // Set message and style
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.classList.remove('hidden');

    // Log to console as well
    const logMethod = type === 'error' ? console.error : console.log;
    logMethod(`[${type.toUpperCase()}] ${message}`);

    // Auto-hide after duration
    if (duration > 0) {
        statusTimeout = setTimeout(() => {
            hideStatus();
        }, duration);
    }
}

export function hideStatus() {
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
        statusElement.classList.add('hidden');
        statusElement.textContent = '';
        statusElement.className = 'status-message hidden';
    }
    
    if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
    }
}

// Date and time formatting
export function formatDateTime(dateString, options = {}) {
    const date = new Date(dateString);
    
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    
    try {
        return date.toLocaleDateString(undefined, formatOptions);
    } catch (error) {
        console.warn('Date formatting failed:', error);
        return dateString;
    }
}

export function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    
    return formatDateTime(dateString);
}

// File size formatting
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// String utilities
export function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

export function sanitizeFileName(fileName) {
    // Remove or replace invalid filename characters
    return fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
}

export function capitalizeFirst(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Validation utilities
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validatePassword(password, minLength = 8) {
    if (!password || password.length < minLength) {
        return { valid: false, message: `Password must be at least ${minLength} characters long` };
    }
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    const criteria = [hasUpper, hasLower, hasNumber, hasSpecial];
    const metCriteria = criteria.filter(Boolean).length;
    
    if (metCriteria < 3) {
        return { 
            valid: false, 
            message: 'Password must contain at least 3 of: uppercase, lowercase, number, special character' 
        };
    }
    
    return { valid: true, message: 'Password is strong' };
}

// DOM utilities
export function createElement(tag, className = '', textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
}

export function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

export function toggleClass(element, className, force = undefined) {
    if (force !== undefined) {
        element.classList.toggle(className, force);
    } else {
        element.classList.toggle(className);
    }
}

// Event utilities
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Array utilities
export function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
}

export function sortBy(array, key, direction = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

export function uniqueBy(array, key) {
    const seen = new Set();
    return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}

// Object utilities
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

export function isEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 === 'object') {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        return keys1.every(key => isEqual(obj1[key], obj2[key]));
    }
    
    return false;
}

// Local storage utilities (with error handling)
export function getFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Failed to get ${key} from localStorage:`, error);
        return defaultValue;
    }
}

export function setToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`Failed to set ${key} in localStorage:`, error);
        return false;
    }
}

export function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn(`Failed to remove ${key} from localStorage:`, error);
        return false;
    }
}

// URL utilities
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, filename);
}

// Error handling utilities
export function handleError(error, context = '') {
    const errorMessage = error?.message || 'Unknown error occurred';
    const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
    
    console.error('Error:', error);
    showStatus(fullMessage, 'error');
    
    return {
        message: errorMessage,
        context,
        timestamp: new Date().toISOString()
    };
}

export function handleAsyncError(asyncFn, context = '') {
    return async (...args) => {
        try {
            return await asyncFn(...args);
        } catch (error) {
            return handleError(error, context);
        }
    };
}

// Performance utilities
export function measureTime(label) {
    const start = performance.now();
    
    return {
        end: () => {
            const duration = performance.now() - start;
            console.log(`${label}: ${duration.toFixed(2)}ms`);
            return duration;
        }
    };
}

// Browser feature detection
export function supportsWebCrypto() {
    return !!(window.crypto && window.crypto.subtle);
}

export function supportsIndexedDB() {
    return 'indexedDB' in window;
}

export function supportsServiceWorker() {
    return 'serviceWorker' in navigator;
}

export function isOnline() {
    return navigator.onLine;
}

export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Development utilities
export function isDevelopment() {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

export function debugLog(...args) {
    if (isDevelopment()) {
        console.log('[DEBUG]', ...args);
    }
}

// Custom event utilities
export function createCustomEvent(type, detail = {}) {
    return new CustomEvent(type, {
        detail,
        bubbles: true,
        cancelable: true
    });
}

export function dispatchCustomEvent(element, type, detail = {}) {
    const event = createCustomEvent(type, detail);
    element.dispatchEvent(event);
    return event;
}

// Animation utilities
export function requestAnimationFrame() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || 
           window.mozRequestAnimationFrame || window.oRequestAnimationFrame ||
           window.msRequestAnimationFrame || function(callback) { 
               window.setTimeout(callback, 1000 / 60);
           };
}

// Constants for common patterns
export const CONSTANTS = {
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000,
    ERROR_DURATION: 5000,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    SUPPORTED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a']
};

// Export all utilities as a single object for convenience
export const Utils = {
    showStatus,
    hideStatus,
    formatDateTime,
    formatRelativeTime,
    formatFileSize,
    truncateText,
    sanitizeFileName,
    capitalizeFirst,
    validateEmail,
    validatePassword,
    createElement,
    removeAllChildren,
    toggleClass,
    debounce,
    throttle,
    groupBy,
    sortBy,
    uniqueBy,
    deepClone,
    isEqual,
    getFromStorage,
    setToStorage,
    removeFromStorage,
    downloadBlob,
    downloadJSON,
    handleError,
    handleAsyncError,
    measureTime,
    supportsWebCrypto,
    supportsIndexedDB,
    supportsServiceWorker,
    isOnline,
    isMobile,
    isDevelopment,
    debugLog,
    createCustomEvent,
    dispatchCustomEvent,
    CONSTANTS
};