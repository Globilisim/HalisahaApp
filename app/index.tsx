import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView, TouchableOpacity, Dimensions, Linking, Image, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Text, Card, IconButton, Portal, Modal, TextInput, Button, Checkbox, Divider, Surface, ActivityIndicator, FAB, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePickerModal } from 'react-native-paper-dates';
// import { PieChart } from 'react-native-chart-kit'; // Disabled for web compatibility
import { firebaseService, Appointment } from '../services/firebaseService';
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

    const stats = useMemo(() => {
        const totalSlotsInMonth = 11 * 2 * 30; // 11 saat * 2 saha * 30 gün (temsili)
        const bookedSlots = allAppointments.length;
        const subscriptionCount = allAppointments.filter(a => a.isSubscription).length;

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
            topCustomers
        };
    }, [allAppointments]);

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

        customAlert(
            "Randevu Sil",
            "Bu randevuyu silmek istediğinize emin misiniz?",
            async () => {
                setIsSaving(true);
                try {
                    await NotificationService.cancelAllForAppointment(editingAppointment.id!);
                    await firebaseService.deleteAppointment(editingAppointment.id!);
                    setModalVisible(false);
                    fetchAppointments();
                    showToast('Randevu silindi.', 'success');
                } catch (error) {
                    console.error("Silme hatası:", error);
                    showToast('Randevu silinirken bir sorun oluştu.', 'error');
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
            <View style={[styles.fieldColumn, { backgroundColor: theme['color-surface'], borderColor: theme['color-border'] }]}>
                <View style={styles.pitchHeader}>
                    <ThemedText variant="h2" style={styles.fieldTitle}>{title}</ThemedText>
                    <View style={[styles.pitchStatusBadge, { backgroundColor: theme['color-success'] + '26' }]}>
                        <ThemedText style={[styles.statusText, { color: theme['color-success'] }]}>
                            {pitchAppointments.length} Dolu</ThemedText>
                    </View>
                </View>

                <View>
                    {[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0].map(hour => {
                        const timeStr = hour === 0 ? "00.00" : `${hour < 10 ? '0' + hour : hour}.00`;
                        const app = pitchAppointments.find(a => a.timeSlot?.startsWith(timeStr));

                        return (
                            <TouchableOpacity
                                key={hour}
                                activeOpacity={0.7}
                                onPress={() => handleOpenModal(pitchId, timeStr, app)}
                                accessible={true}
                                accessibilityRole="button"
                                accessibilityLabel={`${hour}:00 - ${(hour + 1) % 24}:00, ${app ? 'Dolu, Müşteri: ' + app.customerName : 'Boş'}`}
                                accessibilityHint="Randevu detaylarını görmek veya düzenlemek için dokunun"
                            >
                                <ThemedCard style={[
                                    styles.slotCard,
                                    { backgroundColor: theme['color-surface'] },
                                    app ? styles.bookedCard : styles.availableCard,
                                    app ? { backgroundColor: theme['color-danger'] + '1A', borderColor: theme['color-danger'], borderLeftColor: theme['color-danger'] } : { borderColor: theme['color-success'] + '1A' }
                                ]}>
                                    <View style={styles.slotContent}>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.timeRow}>
                                                <ThemedText style={[styles.timeText, { color: theme['color-text-primary'] }]}>{hour < 10 ? '0' + hour : hour}:00 - {(hour + 1) % 24}:00</ThemedText>
                                                {app?.isSubscription && <ThemedText style={[styles.aboneBadge, { backgroundColor: theme['color-primary'], color: theme['color-bg'] }]}>ABONE</ThemedText>}
                                            </View>
                                            <ThemedText numberOfLines={1} style={[styles.customerText, { color: theme['color-text-secondary'] }]}>
                                                {app ? app.customerName : 'Müsait'}
                                            </ThemedText>
                                        </View>
                                        <IconButton
                                            icon={app ? "pencil" : "plus-circle"}
                                            iconColor={app ? theme['color-text-secondary'] : theme['color-primary']}
                                            size={20}
                                        />
                                    </View>
                                </ThemedCard>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const chartConfig = {
        backgroundGradientFrom: theme['color-surface'],
        backgroundGradientTo: theme['color-surface'],
        color: (opacity = 1) => theme['color-primary'],
    };

    return (
        <MainLayout>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                <Portal>
                    {/* Randevu Modalı - Mevcut kod korunuyor */}
                    <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={[styles.modalContent, { backgroundColor: theme['color-surface'], borderColor: theme['color-border'] }]}>
                        {/* ... Modal Content ... */}
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
                                        return (
                                            <Button
                                                key={hour}
                                                mode={isSelected ? 'contained' : 'outlined'}
                                                onPress={() => setSelectedSlot(prev => prev ? { ...prev, timeSlot: time } : { pitchId: 'barnebau', timeSlot: time })}
                                                style={{ marginRight: 8 }}
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
                                    <Text style={[styles.statLabel, { color: theme['color-text-secondary'] }]}>Toplam Maç</Text>
                                    <Text style={[styles.statValue, { color: theme['color-primary'] }]}>{stats.bookedSlots}</Text>
                                </Surface>
                                <Surface style={[styles.statCard, { backgroundColor: theme['color-surface'] }]} elevation={2}>
                                    <Text style={[styles.statLabel, { color: theme['color-text-secondary'] }]}>Abone Sayısı</Text>
                                    <Text style={[styles.statValue, { color: theme['color-primary'] }]}>{stats.subscriptionCount}</Text>
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
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <Button
                                    mode={mode === 'auto' ? 'contained' : 'outlined'}
                                    onPress={() => setMode('auto')}
                                    style={{ flex: 1 }}
                                    textColor={mode === 'auto' ? theme['color-bg'] : theme['color-text-primary']}
                                    buttonColor={mode === 'auto' ? theme['color-primary'] : undefined}
                                >
                                    Otomatik
                                </Button>
                                <Button
                                    mode={mode === 'dark' ? 'contained' : 'outlined'}
                                    onPress={() => setMode('dark')}
                                    style={{ flex: 1 }}
                                    textColor={mode === 'dark' ? theme['color-bg'] : theme['color-text-primary']}
                                    buttonColor={mode === 'dark' ? theme['color-primary'] : undefined}
                                >
                                    Koyu
                                </Button>
                                <Button
                                    mode={mode === 'light' ? 'contained' : 'outlined'}
                                    onPress={() => setMode('light')}
                                    style={{ flex: 1 }}
                                    textColor={mode === 'light' ? theme['color-bg'] : theme['color-text-primary']}
                                    buttonColor={mode === 'light' ? theme['color-primary'] : undefined}
                                >
                                    Açık
                                </Button>
                            </View>
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
                </Portal>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
                    {/* Header Section */}
                    <View style={styles.dashboardHeader}>
                        <View>
                            <ThemedText variant="h1" style={{ color: theme['color-text-primary'] }}>Dashboard</ThemedText>
                            <ThemedText variant="caption" style={{ color: theme['color-text-secondary'] }}>{selectedDate.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</ThemedText>
                        </View>
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
            </SafeAreaView>
            {/* SPEED DIAL FAB */}
            <Portal>
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
            </Portal>
        </MainLayout>
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
    slotCard: {
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        elevation: 2,
    },
    availableCard: {
        opacity: 0.9,
    },
    bookedCard: {
        borderWidth: 1,
        borderLeftWidth: 5,
    },
    slotContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    customerText: {
        fontSize: 12,
    },
    aboneBadge: {
        fontSize: 9,
        fontWeight: 'bold',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        overflow: 'hidden',
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
