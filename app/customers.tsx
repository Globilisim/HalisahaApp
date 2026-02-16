import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Text, Card, IconButton, Searchbar, FAB, Portal, Modal, TextInput, Button, Divider } from 'react-native-paper';
import { MainLayout } from '../components/Layout/MainLayout';
import { ThemedText } from '../components/ThemedText';
import { useTheme } from '../config/ThemeContext';
import { firebaseService, Appointment } from '../services/firebaseService';
import { useToast } from '../config/ToastContext';

export default function CustomersPage() {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            // Get all appointments to extract unique customers
            // In a real app, we'd have a 'customers' collection
            const apps = await firebaseService.getAllAppointmentsInMonth(''); // This might need a more efficient way
            const customerMap = new Map();

            // This is a workaround since there's no direct customer collection yet
            // We'll simulate it from appointment history
            apps.forEach((app: Appointment) => {
                if (app.customerName) {
                    const key = app.customerName.toLowerCase().trim();
                    if (!customerMap.has(key)) {
                        customerMap.set(key, {
                            name: app.customerName,
                            phone: app.phoneNumber,
                            appointmentCount: 1,
                            lastSeen: app.dateString
                        });
                    } else {
                        const existing = customerMap.get(key);
                        existing.appointmentCount += 1;
                    }
                }
            });

            setCustomers(Array.from(customerMap.values()));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
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

            <ScrollView contentContainerStyle={styles.list}>
                {filteredCustomers.map((customer, index) => (
                    <Card key={index} style={[styles.card, { backgroundColor: theme['color-surface'], borderColor: theme['color-border'] }]}>
                        <Card.Content style={styles.cardContent}>
                            <View style={styles.info}>
                                <ThemedText variant="h3">{customer.name}</ThemedText>
                                <ThemedText variant="caption">{customer.phone || 'Telefon yok'}</ThemedText>
                                <View style={styles.stats}>
                                    <View style={[styles.badge, { backgroundColor: theme['color-primary'] + '20' }]}>
                                        <ThemedText style={{ color: theme['color-primary'], fontSize: 10 }}>{customer.appointmentCount} Randevu</ThemedText>
                                    </View>
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
                                    onPress={() => showToast('Müşteri düzenleme özelliği yakında.', 'info')}
                                />
                            </View>
                        </Card.Content>
                    </Card>
                ))}
            </ScrollView>

            <FAB
                icon="account-plus"
                style={[styles.fab, { backgroundColor: theme['color-primary'] }]}
                color={theme['color-bg']}
                onPress={() => showToast('Müşteri ekleme özelliği yakında.', 'info')}
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
    stats: {
        flexDirection: 'row',
        marginTop: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    actions: {
        flexDirection: 'row',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    }
});
