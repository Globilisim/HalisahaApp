import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Text, IconButton, Divider, Drawer, Surface } from 'react-native-paper';
import { useTheme } from '../../config/ThemeContext';
import { ThemedText } from '../ThemedText';
import { useWindowDimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

interface SidebarProps {
    visible: boolean;
    onDismiss?: () => void;
    mode: 'desktop' | 'tablet' | 'mobile';
}

export const Sidebar = ({ visible, onDismiss, mode }: SidebarProps) => {
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(mode === 'tablet');

    const menuItems = [
        { icon: 'view-dashboard', label: 'Dashboard', path: '/' },
        { icon: 'calendar-clock', label: 'Randevular', path: '/appointments' },
        { icon: 'account-group', label: 'Müşteriler', path: '/customers' },
        { icon: 'chart-box', label: 'Raporlar', path: '/reports' },
        { icon: 'cog', label: 'Ayarlar', path: '/settings' },
    ];

    const isCollapsed = mode === 'tablet' && collapsed;

    const handlePress = (path: string) => {
        // router.push(path); // Gerçek navigasyon için
        if (mode === 'mobile' && onDismiss) {
            onDismiss();
        }
    };

    return (
        <Surface
            style={[
                styles.container,
                {
                    backgroundColor: theme['color-surface'],
                    borderRightColor: theme['color-border'],
                    width: isCollapsed ? 80 : 240,
                    display: visible ? 'flex' : 'none',
                }
            ]}
            elevation={1}
        >
            {/* Logo Area */}
            <View style={[styles.header, { height: 80 }]}>
                {isCollapsed ? (
                    <IconButton icon="soccer" iconColor={theme['color-primary']} size={32} />
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton icon="soccer" iconColor={theme['color-primary']} size={32} />
                        <ThemedText variant="h2" style={{ color: theme['color-primary'], marginLeft: 8 }}>SportCity</ThemedText>
                    </View>
                )}
            </View>

            <Divider style={{ backgroundColor: theme['color-border'] }} />

            {/* Menu Items */}
            <View style={styles.menuContainer}>
                {menuItems.map((item, index) => {
                    const isActive = pathname === item.path || (item.path === '/' && pathname === '/');
                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handlePress(item.path)}
                            style={[
                                styles.menuItem,
                                {
                                    backgroundColor: isActive ? theme['color-primary'] + '1A' : 'transparent',
                                    paddingVertical: 12,
                                    paddingHorizontal: isCollapsed ? 0 : 16,
                                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                                    borderLeftWidth: isActive ? 4 : 0,
                                    borderLeftColor: theme['color-primary']
                                }
                            ]}
                        >
                            <IconButton
                                icon={item.icon}
                                iconColor={isActive ? theme['color-primary'] : theme['color-text-secondary']}
                                size={24}
                                style={{ margin: 0 }}
                            />
                            {!isCollapsed && (
                                <ThemedText
                                    style={{
                                        color: isActive ? theme['color-primary'] : theme['color-text-secondary'],
                                        fontWeight: isActive ? 'bold' : 'normal',
                                        marginLeft: 12
                                    }}
                                >
                                    {item.label}
                                </ThemedText>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Footer / Collapse Toggle */}
            {mode !== 'mobile' && (
                <View style={styles.footer}>
                    <Divider style={{ backgroundColor: theme['color-border'] }} />
                    <TouchableOpacity
                        style={[styles.menuItem, { justifyContent: isCollapsed ? 'center' : 'flex-start', padding: 16 }]}
                        onPress={() => setCollapsed(!collapsed)}
                    >
                        <IconButton
                            icon={collapsed ? "chevron-right" : "chevron-left"}
                            iconColor={theme['color-text-secondary']}
                            size={24}
                            style={{ margin: 0 }}
                        />
                        {!isCollapsed && (
                            <ThemedText style={{ color: theme['color-text-secondary'], marginLeft: 12 }}>Daralt</ThemedText>
                        )}
                    </TouchableOpacity>
                </View>
            )}

        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        height: '100%',
        borderRightWidth: 1,
        zIndex: 100,
    },
    header: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        flex: 1,
        paddingTop: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        marginHorizontal: 8,
        borderRadius: 8,
    },
    footer: {
        marginBottom: 20
    }
});
