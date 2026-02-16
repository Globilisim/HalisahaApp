import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView, TouchableOpacity, Dimensions, Linking, Image, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Text, Card, IconButton, Portal, Modal, TextInput, Button, Checkbox, Divider, Surface, ActivityIndicator, FAB, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePickerModal } from 'react-native-paper-dates';
// import { PieChart } from 'react-native-chart-kit'; // Disabled for web compatibility
import { firebaseService, Appointment, Customer } from '../services/firebaseService';
import { NotificationService, BuzzerSettings } from '../services/NotificationService';
import Slider from '@react-native-community/slider';
import { ThemedCard } from '../components/ThemedCard';
import { ThemedText } from '../components/ThemedText';
import { StatsCard } from '../components/StatsCard';
import { ChartWidget } from '../components/ChartWidget';
import { ThemeToggle } from '../components/ThemeToggle';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { MainLayout } from '../components/Layout/MainLayout';
import { ThemedContainer } from '../components/ThemedContainer';
import { useTheme } from '../config/ThemeContext';
import { useToast } from '../config/ToastContext';
import { useRouter } from 'expo-router';

const customAlert = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed) onConfirm();
    } else {
        Alert.alert(title, message, [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Evet', style: 'destructive', onPress: onConfirm }
        ]);
    }
};

