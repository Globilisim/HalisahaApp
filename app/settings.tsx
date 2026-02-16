import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Switch, Divider, Button, Card } from 'react-native-paper';
import { MainLayout } from '../components/Layout/MainLayout';
import { ThemedText } from '../components/ThemedText';
import { useTheme } from '../config/ThemeContext';
import { NotificationService, BuzzerSettings } from '../services/NotificationService';
import { useToast } from '../config/ToastContext';
import Slider from '@react-native-community/slider';

export default function SettingsPage() {
    const { theme, mode, setMode } = useTheme();
    const { showToast } = useToast();
    const [buzzerSettings, setBuzzerSettings] = useState<BuzzerSettings | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const settings = await NotificationService.getSettings();
        setBuzzerSettings(settings);
    };

    const updateBuzzer = async (newSettings: Partial<BuzzerSettings>) => {
        if (!buzzerSettings) return;
        const updated = { ...buzzerSettings, ...newSettings };
        setBuzzerSettings(updated);
        await NotificationService.saveSettings(updated);
        showToast('Ayarlar güncellendi.', 'success');
    };

    if (!buzzerSettings) return null;

    return (
        <MainLayout>
            <View style={styles.header}>
                <ThemedText variant="h1">Ayarlar</ThemedText>
                <ThemedText variant="caption">Uygulama ve bildirim tercihleri</ThemedText>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <Card style={[styles.card, { backgroundColor: theme['color-surface'], borderColor: theme['color-border'] }]}>
                    <List.Section titleStyle={{ color: theme['color-primary'], fontWeight: 'bold' }} title="Görünüm">
                        <List.Item
                            title="Karanlık Mod"
                            right={() => (
                                <Switch
                                    value={mode === 'dark'}
                                    onValueChange={(val) => setMode(val ? 'dark' : 'light')}
                                    color={theme['color-primary']}
                                />
                            )}
                        />
                    </List.Section>

                    <Divider />

                    <List.Section titleStyle={{ color: theme['color-primary'], fontWeight: 'bold' }} title="Zil Sistemi (Buzzer)">
                        <List.Item
                            title="Başlangıç Zili"
                            description="Maç başladığında çalar"
                            right={() => (
                                <Switch
                                    value={buzzerSettings.startEnabled}
                                    onValueChange={(val) => updateBuzzer({ startEnabled: val })}
                                    color={theme['color-primary']}
                                />
                            )}
                        />
                        <List.Item
                            title="Uyarı Zili"
                            description="Bitişe 5 dk kala çalar"
                            right={() => (
                                <Switch
                                    value={buzzerSettings.warningEnabled}
                                    onValueChange={(val) => updateBuzzer({ warningEnabled: val })}
                                    color={theme['color-primary']}
                                />
                            )}
                        />
                        <List.Item
                            title="Bitiş Zili"
                            description="Maç bittiğinde çalar"
                            right={() => (
                                <Switch
                                    value={buzzerSettings.endEnabled}
                                    onValueChange={(val) => updateBuzzer({ endEnabled: val })}
                                    color={theme['color-primary']}
                                />
                            )}
                        />

                        <View style={styles.volumeRow}>
                            <ThemedText style={{ fontSize: 14 }}>Ses Seviyesi</ThemedText>
                            <Slider
                                style={{ flex: 1, marginLeft: 15 }}
                                minimumValue={0}
                                maximumValue={1}
                                value={buzzerSettings.volume}
                                onSlidingComplete={(val) => updateBuzzer({ volume: val })}
                                minimumTrackTintColor={theme['color-primary']}
                                maximumTrackTintColor={theme['color-border']}
                                thumbTintColor={theme['color-primary']}
                            />
                        </View>
                    </List.Section>
                </Card>

                <Button
                    mode="outlined"
                    onPress={() => showToast('Test bildirimi gönderildi.', 'info')}
                    style={{ marginTop: 20, borderColor: theme['color-primary'] }}
                    textColor={theme['color-primary']}
                >
                    Test Bildirimi Gönder
                </Button>
            </ScrollView>
        </MainLayout>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 24,
    },
    container: {
        paddingBottom: 40,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    volumeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    }
});
