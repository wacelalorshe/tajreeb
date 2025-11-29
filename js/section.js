// تطبيق قسم معين - يعرض قنوات قسم معين
class SectionApp {
    constructor() {
        this.sectionId = null;
        this.section = null;
        this.channels = [];
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل صفحة القسم...');
        
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        this.setupEventListeners();
        this.getSectionIdFromURL();
        await this.loadSectionData();
        this.renderChannels();
    }

    getSectionIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.sectionId = urlParams.get('sectionId');
        console.log('📋 sectionId من الرابط:', this.sectionId);
        
        if (!this.sectionId) {
            console.error('❌ لم يتم تحديد sectionId في الرابط');
            this.showError('لم يتم تحديد القسم');
            return;
        }
    }

    async loadSectionData() {
        try {
            // محاولة تحميل البيانات من Firebase أولاً
            if (typeof db !== 'undefined' && db !== null) {
                await this.loadFromFirebase();
            } else {
                await this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل بيانات القسم:', error);
            await this.loadFromLocalStorage();
        }
    }

    async loadFromFirebase() {
        const database = db;
        if (!database) {
            throw new Error('Firebase غير متاح');
        }

        // جلب بيانات القسم
        const sectionDoc = await database.collection('sections').doc(this.sectionId).get();
        if (sectionDoc.exists) {
            this.section = {
                id: sectionDoc.id,
                ...sectionDoc.data()
            };
            console.log('✅ تم تحميل بيانات القسم من Firebase:', this.section.name);
        } else {
            throw new Error('القسم غير موجود في Firebase');
        }

        // جلب قنوات القسم
        const channelsSnapshot = await database.collection('channels')
            .where('sectionId', '==', this.sectionId)
            .orderBy('order')
            .get();

        this.channels = channelsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
        
        this.updateUI();
    }

    async loadFromLocalStorage() {
        const savedSections = localStorage.getItem('bein_sections');
        const savedChannels = localStorage.getItem('bein_channels');
        
        if (savedSections) {
            const sections = JSON.parse(savedSections);
            this.section = sections.find(s => s.id === this.sectionId);
        }
        
        if (savedChannels) {
            const allChannels = JSON.parse(savedChannels);
            this.channels = allChannels.filter(channel => channel.sectionId === this.sectionId)
                .sort((a, b) => (a.order || 1) - (b.order || 1));
        }
        
        if (!this.section) {
            throw new Error('القسم غير موجود في التخزين المحلي');
        }
        
        console.log(`✅ تم تحميل ${this.channels.length} قناة من التخزين المحلي`);
        this.updateUI();
    }

    updateUI() {
        // تحديث عنوان الصفحة واسم القسم
        document.getElementById('sectionHeader').textContent = this.section.name;
        document.getElementById('sectionName').textContent = this.section.name;
        document.getElementById('sectionDescription').textContent = this.section.description || 'استمتع بمشاهدة القنوات المتاحة في هذا القسم';
        document.title = `${this.section.name} - Aseel TV`;
    }

    renderChannels() {
        const container = document.getElementById('channelsContainer');
        if (!container) {
            console.error('❌ حاوية القنوات غير موجودة');
            return;
        }

        if (this.channels.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-tv-retro"></i>
                    <p>لا توجد قنوات في هذا القسم</p>
                    <small>سيتم إضافة القنوات قريباً</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.channels.map(channel => `
            <div class="channel-card" data-channel-id="${channel.id}">
                <div class="channel-logo">
                    <img src="${channel.image || 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'}" 
                         alt="${channel.name}"
                         onerror="this.src='https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'">
                </div>
                <div class="channel-name">${channel.name}</div>
            </div>
        `).join('');

        this.setupChannelEventListeners();
    }

    setupChannelEventListeners() {
        document.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const channelId = card.getAttribute('data-channel-id');
                const channel = this.channels.find(c => c.id === channelId);
                if (channel) {
                    console.log('🔗 فتح القناة:', channel.name);
                    this.openChannel(channel);
                }
            });
        });
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

    showError(message) {
        const container = document.getElementById('channelsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-exclamation-triangle"></i>
                    <p>${message}</p>
                    <a href="index.html" class="modal-button" style="margin-top: 15px; display: inline-block;">
                        العودة للرئيسية
                    </a>
                </div>
            `;
        }
    }

    setupEventListeners() {
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

        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('installModal')) {
                this.closeModal();
            }
        });
    }
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة صفحة القسم...');
    window.sectionApp = new SectionApp();
});
