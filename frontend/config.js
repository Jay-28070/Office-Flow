/**
 * Frontend Configuration
 * Loads environment variables for the frontend
 * 
 * Note: Since this is a vanilla JS project (not using a bundler like Vite/Webpack),
 * we'll use a simple config file that can be customized per environment.
 * 
 * For production, you would:
 * 1. Use a build tool to inject these values
 * 2. Or create separate config files for dev/prod
 */

const config = {
    firebase: {
        apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
        authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
        projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "your-project-id",
        storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
        messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
        appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
    },
    api: {
        baseUrl: import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000"
    }
};

export default config;