export default function DashboardHome() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { theme, setMode, mode, isDark } = useTheme();
    const { showToast } = useToast();
    const [fabOpen, setFabOpen] = useState(false);
    const isMobile = width < 768;
    const isTablet = width >= 768 && width <= 1024;
    const isDesktop = width > 1024;
    const [loading, setLoading] = useState(false);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [analysisVisible, setAnalysisVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ pitchId: 'barnebau' | 'noucamp', timeSlot: string } | null>(null);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [deposit, setDeposit] = useState('');
    const [isSubscription, setIsSubscription] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Calendar State
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Analysis State
    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Buzzer Settings
    const [buzzerSettings, setBuzzerSettings] = useState<BuzzerSettings>({
        startEnabled: true,
        endEnabled: true,
        warningEnabled: true,
        volume: 1.0
    });

    useEffect(() => {
        NotificationService.requestPermissions();
        loadBuzzerSettings();
    }, []);

    const loadBuzzerSettings = async () => {
        const settings = await NotificationService.getSettings();
        setBuzzerSettings(settings);
    };

    const handleSaveSettings = async (newSettings: BuzzerSettings) => {
        setBuzzerSettings(newSettings);
        await NotificationService.saveSettings(newSettings);
    };

    const onConfirmDate = React.useCallback(
        (params: any) => {
            setIsCalendarOpen(false);
            setSelectedDate(params.date);
        },
        [setIsCalendarOpen, setSelectedDate]
    );

    const handleWhatsApp = React.useCallback((phone: string, name: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        const message = `Merhaba ${name}, halı saha randevunuz ile ilgili yazıyorum.`;
        Linking.openURL(`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(message)}`);
    }, []);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const data = await firebaseService.getAppointments(selectedDate);
            setAppointments(data);
        } catch (error) {
            console.error("Veri çekme hatası:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalysisData = async () => {
        setIsAnalyzing(true);
        try {
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const year = String(selectedDate.getFullYear()).slice(-2);
            const monthStr = `${month}.${year}`;

            const data = await firebaseService.getAllAppointmentsInMonth(monthStr);
            const filtered = data.filter(app => app.dateString.endsWith(monthStr));
            setAllAppointments(filtered);

            // Abone sayısını müşteriler koleksiyonundan çek
            const customerData = await firebaseService.getCustomers();
            setCustomers(customerData);

            setAnalysisVisible(true);
        } catch (error) {
            console.error("Analiz verisi çekme hatası:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [selectedDate]);

    const todayStats = useMemo(() => {
        const today = new Date();
        const hour = today.getHours();
        const currentTimeSlot = `${hour < 10 ? '0' + hour : hour}.00`;
        const isToday = selectedDate.toDateString() === today.toDateString();

        const liveNow = appointments.filter(app => app.timeSlot === currentTimeSlot);
        const todayRevenue = appointments.reduce((sum, app) => sum + (parseInt(app.deposit || '0') || 0), 0);
        const tomorrowRevenue = 0; // İleride eklenebilir

        const totalPossibleSlots = 11 * 2; // 11 saat * 2 saha
        const occupancy = Math.round((appointments.length / totalPossibleSlots) * 100);

        return {
            liveNow,
            todayRevenue,
            occupancy,
            isToday
        };
    }, [appointments, selectedDate]);

    const stats = useMemo(() => {
        const totalSlotsInMonth = 11 * 2 * 30; // 11 saat * 2 saha * 30 gün (temsili)
        const bookedSlots = allAppointments.length;
        const subscriptionCount = allAppointments.filter(a => a.isSubscription).length;
        const totalRegisteredSubscribers = customers.filter(c => c.isSubscriber).length;

        const customerCounts: { [key: string]: number } = {};
        allAppointments.forEach(app => {
            if (app.customerName) {
                customerCounts[app.customerName] = (customerCounts[app.customerName] || 0) + 1;
            }
        });

        const topCustomers = Object.entries(customerCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        return {
            bookedSlots,
            emptySlots: Math.max(0, totalSlotsInMonth - bookedSlots),
            subscriptionCount,
            totalRegisteredSubscribers,
            topCustomers
        };
    }, [allAppointments, customers]);

    const chartData = [
        {
            name: "Dolu",
            population: stats.bookedSlots,
            color: theme['color-primary'],
            legendFontColor: theme['color-text-secondary'],
            legendFontSize: 12
        },
        {
            name: "Boş",
            population: stats.emptySlots,
            color: theme['color-text-secondary'] + '20', // Opacity shortcut
            legendFontColor: theme['color-text-secondary'],
            legendFontSize: 12
        }
    ];

    const handleOpenModal = (pitchId: 'barnebau' | 'noucamp', timeSlot: string, app?: Appointment | null) => {
        setSelectedSlot({ pitchId, timeSlot });
        if (app) {
            setEditingAppointment(app);
            setCustomerName(app.customerName);
            setPhoneNumber(app.phoneNumber);
            setDeposit(app.deposit || '');
            setIsSubscription(!!app.isSubscription);
        } else {
            setEditingAppointment(null);
            setCustomerName('');
            setPhoneNumber('');
            setDeposit('');
            setIsSubscription(false);
        }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!customerName.trim()) {
            showToast('Müşteri adı boş bırakılamaz.', 'warning');
            return;
        }
        setIsSaving(true);
        try {
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const year = String(selectedDate.getFullYear()).slice(-2);
            const dateStr = `${day}.${month}.${year}`;

            const appData = {
                pitchId: selectedSlot!.pitchId,
                timeSlot: selectedSlot!.timeSlot,
                dateString: dateStr,
                customerName: customerName.trim(),
                phoneNumber: phoneNumber.trim(),
                deposit: deposit.trim(),
                isSubscription,
                status: 'booked' as const,
            };

            let savedId = editingAppointment?.id;
            if (editingAppointment?.id) {
                await firebaseService.updateAppointment(editingAppointment.id, appData);
            } else {
                const res = await firebaseService.addAppointment(appData);
                // @ts-ignore
                savedId = res.id;
            }

            // Zil Sistemini Zamanla
            if (savedId) {
                await NotificationService.cancelAllForAppointment(savedId);
                await NotificationService.scheduleBuzzer(savedId, dateStr, selectedSlot!.timeSlot);
            }

            setModalVisible(false);
            fetchAppointments();
            showToast(editingAppointment ? 'Randevu güncellendi.' : 'Randevu kaydedildi.', 'success');
        } catch (error) {
            console.error("Kaydetme hatası:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingAppointment?.id) {
            console.warn("Silinecek randevu ID'si bulunamadı.");
            return;
        }

        // Dinamik Mesaj Oluştur
        let message = "Bu randevuyu silmek istediğinize emin misiniz?";
        const warnings: string[] = [];

        if (editingAppointment.deposit && parseInt(editingAppointment.deposit) > 0) {
            warnings.push(`⚠️ BU RANDEVU İÇİN ${editingAppointment.deposit} TL KAPORA ALINMIŞ.`);
        }

        if (editingAppointment.isSubscription) {
            warnings.push("⭐ BU BİR ABONELİK RANDEVUSUDUR. Sadece bu haftalık silinecektir.");
        }

        if (warnings.length > 0) {
            message = `${warnings.join('\n\n')}\n\nDevam etmek istiyor musunuz?`;
        }

        customAlert(
            "Randevu Sil",
            message,
            async () => {
                setIsSaving(true);
                try {
                    // Önce bildirimleri iptal etmeyi dene ama hata verirse logla ve devam et
                    try {
                        await NotificationService.cancelAllForAppointment(editingAppointment.id!);
                    } catch (nErr) {
                        console.error("Bildirim iptal hatası (devam ediliyor):", nErr);
                    }

                    await firebaseService.deleteAppointment(editingAppointment.id!);
                    setModalVisible(false);
                    fetchAppointments();
                    showToast('Randevu başarıyla silindi.', 'success');
                } catch (error) {
                    console.error("Silme hatası:", error);
                    showToast('Randevu veritabanından silinemedi. Lütfen internetinizi kontrol edin.', 'error');
                } finally {
                    setIsSaving(false);
                }
            }
        );
    };

    const playSound = async (type: 'start' | 'warning' | 'end') => {
        await NotificationService.playSound(type, buzzerSettings.volume);
    };

    const renderPitchColumn = (pitchId: 'barnebau' | 'noucamp', title: string) => {
        const pitchAppointments = appointments.filter(app => app.pitchId === pitchId);

        return (
            <View style={styles.pitchColumn}>
                <Surface style={[styles.pitchHeader, { backgroundColor: theme['color-primary'] + '10', borderColor: theme['color-primary'] + '20' }]} elevation={0}>
                    <ThemedText style={{ fontWeight: 'bold', color: theme['color-primary'] }}>{title.toUpperCase()}</ThemedText>
                </Surface>
                <View style={[styles.slotsContainer, { backgroundColor: theme['color-surface'], borderColor: theme['color-border'] }]}>
                    {[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0].map(hour => {
                        const time = `${hour < 10 ? '0' + hour : hour}.00`;
                        const app = pitchAppointments.find(a => a.timeSlot === time);

                        return (
                            <TouchableOpacity
                                key={time}
                                style={[
                                    styles.slotItem,
                                    { borderBottomColor: theme['color-border'] + '40' },
                                    app?.status === 'booked' && styles.bookedSlot
                                ]}
                                onPress={() => handleOpenModal(pitchId, time, app)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.slotTimeBox}>
                                    <ThemedText style={[styles.slotTime, { color: theme['color-text-secondary'] }]}>{time}</ThemedText>
                                </View>

                                <View style={styles.slotContent}>
                                    {app ? (
                                        <View style={styles.bookingInfo}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <ThemedText style={[styles.customerName, { color: theme['color-text-primary'] }]}>{app.customerName}</ThemedText>
                                                {app.isSubscription && <IconButton icon="star" size={14} iconColor="#FFD700" style={{ margin: 0, padding: 0 }} />}
                                            </View>
                                            <ThemedText style={[styles.bookingStatus, { color: theme['color-primary'], fontSize: 11 }]}>
                                                {app.deposit ? `${app.deposit} TL Kapora` : 'Ödeme Yok'}
                                            </ThemedText>
                                        </View>
                                    ) : (
                                        <View style={styles.emptySlotContent}>
                                            <IconButton icon="plus-circle-outline" size={18} iconColor={theme['color-primary'] + '40'} style={{ margin: 0 }} />
                                            <ThemedText style={[styles.emptyText, { color: theme['color-text-secondary'] + '60' }]}>Randevu Al</ThemedText>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <MainLayout>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                <Portal>
                    {/* Randevu Modalı - Mevcut kod korunuyor */}
                    <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={[styles.modalContent, { backgroundColor: theme['color-surface'], borderColor: theme['color-border'] }]}>
                        <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme['color-text-primary'] }]}>
                            {editingAppointment ? 'Randevu Düzenle' : 'Yeni Randevu'}
                        </Text>
                        <Text style={[styles.modalSubtitle, { color: theme['color-text-secondary'], marginBottom: 15 }]}>
                            Randevu Bilgileri
                        </Text>

                        {!editingAppointment && (
                            <View style={{ marginBottom: 15 }}>
                                <Text style={{ color: theme['color-text-secondary'], fontSize: 12, marginBottom: 5 }}>Saha Seçimi</Text>
                                <SegmentedButtons
                                    value={selectedSlot?.pitchId || 'barnebau'}
                                    onValueChange={(val) => setSelectedSlot(prev => prev ? { ...prev, pitchId: val as any } : { pitchId: val as any, timeSlot: '14.00' })}
                                    buttons={[
                                        { value: 'barnebau', label: 'Barnebau' },
                                        { value: 'noucamp', label: 'Nou Camp' },
                                    ]}
                                    theme={{ colors: { secondaryContainer: theme['color-primary'] + '20' } }}
                                />

                                <Text style={{ color: theme['color-text-secondary'], fontSize: 12, marginTop: 15, marginBottom: 5 }}>Saat Seçimi</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                    {[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0].map(hour => {
                                        const time = `${hour < 10 ? '0' + hour : hour}.00`;
                                        const isSelected = selectedSlot?.timeSlot === time;

                                        // Bu saatin dolu olup olmadığını kontrol et
                                        const isBooked = appointments.some(app =>
                                            app.pitchId === selectedSlot?.pitchId &&
                                            app.timeSlot === time
                                        );

                                        return (
                                            <Button
                                                key={hour}
                                                mode={isSelected ? 'contained' : 'outlined'}
                                                onPress={() => setSelectedSlot(prev => prev ? { ...prev, timeSlot: time } : { pitchId: 'barnebau', timeSlot: time })}
                                                style={[
                                                    { marginRight: 8 },
                                                    isBooked && !isSelected && { borderColor: theme['color-danger'] }
                                                ]}
                                                textColor={isBooked && !isSelected ? theme['color-danger'] : undefined}
                                                buttonColor={isSelected ? (isBooked ? theme['color-danger'] : theme['color-primary']) : undefined}
                                                compact
                                            >
                                                {time}
                                            </Button>
                                        );
                                    })}
                                </ScrollView>
                                <Divider style={{ marginVertical: 15 }} />
                            </View>
                        )}

                        <TextInput label="Müşteri Adı" value={customerName} onChangeText={setCustomerName} style={[styles.input, { backgroundColor: theme['color-surface'] }]} mode="outlined" outlineColor={theme['color-border']} activeOutlineColor={theme['color-primary']} textColor={theme['color-text-primary']} />
                        <TextInput label="Telefon Numarası" value={phoneNumber} onChangeText={setPhoneNumber} style={[styles.input, { backgroundColor: theme['color-surface'] }]} mode="outlined" outlineColor={theme['color-border']} activeOutlineColor={theme['color-primary']} textColor={theme['color-text-primary']} keyboardType="phone-pad" />
                        <TextInput label="Kapora (TL)" value={deposit} onChangeText={setDeposit} style={[styles.input, { backgroundColor: theme['color-surface'] }]} mode="outlined" outlineColor={theme['color-border']} activeOutlineColor={theme['color-primary']} textColor={theme['color-text-primary']} keyboardType="numeric" />

                        <View style={styles.checkboxRow}>
                            <Checkbox status={isSubscription ? 'checked' : 'unchecked'} onPress={() => setIsSubscription(!isSubscription)} color={theme['color-primary']} />
                            <ThemedText style={{ color: theme['color-text-primary'] }}>Abone Kaydı</ThemedText>
                        </View>

                        <Divider style={[styles.divider, { backgroundColor: theme['color-border'] }]} />

                        <View style={styles.modalActions}>
                            {editingAppointment && (
                                <>
                                    <Button
                                        mode="contained"
                                        onPress={() => handleWhatsApp(phoneNumber, customerName)}
                                        buttonColor="#25D366"
                                        textColor="#fff"
                                        icon="whatsapp"
                                        style={{ borderRadius: 8 }}
                                    >
                                        WhatsApp
                                    </Button>
                                    <Button mode="text" onPress={handleDelete} textColor={theme['color-danger']} disabled={isSaving}>Sil</Button>
                                </>
                            )}
                            <View style={{ flex: 1 }} />
                            <Button mode="text" onPress={() => setModalVisible(false)} textColor={theme['color-text-secondary']}>Vazgeç</Button>
                            <Button mode="contained" onPress={handleSave} style={styles.saveButton} buttonColor={theme['color-primary']} textColor={theme['color-bg']} loading={isSaving}>Kaydet</Button>
                        </View>
                    </Modal>

                    {/* Analiz Modalı */}
                    <Modal visible={analysisVisible} onDismiss={() => setAnalysisVisible(false)} contentContainerStyle={[styles.modalContent, { width: width * 0.9, alignSelf: 'center', height: '80%', backgroundColor: theme['color-surface'], borderColor: theme['color-border'] }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme['color-text-primary'] }]}>Aylık Analiz</Text>
                                <IconButton icon="close" iconColor={theme['color-text-primary']} onPress={() => setAnalysisVisible(false)} />
                            </View>

                            <View style={styles.statsGrid}>
                                <Surface style={[styles.statCard, { backgroundColor: theme['color-surface'] }]} elevation={2}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={[styles.statLabel, { color: theme['color-text-secondary'] }]}>Kayıtlı Abone</Text>
                                        <IconButton icon="star" size={14} iconColor="#FFD700" style={{ margin: 0, padding: 0, width: 20, height: 20 }} />
                                    </View>
                                    <Text style={[styles.statValue, { color: '#FFD700' }]}>{stats.totalRegisteredSubscribers}</Text>
                                </Surface>
                                <Surface style={[styles.statCard, { backgroundColor: theme['color-surface'] }]} elevation={2}>
                                    <Text style={[styles.statLabel, { color: theme['color-text-secondary'] }]}>Bu Ayki Abone Maçı</Text>
                                    <Text style={[styles.statValue, { color: theme['color-primary'] }]}>{stats.subscriptionCount}</Text>
                                </Surface>
                                <Surface style={[styles.statCard, { backgroundColor: theme['color-surface'] }]} elevation={2}>
                                    <Text style={[styles.statLabel, { color: theme['color-text-secondary'] }]}>Toplam Maç</Text>
                                    <Text style={[styles.statValue, { color: theme['color-primary'] }]}>{stats.bookedSlots}</Text>
                                </Surface>
                            </View>

                            <Text style={[styles.sectionTitle, { marginTop: 20, color: theme['color-text-primary'] }]}>Doluluk Oranı</Text>
                            <View style={styles.chartContainer}>
                                <ThemedText style={{ color: theme['color-text-secondary'], textAlign: 'center', padding: 20 }}>
                                    Detaylı analiz grafiği ana sayfada mevcuttur.
                                </ThemedText>
                            </View>

                            <Text style={[styles.sectionTitle, { color: theme['color-text-primary'] }]}>En Çok Gelen Aboneler</Text>
                            {stats.topCustomers.map(([name, count], index) => (
                                <View key={index} style={[styles.aboneItem, { borderBottomColor: theme['color-border'] }]}>
                                    <Text style={[styles.aboneName, { color: theme['color-text-primary'] }]}>{name}</Text>
                                    <Text style={[styles.aboneCount, { color: theme['color-primary'] }]}>{count} Randevu</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </Modal>

                    {/* Zil Ayarları Modalı */}
                    <Modal visible={settingsVisible} onDismiss={() => setSettingsVisible(false)} contentContainerStyle={[styles.modalContent, { backgroundColor: theme['color-surface'], borderColor: theme['color-border'] }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme['color-text-primary'] }]}>Zil Ayarları</Text>
                            <IconButton icon="close" iconColor={theme['color-text-primary']} onPress={() => setSettingsVisible(false)} />
                        </View>

                        <ThemedCard style={[styles.settingsCard, { marginBottom: 12, backgroundColor: theme['color-surface'] }]}>
                            <View style={styles.settingRow}>
                                <View style={{ flex: 1 }}>
                                    <ThemedText variant="label" style={[styles.settingTitle, { color: theme['color-text-primary'] }]}>Başlangıç Düziği</ThemedText>
                                    <ThemedText variant="caption" style={[styles.settingDesc, { color: theme['color-text-secondary'] }]}>Maç başladığında çalar</ThemedText>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <IconButton icon="play-circle" size={24} iconColor={theme['color-primary']} onPress={() => playSound('start')} />
                                    <Checkbox status={buzzerSettings.startEnabled ? 'checked' : 'unchecked'} onPress={() => handleSaveSettings({ ...buzzerSettings, startEnabled: !buzzerSettings.startEnabled })} color={theme['color-primary']} />
                                </View>
                            </View>
                        </ThemedCard>

                        <ThemedCard style={[styles.settingsCard, { marginBottom: 12, backgroundColor: theme['color-surface'] }]}>
                            <View style={styles.settingRow}>
                                <View style={{ flex: 1 }}>
                                    <ThemedText variant="label" style={[styles.settingTitle, { color: theme['color-text-primary'] }]}>Son 5 Dakika Uyarısı</ThemedText>
                                    <ThemedText variant="caption" style={[styles.settingDesc, { color: theme['color-text-secondary'] }]}>Bitişe 5 dk kala çalar</ThemedText>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <IconButton icon="play-circle" size={24} iconColor={theme['color-primary']} onPress={() => playSound('warning')} />
                                    <Checkbox status={buzzerSettings.warningEnabled ? 'checked' : 'unchecked'} onPress={() => handleSaveSettings({ ...buzzerSettings, warningEnabled: !buzzerSettings.warningEnabled })} color={theme['color-primary']} />
                                </View>
                            </View>
                        </ThemedCard>

                        <ThemedCard style={[styles.settingsCard, { marginBottom: 12, backgroundColor: theme['color-surface'] }]}>
                            <View style={styles.settingRow}>
                                <View style={{ flex: 1 }}>
                                    <ThemedText variant="label" style={[styles.settingTitle, { color: theme['color-text-primary'] }]}>Bitiş Düziği</ThemedText>
                                    <ThemedText variant="caption" style={[styles.settingDesc, { color: theme['color-text-secondary'] }]}>Süre dolduğunda çalar (3 Düdük)</ThemedText>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <IconButton icon="play-circle" size={24} iconColor={theme['color-primary']} onPress={() => playSound('end')} />
                                    <Checkbox status={buzzerSettings.endEnabled ? 'checked' : 'unchecked'} onPress={() => handleSaveSettings({ ...buzzerSettings, endEnabled: !buzzerSettings.endEnabled })} color={theme['color-primary']} />
                                </View>
                            </View>
                        </ThemedCard>

                        <View style={{ marginTop: 20 }}>
                            <ThemedText variant="label" style={{ fontWeight: 'bold', marginBottom: 10, color: theme['color-text-primary'] }}>Tema</ThemedText>
                            <SegmentedButtons
                                value={mode}
                                onValueChange={v => setMode(v as any)}
                                buttons={[
                                    { value: 'auto', label: 'Otomatik', icon: 'brightness-auto' },
                                    { value: 'dark', label: 'Koyu', icon: 'weather-night' },
                                    { value: 'light', label: 'Açık', icon: 'weather-sunny' },
                                ]}
                            />
                        </View>

                        <View style={{ marginTop: 20 }}>
                            <ThemedText variant="label" style={{ fontWeight: 'bold', color: theme['color-text-primary'] }}>Ses Seviyesi</ThemedText>
                            <Slider
                                style={{ width: '100%', height: 40 }}
                                minimumValue={0}
                                maximumValue={1}
                                value={buzzerSettings.volume}
                                onSlidingComplete={(val: number) => handleSaveSettings({ ...buzzerSettings, volume: val })}
                                minimumTrackTintColor={theme['color-primary']}
                                maximumTrackTintColor={theme['color-text-secondary']}
                                thumbTintColor={theme['color-primary']}
                            />
                        </View>

                        <Button mode="contained" onPress={() => setSettingsVisible(false)} style={[styles.saveButton, { marginTop: 20 }]} buttonColor={theme['color-primary']} textColor={theme['color-bg']}>Tamam</Button>
                    </Modal>
                </Portal >

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
                    {/* Header Section */}
                    <View style={styles.dashboardHeader}>
                        <View>
                            <ThemedText variant="h1" style={{ color: theme['color-text-primary'] }}>Dashboard</ThemedText>
                            <ThemedText variant="caption" style={{ color: theme['color-text-secondary'] }}>{selectedDate.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</ThemedText>
                        </View>

                        {/* Summary Cards */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll} contentContainerStyle={styles.summaryContainer}>
                            <Surface style={[styles.summaryCard, { backgroundColor: theme['color-primary'] + '15', borderColor: theme['color-primary'] + '30' }]} elevation={0}>
                                <ThemedText style={styles.summaryLabel}>Bugünkü Kazanç</ThemedText>
                                <ThemedText style={[styles.summaryValue, { color: theme['color-primary'] }]}>{todayStats.todayRevenue} TL</ThemedText>
                            </Surface>

                            <Surface style={[styles.summaryCard, { backgroundColor: '#2563EB15', borderColor: '#2563EB30' }]} elevation={0}>
                                <ThemedText style={[styles.summaryLabel, { color: '#2563EB' }]}>Doluluk</ThemedText>
                                <ThemedText style={[styles.summaryValue, { color: '#2563EB' }]}>%{todayStats.occupancy}</ThemedText>
                            </Surface>

                            {todayStats.isToday && (
                                <Surface style={[styles.summaryCard, { backgroundColor: todayStats.liveNow.length > 0 ? '#DC262615' : '#05966915', borderColor: todayStats.liveNow.length > 0 ? '#DC262630' : '#05966930' }]} elevation={0}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <View style={[styles.liveDot, { backgroundColor: todayStats.liveNow.length > 0 ? '#DC2626' : '#059669' }]} />
                                        <ThemedText style={[styles.summaryLabel, { color: todayStats.liveNow.length > 0 ? '#DC2626' : '#059669' }]}>Şu An</ThemedText>
                                    </View>
                                    <ThemedText style={[styles.summaryValue, { color: todayStats.liveNow.length > 0 ? '#DC2626' : '#059669' }]}>
                                        {todayStats.liveNow.length > 0 ? `${todayStats.liveNow.length} Maç` : 'Saha Boş'}
                                    </ThemedText>
                                </Surface>
                            )}
                        </ScrollView>
                        <View style={{ flexDirection: 'row' }}>
                            <IconButton
                                icon="calendar"
                                mode="contained"
                                containerColor={theme['color-surface']}
                                iconColor={theme['color-primary']}
                                onPress={() => setIsCalendarOpen(true)}
                                accessibilityLabel="Takvimi Aç"
                            />
                            <IconButton
                                icon="bell-ring"
                                mode="contained"
                                containerColor={theme['color-surface']}
                                iconColor={theme['color-primary']}
                                onPress={() => setSettingsVisible(true)}
                                accessibilityLabel="Bildirim Ayarları"
                            />
                            <ThemeToggle />
                        </View>
                    </View>

                    {/* Stats Grid */}
                    <View style={[styles.statsGrid, { flexDirection: isMobile ? 'column' : 'row' }]}>
                        <View style={{ flex: 1 }}>
                            <StatsCard
                                title="Toplam Randevu"
                                value={stats.bookedSlots}
                                icon="calendar-check"
                                trend={{ value: 12, direction: 'up', label: 'Geçen aya göre' }}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <StatsCard
                                title="Abone Sayısı"
                                value={stats.subscriptionCount}
                                icon="account-group"
                                color={theme['color-primary-hover']}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <StatsCard
                                title="Doluluk Oranı"
                                value={`%${Math.round((stats.bookedSlots / (stats.bookedSlots + stats.emptySlots)) * 100) || 0}`}
                                icon="chart-pie"
                                trend={{ value: 5, direction: 'down', label: 'Düşüşte' }}
                                color={theme['color-danger']}
                            />
                        </View>
                    </View>

                    {/* Chart Section */}
                    <ChartWidget
                        title="Doluluk Analizi"
                        type="pie"
                        data={chartData}
                        loading={isAnalyzing}
                        height={220}
                    />

                    <DatePickerModal
                        locale="tr"
                        mode="single"
                        visible={isCalendarOpen}
                        onDismiss={() => setIsCalendarOpen(false)}
                        date={selectedDate}
                        onConfirm={onConfirmDate}
                        label="Tarih Seçin"
                    />

                    {loading ? (
                        <ThemedContainer style={[styles.loadingContainer, { flexDirection: 'row', gap: 10, padding: 10 }]}>
                            <View style={{ flex: 1 }}>
                                <SkeletonLoader height={40} style={{ marginBottom: 10 }} />
                                <SkeletonLoader height={100} style={{ marginBottom: 10 }} />
                                <SkeletonLoader height={100} style={{ marginBottom: 10 }} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <SkeletonLoader height={40} style={{ marginBottom: 10 }} />
                                <SkeletonLoader height={100} style={{ marginBottom: 10 }} />
                                <SkeletonLoader height={100} style={{ marginBottom: 10 }} />
                            </View>
                        </ThemedContainer>
                    ) : (
                        <View style={[styles.content, isMobile ? styles.mobileContent : styles.tabletContent]}>
                            {renderPitchColumn('barnebau', 'BARNEBAU')}
                            {renderPitchColumn('noucamp', 'NOU CAMP')}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView >
            {/* SPEED DIAL FAB */}
            < Portal >
                <FAB.Group
                    open={fabOpen}
                    visible
                    icon={fabOpen ? 'close' : 'plus'}
                    actions={[
                        {
                            icon: 'calendar-plus',
                            label: 'Randevu Ekle',
                            onPress: () => {
                                handleOpenModal('barnebau', `${new Date().getHours()}.00`, undefined);
                            },
                        },
                        {
                            icon: 'account-plus',
                            label: 'Yeni Müşteri',
                            onPress: () => router.push('/customers?action=add'),
                        },
                        {
                            icon: 'chart-bar',
                            label: 'Raporlar',
                            onPress: () => router.push('/reports'),
                        },
                        {
                            icon: 'view-dashboard',
                            label: 'Dashboard',
                            onPress: () => router.push('/'),
                        },
                    ]}
                    onStateChange={({ open }) => setFabOpen(open)}
                    fabStyle={[styles.fab, { backgroundColor: theme['color-primary'] }]}
                    theme={{ colors: { primaryContainer: theme['color-primary'] } }}
                />
            </Portal >
        </MainLayout >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 10,
    },
    dashboardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        marginTop: 10
    },
    summaryScroll: {
        marginBottom: 20,
    },
    summaryContainer: {
        paddingHorizontal: 20,
        gap: 12,
    },
    summaryCard: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: 140,
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 2,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    pitchColumn: {
        flex: 1,
        marginHorizontal: 10,
        marginBottom: 20,
    },
    slotsContainer: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    slotItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        minHeight: 64,
    },
    slotTimeBox: {
        width: 45,
    },
    slotTime: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    slotContent: {
        flex: 1,
        marginLeft: 12,
    },
    bookingInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    emptySlotContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    emptyText: {
        fontSize: 13,
        fontStyle: 'italic',
    },
    bookingStatus: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    bookedSlot: {
        backgroundColor: 'rgba(46, 125, 50, 0.05)',
    },
    bannerArea: {
        width: '100%',
        height: 120, // Banner yüksekliği
        backgroundColor: '#fff', // Banner beyaz zeminde olduğu için
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerImage: {
        width: '90%',
        height: '100%',
    },
    controlsArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
    },
    title: {
        fontWeight: 'bold',
    },
    subtitle: {
        color: 'gray', // theme['color-text-secondary'], - style sheet içinde statik olmalı veya inline
        fontSize: 14,
    },
    content: {
        flex: 1,
        padding: 10,
    },
    tabletContent: {
        flexDirection: 'row',
    },
    mobileContent: {
        flexDirection: 'column',
    },
    fieldColumn: {
        flex: 1,
        borderRadius: 16, // Fixed value for now or use radius.large
        padding: 15,
        marginBottom: 10,
        marginHorizontal: 5,
        borderWidth: 1,
    },
    pitchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    fieldTitle: {
        fontWeight: 'bold',
    },
    pitchStatusBadge: {
        backgroundColor: 'rgba(0, 230, 118, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        padding: 24,
        margin: 20,
        borderRadius: 16,
        // backgroundColor ve borderColor artık inline veriliyor
    },
    modalTitle: {
        fontWeight: 'bold',
    },
    modalSubtitle: {
        marginBottom: 20,
    },
    input: {
        marginBottom: 12,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    divider: {
        marginVertical: 15,
        height: 1,
    },
    modalActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    saveButton: {
        borderRadius: 8,
        paddingHorizontal: 10,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    statCard: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    chartContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    aboneItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    aboneName: {
    },
    aboneCount: {
        fontWeight: 'bold',
    },
    settingsCard: {
        borderRadius: 12,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    settingDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});
