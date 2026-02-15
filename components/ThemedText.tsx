import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle, StyleSheet } from 'react-native';
import { useTheme } from '../config/ThemeContext';

interface ThemedTextProps extends RNTextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
    color?: string;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
    style,
    variant = 'body',
    color,
    ...props
}) => {
    const { theme, typography } = useTheme();

    const getVariantStyle = (): TextStyle => {
        switch (variant) {
            case 'h1': return { fontSize: typography.scale.pageTitle.size, fontWeight: typography.scale.pageTitle.weight as any };
            case 'h2': return { fontSize: typography.scale.sectionTitle.size, fontWeight: typography.scale.sectionTitle.weight as any };
            case 'h3': return { fontSize: typography.scale.cardTitle.size, fontWeight: typography.scale.cardTitle.weight as any };
            case 'body': return { fontSize: typography.scale.body.size, fontWeight: typography.scale.body.weight as any };
            case 'caption': return { fontSize: typography.scale.small.size, fontWeight: typography.scale.small.weight as any };
            case 'label': return { fontSize: typography.scale.body.size, fontWeight: '500' };
            default: return { fontSize: typography.scale.body.size, fontWeight: typography.scale.body.weight as any };
        }
    };

    const textColor = color || (variant === 'caption' ? theme['color-text-secondary'] : theme['color-text-primary']);

    return (
        <RNText
            style={[
                { color: textColor, fontFamily: typography.fontFamily },
                getVariantStyle(),
                style
            ]}
            {...props}
        />
    );
};
