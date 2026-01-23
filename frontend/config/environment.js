/**
 * Environment Configuration
 * Automatically detects environment and sets API base URL
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
    // Replace 'your-render-app-name' with your actual Render app name
    API_BASE_URL: isProduction
        ? 'https://office-flow-8igf.onrender.com'  // Your actual Render backend URL
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

// Log environment info
console.log(`🌍 Environment: ${config.ENVIRONMENT}`);
console.log(`🔗 API Base URL: ${config.API_BASE_URL}`);