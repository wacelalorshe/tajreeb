[file name]: app.js
[file content begin]
// Wait for Firebase to be fully loaded
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
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

    // Fallback authentication for when Firebase fails
    setupFallbackAuth() {
        console.log('Setting up fallback authentication');
        const storedAuth = localStorage.getItem('adminAuth');
        this.isAuthenticated = storedAuth === 'true';
        this.authReady = true;
    }

    async login(email, password) {
        // If Firebase auth is not available, use fallback
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
            
            // Fallback to simple authentication if Firebase fails
            return this.fallbackLogin(email, password);
        }
    }

    // Simple password-based authentication as fallback
    fallbackLogin(email, password) {
        console.log('Using fallback login for:', email);
        
        // Simple password check - you can change this password
        const validPassword = "Ww735981122"; // Change this to your desired password
        
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
            
            // Fallback logout
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

// Main application with sections support
class BeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.currentSection = null;
        this.init();
    }

    async init() {
        console.log('Initializing BeinSport App...');
        
        // Set current year
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // Setup event listeners FIRST
        this.setupEventListeners();
        
        // Wait for auth to be ready
        await this.waitForAuth();
        
        // Load sections and channels
        await this.loadSections();
        
        console.log('App initialized successfully');
    }

    async waitForAuth() {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max
        
        return new Promise((resolve) => {
            const checkAuth = () => {
                attempts++;
                
                if (authManager && authManager.authReady) {
                    console.log("Auth ready after", attempts, "attempts");
                    resolve(true);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    console.warn("Auth not ready, continuing anyway");
                    resolve(false);
                    return;
                }
                
                setTimeout(checkAuth, 100);
            };
            
            checkAuth();
        });
    }

    async loadSections() {
        try {
            console.log('Loading sections...');
            
            // Try Firebase first
            if (typeof db !== 'undefined') {
                const snapshot = await db.collection('sections').orderBy('order').get();
                
                if (!snapshot.empty) {
                    this.sections = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    console.log('Sections loaded:', this.sections.length);
                    this.renderSections();
                    
                    // Load channels for the first section by default
                    if (this.sections.length > 0) {
                        this.showSection(this.sections[0].id);
                    }
                    return;
                }
            }
            
            // Fallback to default sections
            console.log('Using default sections');
            this.loadDefaultSections();
            
        } catch (error) {
            console.error('Error loading sections:', error);
            this.loadDefaultSections();
        }
    }

    loadDefaultSections() {
        console.log('Loading default sections...');
        this.sections = [
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
        this.renderSections();
        
        // Load default channels for first section
        this.loadDefaultChannels();
    }

    renderSections() {
        // Create sections container if it doesn't exist
        let sectionsContainer = document.getElementById('sectionsContainer');
        if (!sectionsContainer) {
            sectionsContainer = document.createElement('div');
            sectionsContainer.id = 'sectionsContainer';
            sectionsContainer.className = 'sections-container';
            
            // Insert after ticker and before content
            const ticker = document.querySelector('.ticker-container');
            const content = document.querySelector('.content');
            if (ticker && content) {
                ticker.parentNode.insertBefore(sectionsContainer, content);
            }
        }

        console.log('Rendering sections:', this.sections.length);
        
        sectionsContainer.innerHTML = this.sections.map(section => `
            <div class="section-tab ${this.currentSection && this.currentSection.id === section.id ? 'active' : ''}" 
                 data-section-id="${section.id}">
                ${section.name}
            </div>
        `).join('');

        // Add click events
        sectionsContainer.querySelectorAll('.section-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const sectionId = tab.getAttribute('data-section-id');
                this.showSection(sectionId);
            });
        });

        // Set first section as active if none is active
        if (!this.currentSection && this.sections.length > 0) {
            this.showSection(this.sections[0].id);
        }
    }

    async showSection(sectionId) {
        console.log('Showing section:', sectionId);
        
        // Update active tab
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        this.currentSection = this.sections.find(s => s.id === sectionId);
        
        // Load channels for this section
        await this.loadChannels(sectionId);
    }

    async loadChannels(sectionId) {
        try {
            const channelsContainer = document.getElementById('channelsContainer');
            if (!channelsContainer) {
                console.error('Channels container not found');
                return;
            }
            
            channelsContainer.innerHTML = '<div class="loading">جاري تحميل القنوات...</div>';
            
            // Try Firebase first
            if (typeof db !== 'undefined') {
                console.log('Loading channels from Firebase for section:', sectionId);
                const snapshot = await db.collection('channels')
                    .where('sectionId', '==', sectionId)
                    .orderBy('order')
                    .get();
                
                if (!snapshot.empty) {
                    this.channels = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    this.renderChannels();
                    return;
                }
            }
            
            // Fallback to default channels
            console.log('Using default channels for section:', sectionId);
            this.loadDefaultChannels();
            
        } catch (error) {
            console.error('Error loading channels:', error);
            this.loadDefaultChannels();
        }
    }

    loadDefaultChannels() {
        console.log('Loading default channels...');
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
        this.renderChannels();
    }

    renderChannels() {
        const container = document.getElementById('channelsContainer');
        if (!container) {
            console.error('Channels container not found');
            return;
        }
        
        if (!this.channels || this.channels.length === 0) {
            container.innerHTML = '<div class="loading">لا توجد قنوات متاحة في هذا القسم</div>';
            return;
        }

        console.log('Rendering channels:', this.channels.length);
        
        container.innerHTML = this.channels.map(channel => `
            <div class="channel-card" data-channel-id="${channel.id}">
                <div class="channel-logo">
                    <img src="${channel.image}" alt="${channel.name}" 
                         onerror="this.src='https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'">
                </div>
                <div class="channel-name">${channel.name}</div>
            </div>
        `).join('');

        // Add click events
        container.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', () => {
                const channelId = card.getAttribute('data-channel-id');
                const channel = this.channels.find(c => c.id === channelId);
                if (channel) {
                    this.openChannel(channel);
                }
            });
        });
    }

    openChannel(channel) {
        console.log('Opening channel:', channel.name);
        
        if (channel.url && channel.url !== '#') {
            window.location.href = channel.url;
        } else {
            // Show install modal if no URL or demo URL
            this.showInstallModal(channel);
        }
    }

    showInstallModal(channel) {
        const modal = document.getElementById('installModal');
        if (modal) {
            modal.style.display = "block";
            
            document.getElementById('confirmInstall').onclick = () => {
                if (channel.downloadUrl) {
                    window.open(channel.downloadUrl, '_blank');
                }
                this.closeModal();
            };
            
            document.getElementById('cancelInstall').onclick = () => {
                this.closeModal();
            };
            
            document.getElementById('dontShowAgain').onclick = function() {
                if (this.checked) {
                    localStorage.setItem('appInstallPrompt', 'disabled');
                } else {
                    localStorage.removeItem('appInstallPrompt');
                }
            };
        }
    }

    closeModal() {
        const modal = document.getElementById('installModal');
        if (modal) {
            modal.style.display = "none";
        }
    }

    showAdminLogin() {
        console.log('Showing admin login modal');
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'block';
            console.log('Login modal displayed successfully');
            
            // Focus on password field
            setTimeout(() => {
                const passwordField = document.getElementById('adminPassword');
                if (passwordField) {
                    passwordField.focus();
                }
            }, 100);
        } else {
            console.error('Login modal not found!');
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
        console.log('Setting up event listeners...');
        
        // Login toggle button - FIXED VERSION
        const loginToggle = document.getElementById('loginToggle');
        if (loginToggle) {
            loginToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Login button clicked - Auth state:', window.authManager ? window.authManager.isAuthenticated : 'unknown');
                
                if (window.authManager && window.authManager.isAuthenticated) {
                    console.log('Redirecting to admin panel');
                    window.location.href = 'admin.html';
                } else {
                    console.log('Showing login modal');
                    this.showAdminLogin();
                }
            });
            console.log('Login toggle event listener added');
        } else {
            console.error('Login toggle button not found!');
        }

        // Login button in modal
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('adminEmail').value;
                const password = document.getElementById('adminPassword').value;
                
                console.log('Login attempt with email:', email);
                
                if (!email || !password) {
                    this.showLoginError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
                    return;
                }
                
                const result = await authManager.login(email, password);
                
                if (result.success) {
                    console.log('Login successful, redirecting to admin');
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

        console.log('All event listeners setup completed');
    }

    showLoginError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
            
            // Hide error after 5 seconds
            setTimeout(() => {
                loginError.style.display = 'none';
            }, 5000);
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, starting initialization...');
    
    try {
        // Create auth manager first
        window.authManager = new AuthManager();
        
        // Create app after a short delay to ensure auth manager is initialized
        setTimeout(() => {
            try {
                window.app = new BeinSportApp();
                console.log('App initialized successfully');
            } catch (appError) {
                console.error('Failed to initialize app:', appError);
            }
        }, 500);
        
    } catch (error) {
        console.error('Failed to initialize auth manager:', error);
    }
});

// Fallback initialization in case of errors
window.addEventListener('load', () => {
    // Ensure login button works even if app initialization fails
    const loginToggle = document.getElementById('loginToggle');
    if (loginToggle && !loginToggle.hasEventListener) {
        loginToggle.hasEventListener = true;
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
