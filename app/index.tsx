import React, { useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Card, IconButton, Portal, Modal, TextInput, Button, Checkbox, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { DatePickerModal } from 'react-native-paper-dates';
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

    useEffect(() => {
        fetchAppointments();
    }, [selectedDate]);

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
            await firebaseService.deleteAppointment(editingAppointment.id);
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
                <IconButton
                    icon="calendar-month"
                    mode="contained"
                    containerColor={Colors.dark.surface}
                    iconColor={Colors.dark.primary}
                    onPress={() => setIsCalendarOpen(true)}
                />
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
        letterSpacing: 2, // Daha geniş harf aralığı
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
        backgroundColor: 'rgba(255,255,255,0.05)', // Hafif daha belirgin cam etkisi
        borderRadius: 20, // Daha yuvarlak köşeler
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
        backgroundColor: 'rgba(255, 68, 68, 0.15)', // Daha belirgin kırmızı tonu
        borderWidth: 1,
        borderColor: 'rgba(255, 68, 68, 0.3)',
        borderLeftWidth: 5, // Sol tarafa kalın bir şerit
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
    }
});
