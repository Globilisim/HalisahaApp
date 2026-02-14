import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Constants from 'expo-constants';

// NOT: Bu değerleri Firebase Console üzerinden alıp .env dosyasına veya buraya eklemelisiniz.
// Firebase yapılandırması (Kullanıcı tarafından sağlandı)
const firebaseConfig = {
    apiKey: "AIzaSyDKR6U9KC5-xo-qSh_NioS1HEtS1V3PVfY",
    authDomain: "halisaha-dcec5.firebaseapp.com",
    projectId: "halisaha-dcec5",
    storageBucket: "halisaha-dcec5.firebasestorage.app",
    messagingSenderId: "933377819550",
    appId: "1:933377819550:web:a3aef417fb0742dbab8c8f",
    measurementId: "G-R8V05L3Q5M"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Servisleri dışarı aktar
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
