import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Portal, Text as PaperText } from 'react-native-paper';
import { useTheme } from '../config/ThemeContext';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme } = useTheme();
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<ToastType>('info');

    const showToast = useCallback((msg: string, t: ToastType = 'info') => {
        setMessage(msg);
        setType(t);
        setVisible(true);
    }, []);

    const onDismiss = () => setVisible(false);

    const getBackgroundColor = () => {
        switch (type) {
            case 'success': return theme['color-success'];
            case 'error': return theme['color-danger'];
            case 'warning': return theme['color-warning'];
            default: return theme['color-surface']; // or inverse surface
        }
    };

    const getTextColor = () => {
        // Assuming basic colors are dark enough for white text, or light for dark text. 
        // For now using white for success/error/warning and primary text for info?
        // Actually, let's use white for all status colors for contrast, or theme background if info is surface.
        if (type === 'info') return theme['color-text-primary'];
        return '#FFFFFF';
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Portal>
                <Snackbar
                    visible={visible}
                    onDismiss={onDismiss}
                    duration={3000}
                    style={{ backgroundColor: getBackgroundColor(), borderRadius: 8, margin: 16 }}
                    action={{
                        label: 'Kapat',
                        onPress: onDismiss,
                        textColor: getTextColor(),
                    }}
                >
                    <PaperText style={{ color: getTextColor() }}>{message}</PaperText>
                </Snackbar>
            </Portal>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
