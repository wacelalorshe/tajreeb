// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
  authDomain: "bein-42f9e.firebaseapp.com",
  projectId: "bein-42f9e",
  storageBucket: "bein-42f9e.firebasestorage.app",
  messagingSenderId: "143741167050",
  appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
  measurementId: "G-JH198SKCFS"
};

// Firebase initialization with enhanced error handling
function initializeFirebase() {
    try {
        console.group('🚀 تهيئة Firebase');
        
        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK لم يتم تحميله. تحقق من اتصال الإنترنت.');
        }

        // Initialize Firebase app
        let app;
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
            console.log('✅ تم تهيئة تطبيق Firebase جديد');
        } else {
            app = firebase.app();
            console.log('✅ استخدام تطبيق Firebase موجود');
        }

        // Initialize services with error handling
        let db, auth;

        try {
            db = firebase.firestore();
            console.log('✅ خدمة Firestore مهيأة');
        } catch (error) {
            console.error('❌ خطأ في تهيئة Firestore:', error);
            db = null;
        }

        try {
            auth = firebase.auth();
            console.log('✅ خدمة Authentication مهيأة');
        } catch (error) {
            console.error('❌ خطأ في تهيئة Authentication:', error);
            auth = null;
        }

        // Firestore settings
        if (db) {
            db.settings({
                timestampsInSnapshots: true
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

// Initialize Firebase and make services globally available
const { app, db, auth } = initializeFirebase();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { app, db, auth, firebaseConfig };
}
