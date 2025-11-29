// Firebase configuration with enhanced error handling
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
let app, db, auth;

// Firebase initialization with enhanced error handling
function initializeFirebase() {
    try {
        console.group('🚀 تهيئة Firebase');
        
        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK لم يتم تحميله');
            throw new Error('Firebase SDK لم يتم تحميله. تحقق من اتصال الإنترنت.');
        }

        console.log('✅ Firebase SDK محمل');

        // Initialize Firebase app
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
            console.log('✅ تم تهيئة تطبيق Firebase جديد');
        } else {
            app = firebase.app();
            console.log('✅ استخدام تطبيق Firebase موجود');
        }

        // Initialize Firestore
        try {
            db = firebase.firestore();
            
            // Enable offline persistence
            db.enablePersistence()
                .then(() => {
                    console.log('✅ تم تمكين التخزين المحلي لـ Firestore');
                })
                .catch((err) => {
                    console.warn('⚠️ لا يمكن تمكين التخزين المحلي:', err);
                });
            
            console.log('✅ خدمة Firestore مهيأة');
        } catch (error) {
            console.error('❌ خطأ في تهيئة Firestore:', error);
            db = null;
        }

        // Initialize Authentication
        try {
            auth = firebase.auth();
            console.log('✅ خدمة Authentication مهيأة');
        } catch (error) {
            console.error('❌ خطأ في تهيئة Authentication:', error);
            auth = null;
        }

        // Firestore settings for better compatibility
        if (db) {
            db.settings({
                timestampsInSnapshots: true,
                ignoreUndefinedProperties: true
            });
        }

        console.log('🎉 تم تهيئة Firebase بنجاح');
        console.groupEnd();

        return { app, db, auth };

    } catch (error) {
        console.error('💥 فشل تهيئة Firebase:', error);
        console.groupEnd();
        return { app: null, db: null, auth: null };
    }
}

// Initialize Firebase immediately
const firebaseInitResult = initializeFirebase();
app = firebaseInitResult.app;
db = firebaseInitResult.db;
auth = firebaseInitResult.auth;

// Make services globally available
window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;

// Test Firebase connection
async function testFirebaseConnection() {
    if (!db) {
        console.error('❌ Firestore غير متاح لاختبار الاتصال');
        return false;
    }

    try {
        console.log('🧪 اختبار اتصال Firebase...');
        const testDoc = db.collection('connection_test').doc('test');
        await testDoc.set({
            timestamp: new Date(),
            message: 'Testing Firebase connection',
            status: 'success'
        });
        
        // Read it back
        const doc = await testDoc.get();
        if (doc.exists) {
            console.log('✅ اتصال Firebase ناجح');
            return true;
        } else {
            console.error('❌ فشل اختبار الاتصال - المستند غير موجود');
            return false;
        }
    } catch (error) {
        console.error('❌ فشل اختبار اتصال Firebase:', error);
        
        // Provide specific error messages
        if (error.code === 'permission-denied') {
            console.error('🔐 خطأ في الصلاحيات - تحقق من قواعد Firestore');
        } else if (error.code === 'unavailable') {
            console.error('🌐 Firebase غير متاح - تحقق من اتصال الإنترنت');
        } else {
            console.error('💥 خطأ غير معروف:', error.message);
        }
        
        return false;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { app, db, auth, firebaseConfig, initializeFirebase, testFirebaseConnection };
}

// Auto-test connection after initialization
setTimeout(() => {
    testFirebaseConnection().then(success => {
        if (success) {
            console.log('🎉 اتصال Firebase يعمل بشكل مثالي');
        } else {
            console.warn('⚠️ اتصال Firebase به مشاكل - استخدام التخزين المحلي');
        }
    });
}, 2000);
