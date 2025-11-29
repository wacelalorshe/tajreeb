// تطبيق Bein Sport - الصفحة الرئيسية (الأقسام فقط)
class BeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.firebaseReady = false;
        this.firebaseError = null;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل تطبيق Bein Sport (الصفحة الرئيسية)...');
        
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        this.setupEventListeners();
        await this.initializeFirebase();
        await this.loadData();
        
        console.log('✅ تم تهيئة التطبيق بنجاح');
    }

    async initializeFirebase() {
        console.log('🔥 جاري تهيئة Firebase...');
        
        await this.waitForFirebaseSDK();
        const firebaseTest = await this.testFirebaseConnection();
        
        if (firebaseTest.success) {
            this.firebaseReady = true;
            console.log('✅ Firebase جاهز للاستخدام');
        } else {
            this.firebaseReady = false;
            this.firebaseError = firebaseTest.error;
            console.warn('⚠️ Firebase غير متاح:', firebaseTest.error);
        }
    }

    async waitForFirebaseSDK() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkFirebase = () => {
                attempts++;
                
                if (typeof firebase !== 'undefined') {
                    console.log('✅ Firebase SDK محمل بعد', attempts, 'محاولة');
                    resolve(true);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    console.warn('⚠️ Firebase SDK لم يتم تحميله بعد', maxAttempts, 'محاولة');
                    resolve(false);
                    return;
                }
                
                setTimeout(checkFirebase, 200);
            };
            
            checkFirebase();
        });
    }

    async testFirebaseConnection() {
        if (typeof db === 'undefined' || db === null) {
            return { success: false, error: 'Firestore غير مهيأ' };
        }

        try {
            console.log('🧪 اختبار اتصال Firebase...');
            const database = this.getSafeDatabase();
            if (!database) {
                return { success: false, error: 'قاعدة البيانات غير متاحة' };
            }
            
            const testDoc = database.collection('connection_test').doc('test');
            await testDoc.set({
                timestamp: new Date(),
                test: true,
                app: 'Bein Sport'
            });
            
            await testDoc.delete();
            return { success: true };
        } catch (error) {
            console.error('❌ فشل اختبار اتصال Firebase:', error);
            return { 
                success: false, 
                error: error.message,
                code: error.code 
            };
        }
    }

    getSafeDatabase() {
        if (typeof db !== 'undefined' && db !== null) {
            return db;
        }
        
        if (typeof getFirebaseDb === 'function') {
            return getFirebaseDb();
        }
        
        if (typeof initializeFirebase === 'function') {
            const result = initializeFirebase();
            return result.db;
        }
        
        console.error('❌ لا يمكن الوصول إلى قاعدة البيانات');
        return null;
    }

    async loadData() {
        console.log('📥 جاري تحميل البيانات...');
        
        // محاولة التحميل من Firebase أولاً
        if (this.firebaseReady) {
            console.log('🔥 محاولة تحميل البيانات من Firebase...');
            const firebaseLoaded = await this.loadFromFirebase();
            
            if (firebaseLoaded) {
                console.log('✅ تم تحميل البيانات من Firebase');
                this.renderData();
                return;
            }
        }
        
        // إذا فشل Firebase، استخدم التخزين المحلي
        console.log('💾 تحميل البيانات من التخزين المحلي...');
        await this.loadFromLocalStorage();
        this.renderData();
    }

    async loadFromFirebase() {
        const database = this.getSafeDatabase();
        if (!database) {
            console.log('❌ قاعدة البيانات غير متاحة لتحميل البيانات');
            return false;
        }

        try {
            console.log('📡 جاري جلب البيانات من Firebase...');
            
            // تحميل الأقسام فقط
            const sectionsSnapshot = await database.collection('sections')
                .where('isActive', '==', true)
                .orderBy('order')
                .get();

            if (!sectionsSnapshot.empty) {
                this.sections = sectionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ تم تحميل ${this.sections.length} قسم من Firebase`);
                localStorage.setItem('bein_sections', JSON.stringify(this.sections));
            } else {
                console.log('ℹ️ لا توجد أقسام في Firebase');
                return false;
            }

            // تحميل القنوات لتحديد العدد فقط
            const channelsSnapshot = await database.collection('channels').get();
            if (!channelsSnapshot.empty) {
                this.channels = channelsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                localStorage.setItem('bein_channels', JSON.stringify(this.channels));
            }

            return true;

        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات من Firebase:', error);
            return false;
        }
    }

    async loadFromLocalStorage() {
        try {
            const savedSections = localStorage.getItem('bein_sections');
            const savedChannels = localStorage.getItem('bein_channels');
            
            if (savedSections) {
                this.sections = JSON.parse(savedSections);
                console.log(`✅ تم تحميل ${this.sections.length} قسم من localStorage`);
            }
            
            if (savedChannels) {
                this.channels = JSON.parse(savedChannels);
            }
            
            if (this.sections.length === 0) {
                this.loadDefaultData();
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات المحلية:', error);
            this.loadDefaultData();
        }
    }

    renderData() {
        this.renderSections();
    }

    getActiveSections() {
        return this.sections
            .filter(section => section.isActive !== false)
            .sort((a, b) => (a.order || 1) - (b.order || 1));
    }

    renderSections() {
        const container = document.getElementById('sectionsContainer');
        if (!container) {
            console.error('❌ حاوية الأقسام غير موجودة');
            return;
        }

        const activeSections = this.getActiveSections();
        
        if (activeSections.length === 0) {
            container.innerHTML = '<div class="loading">لا توجد أقسام متاحة</div>';
            return;
        }

        // عرض الأقسام كبطاقات مع الصور
        container.innerHTML = `
            <div class="sections-grid">
                ${activeSections.map(section => {
                    return `
                        <div class="section-card" data-section-id="${section.id}">
                            <a href="section.html?sectionId=${section.id}" class="section-card-link">
                                ${section.image ? `
                                    <div class="section-image">
                                        <img src="${section.image}" alt="${section.name}" 
                                             onerror="this.src='https://via.placeholder.com/200x150/2F2562/FFFFFF?text=No+Image'">
                                    </div>
                                ` : `
                                    <div class="section-icon">
                                        <i class="uil uil-folder"></i>
                                    </div>
                                `}
                                <div class="section-name">${section.name}</div>
                                ${section.description ? `<div class="section-description">${section.description}</div>` : ''}
                                <div class="section-badge">${this.getChannelsCount(section.id)} قناة</div>
                            </a>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // دالة جديدة: الحصول على عدد القنوات في القسم
    getChannelsCount(sectionId) {
        return this.channels.filter(channel => channel.sectionId === sectionId).length;
    }

    setupEventListeners() {
        console.log('🔧 إعداد مستمعي الأحداث...');
        
        const loginToggle = document.getElementById('loginToggle');
        if (loginToggle) {
            loginToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAdminLogin();
            });
        }

        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleLogin();
            });
        }

        const cancelLogin = document.getElementById('cancelLogin');
        if (cancelLogin) {
            cancelLogin.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hideAdminLogin();
            });
        }

        const adminPassword = document.getElementById('adminPassword');
        if (adminPassword) {
            adminPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleLogin();
                }
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('loginModal')) {
                this.hideAdminLogin();
            }
        });
    }

    handleLogin() {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        if (!email || !password) {
            this.showLoginError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }
        
        if (password === "Ww735981122" && email === "admin@aseeltv.com") {
            localStorage.setItem('adminAuth', 'true');
            localStorage.setItem('adminEmail', email);
            this.hideAdminLogin();
            window.location.href = 'admin.html';
        } else {
            this.showLoginError('كلمة المرور غير صحيحة');
        }
    }

    showAdminLogin() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'block';
            setTimeout(() => {
                const passwordField = document.getElementById('adminPassword');
                if (passwordField) passwordField.focus();
            }, 100);
        }
    }

    hideAdminLogin() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('adminPassword').value = '';
            this.hideLoginError();
        }
    }

    showLoginError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
    }

    hideLoginError() {
        const loginError = document.getElementById('loginError');
        if (loginError) loginError.style.display = 'none';
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_sections', JSON.stringify(this.sections));
            localStorage.setItem('bein_channels', JSON.stringify(this.channels));
            console.log('💾 تم حفظ البيانات في التخزين المحلي');
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات محلياً:', error);
        }
    }

    loadDefaultData() {
        console.log('📋 استخدام البيانات الافتراضية...');
        
        this.sections = [{
            id: 'default-1',
            name: 'قنوات بي إن سبورت',
            order: 1,
            isActive: true,
            description: 'جميع قنوات بي إن سبورت الرياضية',
            image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=BEIN+SPORT'
        }, {
            id: 'default-2', 
            name: 'القنوات الرياضية',
            order: 2,
            isActive: true,
            description: 'أفضل القنوات الرياضية',
            image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=SPORTS'
        }];
        
        this.channels = [
            {
                id: 'default-1',
                name: 'bein sport 1',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+1',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 1,
                sectionId: 'default-1'
            },
            {
                id: 'default-2',
                name: 'bein sport 2', 
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+2',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 2,
                sectionId: 'default-1'
            }
        ];
        
        this.saveToLocalStorage();
    }

    refreshData() {
        console.log('🔄 تحديث يدوي للبيانات');
        this.loadData();
    }
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة التطبيق الرئيسي...');
    window.app = new BeinSportApp();
});
