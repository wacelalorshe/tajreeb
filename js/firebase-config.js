// Firebase configuration with comprehensive error handling
const firebaseConfig = {
  apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
  authDomain: "bein-42f9e.firebaseapp.com",
  projectId: "bein-42f9e",
  storageBucket: "bein-42f9e.firebasestorage.app",
  messagingSenderId: "143741167050",
  appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
  measurementId: "G-JH198SKCFS"
};

// Global variables for Firebase services
let app = null;
let db = null;
let auth = null;
let firebaseInitialized = false;

// Enhanced Firebase initialization
function initializeFirebase() {
    try {
        console.group('🚀 Firebase Initialization');
        
        // Check if Firebase SDK is properly loaded
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK is not loaded');
            throw new Error('Firebase SDK لم يتم تحميله. تحقق من اتصال الإنترنت.');
        }

        console.log('✅ Firebase SDK is loaded');

        // Initialize Firebase app
        try {
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
                console.log('✅ New Firebase app initialized');
            } else {
                app = firebase.app();
                console.log('✅ Using existing Firebase app');
            }
        } catch (appError) {
            console.error('❌ Firebase app initialization failed:', appError);
            throw appError;
        }

        // Initialize Firestore with error handling
        try {
            if (typeof firebase.firestore === 'undefined') {
                throw new Error('Firestore is not available');
            }
            
            db = firebase.firestore();
            console.log('✅ Firestore service initialized');
            
            // Configure Firestore settings
            if (db) {
                db.settings({
                    timestampsInSnapshots: true,
                    ignoreUndefinedProperties: true
                });
            }
        } catch (firestoreError) {
            console.error('❌ Firestore initialization failed:', firestoreError);
            db = null;
        }

        // Initialize Authentication
        try {
            if (typeof firebase.auth === 'undefined') {
                throw new Error('Authentication is not available');
            }
            
            auth = firebase.auth();
            console.log('✅ Authentication service initialized');
        } catch (authError) {
            console.error('❌ Authentication initialization failed:', authError);
            auth = null;
        }

        // Mark as initialized
        firebaseInitialized = true;
        console.log('🎉 Firebase initialized successfully');
        console.groupEnd();

        return { 
            success: true, 
            app: app, 
            db: db, 
            auth: auth 
        };

    } catch (error) {
        console.error('💥 Firebase initialization failed:', error);
        console.groupEnd();
        
        return { 
            success: false, 
            app: null, 
            db: null, 
            auth: null,
            error: error.message 
        };
    }
}

// Safe database access function
function getDatabase() {
    if (!db) {
        console.warn('⚠️ Database is not available. Initializing Firebase...');
        const result = initializeFirebase();
        return result.db;
    }
    return db;
}

// Test Firebase connection
async function testFirebaseConnection() {
    const database = getDatabase();
    
    if (!database) {
        console.error('❌ Database is not available for connection test');
        return { success: false, error: 'Database not available' };
    }

    try {
        console.log('🧪 Testing Firebase connection...');
        
        const testDoc = database.collection('connection_test').doc('test');
        await testDoc.set({
            timestamp: new Date(),
            message: 'Testing Firebase connection',
            status: 'success'
        });
        
        // Read it back to verify
        const doc = await testDoc.get();
        if (doc.exists) {
            console.log('✅ Firebase connection test successful');
            
            // Clean up test document
            await testDoc.delete();
            
            return { success: true };
        } else {
            console.error('❌ Test document was not created');
            return { success: false, error: 'Test document not found' };
        }
    } catch (error) {
        console.error('❌ Firebase connection test failed:', error);
        
        let errorMessage = error.message;
        if (error.code) {
            errorMessage = `Error ${error.code}: ${error.message}`;
        }
        
        return { 
            success: false, 
            error: errorMessage,
            code: error.code 
        };
    }
}

// Initialize Firebase immediately
console.log('🔧 Starting Firebase initialization...');
const initResult = initializeFirebase();

// Make services globally available with safety checks
window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;
window.firebaseInitialized = firebaseInitialized;

// Safe global access functions
window.getFirebaseDb = getDatabase;
window.testFirebase = testFirebaseConnection;

// Auto-test connection
setTimeout(() => {
    if (db) {
        testFirebaseConnection().then(result => {
            if (result.success) {
                console.log('🎉 Firebase is working perfectly!');
            } else {
                console.warn('⚠️ Firebase has issues:', result.error);
            }
        });
    } else {
        console.warn('⚠️ Firebase not initialized - using local storage only');
    }
}, 3000);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        firebaseConfig, 
        initializeFirebase, 
        testFirebaseConnection,
        getDatabase,
        app, db, auth 
    };
}
