import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../config/ThemeContext';

export const ThemedContainer: React.FC<ViewProps> = ({ style, ...props }) => {
    const { theme } = useTheme();

    return (
        <View
            style={[
                { backgroundColor: theme['color-bg'], flex: 1 },
                style
            ]}
            {...props}
        />
    );
};
