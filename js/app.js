// تطبيق Bein Sport - الإصدار المحسن
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
        
        // حاول تحميل البيانات من localStorage أولاً (للسرعة)
        await this.loadFromLocalStorage();
        
        // ثم حاول التحديث من Firebase
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
                
                // حفظ في localStorage
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
                
                // حفظ في localStorage
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
        // مستمع للأقسام
        db.collection('sections')
            .where('isActive', '==', true)
            .orderBy('order')
            .onSnapshot((snapshot) => {
                console.log('🔄 تحديث الأقسام من Firebase');
                this.sections = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                localStorage.setItem('bein_sections', JSON.stringify(this.sections));
                this.renderSections();
            });

        // مستمع للقنوات
        db.collection('channels')
            .orderBy('order')
            .onSnapshot((snapshot) => {
                console.log('🔄 تحديث القنوات من Firebase');
                this.channels = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                localStorage.setItem('bein_channels', JSON.stringify(this.channels));
                this.renderChannels();
            });
    }

    async checkForUpdates() {
        // تحميل أحدث بيانات من localStorage
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
        if (!container) return;

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

        container.querySelectorAll('.section-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const sectionId = tab.getAttribute('data-section-id');
                this.showSection(sectionId);
            });
        });
    }

    showSection(sectionId) {
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        this.currentSection = this.sections.find(s => s.id === sectionId);
        this.renderChannels();
    }

    renderChannels() {
        const container = document.getElementById('channelsContainer');
        if (!container) return;

        if (!this.currentSection) {
            container.innerHTML = '<div class="loading">لا توجد قنوات متاحة</div>';
            return;
        }

        const sectionChannels = this.channels
            .filter(channel => channel.sectionId === this.currentSection.id)
            .sort((a, b) => (a.order || 1) - (b.order || 1));

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

        container.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', () => {
                const channelId = card.getAttribute('data-channel-id');
                const channel = sectionChannels.find(c => c.id === channelId);
                if (channel) this.openChannel(channel);
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
                </div>
            `;
        }
    }

    openChannel(channel) {
        if (channel.url && channel.url !== '#') {
            window.open(channel.url, '_blank');
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
                    window.open(channel.downloadUrl, '_blank');
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
        const loginToggle = document.getElementById('loginToggle');
        if (loginToggle) {
            loginToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAdminLogin();
            });
        }

        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        const cancelLogin = document.getElementById('cancelLogin');
        if (cancelLogin) {
            cancelLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideAdminLogin();
            });
        }

        const adminPassword = document.getElementById('adminPassword');
        if (adminPassword) {
            adminPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('installModal')) this.closeModal();
            if (event.target === document.getElementById('loginModal')) this.hideAdminLogin();
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
        if (modal) modal.style.display = 'block';
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
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BeinSportApp();
});
