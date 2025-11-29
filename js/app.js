// Wait for Firebase to be fully loaded
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase !== 'undefined' && 
                firebase.apps && 
                firebase.apps.length > 0) {
                console.log("✅ Firebase is ready after", attempts, "attempts");
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.error("❌ Firebase failed to load after", maxAttempts, "attempts");
                resolve(false);
                return;
            }
            
            setTimeout(checkFirebase, 100);
        };
        
        checkFirebase();
    });
}

// نظام تحميل البيانات المحسّن
class DataManager {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.firebaseReady = false;
        this.sectionsUnsubscribe = null;
        this.channelsUnsubscribe = null;
    }

    async loadData() {
        console.log('📥 بدء تحميل البيانات...');
        
        try {
            // محاولة تحميل البيانات من Firebase أولاً
            if (await this.loadFromFirebase()) {
                this.firebaseReady = true;
                console.log('✅ تم تحميل البيانات من Firebase');
            } else {
                // إذا فشل Firebase، نستخدم البيانات المحلية
                await this.loadFromLocalStorage();
                console.log('✅ تم تحميل البيانات من التخزين المحلي');
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
            await this.loadFromLocalStorage();
        }
    }

    async loadFromFirebase() {
        if (typeof db === 'undefined' || !db) {
            console.log('❌ Firestore غير متاح');
            return false;
        }

        try {
            console.log('🔥 محاولة تحميل البيانات من Firebase...');
            
            // تحميل الأقسام
            const sectionsSnapshot = await db.collection('sections')
                .where('isActive', '==', true)
                .orderBy('order')
                .get();
            
            if (!sectionsSnapshot.empty) {
                this.sections = sectionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ تم تحميل ${this.sections.length} قسم من Firebase`);
            }

            // تحميل القنوات
            const channelsSnapshot = await db.collection('channels')
                .orderBy('order')
                .get();
            
            if (!channelsSnapshot.empty) {
                this.channels = channelsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
            }

            // حفظ نسخة محلية من البيانات
            this.saveToLocalStorage();
            
            // إعداد real-time listeners
            this.setupRealtimeListeners();
            
            return true;
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات من Firebase:', error);
            return false;
        }
    }

    setupRealtimeListeners() {
        if (typeof db === 'undefined' || !db) {
            console.log('❌ Firestore غير متاح لإعداد المستمعين اللحظيين');
            return;
        }

        try {
            console.log('👂 إعداد المستمعين اللحظيين...');
            
            // مستمع للأقسام
            this.sectionsUnsubscribe = db.collection('sections')
                .where('isActive', '==', true)
                .orderBy('order')
                .onSnapshot((snapshot) => {
                    console.log('🔄 تم تحديث الأقسام:', snapshot.size);
                    if (!snapshot.empty) {
                        this.sections = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        this.saveToLocalStorage();
                        
                        // إشعار التطبيق بالتحديث
                        if (window.app && window.app.onDataUpdated) {
                            window.app.onDataUpdated('sections');
                        }
                    }
                }, (error) => {
                    console.error('❌ خطأ في مستمع الأقسام:', error);
                });

            // مستمع للقنوات
            this.channelsUnsubscribe = db.collection('channels')
                .orderBy('order')
                .onSnapshot((snapshot) => {
                    console.log('🔄 تم تحديث القنوات:', snapshot.size);
                    if (!snapshot.empty) {
                        this.channels = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        this.saveToLocalStorage();
                        
                        // إشعار التطبيق بالتحديث
                        if (window.app && window.app.onDataUpdated) {
                            window.app.onDataUpdated('channels');
                        }
                    }
                }, (error) => {
                    console.error('❌ خطأ في مستمع القنوات:', error);
                });

        } catch (error) {
            console.error('❌ خطأ في إعداد المستمعين اللحظيين:', error);
        }
    }

    async loadFromLocalStorage() {
        console.log('💾 تحميل البيانات من التخزين المحلي...');
        
        try {
            const savedSections = localStorage.getItem('bein_sections');
            const savedChannels = localStorage.getItem('bein_channels');
            
            if (savedSections) {
                this.sections = JSON.parse(savedSections);
                console.log(`✅ تم تحميل ${this.sections.length} قسم من التخزين المحلي`);
            }
            
            if (savedChannels) {
                this.channels = JSON.parse(savedChannels);
                console.log(`✅ تم تحميل ${this.channels.length} قناة من التخزين المحلي`);
            }
            
            // إذا لم توجد بيانات محلية، نستخدم البيانات الافتراضية
            if (this.sections.length === 0 && this.channels.length === 0) {
                this.loadDefaultData();
            }
            
            return true;
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات المحلية:', error);
            this.loadDefaultData();
            return true;
        }
    }

    loadDefaultData() {
        console.log('📋 استخدام البيانات الافتراضية...');
        
        this.sections = [
            {
                id: 'default-1',
                name: 'قنوات بي إن سبورت',
                order: 1,
                isActive: true
            }
        ];
        
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

    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_sections', JSON.stringify(this.sections));
            localStorage.setItem('bein_channels', JSON.stringify(this.channels));
            console.log('💾 تم حفظ البيانات في التخزين المحلي');
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات محلياً:', error);
        }
    }

    getSections() {
        return this.sections.filter(section => section.isActive !== false)
                          .sort((a, b) => (a.order || 1) - (b.order || 1));
    }

    getChannelsBySection(sectionId) {
        return this.channels.filter(channel => channel.sectionId === sectionId)
                           .sort((a, b) => (a.order || 1) - (b.order || 1));
    }

    // تنظيف الاشتراكات
    destroy() {
        if (this.sectionsUnsubscribe) {
            this.sectionsUnsubscribe();
        }
        if (this.channelsUnsubscribe) {
            this.channelsUnsubscribe();
        }
    }
}

// التطبيق الرئيسي المحسّن
class BeinSportApp {
    constructor() {
        this.dataManager = new DataManager();
        this.currentSection = null;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تهيئة تطبيق بي إن سبورت...');
        
        // تهيئة السنة الحالية
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // إعداد مستمعين الأحداث أولاً
        this.setupEventListeners();
        
        // انتظار تحميل Firebase
        await waitForFirebase();
        
        // تحميل البيانات
        await this.dataManager.loadData();
        
        // عرض البيانات
        this.renderData();
        
        // إعداد التحديث التلقائي
        this.setupAutoRefresh();
        
        console.log('✅ تم تهيئة التطبيق بنجاح');
    }

    // دالة للتعامل مع تحديثات البيانات
    onDataUpdated(dataType) {
        console.log(`🔄 تم تحديث البيانات: ${dataType}`);
        
        if (dataType === 'sections' || dataType === 'both') {
            this.renderSections();
            
            // إذا كان القسم الحالي لم يعد موجوداً، نعرض القسم الأول
            if (this.currentSection && !this.dataManager.getSections().find(s => s.id === this.currentSection.id)) {
                const sections = this.dataManager.getSections();
                if (sections.length > 0) {
                    this.showSection(sections[0].id);
                } else {
                    this.currentSection = null;
                    this.renderChannels();
                }
            }
        }
        
        if (dataType === 'channels' || dataType === 'both') {
            if (this.currentSection) {
                this.renderChannelsForSection(this.currentSection.id);
            } else {
                this.renderChannels();
            }
        }
    }

    renderData() {
        this.renderSections();
        
        // عرض القسم الأول افتراضياً
        const sections = this.dataManager.getSections();
        if (sections.length > 0) {
            this.showSection(sections[0].id);
        } else {
            this.showNoData();
        }
    }

    renderSections() {
        const sectionsContainer = document.getElementById('sectionsContainer');
        if (!sectionsContainer) {
            console.error('❌ حاوية الأقسام غير موجودة');
            return;
        }

        const sections = this.dataManager.getSections();
        
        if (sections.length === 0) {
            sectionsContainer.innerHTML = '';
            return;
        }

        sectionsContainer.innerHTML = sections.map(section => `
            <div class="section-tab ${this.currentSection && this.currentSection.id === section.id ? 'active' : ''}" 
                 data-section-id="${section.id}">
                ${section.name}
            </div>
        `).join('');

        // إضافة مستمعي الأحداث للأقسام
        sectionsContainer.querySelectorAll('.section-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const sectionId = tab.getAttribute('data-section-id');
                this.showSection(sectionId);
            });
        });

        console.log('✅ تم عرض الأقسام:', sections.length);
    }

    showSection(sectionId) {
        console.log('📂 عرض القسم:', sectionId);
        
        // تحديث التبويب النشط
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        this.currentSection = this.dataManager.getSections().find(s => s.id === sectionId);
        this.renderChannels();
    }

    renderChannels() {
        const container = document.getElementById('channelsContainer');
        if (!container) {
            console.error('❌ حاوية القنوات غير موجودة');
            return;
        }

        if (!this.currentSection) {
            container.innerHTML = this.getLoadingHTML();
            return;
        }

        this.renderChannelsForSection(this.currentSection.id);
    }

    renderChannelsForSection(sectionId) {
        const container = document.getElementById('channelsContainer');
        const channels = this.dataManager.getChannelsBySection(sectionId);
        
        if (channels.length === 0) {
            container.innerHTML = this.getNoChannelsHTML();
            return;
        }

        container.innerHTML = channels.map(channel => `
            <div class="channel-card" data-channel-id="${channel.id}">
                <div class="channel-logo">
                    <img src="${channel.image || 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'}" 
                         alt="${channel.name}"
                         onerror="this.src='https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'">
                </div>
                <div class="channel-name">${channel.name}</div>
            </div>
        `).join('');

        // إضافة مستمعي الأحداث للقنوات
        container.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', () => {
                const channelId = card.getAttribute('data-channel-id');
                const channel = channels.find(c => c.id === channelId);
                if (channel) {
                    this.openChannel(channel);
                }
            });
        });

        console.log('✅ تم عرض القنوات:', channels.length);
    }

    getLoadingHTML() {
        return `
            <div class="loading">
                <i class="uil uil-tv-retro"></i>
                <p>جاري تحميل القنوات...</p>
            </div>
        `;
    }

    getNoChannelsHTML() {
        return `
            <div class="loading">
                <i class="uil uil-tv-retro-slash"></i>
                <p>لا توجد قنوات متاحة في هذا القسم</p>
            </div>
        `;
    }

    showNoData() {
        const container = document.getElementById('channelsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-exclamation-triangle"></i>
                    <p>لا توجد بيانات متاحة</p>
                    <button onclick="location.reload()" class="modal-button" style="margin-top: 15px;">
                        إعادة تحميل الصفحة
                    </button>
                </div>
            `;
        }
    }

    openChannel(channel) {
        console.log('🔗 فتح القناة:', channel.name);
        
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
        if (modal) {
            modal.style.display = "none";
        }
    }

    setupEventListeners() {
        console.log('🔧 إعداد مستمعي الأحداث...');
        
        // زر تسجيل الدخول
        const loginToggle = document.getElementById('loginToggle');
        if (loginToggle) {
            loginToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAdminLogin();
            });
        }

        // زر الدخول في النافذة المنبثقة
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        // إلغاء الدخول
        const cancelLogin = document.getElementById('cancelLogin');
        if (cancelLogin) {
            cancelLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideAdminLogin();
            });
        }

        // زر Enter في حقل كلمة المرور
        const adminPassword = document.getElementById('adminPassword');
        if (adminPassword) {
            adminPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }

        // إغلاق النوافذ بالنقر خارجها
        window.addEventListener('click', (event) => {
            const installModal = document.getElementById('installModal');
            const loginModal = document.getElementById('loginModal');
            
            if (event.target === installModal) this.closeModal();
            if (event.target === loginModal) this.hideAdminLogin();
        });
    }

    async handleLogin() {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        if (!email || !password) {
            this.showLoginError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }
        
        // تحقق بسيط من كلمة المرور
        const validPassword = "Ww735981122";
        
        if (password === validPassword && email === "admin@aseeltv.com") {
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
            const adminPassword = document.getElementById('adminPassword');
            if (adminPassword) adminPassword.value = '';
            
            const loginError = document.getElementById('loginError');
            if (loginError) loginError.style.display = 'none';
        }
    }

    showLoginError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
    }

    setupAutoRefresh() {
        // تحديث البيانات كل 30 ثانية إذا كان Firebase متصلاً
        if (this.dataManager.firebaseReady) {
            setInterval(() => {
                console.log('🔄 التحديث التلقائي للبيانات...');
                // يمكن إضافة تحديث للبيانات هنا إذا لزم الأمر
            }, 30000);
        }
    }

    // تنظيف الذاكرة
    destroy() {
        this.dataManager.destroy();
    }
}

// التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏠 تم تحميل الصفحة، بدء التهيئة...');
    
    try {
        window.app = new BeinSportApp();
    } catch (error) {
        console.error('❌ فشل تهيئة التطبيق:', error);
        
        // عرض رسالة خطأ للمستخدم
        const container = document.getElementById('channelsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-exclamation-triangle"></i>
                    <p>حدث خطأ في تحميل التطبيق</p>
                    <button onclick="location.reload()" class="modal-button" style="margin-top: 15px;">
                        إعادة تحميل الصفحة
                    </button>
                </div>
            `;
        }
    }
});

// Fallback initialization
window.addEventListener('load', () => {
    const loginToggle = document.getElementById('loginToggle');
    if (loginToggle) {
        loginToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('loginModal');
            if (modal) {
                modal.style.display = 'block';
            }
        });
    }
});
