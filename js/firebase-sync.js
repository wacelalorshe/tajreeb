/**
 * Firebase Sync Manager - إدارة المزامنة بين Firebase و LocalStorage
 */

class FirebaseSyncManager {
    constructor() {
        this.isSyncing = false;
        this.lastSyncTime = null;
    }

    // مزامنة كاملة للبيانات
    async fullSync() {
        if (this.isSyncing) {
            console.log('⏳ جاري المزامنة بالفعل...');
            return;
        }

        this.isSyncing = true;
        console.log('🔄 بدء المزامنة الكاملة مع Firebase...');

        try {
            await this.syncSections();
            await this.syncChannels();
            
            this.lastSyncTime = new Date();
            console.log('✅ تمت المزامنة الكاملة بنجاح');
            
        } catch (error) {
            console.error('❌ فشل المزامنة:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    // مزامنة الأقسام
    async syncSections() {
        const database = this.getSafeDatabase();
        if (!database) {
            throw new Error('قاعدة البيانات غير متاحة');
        }

        try {
            // جلب الأقسام من Firebase
            const sectionsSnapshot = await database.collection('sections')
                .orderBy('order')
                .get();

            const firebaseSections = sectionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // جلب الأقسام من localStorage
            const localSections = JSON.parse(localStorage.getItem('bein_sections') || '[]');

            // دمج البيانات
            const mergedSections = this.mergeData(firebaseSections, localSections, 'sections');
            
            // حفظ في localStorage
            localStorage.setItem('bein_sections', JSON.stringify(mergedSections));
            
            // رفع البيانات المدمجة إلى Firebase
            for (const section of mergedSections) {
                if (section.id.startsWith('local_')) {
                    // تحويل البيانات المحلية إلى Firebase
                    const { id, ...sectionData } = section;
                    const docRef = await database.collection('sections').add(sectionData);
                    console.log('✅ تم تحويل القسم المحلي إلى Firebase:', docRef.id);
                }
            }

            console.log(`✅ تمت مزامنة ${mergedSections.length} قسم`);
            return mergedSections;

        } catch (error) {
            console.error('❌ فشل مزامنة الأقسام:', error);
            throw error;
        }
    }

    // مزامنة القنوات
    async syncChannels() {
        const database = this.getSafeDatabase();
        if (!database) {
            throw new Error('قاعدة البيانات غير متاحة');
        }

        try {
            // جلب القنوات من Firebase
            const channelsSnapshot = await database.collection('channels')
                .orderBy('order')
                .get();

            const firebaseChannels = channelsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // جلب القنوات من localStorage
            const localChannels = JSON.parse(localStorage.getItem('bein_channels') || '[]');

            // دمج البيانات
            const mergedChannels = this.mergeData(firebaseChannels, localChannels, 'channels');
            
            // حفظ في localStorage
            localStorage.setItem('bein_channels', JSON.stringify(mergedChannels));
            
            // رفع البيانات المدمجة إلى Firebase
            for (const channel of mergedChannels) {
                if (channel.id.startsWith('local_')) {
                    // تحويل البيانات المحلية إلى Firebase
                    const { id, ...channelData } = channel;
                    const docRef = await database.collection('channels').add(channelData);
                    console.log('✅ تم تحويل القناة المحلية إلى Firebase:', docRef.id);
                }
            }

            console.log(`✅ تمت مزامنة ${mergedChannels.length} قناة`);
            return mergedChannels;

        } catch (error) {
            console.error('❌ فشل مزامنة القنوات:', error);
            throw error;
        }
    }

    // دمج البيانات من Firebase و LocalStorage
    mergeData(firebaseData, localData, dataType) {
        const merged = [...firebaseData];
        
        for (const localItem of localData) {
            if (localItem.id.startsWith('local_')) {
                // البحث عن عنصر مكافئ في بيانات Firebase
                const equivalent = this.findEquivalent(localItem, firebaseData, dataType);
                
                if (!equivalent) {
                    // إضافة العنصر المحلي إذا لم يوجد مكافئ في Firebase
                    merged.push(localItem);
                } else if (this.isNewer(localItem, equivalent)) {
                    // استبدال العنصر القديم بالأحدث
                    const index = merged.findIndex(item => item.id === equivalent.id);
                    if (index !== -1) {
                        merged[index] = { ...localItem, id: equivalent.id };
                    }
                }
            }
        }

        return merged;
    }

    // البحث عن عنصر مكافئ
    findEquivalent(localItem, firebaseData, dataType) {
        if (dataType === 'sections') {
            return firebaseData.find(fbItem => 
                fbItem.name === localItem.name && 
                fbItem.order === localItem.order
            );
        } else if (dataType === 'channels') {
            return firebaseData.find(fbItem => 
                fbItem.name === localItem.name && 
                fbItem.sectionId === localItem.sectionId
            );
        }
        return null;
    }

    // التحقق من الأحدث
    isNewer(item1, item2) {
        const time1 = item1.updatedAt || item1.createdAt || new Date(0);
        const time2 = item2.updatedAt || item2.createdAt || new Date(0);
        return new Date(time1) > new Date(time2);
    }

    getSafeDatabase() {
        if (typeof db !== 'undefined' && db !== null) {
            return db;
        }
        
        if (typeof getFirebaseDb === 'function') {
            return getFirebaseDb();
        }
        
        return null;
    }

    // الحصول على حالة المزامنة
    getSyncStatus() {
        return {
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            firebaseAvailable: this.getSafeDatabase() !== null
        };
    }

    // إعادة تعيين كاملة
    async resetAndSync() {
        console.log('🔄 إعادة تعيين ومزامنة كاملة...');
        
        // حذف البيانات المحلية
        localStorage.removeItem('bein_sections');
        localStorage.removeItem('bein_channels');
        
        // إعادة التحميل من Firebase
        await this.fullSync();
        
        console.log('✅ تمت إعادة التعيين والمزامنة');
    }
}

// إنشاء نسخة عامة
window.firebaseSyncManager = new FirebaseSyncManager();

// تصدير للاستخدام في الموديولات
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseSyncManager;
}
