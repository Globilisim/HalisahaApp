import React, { useRef, useEffect } from 'react';
import { Animated, Easing, TouchableOpacity, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useTheme } from '../config/ThemeContext';

export const ThemeToggle = () => {
    const { mode, setMode, theme } = useTheme();
    const spinValue = useRef(new Animated.Value(mode === 'dark' ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(spinValue, {
            toValue: mode === 'dark' ? 1 : 0,
            duration: 300,
            easing: Easing.linear,
            useNativeDriver: true,
        }).start();
    }, [mode]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    const toggleTheme = () => {
        setMode(mode === 'dark' ? 'light' : 'dark');
    };

    return (
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <IconButton
                    icon={mode === 'dark' ? 'weather-night' : 'weather-sunny'}
                    mode="contained"
                    containerColor={theme['color-surface']}
                    iconColor={theme['color-primary']}
                    size={20}
                    onPress={toggleTheme}
                />
            </Animated.View>
        </TouchableOpacity>
    );
};
