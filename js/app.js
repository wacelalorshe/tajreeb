// تطبيق Bein Sport - الإصدار المحسن مع إصلاح الحفظ في Firebase
class BeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.currentSection = null;
        this.firebaseReady = false;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل تطبيق Bein Sport...');
        
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        this.setupEventListeners();
        await this.initializeFirebase();
        await this.loadData();
        this.setupRealTimeUpdates();
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

    // دوال الحفظ في Firebase - جديدة
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
            }
        ];
        
        this.saveToLocalStorage();
    }

    // باقي الدوال تبقى كما هي...
    setupRealTimeUpdates() {
        setInterval(() => {
            this.checkForUpdates();
        }, 10000);

        window.addEventListener('storage', (e) => {
            if (e.key === 'bein_sections' || e.key === 'bein_channels') {
                console.log('🔄 تم تحديث البيانات من تبويب آخر');
                this.loadFromLocalStorage();
                this.renderData();
            }
        });

        if (this.firebaseReady) {
            this.setupFirebaseListeners();
        }
    }

    setupFirebaseListeners() {
        const database = this.getSafeDatabase();
        if (!database) return;

        try {
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
                });

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
                });

        } catch (error) {
            console.error('❌ خطأ في إعداد مستمعي Firebase:', error);
        }
    }

    // باقي الدوال...
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة التطبيق...');
    window.app = new BeinSportApp();
});
