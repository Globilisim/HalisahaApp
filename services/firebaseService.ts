import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Appointment {
    id?: string;
    pitchId: 'barnebau' | 'noucamp';
    customerName: string;
    phoneNumber: string;
    timeSlot: string;
    dateString: string;
    status: 'booked' | 'cancelled';
    deposit?: string; // Kapora
    isSubscription?: boolean; // Abone mi?
    createdAt: any;
}

export interface Customer {
    id?: string;
    name: string;
    phone: string;
    note?: string;
    isSubscriber?: boolean;
    createdAt: any;
}export interface Subscription {
    id?: string;
    pitchId: 'barnebau' | 'noucamp';
    dayOfWeek: number; // 0 (Sun) - 6 (Sat)
    timeSlot: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    active: boolean;
}

const APPOINTMENTS_COLLECTION = 'appointments';
const CUSTOMERS_COLLECTION = 'customers';
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';

export const firebaseService = {
    // Belirli bir tarih dizisi (dd.mm.yy) için randevuları getir
    getAppointments: async (date: Date) => {
        try {
            const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);

            const dateStr = `${day}.${month}.${year}`;

            const q = query(
                appointmentsRef,
                where('dateString', '==', dateStr)
            );

            const querySnapshot = await getDocs(q);
            const results = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Appointment[];

            return results.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
        } catch (error) {
            console.error("Randevular çekilirken hata oluştu:", error);
            throw error;
        }
    },

    // Yeni randevu ekle
    addAppointment: async (appointment: Omit<Appointment, 'id' | 'createdAt'>) => {
        try {
            const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);
            const docRef = await addDoc(appointmentsRef, {
                ...appointment,
                createdAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error("Randevu eklenirken hata oluştu:", error);
            throw error;
        }
    },

    // Randevu güncelle
    updateAppointment: async (id: string, data: Partial<Appointment>) => {
        try {
            const appRef = doc(db, APPOINTMENTS_COLLECTION, id);
            await updateDoc(appRef, data);
        } catch (error) {
            console.error("Randevu güncellenirken hata oluştu:", error);
            throw error;
        }
    },

    // Randevu sil
    deleteAppointment: async (id: string) => {
        try {
            const appRef = doc(db, APPOINTMENTS_COLLECTION, id);
            await deleteDoc(appRef);
        } catch (error) {
            console.error("Randevu silinirken hata oluştu:", error);
            throw error;
        }
    },

    // Belirli bir ay için tüm randevuları getir (Analiz için)
    getAllAppointmentsInMonth: async (monthStr: string) => {
        try {
            const appointmentsRef = collection(db, APPOINTMENTS_COLLECTION);

            // dateString formatı "dd.mm.yy" olduğu için aramayı "xx.mm.yy" şeklinde yaparız
            // Ancak Firestore 'where' ile partial string match (starts-with hariç) zor olduğu için 
            // Tüm ayları çekmek yerine istemci tarafında filtreleme yapacağız veya .54.033 gibi sürümlerde 
            // regex desteği kısıtlıdır. En garantisi ilgili ayın başı ve sonu arasındaki veriyi çekmektir.

            // Basitlik ve performans için: Mevcut koleksiyondaki tüm randevuları çekip 
            // (Halı saha verisi genelde binlerce satır olmaz) frontend'de filtreleyelim.
            const querySnapshot = await getDocs(appointmentsRef);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Appointment[];
        } catch (error) {
            console.error("Analiz verileri çekilirken hata oluştu:", error);
            throw error;
        }
    },

    // --- MÜŞTERİ YÖNETİMİ ---

    // Tüm müşterileri getir
    getCustomers: async () => {
        try {
            const customersRef = collection(db, CUSTOMERS_COLLECTION);
            const querySnapshot = await getDocs(customersRef);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Customer[];
        } catch (error) {
            console.error("Müşteriler çekilirken hata oluştu:", error);
            throw error;
        }
    },

    // Yeni müşteri ekle
    addCustomer: async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
        try {
            const customersRef = collection(db, CUSTOMERS_COLLECTION);
            const docRef = await addDoc(customersRef, {
                ...customer,
                createdAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error("Müşteri eklenirken hata oluştu:", error);
            throw error;
        }
    },

    // Müşteri güncelle
    updateCustomer: async (id: string, data: Partial<Customer>) => {
        try {
            const customerRef = doc(db, CUSTOMERS_COLLECTION, id);
            await updateDoc(customerRef, data);
        } catch (error) {
            console.error("Müşteri güncellenirken hata oluştu:", error);
            throw error;
        }
    },

    // Müşteri sil
    deleteCustomer: async (id: string) => {
        try {
            const customerRef = doc(db, CUSTOMERS_COLLECTION, id);
            await deleteDoc(customerRef);
        } catch (error) {
            console.error("Müşteri silinirken hata oluştu:", error);
            throw error;
        }
    },
    // Subscription Operations
    getSubscriptions: async (): Promise<Subscription[]> => {
        const q = query(collection(db, SUBSCRIPTIONS_COLLECTION));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
    },

    addSubscription: async (subscription: Subscription): Promise<string> => {
        const docRef = await addDoc(collection(db, SUBSCRIPTIONS_COLLECTION), {
            ...subscription,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    },

    updateSubscription: async (id: string, subscription: Partial<Subscription>): Promise<void> => {
        const docRef = doc(db, SUBSCRIPTIONS_COLLECTION, id);
        await updateDoc(docRef, {
            ...subscription,
            updatedAt: serverTimestamp(),
        });
    },

    deleteSubscription: async (id: string): Promise<void> => {
        const docRef = doc(db, SUBSCRIPTIONS_COLLECTION, id);
        await deleteDoc(docRef);
    },
};
