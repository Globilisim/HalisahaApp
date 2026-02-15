import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Text, Card, IconButton, Portal, Modal, TextInput, Button, Checkbox, Divider, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { DatePickerModal } from 'react-native-paper-dates';
import { PieChart } from 'react-native-chart-kit';
import { Colors } from '../constants/Colors';
import { firebaseService, Appointment } from '../services/firebaseService';

export default function Dashboard() {
    const { width } = useWindowDimensions();
    const isTablet = width > 768;
    const [loading, setLoading] = useState(false);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [analysisVisible, setAnalysisVisible] = useState(false);
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
            // Frontend tarafında ay filtrelemesi yapalım (dd.mm.yy formatına göre)
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

        // Müşteri bazlı abone sayıları
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
            color: Colors.dark.primary,
            legendFontColor: "#7F7F7F",
            legendFontSize: 12
        },
        {
            name: "Boş",
            population: stats.emptySlots,
            color: "rgba(255,255,255,0.1)",
            legendFontColor: "#7F7F7F",
            legendFontSize: 12
        }
    ];

    const handleOpenModal = (pitchId: 'barnebau' | 'noucamp', timeSlot: string, app?: Appointment) => {
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
        if (!customerName.trim()) return;
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

            if (editingAppointment?.id) {
                await firebaseService.updateAppointment(editingAppointment.id, appData);
            } else {
                await firebaseService.addAppointment(appData);
            }
            setModalVisible(false);
            fetchAppointments();
        } catch (error) {
            console.error("Kaydetme hatası:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingAppointment?.id) return;
        setIsSaving(true);
        try {
            await firebaseService.deleteAccount(editingAppointment.id);
            setModalVisible(false);
            fetchAppointments();
        } catch (error) {
            console.error("Silme hatası:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const renderPitchColumn = (pitchId: 'barnebau' | 'noucamp', title: string) => {
        const pitchAppointments = appointments.filter(app => app.pitchId === pitchId);

        return (
            <View style={styles.fieldColumn}>
                <View style={styles.pitchHeader}>
                    <Text variant="titleLarge" style={styles.fieldTitle}>{title}</Text>
                    <View style={styles.pitchStatusBadge}>
                        <Text style={styles.statusText}>{pitchAppointments.length} Dolu</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0].map(hour => {
                        const timeStr = hour === 0 ? "00.00" : `${hour < 10 ? '0' + hour : hour}.00`;
                        const app = pitchAppointments.find(a => a.timeSlot?.startsWith(timeStr));

                        return (
                            <TouchableOpacity key={hour} activeOpacity={0.7} onPress={() => handleOpenModal(pitchId, timeStr, app)}>
                                <Card style={[styles.slotCard, app ? styles.bookedCard : styles.availableCard]}>
                                    <View style={styles.slotContent}>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.timeRow}>
                                                <Text style={styles.timeText}>{hour < 10 ? '0' + hour : hour}:00 - {(hour + 1) % 24}:00</Text>
                                                {app?.isSubscription && <Text style={styles.aboneBadge}>ABONE</Text>}
                                            </View>
                                            <Text numberOfLines={1} style={styles.customerText}>
                                                {app ? app.customerName : 'Müsait'}
                                            </Text>
                                        </View>
                                        <IconButton
                                            icon={app ? "pencil" : "plus-circle"}
                                            iconColor={app ? Colors.dark.textSecondary : Colors.dark.primary}
                                            size={20}
                                        />
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <Portal>
                {/* Randevu Modalı */}
                <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="headlineSmall" style={styles.modalTitle}>
                        {editingAppointment ? 'Randevu Düzenle' : 'Yeni Randevu'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                        {selectedSlot?.pitchId.toUpperCase()} • {selectedSlot?.timeSlot?.replace('.', ':')}
                    </Text>

                    <TextInput label="Müşteri Adı" value={customerName} onChangeText={setCustomerName} style={styles.input} mode="outlined" outlineColor={Colors.dark.cardBorder} activeOutlineColor={Colors.dark.primary} textColor="#fff" />
                    <TextInput label="Telefon Numarası" value={phoneNumber} onChangeText={setPhoneNumber} style={styles.input} mode="outlined" outlineColor={Colors.dark.cardBorder} activeOutlineColor={Colors.dark.primary} textColor="#fff" keyboardType="phone-pad" />
                    <TextInput label="Kapora (TL)" value={deposit} onChangeText={setDeposit} style={styles.input} mode="outlined" outlineColor={Colors.dark.cardBorder} activeOutlineColor={Colors.dark.primary} textColor="#fff" keyboardType="numeric" />

                    <View style={styles.checkboxRow}>
                        <Checkbox status={isSubscription ? 'checked' : 'unchecked'} onPress={() => setIsSubscription(!isSubscription)} color={Colors.dark.primary} />
                        <Text style={{ color: '#fff' }}>Abone Kaydı</Text>
                    </View>

                    <Divider style={styles.divider} />

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
                                <Button mode="text" onPress={handleDelete} textColor="#ff5252" disabled={isSaving}>Sil</Button>
                            </>
                        )}
                        <View style={{ flex: 1 }} />
                        <Button mode="text" onPress={() => setModalVisible(false)} textColor={Colors.dark.textSecondary}>Vazgeç</Button>
                        <Button mode="contained" onPress={handleSave} style={styles.saveButton} buttonColor={Colors.dark.primary} textColor="#000" loading={isSaving}>Kaydet</Button>
                    </View>
                </Modal>

                {/* Analiz Modalı */}
                <Modal visible={analysisVisible} onDismiss={() => setAnalysisVisible(false)} contentContainerStyle={[styles.modalContent, { width: width * 0.9, alignSelf: 'center', height: '80%' }]}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text variant="headlineSmall" style={styles.modalTitle}>Aylık Analiz</Text>
                            <IconButton icon="close" iconColor="#fff" onPress={() => setAnalysisVisible(false)} />
                        </View>

                        <View style={styles.statsGrid}>
                            <Surface style={styles.statCard} elevation={2}>
                                <Text style={styles.statLabel}>Toplam Maç</Text>
                                <Text style={styles.statValue}>{stats.bookedSlots}</Text>
                            </Surface>
                            <Surface style={styles.statCard} elevation={2}>
                                <Text style={styles.statLabel}>Abone Sayısı</Text>
                                <Text style={styles.statValue}>{stats.subscriptionCount}</Text>
                            </Surface>
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Doluluk Oranı</Text>
                        <View style={styles.chartContainer}>
                            <PieChart
                                data={chartData}
                                width={Dimensions.get("window").width * 0.8}
                                height={180}
                                chartConfig={{
                                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                }}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={"15"}
                                center={[0, 0]}
                                absolute
                            />
                        </View>

                        <Text style={styles.sectionTitle}>En Çok Gelen Aboneler</Text>
                        {stats.topCustomers.map(([name, count], index) => (
                            <View key={index} style={styles.aboneItem}>
                                <Text style={styles.aboneName}>{name}</Text>
                                <Text style={styles.aboneCount}>{count} Randevu</Text>
                            </View>
                        ))}
                    </ScrollView>
                </Modal>
            </Portal>

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <IconButton
                        icon="stadium-variant"
                        iconColor={Colors.dark.primary}
                        size={32}
                        style={styles.logoIcon}
                    />
                    <View>
                        <Text variant="headlineMedium" style={styles.title}>SPORT CITY</Text>
                        <Text style={styles.subtitle}>İşletme Paneli • {selectedDate.toLocaleDateString('tr-TR')}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row' }}>
                    <IconButton
                        icon="chart-pie"
                        mode="contained"
                        containerColor="rgba(0, 230, 118, 0.1)"
                        iconColor={Colors.dark.primary}
                        onPress={fetchAnalysisData}
                        loading={isAnalyzing}
                    />
                    <IconButton
                        icon="calendar-month"
                        mode="contained"
                        containerColor={Colors.dark.surface}
                        iconColor={Colors.dark.primary}
                        onPress={() => setIsCalendarOpen(true)}
                    />
                </View>
            </View>

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
                <View style={styles.center}>
                    <ActivityIndicator animating={true} color={Colors.dark.primary} size="large" />
                </View>
            ) : (
                <View style={[styles.content, isTablet ? styles.tabletContent : styles.mobileContent]}>
                    {renderPitchColumn('barnebau', 'BARNEBAU')}
                    {renderPitchColumn('noucamp', 'NOUCAMP')}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    header: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.dark.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.cardBorder,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoIcon: {
        margin: 0,
        marginRight: 8,
    },
    title: {
        color: Colors.dark.primary,
        fontWeight: '900',
        letterSpacing: 2,
    },
    subtitle: {
        color: Colors.dark.textSecondary,
        fontWeight: '600',
        fontSize: 12,
        marginTop: -4,
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
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 15,
        marginBottom: 10,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    pitchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    fieldTitle: {
        color: Colors.dark.textPrimary,
        fontWeight: 'bold',
    },
    pitchStatusBadge: {
        backgroundColor: 'rgba(0, 230, 118, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: Colors.dark.primary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    slotCard: {
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: Colors.dark.surface,
        overflow: 'hidden',
    },
    availableCard: {
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.1)',
    },
    bookedCard: {
        backgroundColor: 'rgba(255, 68, 68, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 68, 68, 0.3)',
        borderLeftWidth: 5,
        borderLeftColor: '#ff4444',
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
        color: Colors.dark.textPrimary,
        fontSize: 14,
        fontWeight: 'bold',
    },
    customerText: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
    },
    aboneBadge: {
        backgroundColor: Colors.dark.primary,
        color: '#000',
        fontSize: 9,
        fontWeight: 'bold',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: Colors.dark.surface,
        padding: 24,
        margin: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.dark.cardBorder,
    },
    modalTitle: {
        color: Colors.dark.primary,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        color: Colors.dark.textSecondary,
        marginBottom: 20,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginBottom: 12,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    divider: {
        marginVertical: 15,
        backgroundColor: Colors.dark.cardBorder,
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
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
    },
    statLabel: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
    },
    statValue: {
        color: Colors.dark.primary,
        fontSize: 24,
        fontWeight: 'bold',
    },
    sectionTitle: {
        color: '#fff',
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
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    aboneName: {
        color: '#fff',
    },
    aboneCount: {
        color: Colors.dark.primary,
        fontWeight: 'bold',
    }
});
