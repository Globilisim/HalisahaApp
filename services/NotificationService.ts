import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Bildirimlerin nasıl görüneceğini ayarlayalım
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export interface BuzzerSettings {
    startEnabled: boolean;
    endEnabled: boolean;
    warningEnabled: boolean;
    volume: number;
}

const SETTINGS_KEY = '@buzzer_settings';

export const NotificationService = {
    // İzinleri kontrol et ve iste
    requestPermissions: async () => {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        return finalStatus === 'granted';
    },

    // Ayarları kaydet
    saveSettings: async (settings: BuzzerSettings) => {
        try {
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('Ayarlar kaydedilemedi', e);
        }
    },

    // Ayarları yükle
    getSettings: async (): Promise<BuzzerSettings> => {
        try {
            const saved = await AsyncStorage.getItem(SETTINGS_KEY);
            return saved ? JSON.parse(saved) : {
                startEnabled: true,
                endEnabled: true,
                warningEnabled: true,
                volume: 1.0
            };
        } catch (e) {
            return { startEnabled: true, endEnabled: true, warningEnabled: true, volume: 1.0 };
        }
    },

    // Bir randevu için zilleri zamanla
    scheduleBuzzer: async (appointmentId: string, dateStr: string, timeSlot: string) => {
        const settings = await NotificationService.getSettings();
        if (!settings.startEnabled && !settings.endEnabled && !settings.warningEnabled) return;

        // Tarih ve saati ayrıştır (dd.mm.yy ve hh.mm)
        const [day, month, year] = dateStr.split('.').map(Number);
        const [hour, minute] = timeSlot.split('.').map(Number);
        const startDate = new Date(2000 + year, month - 1, day, hour, minute);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 saat sonra

        // 1. Başlangıç Zili
        if (settings.startEnabled) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Maç Başladı! ⚽',
                    body: `${timeSlot} maçı için başlama düdüğü çaldı.`,
                    sound: 'start.wav', // assets/sounds içinde olmalı
                    data: { appointmentId, type: 'start' },
                },
                trigger: startDate,
            });
        }

        // 2. Uyarı Zili (5 dk kala)
        if (settings.warningEnabled) {
            const warningDate = new Date(endDate.getTime() - 5 * 60 * 1000);
            if (warningDate > new Date()) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Son 5 Dakika! ⏳',
                        body: 'Mevcut maçın bitimine 5 dakika kaldı.',
                        sound: 'warning.wav',
                        data: { appointmentId, type: 'warning' },
                    },
                    trigger: warningDate,
                });
            }
        }

        // 3. Bitiş Zili
        if (settings.endEnabled) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Maç Bitti! 🏁',
                    body: 'Süre doldu, saha boşaltılmalıdır.',
                    sound: 'end.wav',
                    data: { appointmentId, type: 'end' },
                },
                trigger: endDate,
            });
        }
    },

    // Tüm planlanmış bildirimleri iptal et (Randevu silindiğinde)
    cancelAllForAppointment: async (appointmentId: string) => {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduled) {
            if (notification.content.data?.appointmentId === appointmentId) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            }
        }
    }
};
