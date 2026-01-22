/**
 * Color Scheme Utility
 * Applies user's saved color scheme preference on page load
 * This ensures loading screens match the user's chosen theme
 */

/**
 * Apply color scheme to the page
 * @param {string} scheme - Color scheme name ('warm', 'cool', 'nature')
 */
function applyColorScheme(scheme) {
    const root = document.documentElement;

    switch (scheme) {
        case 'cool':
            // Cool blue/cyan theme
            root.style.setProperty('--primary-color', '#3b82f6');
            root.style.setProperty('--primary-hover', '#2563eb');
            root.style.setProperty('--primary-light', '#dbeafe');
            root.style.setProperty('--primary-dark', '#1d4ed8');
            root.style.setProperty('--secondary-color', '#06b6d4');
            root.style.setProperty('--secondary-hover', '#0891b2');
            root.style.setProperty('--secondary-light', '#cffafe');
            root.style.setProperty('--accent-color', '#8b5cf6');
            root.style.setProperty('--accent-hover', '#7c3aed');
            root.style.setProperty('--accent-light', '#f3e8ff');
            root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)');
            root.style.setProperty('--gradient-accent', 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)');
            root.style.setProperty('--gradient-bg', 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 25%, #f3e8ff 50%, #cffafe 75%, #dbeafe 100%)');
            break;
        case 'nature':
            // Green/nature theme
            root.style.setProperty('--primary-color', '#10b981');
            root.style.setProperty('--primary-hover', '#059669');
            root.style.setProperty('--primary-light', '#d1fae5');
            root.style.setProperty('--primary-dark', '#047857');
            root.style.setProperty('--secondary-color', '#84cc16');
            root.style.setProperty('--secondary-hover', '#65a30d');
            root.style.setProperty('--secondary-light', '#ecfccb');
            root.style.setProperty('--accent-color', '#f59e0b');
            root.style.setProperty('--accent-hover', '#d97706');
            root.style.setProperty('--accent-light', '#fef3c7');
            root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #10b981 0%, #f59e0b 100%)');
            root.style.setProperty('--gradient-accent', 'linear-gradient(135deg, #f59e0b 0%, #84cc16 100%)');
            root.style.setProperty('--gradient-bg', 'linear-gradient(135deg, #d1fae5 0%, #ecfccb 25%, #fef3c7 50%, #d1fae5 75%, #ecfccb 100%)');
            break;
        default: // warm
            // Warm orange/coral theme (original)
            root.style.setProperty('--primary-color', '#fb923c');
            root.style.setProperty('--primary-hover', '#f97316');
            root.style.setProperty('--primary-light', '#fed7aa');
            root.style.setProperty('--primary-dark', '#ea580c');
            root.style.setProperty('--secondary-color', '#f87171');
            root.style.setProperty('--secondary-hover', '#ef4444');
            root.style.setProperty('--secondary-light', '#fecaca');
            root.style.setProperty('--accent-color', '#fbbf24');
            root.style.setProperty('--accent-hover', '#f59e0b');
            root.style.setProperty('--accent-light', '#fef3c7');
            root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #fb923c 0%, #fbbf24 100%)');
            root.style.setProperty('--gradient-accent', 'linear-gradient(135deg, #fbbf24 0%, #f87171 100%)');
            root.style.setProperty('--gradient-bg', 'linear-gradient(135deg, #fef7ed 0%, #fed7aa 25%, #fecaca 50%, #fef3c7 75%, #fef7ed 100%)');
            break;
    }
}

/**
 * Load and apply saved color scheme from localStorage
 * Call this immediately on page load to ensure loading screen matches user preference
 */
function loadSavedColorScheme() {
    try {
        // Try to get user data from localStorage
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            const colorScheme = userData.preferences?.colorScheme || 'warm';
            applyColorScheme(colorScheme);
            return colorScheme;
        }
    } catch (error) {
        console.log('No saved color scheme found, using default');
    }

    // Default to warm if no saved preference
    applyColorScheme('warm');
    return 'warm';
}

// Apply color scheme immediately when script loads
// This ensures the loading screen uses the correct colors
loadSavedColorScheme();