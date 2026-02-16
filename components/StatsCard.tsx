import React, { useState } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Animated, Platform } from 'react-native';
import { Surface, Text, IconButton } from 'react-native-paper';
import { useTheme } from '../config/ThemeContext';
import { ThemedText } from './ThemedText';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: string;
    trend?: {
        value: number;
        direction: 'up' | 'down';
        label: string;
    };
    color?: string;
    onPress?: () => void;
}

export const StatsCard = ({ title, value, icon, trend, color, onPress }: StatsCardProps) => {
    const { theme } = useTheme();
    const [scale] = useState(new Animated.Value(1));
    const [elevation, setElevation] = useState<0 | 1 | 2 | 3 | 4 | 5>(2);

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.98,
            useNativeDriver: true,
        }).start();
        setElevation(4);
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
        setElevation(2);
    };

    // Web-like hover effect simulation (simplified for RN)
    // For true web hover, we'd use 'onHoverIn' on Pressable tailored for web.

    return (
        <TouchableWithoutFeedback
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
                <Surface
                    style={[
                        styles.container,
                        {
                            backgroundColor: theme['color-surface'],
                            borderLeftColor: color || theme['color-primary'],
                        }
                    ]}
                    elevation={elevation}
                >
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: (color || theme['color-primary']) + '1A' }]}>
                            <IconButton icon={icon} iconColor={color || theme['color-primary']} size={24} style={{ margin: 0 }} />
                        </View>
                        {trend && (
                            <View style={[styles.trendContainer, { backgroundColor: trend.direction === 'up' ? theme['color-success'] + '1A' : theme['color-danger'] + '1A' }]}>
                                <IconButton
                                    icon={trend.direction === 'up' ? 'arrow-up' : 'arrow-down'}
                                    iconColor={trend.direction === 'up' ? theme['color-success'] : theme['color-danger']}
                                    size={16}
                                    style={{ margin: 0, width: 16, height: 16 }}
                                />
                                <Text style={[styles.trendText, { color: trend.direction === 'up' ? theme['color-success'] : theme['color-danger'] }]}>
                                    {trend.value}%
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.content}>
                        <ThemedText variant="caption" style={{ color: theme['color-text-secondary'], marginBottom: 4 }}>{title}</ThemedText>
                        <ThemedText variant="h1" style={{ color: theme['color-text-primary'] }}>{value}</ThemedText>
                        {trend && (
                            <ThemedText variant="caption" style={{ color: theme['color-text-secondary'], marginTop: 4 }}>{trend.label}</ThemedText>
                        )}
                    </View>
                </Surface>
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        height: '100%',
        justifyContent: 'space-between'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconContainer: {
        padding: 8,
        borderRadius: 8,
    },
    content: {
        justifyContent: 'flex-end',
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
    },
    trendText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 2
    }
});
