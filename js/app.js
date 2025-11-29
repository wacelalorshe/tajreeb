// تطبيق Bein Sport - الإصدار المحسن مع الحفظ في Firebase
class BeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.currentSection = null;
        this.firebaseReady = false;
        this.firebaseError = null;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل تطبيق Bein Sport...');
        
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        this.setupEventListeners();
        await this.initializeFirebase();
        await this.loadData();
        
        // التحقق مما إذا كان هناك قسم محدد في الرابط
        this.checkUrlForSection();
        
        this.setupRealTimeUpdates();
        
        console.log('✅ تم تهيئة التطبيق بنجاح');
    }

    // دالة جديدة: التحقق من وجود قسم في الرابط
    checkUrlForSection() {
        const urlParams = new URLSearchParams(window.location.search);
        const sectionId = urlParams.get('section');
        
        if (sectionId) {
            console.log('📋 تم العثور على قسم في الرابط:', sectionId);
            // انتظر قليلاً لتحميل البيانات ثم اعرض القسم
            setTimeout(() => {
                this.showSection(sectionId);
            }, 100);
        }
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
            
            // تحميل الأقسام
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

            // تحميل القنوات
            const channelsSnapshot = await database.collection('channels')
                .orderBy('order')
                .get();

            if (!channelsSnapshot.empty) {
                this.channels = channelsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
                localStorage.setItem('bein_channels', JSON.stringify(this.channels));
            } else {
                console.log('ℹ️ لا توجد قنوات في Firebase');
                return false;
            }

            return true;

        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات من Firebase:', error);
            
            if (error.code === 'permission-denied') {
                console.error('🔐 خطأ في الصلاحيات - يرجى التحقق من قواعد Firestore');
            } else if (error.code === 'unavailable') {
                console.error('🌐 Firebase غير متاح - تحقق من اتصال الإنترنت');
            } else {
                console.error('💥 خطأ غير متوقع:', error.message);
            }
            
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
                console.log(`✅ تم تحميل ${this.channels.length} قناة من localStorage`);
            }
            
            if (this.sections.length === 0 && this.channels.length === 0) {
                this.loadDefaultData();
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات المحلية:', error);
            this.loadDefaultData();
        }
    }

    setupRealTimeUpdates() {
        // تحديث تلقائي كل 30 ثانية للتحقق من التحديثات
        setInterval(() => {
            this.checkForUpdates();
        }, 30000);

        // الاستماع لتحديثات localStorage من التبويبات الأخرى
        window.addEventListener('storage', (e) => {
            if (e.key === 'bein_sections' || e.key === 'bein_channels') {
                console.log('🔄 تم تحديث البيانات من تبويب آخر');
                this.loadFromLocalStorage();
                this.renderData();
            }
        });

        // إعداد مستمعي Firebase إذا كان متاحاً
        if (this.firebaseReady) {
            this.setupFirebaseListeners();
        }
    }

    setupFirebaseListeners() {
        const database = this.getSafeDatabase();
        if (!database) {
            console.log('❌ لا يمكن إعداد مستمعي Firebase - قاعدة البيانات غير متاحة');
            return;
        }

        try {
            console.log('👂 جاري إعداد مستمعي Firebase...');

            // مستمع للأقسام
            database.collection('sections')
                .where('isActive', '==', true)
                .orderBy('order')
                .onSnapshot((snapshot) => {
                    console.log('🔄 تحديث الأقسام من Firebase');
                    if (!snapshot.empty) {
                        this.sections = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        this.saveToLocalStorage();
                        this.renderSections();
                    }
                }, (error) => {
                    console.error('❌ خطأ في مستمع الأقسام:', error);
                });

            // مستمع للقنوات
            database.collection('channels')
                .orderBy('order')
                .onSnapshot((snapshot) => {
                    console.log('🔄 تحديث القنوات من Firebase');
                    if (!snapshot.empty) {
                        this.channels = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        this.saveToLocalStorage();
                        if (this.currentSection) {
                            this.renderChannels();
                        }
                    }
                }, (error) => {
                    console.error('❌ خطأ في مستمع القنوات:', error);
                });

        } catch (error) {
            console.error('❌ خطأ في إعداد مستمعي Firebase:', error);
        }
    }

    async checkForUpdates() {
        if (this.firebaseReady) {
            await this.loadFromFirebase();
        } else {
            await this.loadFromLocalStorage();
        }
        this.renderData();
    }

    renderData() {
        this.renderSections();
        
        const activeSections = this.getActiveSections();
        if (activeSections.length > 0) {
            // إذا لم يكن هناك قسم محدد في الرابط، اعرض القسم الأول
            const urlParams = new URLSearchParams(window.location.search);
            const sectionIdFromUrl = urlParams.get('section');
            
            if (!sectionIdFromUrl) {
                if (!this.currentSection || !activeSections.find(s => s.id === this.currentSection.id)) {
                    this.showSection(activeSections[0].id);
                } else {
                    this.renderChannels();
                }
            }
        } else {
            this.showNoData();
        }
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

        // عرض الأقسام كبطاقات
        container.innerHTML = `
            <div class="sections-grid">
                ${activeSections.map(section => {
                    // استخدام الرابط المخصص إذا كان موجوداً، وإلا استخدم معرف القسم
                    const sectionUrl = section.customUrl ? section.customUrl : section.id;
                    const isActive = this.currentSection?.id === section.id;
                    
                    return `
                        <div class="section-card ${isActive ? 'active' : ''}" 
                             data-section-id="${section.id}">
                            <a href="?section=${sectionUrl}" target="_blank" class="section-card-link">
                                <div class="section-icon">
                                    <i class="uil uil-folder"></i>
                                </div>
                                <div class="section-name">${section.name}</div>
                                ${section.description ? `<div class="section-description">${section.description}</div>` : ''}
                                <div class="section-badge">${this.getChannelsCount(section.id)} قناة</div>
                            </a>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        this.setupSectionEventListeners();
    }

    // دالة جديدة: الحصول على عدد القنوات في القسم
    getChannelsCount(sectionId) {
        return this.channels.filter(channel => channel.sectionId === sectionId).length;
    }

    setupSectionEventListeners() {
        document.querySelectorAll('.section-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const sectionId = card.getAttribute('data-section-id');
                console.log('🎯 نقرة على القسم:', sectionId);
                
                // فتح الرابط في صفحة جديدة
                const sectionLink = card.querySelector('.section-card-link');
                if (sectionLink) {
                    window.open(sectionLink.href, '_blank');
                }
            });
        });
    }

    showSection(sectionId) {
        console.log('📂 محاولة عرض القسم:', sectionId);
        
        const section = this.sections.find(s => s.id === sectionId);
        if (!section) {
            console.error('❌ القسم غير موجود:', sectionId);
            return;
        }

        document.querySelectorAll('.section-card').forEach(card => {
            card.classList.remove('active');
        });
        
        const activeCard = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (activeCard) {
            activeCard.classList.add('active');
            console.log('✅ تم تفعيل البطاقة:', section.name);
        }
        
        this.currentSection = section;
        this.renderChannels();
    }

    renderChannels() {
        const container = document.getElementById('channelsContainer');
        if (!container) {
            console.error('❌ حاوية القنوات غير موجودة');
            return;
        }

        if (!this.currentSection) {
            container.innerHTML = '<div class="loading">لا توجد قنوات متاحة</div>';
            return;
        }

        const sectionChannels = this.channels
            .filter(channel => channel.sectionId === this.currentSection.id)
            .sort((a, b) => (a.order || 1) - (b.order || 1));

        console.log(`📺 عرض ${sectionChannels.length} قناة في قسم ${this.currentSection.name}`);

        if (sectionChannels.length === 0) {
            container.innerHTML = '<div class="loading">لا توجد قنوات في هذا القسم</div>';
            return;
        }

        container.innerHTML = sectionChannels.map(channel => `
            <div class="channel-card" data-channel-id="${channel.id}">
                <div class="channel-logo">
                    <img src="${channel.image || 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'}" 
                         alt="${channel.name}"
                         onerror="this.src='https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'">
                </div>
                <div class="channel-name">${channel.name}</div>
            </div>
        `).join('');

        this.setupChannelEventListeners(sectionChannels);
    }

    setupChannelEventListeners(sectionChannels) {
        document.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const channelId = card.getAttribute('data-channel-id');
                const channel = sectionChannels.find(c => c.id === channelId);
                if (channel) {
                    console.log('🔗 فتح القناة:', channel.name);
                    this.openChannel(channel);
                }
            });
        });
    }

    showNoData() {
        const container = document.getElementById('channelsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-exclamation-triangle"></i>
                    <p>لا توجد بيانات متاحة</p>
                    <small>حالة Firebase: ${this.firebaseReady ? '✅ متصل' : '❌ غير متصل'}</small>
                    <button onclick="location.reload()" class="modal-button" style="margin-top: 15px;">
                        إعادة تحميل الصفحة
                    </button>
                </div>
            `;
        }
    }

    openChannel(channel) {
        if (channel.url && channel.url !== '#' && channel.url.trim() !== '') {
            try {
                window.open(channel.url, '_blank');
            } catch (error) {
                console.error('❌ خطأ في فتح الرابط:', error);
                this.showInstallModal(channel);
            }
        } else {
            this.showInstallModal(channel);
        }
    }

    showInstallModal(channel) {
        const modal = document.getElementById('installModal');
        if (modal) {
            modal.style.display = "block";
            const confirmBtn = document.getElementById('confirmInstall');
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    const downloadUrl = channel.downloadUrl || channel.appUrl || 'https://play.google.com/store/apps/details?id=com.xpola.player';
                    window.open(downloadUrl, '_blank');
                    this.closeModal();
                };
            }
        }
    }

    closeModal() {
        const modal = document.getElementById('installModal');
        if (modal) modal.style.display = "none";
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
            if (event.target === document.getElementById('installModal')) {
                this.closeModal();
            }
            if (event.target === document.getElementById('loginModal')) {
                this.hideAdminLogin();
            }
        });

        const confirmInstall = document.getElementById('confirmInstall');
        if (confirmInstall) {
            confirmInstall.addEventListener('click', () => {
                window.open('https://play.google.com/store/apps/details?id=com.xpola.player', '_blank');
                this.closeModal();
            });
        }

        const cancelInstall = document.getElementById('cancelInstall');
        if (cancelInstall) {
            cancelInstall.addEventListener('click', () => {
                this.closeModal();
            });
        }

        const sectionsContainer = document.getElementById('sectionsContainer');
        if (sectionsContainer) {
            sectionsContainer.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        const channelsContainer = document.getElementById('channelsContainer');
        if (channelsContainer) {
            channelsContainer.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
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
            description: 'جميع قنوات بي إن سبورت الرياضية'
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
    console.log('🏠 تهيئة التطبيق...');
    window.app = new BeinSportApp();
});

// Fallback for emergency
window.addEventListener('load', () => {
    console.log('🔄 تهيئة الطوارئ...');
    
    const loginToggle = document.getElementById('loginToggle');
    if (loginToggle) {
        loginToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('loginModal');
            if (modal) modal.style.display = 'block';
        });
    }
    
    setInterval(() => {
        if (window.app && window.app.refreshData) {
            window.app.refreshData();
        }
    }, 30000);
});
