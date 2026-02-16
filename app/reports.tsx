import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, Divider, ActivityIndicator } from 'react-native-paper';
import { MainLayout } from '../components/Layout/MainLayout';
import { ThemedText } from '../components/ThemedText';
import { StatsCard } from '../components/StatsCard';
import { ChartWidget } from '../components/ChartWidget';
import { useTheme } from '../config/ThemeContext';
import { firebaseService, Appointment } from '../services/firebaseService';

export default function ReportsPage() {
    const { theme } = useTheme();
    const [stats, setStats] = useState({
        totalBookings: 0,
        subscriptionCount: 0,
        bookedSlots: 0,
        emptySlots: 40,
        revenue: '0'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const today = new Date();
            const day = String(today.getDate()).padStart(2, '0');
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const year = String(today.getFullYear()).slice(-2);
            const dateStr = `${day}.${month}.${year}`;

            const apps = await firebaseService.getAllAppointmentsInMonth(''); // Fetch all for stats
            const todayApps = apps.filter((a: Appointment) => a.dateString === dateStr);
            const subCount = todayApps.filter((a: Appointment) => a.isSubscription).length;

            setStats({
                totalBookings: apps.length,
                subscriptionCount: subCount,
                bookedSlots: todayApps.length,
                emptySlots: 40 - todayApps.length,
                revenue: (apps.length * 1500).toLocaleString('tr-TR')
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

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
            color: theme['color-text-secondary'] + '20',
            legendFontColor: theme['color-text-secondary'],
            legendFontSize: 12
        }
    ];

    if (loading) {
        return (
            <MainLayout>
                <View style={styles.center}>
                    <ActivityIndicator color={theme['color-primary']} size="large" />
                </View>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <View style={styles.header}>
                <ThemedText variant="h1">Raporlar \u0026 Analiz</ThemedText>
                <ThemedText variant="caption">İşletmenizin detaylı performans verileri</ThemedText>
            </View>

            <View style={styles.grid}>
                <StatsCard title="Toplam Rezervasyon" value={stats.totalBookings} icon="calendar-check" color={theme['color-primary']} />
                <StatsCard title="Toplam Gelir (₺)" value={stats.revenue} icon="cash-multiple" color={theme['color-success']} />
                <StatsCard title="Aktif Aboneler" value={stats.subscriptionCount} icon="account-group" color={theme['color-primary-hover']} />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.chartSection}>
                <ThemedText variant="h2" style={styles.sectionTitle}>Bugünkü Doluluk Oranı</ThemedText>
                <ChartWidget
                    title="Saha Kullanımı"
                    type="pie"
                    data={chartData}
                    height={300}
                />
            </View>

            <Card style={[styles.infoCard, { backgroundColor: theme['color-surface'], borderColor: theme['color-border'] }]}>
                <Card.Content>
                    <ThemedText variant="h3">Özet Bilgi</ThemedText>
                    <ThemedText variant="body" style={{ marginTop: 10 }}>
                        Bu ayki performansınız geçen aya göre %12 daha yüksek. En yoğun saatleriniz 20:00 - 23:00 arası.
                    </ThemedText>
                </Card.Content>
            </Card>
        </MainLayout>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
    },
    divider: {
        marginVertical: 24,
        opacity: 0.1,
    },
    chartSection: {
        marginBottom: 32,
        alignItems: 'center',
    },
    sectionTitle: {
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    infoCard: {
        borderRadius: 16,
        borderWidth: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
