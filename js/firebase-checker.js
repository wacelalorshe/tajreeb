/**
 * Firebase Checker - أداة التحقق من عمل Firebase
 * يمكن استخدام هذا الملف للتحقق من حالة Firebase في أي صفحة
 */

class FirebaseChecker {
    constructor() {
        this.results = {
            firebase: { status: 'unknown', message: '' },
            auth: { status: 'unknown', message: '' },
            firestore: { status: 'unknown', message: '' },
            rules: { status: 'unknown', message: '' }
        };
    }

    // التحقق الشامل من Firebase
    async checkAll() {
        console.group('🔥 Firebase Comprehensive Check');
        
        await this.checkFirebaseSDK();
        await this.checkAuthentication();
        await this.checkFirestore();
        await this.checkFirestoreRules();
        
        console.groupEnd();
        return this.results;
    }

    // التحقق من تحميل Firebase SDK
    checkFirebaseSDK() {
        return new Promise((resolve) => {
            console.log('🔍 Checking Firebase SDK...');
            
            if (typeof firebase === 'undefined') {
                this.results.firebase = {
                    status: 'error',
                    message: 'Firebase SDK لم يتم تحميله بشكل صحيح'
                };
                console.error('❌ Firebase SDK غير محمل');
                resolve(false);
                return;
            }

            if (!firebase.apps.length) {
                this.results.firebase = {
                    status: 'error',
                    message: 'لم يتم تهيئة تطبيق Firebase'
                };
                console.error('❌ تطبيق Firebase غير مهيأ');
                resolve(false);
                return;
            }

            try {
                const app = firebase.app();
                this.results.firebase = {
                    status: 'success',
                    message: `Firebase مهيأ باسم: ${app.name}`
                };
                console.log('✅ Firebase SDK محمل ومهيأ بشكل صحيح');
                resolve(true);
            } catch (error) {
                this.results.firebase = {
                    status: 'error',
                    message: `خطأ في تهيئة Firebase: ${error.message}`
                };
                console.error('❌ خطأ في تهيئة Firebase:', error);
                resolve(false);
            }
        });
    }

    // التحقق من خدمة المصادقة
    async checkAuthentication() {
        console.log('🔍 Checking Authentication...');
        
        if (typeof auth === 'undefined') {
            this.results.auth = {
                status: 'error',
                message: 'خدمة Authentication غير متاحة'
            };
            console.error('❌ خدمة Authentication غير متاحة');
            return false;
        }

        try {
            // التحقق من حالة المستخدم الحالي
            const user = auth.currentUser;
            
            if (user) {
                this.results.auth = {
                    status: 'success',
                    message: `مستخدم مسجل: ${user.email}`
                };
                console.log('✅ Authentication نشط - مستخدم مسجل:', user.email);
            } else {
                this.results.auth = {
                    status: 'warning',
                    message: 'لا يوجد مستخدم مسجل حاليًا'
                };
                console.log('⚠️ Authentication نشط - لا يوجد مستخدم مسجل');
            }
            
            return true;
        } catch (error) {
            this.results.auth = {
                status: 'error',
                message: `خطأ في Authentication: ${error.message}`
            };
            console.error('❌ خطأ في Authentication:', error);
            return false;
        }
    }

    // التحقق من Firestore
    async checkFirestore() {
        console.log('🔍 Checking Firestore...');
        
        if (typeof db === 'undefined') {
            this.results.firestore = {
                status: 'error',
                message: 'خدمة Firestore غير متاحة'
            };
            console.error('❌ خدمة Firestore غير متاحة');
            return false;
        }

        try {
            // محاولة قراءة من Firestore
            const testQuery = db.collection('channels').limit(1);
            const snapshot = await testQuery.get();
            
            this.results.firestore = {
                status: 'success',
                message: `Firestore نشط - ${snapshot.size} قناة موجودة`
            };
            console.log('✅ Firestore نشط - اتصال ناجح');
            return true;
        } catch (error) {
            this.results.firestore = {
                status: 'error',
                message: `خطأ في Firestore: ${error.message}`
            };
            console.error('❌ خطأ في Firestore:', error);
            return false;
        }
    }

