import React from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { Surface, Text } from 'react-native-paper';
// import { PieChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '../config/ThemeContext';
import { ThemedText } from './ThemedText';

interface ChartWidgetProps {
    title: string;
    type: 'pie' | 'bar';
    data: any;
    loading?: boolean;
    height?: number;
}

export const ChartWidget = ({ title, type, data, loading, height = 240 }: ChartWidgetProps) => {
    const { theme } = useTheme();
    // const screenWidth = Dimensions.get('window').width;

    // // Responsive width calculation suitable for grid (simplified)
    // const chartWidth = screenWidth > 768 ? (screenWidth - 300) / 2 : screenWidth - 40;

    // const chartConfig = {
    //     backgroundGradientFrom: theme['color-surface'],
    //     backgroundGradientTo: theme['color-surface'],
    //     color: (opacity = 1) => theme['color-primary'],
    //     labelColor: (opacity = 1) => theme['color-text-secondary'],
    //     strokeWidth: 2,
    //     barPercentage: 0.5,
    //     useShadowColorFromDataset: false,
    //     decimalPlaces: 0,
    // };

    return (
        <Surface style={[styles.container, { backgroundColor: theme['color-surface'] }]} elevation={2}>
            <View style={styles.header}>
                <ThemedText variant="h3" style={{ color: theme['color-text-primary'] }}>{title}</ThemedText>
            </View>

            {loading ? (
                <View style={[styles.content, { height }]}>
                    <ActivityIndicator size="large" color={theme['color-primary']} />
                </View>
            ) : (
                <View style={styles.content}>
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <ThemedText style={{ color: theme['color-text-secondary'], textAlign: 'center' }}>
                            Grafik gösterimi bakım modundadır.
                        </ThemedText>
                    </View>
                </View>
            )}
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        overflow: 'hidden'
    },
    header: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 8
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center'
    }
});
