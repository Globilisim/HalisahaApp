
import { Stack } from 'expo-router';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';

const theme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        primary: Colors.dark.primary,
        background: Colors.dark.background,
        surface: Colors.dark.surface,
        onSurface: Colors.dark.textPrimary,
    },
};

export default function RootLayout() {
    return (
        <PaperProvider theme={theme}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.dark.background } }}>
                <Stack.Screen name="index" />
            </Stack>
        </PaperProvider>
    );
}
