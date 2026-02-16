import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Surface, IconButton, Button, Portal, Modal, List, Searchbar, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { MainLayout } from '../components/Layout/MainLayout';
import { ThemedText } from '../components/ThemedText';
import { useTheme } from '../config/ThemeContext';
import { useToast } from '../config/ToastContext';
import { firebaseService, Subscription, Appointment, Customer } from '../services/firebaseService';

const MONTHS = [
    { label: 'Genel', value: -1 },
    { label: 'Oca', value: 0 },
    { label: 'Şub', value: 1 },
    { label: 'Mar', value: 2 },
    { label: 'Nis', value: 3 },
    { label: 'May', value: 4 },
    { label: 'Haz', value: 5 },
    { label: 'Tem', value: 6 },
    { label: 'Ağu', value: 7 },
    { label: 'Eyl', value: 8 },
    { label: 'Eki', value: 9 },
    { label: 'Kas', value: 10 },
    { label: 'Ara', value: 11 },
];

const DAYS = [
    { label: 'Pzt', value: 1 },
    { label: 'Sal', value: 2 },
    { label: 'Çar', value: 3 },
    { label: 'Per', value: 4 },
    { label: 'Cum', value: 5 },
    { label: 'Cmt', value: 6 },
    { label: 'Paz', value: 0 },
];

const HOURS = ['14.00', '15.00', '16.00', '17.00', '18.00', '19.00', '20.00', '21.00', '22.00', '23.00', '00.00'];

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

