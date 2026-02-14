
import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors } from '../constants/Colors';

interface TimeSlot {
    id: string;
    time: string;
    status: 'available' | 'booked';
    customerName?: string;
    customerPhone?: string;
}

interface TimeSlotListProps {
    slots: TimeSlot[];
    onSlotPress: (slot: TimeSlot) => void;
}

export const TimeSlotList: React.FC<TimeSlotListProps> = ({ slots, onSlotPress }) => {
    const renderItem = ({ item }: { item: TimeSlot }) => {
        const isBooked = item.status === 'booked';
        return (
            <TouchableOpacity
                style={[styles.card, isBooked ? styles.bookedCard : styles.availableCard]}
                onPress={() => onSlotPress(item)}
            >
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{item.time}</Text>
                    {isBooked && <Text style={styles.customerText}>{item.customerName}</Text>}
                    {!isBooked && <Text style={styles.availableText}>Müsait</Text>}
                </View>
                <View style={styles.statusIndicator}>
                    <Text style={[styles.statusText, isBooked ? styles.bookedText : styles.availableStatusText]}>
                        {isBooked ? 'DOLU' : 'BOŞ'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <FlatList
            data={slots}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
        />
    );
};

const styles = StyleSheet.create({
    listContent: {
        padding: 10,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        marginBottom: 10,
        borderRadius: 12,
        borderLeftWidth: 4,
        backgroundColor: Colors.dark.surface,
    },
    availableCard: {
        borderLeftColor: Colors.dark.primary,
    },
    bookedCard: {
        borderLeftColor: Colors.dark.accentRed,
        opacity: 0.8,
    },
    timeContainer: {
        flex: 1,
    },
    timeText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.dark.textPrimary,
    },
    customerText: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
        marginTop: 4,
    },
    availableText: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
        marginTop: 4,
        fontStyle: 'italic',
    },
    statusIndicator: {
        marginLeft: 10,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    bookedText: {
        color: Colors.dark.accentRed,
    },
    availableStatusText: {
        color: Colors.dark.primary,
    },
});
