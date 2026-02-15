import { collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
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

const APPOINTMENTS_COLLECTION = 'appointments';

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
    }
};
