[file name]: app.js
[file content begin]
// Wait for Firebase to be fully loaded
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase !== 'undefined' && 
                typeof db !== 'undefined' && 
                typeof auth !== 'undefined') {
                console.log("Firebase is ready after", attempts, "attempts");
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.error("Firebase failed to load after", maxAttempts, "attempts");
                reject(new Error("Firebase failed to load"));
                return;
            }
            
            setTimeout(checkFirebase, 100);
        };
        
        checkFirebase();
    });
}

// Enhanced Authentication system
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.authReady = false;
        this.init();
    }

    async init() {
        try {
            await waitForFirebase();
            
            if (typeof auth === 'undefined') {
                console.error('Firebase auth is not available');
                this.setupFallbackAuth();
                return;
            }
            
            this.setupAuthListener();
            this.authReady = true;
            console.log('AuthManager initialized successfully');
            
        } catch (error) {
            console.error('AuthManager initialization failed:', error);
            this.setupFallbackAuth();
        }
    }

    setupAuthListener() {
        if (typeof auth === 'undefined') {
            console.log('Auth not available, using fallback');
            return;
        }

        auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? 'User signed in' : 'User signed out');
            if (user) {
                this.isAuthenticated = true;
                this.currentUser = user;
                localStorage.setItem('adminAuth', 'true');
                localStorage.setItem('adminEmail', user.email);
                console.log('User authenticated:', user.email);
            } else {
                this.isAuthenticated = false;
                this.currentUser = null;
                localStorage.removeItem('adminAuth');
                localStorage.removeItem('adminEmail');
                console.log('User signed out');
            }
        }, (error) => {
            console.error('Auth state change error:', error);
            this.setupFallbackAuth();
        });
    }

    setupFallbackAuth() {
        console.log('Setting up fallback authentication');
        const storedAuth = localStorage.getItem('adminAuth');
        this.isAuthenticated = storedAuth === 'true';
        this.authReady = true;
    }

    async login(email, password) {
        if (typeof auth === 'undefined') {
            console.log('Using fallback authentication');
            return this.fallbackLogin(email, password);
        }

        try {
            console.log('Attempting Firebase login for:', email);
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            this.isAuthenticated = true;
            this.currentUser = userCredential.user;
            
            localStorage.setItem('adminAuth', 'true');
            localStorage.setItem('adminEmail', email);
            
            console.log('Firebase login successful for:', email);
            return { success: true, user: userCredential.user };
            
        } catch (error) {
            console.error('Firebase login error:', error);
            return this.fallbackLogin(email, password);
        }
    }

    fallbackLogin(email, password) {
        console.log('Using fallback login for:', email);
        
        const validPassword = "Ww735981122";
        
        if (password === validPassword && email === "admin@aseeltv.com") {
            this.isAuthenticated = true;
            this.currentUser = { email: email };
            localStorage.setItem('adminAuth', 'true');
            localStorage.setItem('adminEmail', email);
            
            console.log('Fallback login successful');
            return { success: true, user: { email: email } };
        } else {
            let errorMessage = 'كلمة المرور غير صحيحة';
            
            if (email !== "admin@aseeltv.com") {
                errorMessage = 'البريد الإلكتروني غير صحيح';
            }
            
            return { success: false, error: errorMessage };
        }
    }

    async logout() {
        try {
            if (typeof auth !== 'undefined') {
                await auth.signOut();
            }
            
            this.isAuthenticated = false;
            this.currentUser = null;
            localStorage.removeItem('adminAuth');
            localStorage.removeItem('adminEmail');
            
            console.log('Logout successful');
            return { success: true };
            
        } catch (error) {
            console.error('Logout error:', error);
            this.isAuthenticated = false;
            this.currentUser = null;
            localStorage.removeItem('adminAuth');
            localStorage.removeItem('adminEmail');
            
            return { success: true };
        }
    }

    checkAuth() {
        if (!this.authReady) {
            console.log('Auth not ready yet');
            return false;
        }
        
        const storedAuth = localStorage.getItem('adminAuth');
        this.isAuthenticated = storedAuth === 'true';
        
        console.log('Auth check:', this.isAuthenticated ? 'Authenticated' : 'Not authenticated');
        return this.isAuthenticated;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// البيانات الافتراضية
const DEFAULT_SECTIONS = [
    {
        id: 'default-1',
        name: 'قنوات بي إن سبورت',
        order: 1,
        isActive: true
    },
    {
        id: 'default-2', 
        name: 'القنوات الرياضية',
        order: 2,
        isActive: true
    }
];

const DEFAULT_CHANNELS = [
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

// Main application with improved data loading
class BeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.currentSection = null;
        this.sectionsUnsubscribe = null;
        this.channelsUnsubscribe = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing BeinSport App...');
        
        // Set current year
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // Setup event listeners FIRST
        this.setupEventListeners();
        
        // Wait for auth to be ready
        await this.waitForAuth();
        
        // Load data
        await this.loadData();
        
        console.log('✅ App initialized successfully');
    }

    async waitForAuth() {
        let attempts = 0;
        const maxAttempts = 100;
        
        return new Promise((resolve) => {
            const checkAuth = () => {
                attempts++;
                
                if (window.authManager && window.authManager.authReady) {
                    console.log("✅ Auth ready after", attempts, "attempts");
                    resolve(true);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    console.warn("⚠️ Auth not ready, continuing anyway");
                    resolve(false);
                    return;
                }
                
                setTimeout(checkAuth, 100);
            };
            
            checkAuth();
        });
    }

    async loadData() {
        console.log('📥 Loading data...');
        
        if (typeof db === 'undefined') {
            console.log('❌ Firestore not available, using default data');
            this.loadDefaultData();
            return;
        }

        try {
            // محاولة تحميل البيانات من Firestore
            await this.loadFromFirestore();
        } catch (error) {
            console.error('❌ Error loading from Firestore:', error);
            this.loadDefaultData();
        }
    }

    async loadFromFirestore() {
        console.log('🔥 Loading data from Firestore...');
        
        try {
            // تحميل الأقسام
            const sectionsSnapshot = await db.collection('sections')
                .orderBy('order')
                .get();
            
            if (!sectionsSnapshot.empty) {
                this.sections = sectionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ Loaded ${this.sections.length} sections from Firestore`);
            } else {
                console.log('ℹ️ No sections found in Firestore, using default');
                this.sections = [...DEFAULT_SECTIONS];
            }

            // تحميل جميع القنوات
            const channelsSnapshot = await db.collection('channels')
                .orderBy('order')
                .get();
            
            if (!channelsSnapshot.empty) {
                this.channels = channelsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ Loaded ${this.channels.length} channels from Firestore`);
            } else {
                console.log('ℹ️ No channels found in Firestore, using default');
                this.channels = [...DEFAULT_CHANNELS];
            }

            this.renderData();
            this.setupRealtimeListeners();
            
        } catch (error) {
            console.error('❌ Firestore load error:', error);
            throw error;
        }
    }

    setupRealtimeListeners() {
        console.log('👂 Setting up real-time listeners...');
        
        try {
            // مستمع للأقسام
            this.sectionsUnsubscribe = db.collection('sections')
                .orderBy('order')
                .onSnapshot((snapshot) => {
                    console.log('🔄 Sections updated:', snapshot.size);
                    if (!snapshot.empty) {
                        this.sections = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        this.renderSections();
                    }
                }, (error) => {
                    console.error('❌ Sections listener error:', error);
                });

            // مستمع للقنوات
            this.channelsUnsubscribe = db.collection('channels')
                .orderBy('order')
                .onSnapshot((snapshot) => {
                    console.log('🔄 Channels updated:', snapshot.size);
                    if (!snapshot.empty) {
                        this.channels = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        if (this.currentSection) {
                            this.renderChannelsForSection(this.currentSection.id);
                        }
                    }
                }, (error) => {
                    console.error('❌ Channels listener error:', error);
                });

        } catch (error) {
            console.error('❌ Error setting up real-time listeners:', error);
        }
    }

    loadDefaultData() {
        console.log('📋 Loading default data...');
        this.sections = [...DEFAULT_SECTIONS];
        this.channels = [...DEFAULT_CHANNELS];
        this.renderData();
    }

    renderData() {
        this.renderSections();
        if (this.sections.length > 0) {
            this.showSection(this.sections[0].id);
        }
    }

    renderSections() {
        console.log('🎨 Rendering sections:', this.sections.length);
        
        let sectionsContainer = document.getElementById('sectionsContainer');
        if (!sectionsContainer) {
            sectionsContainer = document.createElement('div');
            sectionsContainer.id = 'sectionsContainer';
            sectionsContainer.className = 'sections-container';
            
            const ticker = document.querySelector('.ticker-container');
            const content = document.querySelector('.content');
            if (ticker && content) {
                ticker.parentNode.insertBefore(sectionsContainer, content);
            } else {
                document.body.insertBefore(sectionsContainer, document.querySelector('.content'));
            }
        }

        if (this.sections.length === 0) {
            sectionsContainer.innerHTML = '<div class="no-sections">لا توجد أقسام متاحة</div>';
            return;
        }

        sectionsContainer.innerHTML = this.sections.map(section => `
            <div class="section-tab ${this.currentSection && this.currentSection.id === section.id ? 'active' : ''}" 
                 data-section-id="${section.id}">
                ${section.name}
            </div>
        `).join('');

        // إضافة event listeners للأقسام
        sectionsContainer.querySelectorAll('.section-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const sectionId = tab.getAttribute('data-section-id');
                this.showSection(sectionId);
            });
        });

        console.log('✅ Sections rendered successfully');
    }

    showSection(sectionId) {
        console.log('📂 Showing section:', sectionId);
        
        // تحديث التبويب النشط
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        this.currentSection = this.sections.find(s => s.id === sectionId);
        
        // عرض القنوات للقسم المحدد
        this.renderChannelsForSection(sectionId);
    }

    renderChannelsForSection(sectionId) {
        console.log('📺 Rendering channels for section:', sectionId);
        
        const sectionChannels = this.channels.filter(channel => channel.sectionId === sectionId);
        console.log(`📊 Found ${sectionChannels.length} channels for section ${sectionId}`);
        
        this.renderChannels(sectionChannels);
    }

    renderChannels(channels = []) {
        const container = document.getElementById('channelsContainer');
        if (!container) {
            console.error('❌ Channels container not found');
            return;
        }
        
        if (!channels || channels.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-tv-retro"></i>
                    <p>لا توجد قنوات متاحة في هذا القسم</p>
                </div>
            `;
            return;
        }

        console.log('🎨 Rendering channels:', channels.length);
        
        container.innerHTML = channels.map(channel => `
            <div class="channel-card" data-channel-id="${channel.id}">
                <div class="channel-logo">
                    <img src="${channel.image}" alt="${channel.name}" 
                         onerror="this.src='https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'">
                </div>
                <div class="channel-name">${channel.name}</div>
            </div>
        `).join('');

        // إضافة event listeners للقنوات
        container.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', () => {
                const channelId = card.getAttribute('data-channel-id');
                const channel = channels.find(c => c.id === channelId);
                if (channel) {
                    this.openChannel(channel);
                }
            });
        });

        console.log('✅ Channels rendered successfully');
    }

    openChannel(channel) {
        console.log('🔗 Opening channel:', channel.name);
        
        if (channel.url && channel.url !== '#' && channel.url.trim() !== '') {
            try {
                // محاولة فك تشفير Base64 إذا كان الرابط مشفراً
                if (channel.url.startsWith('data:')) {
                    const decodedUrl = atob(channel.url.split(',')[1]);
                    window.location.href = decodedUrl;
                } else {
                    window.location.href = channel.url;
                }
            } catch (error) {
                console.error('❌ Error decoding channel URL:', error);
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
            const cancelBtn = document.getElementById('cancelInstall');
            
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    const downloadUrl = channel.downloadUrl || 'https://play.google.com/store/apps/details?id=com.xpola.player';
                    window.open(downloadUrl, '_blank');
                    this.closeModal();
                };
            }
            
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    this.closeModal();
                };
            }
            
            const dontShowCheckbox = document.getElementById('dontShowAgain');
            if (dontShowCheckbox) {
                dontShowCheckbox.onclick = function() {
                    if (this.checked) {
                        localStorage.setItem('appInstallPrompt', 'disabled');
                    } else {
                        localStorage.removeItem('appInstallPrompt');
                    }
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

    showAdminLogin() {
        console.log('🔐 Showing admin login modal');
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'block';
            
            setTimeout(() => {
                const passwordField = document.getElementById('adminPassword');
                if (passwordField) {
                    passwordField.focus();
                }
            }, 100);
        } else {
            console.error('❌ Login modal not found!');
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

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Login toggle button
        const loginToggle = document.getElementById('loginToggle');
        if (loginToggle) {
            loginToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (window.authManager && window.authManager.isAuthenticated) {
                    window.location.href = 'admin.html';
                } else {
                    this.showAdminLogin();
                }
            });
        }

        // Login button in modal
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('adminEmail').value;
                const password = document.getElementById('adminPassword').value;
                
                if (!email || !password) {
                    this.showLoginError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
                    return;
                }
                
                const result = await authManager.login(email, password);
                
                if (result.success) {
                    this.hideAdminLogin();
                    window.location.href = 'admin.html';
                } else {
                    this.showLoginError(result.error);
                }
            });
        }

        // Cancel login
        const cancelLogin = document.getElementById('cancelLogin');
        if (cancelLogin) {
            cancelLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideAdminLogin();
            });
        }

        // Close modals when clicking outside
        window.addEventListener('click', (event) => {
            const installModal = document.getElementById('installModal');
            const loginModal = document.getElementById('loginModal');
            
            if (event.target === installModal) this.closeModal();
            if (event.target === loginModal) this.hideAdminLogin();
        });

        // Enter key in password field
        const adminPassword = document.getElementById('adminPassword');
        if (adminPassword) {
            adminPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const loginButton = document.getElementById('loginButton');
                    if (loginButton) loginButton.click();
                }
            });
        }

        console.log('✅ Event listeners setup completed');
    }

    showLoginError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
            
            setTimeout(() => {
                loginError.style.display = 'none';
            }, 5000);
        }
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

// التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏠 DOM loaded, starting initialization...');
    
    try {
        window.authManager = new AuthManager();
        
        setTimeout(() => {
            try {
                window.app = new BeinSportApp();
            } catch (appError) {
                console.error('❌ Failed to initialize app:', appError);
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Failed to initialize auth manager:', error);
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
[file content end]
