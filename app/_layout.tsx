import { Stack } from 'expo-router';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../config/ThemeContext';
import { ToastProvider } from '../config/ToastContext';
import { View } from 'react-native';

const AppContent = () => {
    const { isDark, theme } = useTheme();

    // React Native Paper temasını bizim design system ile senkronize et
    const paperTheme = {
        ...(isDark ? MD3DarkTheme : MD3LightTheme),
        colors: {
            ...(isDark ? MD3DarkTheme.colors : MD3LightTheme.colors),
            primary: theme['color-primary'],
            background: theme['color-bg'],
            surface: theme['color-surface'],
            onSurface: theme['color-text-primary'],
            error: theme['color-danger'],
        },
    };

    return (
        <PaperProvider theme={paperTheme}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <View style={{ flex: 1, backgroundColor: theme['color-bg'] }}>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme['color-bg'] } }}>
                    <Stack.Screen name="index" />
                </Stack>
            </View>
        </PaperProvider>
    );
};

export default function RootLayout() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <AppContent />
            </ToastProvider>
        </ThemeProvider>
    );
}
