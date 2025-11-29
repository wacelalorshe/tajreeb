// تطبيق Bein Sport - الإصدار المحسن مع إصلاح التنقل
class BeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.currentSection = null;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل تطبيق Bein Sport...');
        
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        this.setupEventListeners();
        await this.loadData();
        this.setupRealTimeUpdates();
    }

    async loadData() {
        console.log('📥 جاري تحميل البيانات...');
        
        await this.loadFromLocalStorage();
        await this.loadFromFirebase();
        this.renderData();
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
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات من localStorage:', error);
        }
    }

    async loadFromFirebase() {
        if (typeof db === 'undefined') {
            console.log('⚠️ Firebase غير متاح');
            return;
        }

        try {
            // تحميل الأقسام من Firebase
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
                localStorage.setItem('bein_sections', JSON.stringify(this.sections));
            }

            // تحميل القنوات من Firebase
            const channelsSnapshot = await db.collection('channels')
                .orderBy('order')
                .get();

            if (!channelsSnapshot.empty) {
                this.channels = channelsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
                localStorage.setItem('bein_channels', JSON.stringify(this.channels));
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات من Firebase:', error);
        }
    }

    setupRealTimeUpdates() {
        // تحديث تلقائي كل 3 ثوانٍ
        setInterval(() => {
            this.checkForUpdates();
        }, 3000);

        // الاستماع لتحديثات localStorage من التبويبات الأخرى
        window.addEventListener('storage', (e) => {
            if (e.key === 'bein_sections' || e.key === 'bein_channels') {
                console.log('🔄 تم تحديث البيانات من تبويب آخر');
                this.loadFromLocalStorage();
                this.renderData();
            }
        });

        // إعداد مستمعي Firebase اللحظيين إذا كان متاحاً
        if (typeof db !== 'undefined') {
            this.setupFirebaseListeners();
        }
    }

    setupFirebaseListeners() {
        try {
            // مستمع للأقسام
            db.collection('sections')
                .where('isActive', '==', true)
                .orderBy('order')
                .onSnapshot((snapshot) => {
                    console.log('🔄 تحديث الأقسام من Firebase');
                    if (!snapshot.empty) {
                        this.sections = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        localStorage.setItem('bein_sections', JSON.stringify(this.sections));
                        this.renderSections();
                    }
                });

            // مستمع للقنوات
            db.collection('channels')
                .orderBy('order')
                .onSnapshot((snapshot) => {
                    console.log('🔄 تحديث القنوات من Firebase');
                    if (!snapshot.empty) {
                        this.channels = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        localStorage.setItem('bein_channels', JSON.stringify(this.channels));
                        if (this.currentSection) {
                            this.renderChannels();
                        }
                    }
                });
        } catch (error) {
            console.error('❌ خطأ في إعداد مستمعي Firebase:', error);
        }
    }

    async checkForUpdates() {
        await this.loadFromLocalStorage();
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

        // إضافة event listeners للأقسام - الطريقة الصحيحة
        this.setupSectionEventListeners();
    }

    setupSectionEventListeners() {
        const sectionTabs = document.querySelectorAll('.section-tab');
        
        sectionTabs.forEach(tab => {
            // إزالة أي event listeners سابقة لمنع التكرار
            tab.replaceWith(tab.cloneNode(true));
        });

        // إضافة event listeners جديدة
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
        
        // العثور على القسم
        const section = this.sections.find(s => s.id === sectionId);
        if (!section) {
            console.error('❌ القسم غير موجود:', sectionId);
            return;
        }

        // تحديث التبويب النشط
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

        // إضافة event listeners للقنوات
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
        
        // زر تسجيل الدخول
        const loginToggle = document.getElementById('loginToggle');
        if (loginToggle) {
            loginToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAdminLogin();
            });
        }

        // زر الدخول في النافذة المنبثقة
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleLogin();
            });
        }

        // إلغاء الدخول
        const cancelLogin = document.getElementById('cancelLogin');
        if (cancelLogin) {
            cancelLogin.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hideAdminLogin();
            });
        }

        // زر Enter في حقل كلمة المرور
        const adminPassword = document.getElementById('adminPassword');
        if (adminPassword) {
            adminPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleLogin();
                }
            });
        }

        // إغلاق النوافذ بالنقر خارجها
        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('installModal')) {
                this.closeModal();
            }
            if (event.target === document.getElementById('loginModal')) {
                this.hideAdminLogin();
            }
        });

        // منع انتشار الأحداث في الحاويات
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
            // تركيز على حقل كلمة المرور
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

    // دالة مساعدة للتحديث اليدوي
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
    
    // تأكد من أن event listeners الأساسية تعمل
    const loginToggle = document.getElementById('loginToggle');
    if (loginToggle) {
        loginToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('loginModal');
            if (modal) modal.style.display = 'block';
        });
    }
    
    // تحديث تلقائي احتياطي
    setInterval(() => {
        if (window.app && window.app.refreshData) {
            window.app.refreshData();
        }
    }, 10000);
});
