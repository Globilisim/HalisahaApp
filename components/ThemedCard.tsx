import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../config/ThemeContext';

interface ThemedCardProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
}

export const ThemedCard: React.FC<ThemedCardProps> = ({ children, style }) => {
    const { theme, spacing, radius } = useTheme();

    return (
        <View style={[
            styles.card,
            {
                backgroundColor: theme['color-card'],
                borderColor: theme['color-border'],
                padding: spacing.cardPadding,
                borderRadius: radius.medium
            },
            style
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
});