    // التحقق من قواعد Firestore
    async checkFirestoreRules() {
        console.log('🔍 Checking Firestore Rules...');
        
        if (typeof db === 'undefined') {
            this.results.rules = {
                status: 'error',
                message: 'لا يمكن التحقق من القواعد - Firestore غير متاح'
            };
            return false;
        }

        try {
            // محاولة كتابة مستند اختباري (سيتم حذفه فورًا)
            const testDoc = db.collection('test_rules').doc('permission_test');
            
            // محاولة الكتابة
            await testDoc.set({
                test: true,
                timestamp: new Date()
            });
            
            // محاولة القراءة
            const doc = await testDoc.get();
            
            // تنظيف - حذف المستند الاختباري
            await testDoc.delete();
            
            this.results.rules = {
                status: 'success',
                message: 'قواعد Firestore تعمل بشكل صحيح'
            };
            console.log('✅ قواعد Firestore تعمل بشكل صحيح');
            return true;
        } catch (error) {
            let message = `خطأ في القواعد: ${error.message}`;
            let status = 'error';
            
            if (error.code === 'permission-denied') {
                message = 'صلاحيات الكتابة مرفوضة - تحقق من قواعد Firestore';
                status = 'warning';
                console.warn('⚠️ صلاحيات الكتابة مرفوضة - قد يكون هذا متوقعًا');
            } else {
                console.error('❌ خطأ في قواعد Firestore:', error);
            }
            
            this.results.rules = { status, message };
            return false;
        }
    }

    // عرض النتائج في واجهة المستخدم
    displayResults(containerId = 'firebase-status') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('❌ عنصر العرض غير موجود');
            return;
        }

        let html = `
            <div class="firebase-checker">
                <h3 style="color: #fff; margin-bottom: 20px;">🔥 حالة Firebase</h3>
        `;

        Object.entries(this.results).forEach(([service, result]) => {
            const serviceNames = {
                firebase: 'Firebase SDK',
                auth: 'المصادقة',
                firestore: 'قاعدة البيانات',
                rules: 'قواعد الأمان'
            };

            const icons = {
                success: '✅',
                warning: '⚠️',
                error: '❌',
                unknown: '❓'
            };

            const colors = {
                success: '#28a745',
                warning: '#ffc107',
                error: '#dc3545',
                unknown: '#6c757d'
            };

            html += `
                <div class="service-status" style="
                    background: rgba(255,255,255,0.1);
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 8px;
                    border-left: 4px solid ${colors[result.status]};
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <strong style="color: #fff;">${serviceNames[service]}</strong>
                            <div style="color: #ccc; font-size: 14px; margin-top: 5px;">${result.message}</div>
                        </div>
                        <span style="font-size: 20px;">${icons[result.status]}</span>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    // إنشاء تقرير مفصل
    generateReport() {
        console.group('📊 تقرير حالة Firebase');
        
        Object.entries(this.results).forEach(([service, result]) => {
            const serviceNames = {
                firebase: 'Firebase SDK',
                auth: 'المصادقة',
                firestore: 'قاعدة البيانات',
                rules: 'قواعد الأمان'
            };

            const icons = {
                success: '✅',
                warning: '⚠️',
                error: '❌',
                unknown: '❓'
            };

            console.log(`${icons[result.status]} ${serviceNames[service]}: ${result.message}`);
        });

        console.groupEnd();
        
        return this.results;
    }
}

// استخدام سهل للفحص
window.firebaseChecker = new FirebaseChecker();

// فحص تلقائي عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 بدء الفحص التلقائي لـ Firebase...');
    
    await firebaseChecker.checkAll();
    firebaseChecker.generateReport();
    
    // عرض النتائج إذا كان هناك عنصر للعرض
    if (document.getElementById('firebase-status')) {
        firebaseChecker.displayResults();
    }
});

// تصدير للاستخدام في الموديولات
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseChecker;
}
