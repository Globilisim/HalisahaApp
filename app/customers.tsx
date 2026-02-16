import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, Platform } from 'react-native';
import { Card, IconButton, Searchbar, FAB, Portal, Modal, TextInput, Button, Divider, ActivityIndicator } from 'react-native-paper';
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
        } else {
            setCustomerName('');
            setCustomerPhone('');
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
            };

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

        customAlert(
            "Müşteriyi Sil",
            `${customer.name} isimli müşteriyi silmek istediğinize emin misiniz?`,
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
                                        <ThemedText variant="h3">{customer.name}</ThemedText>
                                        <ThemedText variant="caption">{customer.phone}</ThemedText>
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
