import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../config/ThemeContext';

interface SkeletonLoaderProps {
    width?: DimensionValue;
    height?: DimensionValue;
    style?: ViewStyle;
    borderRadius?: number;
}

export const SkeletonLoader = ({ width = '100%', height = 20, style, borderRadius = 4 }: SkeletonLoaderProps) => {
    const { theme } = useTheme();
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();

        return () => loop.stop();
    }, []);

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: theme['color-text-secondary'], // using text secondary as base grey
                    opacity,
                },
                style,
            ]}
        />
    );
};

const styles = StyleSheet.create({
    skeleton: {
        // Base styles
    },
});
