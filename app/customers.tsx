import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, Platform, TouchableOpacity } from 'react-native';
import { Card, IconButton, Searchbar, FAB, Portal, Modal, TextInput, Button, Divider, ActivityIndicator, Checkbox } from 'react-native-paper';
import { MainLayout } from '../components/Layout/MainLayout';
import { ThemedText } from '../components/ThemedText';
import { useTheme } from '../config/ThemeContext';
import { firebaseService, Customer } from '../services/firebaseService';
import { useToast } from '../config/ToastContext';
import { useLocalSearchParams } from 'expo-router';

const customAlert = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed) onConfirm();
    } else {
        Alert.alert(title, message, [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: onConfirm }
        ]);
    }
};

export default function CustomersPage() {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    // CRUD state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isSubscriber, setIsSubscriber] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const { action } = useLocalSearchParams();

    useEffect(() => {
        fetchCustomers().then(() => {
            if (action === 'add') {
                handleOpenModal();
            }
        });
    }, [action]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const data = await firebaseService.getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error(error);
            showToast('Müşteriler yüklenirken hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (customer?: Customer) => {
        setEditingCustomer(customer);
        if (customer) {
            setCustomerName(customer.name);
            setCustomerPhone(customer.phone);
            setIsSubscriber(!!customer.isSubscriber);
            setDepositAmount(customer.depositAmount || '');
        } else {
            setCustomerName('');
            setCustomerPhone('');
            setIsSubscriber(false);
            setDepositAmount('');
        }
        setIsModalVisible(true);
    };

    const handleSaveCustomer = async () => {
        if (!customerName.trim() || !customerPhone.trim()) {
            showToast('Lütfen isim ve telefon giriniz.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const customerData = {
                name: customerName.trim(),
                phone: customerPhone.trim(),
                isSubscriber: isSubscriber,
                depositAmount: depositAmount,
                depositDate: depositAmount !== editingCustomer?.depositAmount ? new Date() : (editingCustomer?.depositDate || null)
            };

            // Mükerrer Kayıt Kontrolü (Case-insensitive name and exact phone)
            const duplicatePhone = customers.find(c =>
                c.phone.trim() === customerData.phone && c.id !== editingCustomer?.id
            );
            const duplicateName = customers.find(c =>
                c.name.trim().toLowerCase() === customerData.name.toLowerCase() && c.id !== editingCustomer?.id
            );

            if (duplicatePhone) {
                showToast(`Bu telefon numarası zaten ${duplicatePhone.name} adına kayıtlı.`, 'error');
                setIsSaving(false);
                return;
            }

            if (duplicateName) {
                showToast('Bu isimle zaten bir kayıt mevcut. Farklı bir isim veya numara kullanın.', 'error');
                setIsSaving(false);
                return;
            }

            if (editingCustomer?.id) {
                await firebaseService.updateCustomer(editingCustomer.id, customerData);
                showToast('Müşteri güncellendi.', 'success');
            } else {
                await firebaseService.addCustomer(customerData);
                showToast('Müşteri eklendi.', 'success');
            }

            setIsModalVisible(false);
            fetchCustomers();
        } catch (error) {
            console.error(error);
            showToast('İşlem sırasında bir hata oluştu.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCustomer = (customer: Customer) => {
        if (!customer.id) return;

        let msg = `${customer.name} isimli müşteriyi silmek istediğinize emin misiniz?`;

        if (customer.depositAmount && parseInt(customer.depositAmount) > 0) {
            msg = `⚠️ DİKKAT: Bu müşterinin ${customer.depositAmount} TL Güvence Kaporası bulunmaktadır. İade etmeyi unutmayınız!\n\n${msg}`;
        }

        customAlert(
            "Müşteriyi Sil",
            msg,
            async () => {
                try {
                    await firebaseService.deleteCustomer(customer.id!);
                    showToast('Müşteri silindi.', 'success');
                    fetchCustomers();
                } catch (error) {
                    console.error(error);
                    showToast('Silme işlemi başarısız oldu.', 'error');
                }
            }
        );
    };

    const handleWhatsApp = (phone: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const url = `https://wa.me/90${cleanPhone}`;
        Linking.openURL(url);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );

    return (
        <MainLayout>
            <View style={styles.header}>
                <ThemedText variant="h1">Müşteriler</ThemedText>
                <ThemedText variant="caption">Tüm aboneler ve müşteriler</ThemedText>
            </View>

            <Searchbar
                placeholder="İsim veya telefon ara..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={[styles.searchBar, { backgroundColor: theme['color-surface'] }]}
                iconColor={theme['color-primary']}
                inputStyle={{ color: theme['color-text-primary'] }}
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={theme['color-primary']} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    {filteredCustomers.length === 0 ? (
                        <View style={styles.center}>
                            <ThemedText variant="caption">Müşteri bulunamadı.</ThemedText>
                        </View>
                    ) : (
                        filteredCustomers.map((customer) => (
                            <Card key={customer.id} style={[styles.card, { backgroundColor: theme['color-surface'], borderColor: theme['color-border'] }]}>
                                <Card.Content style={styles.cardContent}>
                                    <View style={styles.info}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <ThemedText variant="h3">{customer.name}</ThemedText>
                                            {customer.isSubscriber && (
                                                <IconButton
                                                    icon="star"
                                                    size={16}
                                                    iconColor="#FFD700"
                                                    style={{ margin: 0, padding: 0, width: 20, height: 20 }}
                                                />
                                            )}
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <ThemedText variant="caption">{customer.phone}</ThemedText>
                                            {customer.depositAmount && parseInt(customer.depositAmount) > 0 && (
                                                <View style={{ backgroundColor: theme['color-primary'] + '20', paddingHorizontal: 6, borderRadius: 6 }}>
                                                    <ThemedText style={{ fontSize: 10, color: theme['color-primary'], fontWeight: 'bold' }}>
                                                        {customer.depositAmount} TL Güvence
                                                    </ThemedText>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <View style={styles.actions}>
                                        <IconButton
                                            icon="whatsapp"
                                            mode="contained"
                                            containerColor={theme['color-success'] + '20'}
                                            iconColor={theme['color-success']}
                                            onPress={() => handleWhatsApp(customer.phone)}
                                        />
                                        <IconButton
                                            icon="pencil"
                                            mode="contained"
                                            containerColor={theme['color-primary'] + '20'}
                                            iconColor={theme['color-primary']}
                                            onPress={() => handleOpenModal(customer)}
                                        />
                                        <IconButton
                                            icon="delete"
                                            mode="contained"
                                            containerColor={theme['color-danger'] + '20'}
                                            iconColor={theme['color-danger']}
                                            onPress={() => handleDeleteCustomer(customer)}
                                        />
                                    </View>
                                </Card.Content>
                            </Card>
                        ))
                    )}
                </ScrollView>
            )}

            <Portal>
                <Modal
                    visible={isModalVisible}
                    onDismiss={() => !isSaving && setIsModalVisible(false)}
                    contentContainerStyle={[styles.modal, { backgroundColor: theme['color-surface'] }]}
                >
                    <ThemedText variant="h2">{editingCustomer ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'}</ThemedText>
                    <Divider style={styles.divider} />

                    <TextInput
                        label="İsim Soyisim"
                        value={customerName}
                        onChangeText={setCustomerName}
                        mode="outlined"
                        style={styles.input}
                        activeOutlineColor={theme['color-primary']}
                    />

                    <TextInput
                        label="Telefon Numarası"
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        mode="outlined"
                        keyboardType="phone-pad"
                        style={styles.input}
                        activeOutlineColor={theme['color-primary']}
                    />

                    <TextInput
                        label="Güvence Kaporası"
                        value={depositAmount}
                        onChangeText={setDepositAmount}
                        mode="outlined"
                        keyboardType="numeric"
                        left={<TextInput.Affix text="₺" />}
                        style={styles.input}
                        activeOutlineColor={theme['color-primary']}
                    />

                    {editingCustomer?.depositDate && (
                        <ThemedText style={{ fontSize: 11, opacity: 0.6, marginBottom: 15, marginTop: -10 }}>
                            Kapora İşlem Tarihi: {
                                editingCustomer.depositDate.seconds
                                    ? new Date(editingCustomer.depositDate.seconds * 1000).toLocaleDateString('tr-TR')
                                    : new Date(editingCustomer.depositDate).toLocaleDateString('tr-TR')
                            }
                        </ThemedText>
                    )}

                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 }}
                        onPress={() => setIsSubscriber(!isSubscriber)}
                        activeOpacity={0.7}
                    >
                        <Checkbox
                            status={isSubscriber ? 'checked' : 'unchecked'}
                            onPress={() => setIsSubscriber(!isSubscriber)}
                            color={theme['color-primary']}
                        />
                        <ThemedText>Düzenli Abone</ThemedText>
                    </TouchableOpacity>

                    <View style={styles.modalActions}>
                        <Button
                            mode="text"
                            onPress={() => setIsModalVisible(false)}
                            disabled={isSaving}
                        >
                            Vazgeç
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleSaveCustomer}
                            loading={isSaving}
                            disabled={isSaving}
                            buttonColor={theme['color-primary']}
                        >
                            Kaydet
                        </Button>
                    </View>
                </Modal>
            </Portal>

            <FAB
                icon="account-plus"
                style={[styles.fab, { backgroundColor: theme['color-primary'] }]}
                color={theme['color-bg']}
                onPress={() => handleOpenModal()}
            />
        </MainLayout>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 20,
    },
    searchBar: {
        marginBottom: 20,
        borderRadius: 12,
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    list: {
        paddingBottom: 80,
    },
    card: {
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: 1,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    info: {
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    modal: {
        padding: 20,
        margin: 20,
        borderRadius: 16,
    },
    divider: {
        marginVertical: 15,
    },
    input: {
        marginBottom: 15,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 10,
    }
});
