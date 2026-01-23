/**
 * Environment Configuration
 * Automatically detects environment and sets API base URL
 * Updated: Force cache refresh
 */

// PRESENTATION MODE: Uncomment next line to force localhost for demos
// const FORCE_LOCALHOST = true;

// Detect environment
const isProduction = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    && !window.FORCE_LOCALHOST;  // Override for presentations

console.log('🔍 Environment Detection Debug:');
console.log('- Current hostname:', window.location.hostname);
console.log('- Is production?', isProduction);
console.log('- FORCE_LOCALHOST?', window.FORCE_LOCALHOST);

// Configuration
const config = {
    // Railway URL - your actual deployment
    API_BASE_URL: isProduction
        ? 'https://office-flow-production.up.railway.app'  // Your Railway backend URL
        : 'http://localhost:3000',  // Local development

    // Environment info
    ENVIRONMENT: isProduction ? 'production' : 'development'
};

// 🎯 QUICK LOCALHOST OVERRIDE: Add ?localhost=true to URL for instant localhost mode
if (window.location.search.includes('localhost=true')) {
    config.API_BASE_URL = 'http://localhost:3000';
    config.ENVIRONMENT = 'development (forced)';
}

// Make config available globally
window.APP_CONFIG = config;

// Log environment info with prominent styling
console.log('%c🌍 ENVIRONMENT DETECTION RESULTS:', 'background: #4CAF50; color: white; padding: 5px; font-weight: bold;');
console.log(`%c Environment: ${config.ENVIRONMENT}`, 'color: #2196F3; font-weight: bold;');
console.log(`%c API Base URL: ${config.API_BASE_URL}`, 'color: #FF9800; font-weight: bold;');

// Alert for debugging (remove after testing)
if (window.location.hostname !== 'localhost') {
    console.log('%c🚀 PRODUCTION MODE DETECTED - Should use Render backend!', 'background: #FF5722; color: white; padding: 5px; font-weight: bold;');
}