export default function SubscriptionsPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedPitch, setSelectedPitch] = useState<'barnebau' | 'noucamp'>('barnebau');
    const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 1);
    const [selectedMonth, setSelectedMonth] = useState(-1); // -1 = Genel

    // Modal State
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subData, custData] = await Promise.all([
                firebaseService.getSubscriptions(),
                firebaseService.getCustomers()
            ]);
            setSubscriptions(subData);
            setCustomers(custData);
        } catch (error) {
            showToast('Veriler yüklenirken hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubscription = async (customer: Customer) => {
        if (!selectedSlot) return;
        setIsSaving(true);
        try {
            const newSub: Subscription = {
                pitchId: selectedPitch,
                dayOfWeek: selectedDay,
                timeSlot: selectedSlot,
                customerId: customer.id!,
                customerName: customer.name,
                customerPhone: customer.phone,
                active: true,
                month: selectedMonth !== -1 ? selectedMonth : undefined
            };
            await firebaseService.addSubscription(newSub);
            showToast('Abonelik başarıyla eklendi.', 'success');
            setIsAddModalVisible(false);
            fetchData();
        } catch (error) {
            showToast('Abone eklenirken hata oluştu.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSubscription = async (id: string) => {
        try {
            await firebaseService.deleteSubscription(id);
            showToast('Abonelik silindi.', 'success');
            fetchData();
        } catch (error) {
            showToast('Silme işlemi başarısız.', 'error');
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );

    const getSlotSubscription = (time: string) => {
        return subscriptions.find(s =>
            s.pitchId === selectedPitch &&
            s.dayOfWeek === selectedDay &&
            s.timeSlot === time &&
            (selectedMonth === -1 ? (!s.month || s.month === -1) : s.month === selectedMonth)
        );
    };

    if (loading) {
        return (
            <MainLayout>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme['color-primary']} />
                </View>
            </MainLayout>
        );
    }

    const handleSync = async () => {
        if (subscriptions.length === 0) {
            showToast('Sync işlemi için kayıtlı abone bulunamadı.', 'warning');
            return;
        }

        const monthLabel = selectedMonth === -1 ? "Önümüzdeki 30 Gün" : MONTHS.find(m => m.value === selectedMonth)?.label;

        customAlert(
            "Aboneleri Aktar",
            `${monthLabel} dönemi için tüm abone saatlerini randevu olarak takvime ekleyecektir. Onaylıyor musunuz?`,
            async () => {
                setIsSaving(true);
                try {
                    let count = 0;
                    const today = new Date();
                    const currentYear = today.getFullYear();

                    const iterateDates: Date[] = [];

                    if (selectedMonth === -1) {
                        // Önümüzdeki 4 hafta
                        for (let i = 0; i < 28; i++) {
                            const d = new Date();
                            d.setDate(today.getDate() + i);
                            iterateDates.push(d);
                        }
                    } else {
                        // Seçilen ayın tüm günleri
                        const daysInMonth = new Date(currentYear, selectedMonth + 1, 0).getDate();
                        for (let i = 1; i <= daysInMonth; i++) {
                            iterateDates.push(new Date(currentYear, selectedMonth, i));
                        }
                    }

                    for (const targetDate of iterateDates) {
                        const dayOfWeek = targetDate.getDay();
                        const dateStr = `${targetDate.getDate().toString().padStart(2, '0')}.${(targetDate.getMonth() + 1).toString().padStart(2, '0')}.${targetDate.getFullYear().toString().slice(-2)}`;

                        // O güne ait aboneleri bul (Filtreleme: Genel aboneler + O aya özel aboneler)
                        const daySubs = subscriptions.filter(s =>
                            s.dayOfWeek === dayOfWeek &&
                            s.active &&
                            (!s.month || s.month === -1 || s.month === targetDate.getMonth())
                        );

                        if (daySubs.length > 0) {
                            const existingApps = await firebaseService.getAppointments(targetDate);

                            for (const sub of daySubs) {
                                const isAlreadyBooked = existingApps.some((app: Appointment) =>
                                    app.pitchId === sub.pitchId &&
                                    app.timeSlot === sub.timeSlot
                                );

                                if (!isAlreadyBooked) {
                                    const newApp = {
                                        pitchId: sub.pitchId,
                                        timeSlot: sub.timeSlot,
                                        dateString: dateStr,
                                        customerName: sub.customerName,
                                        phoneNumber: sub.customerPhone,
                                        status: 'booked' as const,
                                        isSubscription: true,
                                        deposit: '0',
                                    };

                                    await firebaseService.addAppointment(newApp);
                                    count++;
                                }
                            }
                        }
                    }
                    showToast(`${count} adet abone randevusu oluşturuldu.`, 'success');
                } catch (error) {
                    console.error("Sync hatası:", error);
                    showToast('Aktarım sırasında bir hata oluştu.', 'error');
                } finally {
                    setIsSaving(false);
                }
            }
        );
    };

    return (
        <MainLayout>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ThemedText variant="h1">Abonelik Yönetimi</ThemedText>
                    <Button
                        mode="contained"
                        onPress={handleSync}
                        icon="sync"
                        buttonColor={theme['color-primary']}
                        loading={isSaving}
                    >
                        Aktar
                    </Button>
                </View>
                <ThemedText variant="caption">Haftalık sabit saatleri buradan yönetebilirsiniz.</ThemedText>
            </View>

            <Surface style={[styles.controls, { backgroundColor: theme['color-surface'], borderColor: theme['color-border'] }]}>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                    <View style={{ flex: 1 }}>
                        <ThemedText style={styles.label}>Saha Seçimi</ThemedText>
                        <SegmentedButtons
                            value={selectedPitch}
                            onValueChange={v => setSelectedPitch(v as any)}
                            buttons={[
                                { value: 'barnebau', label: 'Barnebau' },
                                { value: 'noucamp', label: 'Nou Camp' },
                            ]}
                            style={styles.segmented}
                        />
                    </View>
                </View>

                <ThemedText style={styles.label}>Ay/Sezon Seçimi</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                    <SegmentedButtons
                        value={selectedMonth.toString()}
                        onValueChange={v => setSelectedMonth(parseInt(v))}
                        buttons={MONTHS.map((m: any) => ({ value: m.value.toString(), label: m.label }))}
                        style={styles.segmented}
                    />
                </ScrollView>

                <ThemedText style={styles.label}>Gün Seçimi (Haftalık Çizelge)</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <SegmentedButtons
                        value={selectedDay.toString()}
                        onValueChange={v => setSelectedDay(parseInt(v))}
                        buttons={DAYS.map((d: any) => ({ value: d.value.toString(), label: d.label }))}
                        style={styles.segmented}
                    />
                </ScrollView>
            </Surface>

            <ScrollView contentContainerStyle={styles.listContainer}>
                {HOURS.map(time => {
                    const sub = getSlotSubscription(time);
                    return (
                        <Surface
                            key={time}
                            style={[
                                styles.slotRow,
                                { backgroundColor: theme['color-surface'], borderColor: theme['color-border'] },
                                sub && { borderLeftWidth: 4, borderLeftColor: theme['color-primary'] }
                            ]}
                            elevation={1}
                        >
                            <View style={styles.timeBox}>
                                <ThemedText style={[styles.time, { color: theme['color-primary'] }]}>{time}</ThemedText>
                            </View>

                            <View style={styles.subscriberBox}>
                                {sub ? (
                                    <View>
                                        <ThemedText style={styles.subName}>{sub.customerName}</ThemedText>
                                        <ThemedText variant="caption">{sub.customerPhone}</ThemedText>
                                    </View>
                                ) : (
                                    <ThemedText style={{ fontStyle: 'italic', opacity: 0.5 }}>Boş Saat</ThemedText>
                                )}
                            </View>

                            <View style={styles.actionBox}>
                                {sub ? (
                                    <IconButton
                                        icon="delete-outline"
                                        iconColor={theme['color-danger']}
                                        onPress={() => handleDeleteSubscription(sub.id!)}
                                    />
                                ) : (
                                    <Button
                                        mode="text"
                                        onPress={() => {
                                            setSelectedSlot(time);
                                            setIsAddModalVisible(true);
                                        }}
                                        compact
                                    >
                                        Abone Ekle
                                    </Button>
                                )}
                            </View>
                        </Surface>
                    );
                })}
            </ScrollView>

            <Portal>
                <Modal
                    visible={isAddModalVisible}
                    onDismiss={() => setIsAddModalVisible(false)}
                    contentContainerStyle={[styles.modal, { backgroundColor: theme['color-surface'] }]}
                >
                    <ThemedText variant="h2" style={{ marginBottom: 10 }}>Abone Seçin</ThemedText>
                    <ThemedText variant="caption" style={{ marginBottom: 20 }}>
                        {DAYS.find((d: any) => d.value === selectedDay)?.label} {selectedSlot} saati için müşteri seçin.
                    </ThemedText>

                    <Searchbar
                        placeholder="Müşteri Ara..."
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={[styles.search, { backgroundColor: theme['color-bg'] }]}
                    />

                    <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
                        {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                            <List.Item
                                key={customer.id}
                                title={customer.name}
                                description={customer.phone}
                                left={props => <List.Icon {...props} icon="account" />}
                                onPress={() => handleAddSubscription(customer)}
                                right={props => <IconButton {...props} icon="plus" />}
                            />
                        )) : (
                            <View style={styles.center}>
                                <ThemedText>Müşteri bulunamadı.</ThemedText>
                                <Button mode="text" onPress={() => router.push('/customers')}>Yeni Müşteri Ekle</Button>
                            </View>
                        )}
                    </ScrollView>

                    <Button
                        mode="outlined"
                        onPress={() => setIsAddModalVisible(false)}
                        style={{ marginTop: 20 }}
                    >
                        Kapat
                    </Button>
                </Modal>
            </Portal>
        </MainLayout>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 20,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    controls: {
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        opacity: 0.7,
    },
    segmented: {
        marginBottom: 15,
    },
    listContainer: {
        paddingBottom: 40,
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
    },
    timeBox: {
        width: 60,
    },
    time: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    subscriberBox: {
        flex: 1,
        paddingHorizontal: 10,
    },
    subName: {
        fontWeight: 'bold',
    },
    actionBox: {
        width: 100,
        alignItems: 'flex-end',
    },
    modal: {
        margin: 20,
        padding: 24,
        borderRadius: 16,
    },
    search: {
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        borderRadius: 10,
    }
});
