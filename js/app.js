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
        this.setupRealTimeUpdates();
        
        console.log('✅ تم تهيئة التطبيق بنجاح');
    }

    async initializeFirebase() {
        console.log('🔥 جاري تهيئة Firebase...');
        
        await this.waitForFirebaseSDK();
        const firebaseTest = await this.testFirebaseConnection();
        
        if (firebaseTest.success) {
            this.firebaseReady = true;
            console.log('✅ Firebase جاهز للاستخدام');
            this.updateFirebaseStatus('Firebase متصل', 'success');
        } else {
            this.firebaseReady = false;
            this.firebaseError = firebaseTest.error;
            console.warn('⚠️ Firebase غير متاح:', firebaseTest.error);
            this.updateFirebaseStatus('Firebase غير متصل - جاري استخدام التخزين المحلي', 'error');
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
        
        if (this.firebaseReady) {
            console.log('🔥 محاولة تحميل البيانات من Firebase...');
            const firebaseLoaded = await this.loadFromFirebase();
            
            if (firebaseLoaded) {
                console.log('✅ تم تحميل البيانات من Firebase');
                this.renderData();
                return;
            }
        }
        
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

    // دوال الحفظ في Firebase
    async saveSectionToFirebase(sectionData) {
        const database = this.getSafeDatabase();
        if (!database || !this.firebaseReady) {
            console.warn('⚠️ Firebase غير متاح للحفظ، سيتم استخدام التخزين المحلي');
            return this.saveSectionToLocalStorage(sectionData);
        }

        try {
            let sectionId;
            if (sectionData.id && sectionData.id.startsWith('local_')) {
                // إنشاء مستند جديد في Firebase
                const docRef = await database.collection('sections').add({
                    name: sectionData.name,
                    order: sectionData.order,
                    isActive: sectionData.isActive,
                    description: sectionData.description,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                sectionId = docRef.id;
            } else {
                // تحديث مستند موجود
                await database.collection('sections').doc(sectionData.id).set({
                    ...sectionData,
                    updatedAt: new Date()
                }, { merge: true });
                sectionId = sectionData.id;
            }
            
            console.log('✅ تم حفظ القسم في Firebase:', sectionId);
            return sectionId;
        } catch (error) {
            console.error('❌ خطأ في حفظ القسم في Firebase:', error);
            throw error;
        }
    }

    async saveChannelToFirebase(channelData) {
        const database = this.getSafeDatabase();
        if (!database || !this.firebaseReady) {
            console.warn('⚠️ Firebase غير متاح للحفظ، سيتم استخدام التخزين المحلي');
            return this.saveChannelToLocalStorage(channelData);
        }

        try {
            let channelId;
            if (channelData.id && channelData.id.startsWith('local_')) {
                // إنشاء مستند جديد في Firebase
                const docRef = await database.collection('channels').add({
                    name: channelData.name,
                    image: channelData.image,
                    url: channelData.url,
                    order: channelData.order,
                    sectionId: channelData.sectionId,
                    appUrl: channelData.appUrl,
                    downloadUrl: channelData.downloadUrl,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                channelId = docRef.id;
            } else {
                // تحديث مستند موجود
                await database.collection('channels').doc(channelData.id).set({
                    ...channelData,
                    updatedAt: new Date()
                }, { merge: true });
                channelId = channelData.id;
            }
            
            console.log('✅ تم حفظ القناة في Firebase:', channelId);
            return channelId;
        } catch (error) {
            console.error('❌ خطأ في حفظ القناة في Firebase:', error);
            throw error;
        }
    }

    async deleteSectionFromFirebase(sectionId) {
        const database = this.getSafeDatabase();
        if (!database || !this.firebaseReady) {
            console.warn('⚠️ Firebase غير متاح للحذف، سيتم الحذف محلياً فقط');
            return this.deleteSectionFromLocalStorage(sectionId);
        }

        try {
            await database.collection('sections').doc(sectionId).delete();
            console.log('✅ تم حذف القسم من Firebase:', sectionId);
            
            // حذف القنوات المرتبطة
            const relatedChannels = this.channels.filter(channel => channel.sectionId === sectionId);
            for (const channel of relatedChannels) {
                await this.deleteChannelFromFirebase(channel.id);
            }
            
        } catch (error) {
            console.error('❌ خطأ في حذف القسم من Firebase:', error);
            throw error;
        }
    }

    async deleteChannelFromFirebase(channelId) {
        const database = this.getSafeDatabase();
        if (!database || !this.firebaseReady) {
            console.warn('⚠️ Firebase غير متاح للحذف، سيتم الحذف محلياً فقط');
            return this.deleteChannelFromLocalStorage(channelId);
        }

        try {
            await database.collection('channels').doc(channelId).delete();
            console.log('✅ تم حذف القناة من Firebase:', channelId);
        } catch (error) {
            console.error('❌ خطأ في حذف القناة من Firebase:', error);
            throw error;
        }
    }

    // دوال الحفظ المحلي (كبديل)
    saveSectionToLocalStorage(sectionData) {
        const sectionId = sectionData.id || 'local_' + Date.now();
        const sectionToSave = {
            id: sectionId,
            ...sectionData
        };
        
        this.sections.push(sectionToSave);
        this.saveToLocalStorage();
        return sectionId;
    }

    saveChannelToLocalStorage(channelData) {
        const channelId = channelData.id || 'local_' + Date.now();
        const channelToSave = {
            id: channelId,
            ...channelData
        };
        
        this.channels.push(channelToSave);
        this.saveToLocalStorage();
        return channelId;
    }

    deleteSectionFromLocalStorage(sectionId) {
        this.sections = this.sections.filter(s => s.id !== sectionId);
        this.channels = this.channels.filter(c => c.sectionId !== sectionId);
        this.saveToLocalStorage();
    }

    deleteChannelFromLocalStorage(channelId) {
        this.channels = this.channels.filter(c => c.id !== channelId);
        this.saveToLocalStorage();
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
            isActive: true
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

    setupRealTimeUpdates() {
        // تحديث تلقائي كل 10 ثوانٍ
        setInterval(() => {
            this.checkForUpdates();
        }, 10000);

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
            if (!this.currentSection || !activeSections.find(s => s.id === this.currentSection.id)) {
                this.showSection(activeSections[0].id);
            } else {
                this.renderChannels();
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
            container.innerHTML = '';
            return;
        }

        container.innerHTML = activeSections.map(section => `
            <div class="section-tab ${this.currentSection?.id === section.id ? 'active' : ''}" 
                 data-section-id="${section.id}">
                ${section.name}
            </div>
        `).join('');

        this.setupSectionEventListeners();
    }

    setupSectionEventListeners() {
        const sectionTabs = document.querySelectorAll('.section-tab');
        
        sectionTabs.forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
        });

        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const sectionId = tab.getAttribute('data-section-id');
                console.log('🎯 نقرة على القسم:', sectionId);
                this.showSection(sectionId);
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

        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            console.log('✅ تم تفعيل التبويب:', section.name);
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

        const syncButton = document.getElementById('syncButton');
        if (syncButton) {
            syncButton.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await this.syncWithFirebase();
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

    async syncWithFirebase() {
        console.log('🔄 بدء المزامنة مع Firebase...');
        
        try {
            if (typeof firebaseSyncManager !== 'undefined') {
                this.showAlert('جاري المزامنة مع Firebase...', 'info');
                await firebaseSyncManager.fullSync();
                await this.loadData();
                this.showAlert('تمت المزامنة بنجاح', 'success');
            } else {
                this.showAlert('أداة المزامنة غير متاحة', 'error');
            }
        } catch (error) {
            console.error('❌ فشل المزامنة:', error);
            this.showAlert('فشل المزامنة: ' + error.message, 'error');
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

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10000;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            font-weight: bold;
        `;
        alertDiv.textContent = message;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    updateFirebaseStatus(message, type) {
        const statusElement = document.getElementById('firebaseStatus');
        const statusText = document.getElementById('firebaseStatusText');
        
        if (statusElement && statusText) {
            statusElement.style.display = 'block';
            statusText.textContent = message;
            
            statusElement.classList.remove('firebase-connected', 'firebase-disconnected', 'firebase-warning');
            
            if (type === 'success') {
                statusElement.classList.add('firebase-connected');
            } else if (type === 'error') {
                statusElement.classList.add('firebase-disconnected');
            } else if (type === 'warning') {
                statusElement.classList.add('firebase-warning');
            }
        }
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
    }, 15000);
});
