import React, { useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { useTheme } from '../../config/ThemeContext';
import { Sidebar } from './Sidebar';
import { FAB, Portal, Modal } from 'react-native-paper';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
    const { width } = useWindowDimensions();
    const { theme } = useTheme();

    // Breakpoints from ux-upgrade-v2.json
    const isMobile = width < 768;
    const isTablet = width >= 768 && width <= 1024;
    const isDesktop = width > 1024;

    const [sidebarVisible, setSidebarVisible] = useState(!isMobile);

    useEffect(() => {
        setSidebarVisible(!isMobile);
    }, [isMobile]);

    return (
        <View style={[styles.container, { backgroundColor: theme['color-bg'] }]}>
            {/* Desktop & Tablet Sidebar (Permanent/Collapsible) */}
            {!isMobile && (
                <Sidebar
                    visible={true}
                    mode={isDesktop ? 'desktop' : 'tablet'}
                />
            )}

            {/* Content Area */}
            <View style={styles.content}>
                {/* Max Width Container for Dashboard */}
                <View style={[styles.mainContainer, { maxWidth: 1280 }]}>
                    {children}
                </View>
            </View>

            {/* Mobile Drawer (Modal) */}
            {isMobile && (
                <Portal>
                    <Modal
                        visible={sidebarVisible}
                        onDismiss={() => setSidebarVisible(false)}
                        contentContainerStyle={{ flex: 1, width: 280, marginTop: 0, marginLeft: 0, marginBottom: 0 }}
                        style={{ margin: 0, justifyContent: 'flex-start' }}
                    >
                        <Sidebar
                            visible={true}
                            mode="mobile"
                            onDismiss={() => setSidebarVisible(false)}
                        />
                    </Modal>
                </Portal>
            )}

            {/* Mobile Menu FAB */}
            {isMobile && !sidebarVisible && (
                <FAB
                    icon="menu"
                    style={[styles.fab, { backgroundColor: theme['color-primary'] }]}
                    color={theme['color-bg']}
                    onPress={() => setSidebarVisible(true)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    content: {
        flex: 1,
        height: '100%',
        alignItems: 'center', // Center content horizontally
    },
    mainContainer: {
        flex: 1,
        width: '100%',
        padding: 20,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        left: 0,
        bottom: 0,
        zIndex: 200,
    },
});
