
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors } from '../constants/Colors';

interface CalendarStripProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

export const CalendarStrip: React.FC<CalendarStripProps> = ({ selectedDate, onSelectDate }) => {
    // Generate next 14 days
    const days = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    };

    const getDayName = (date: Date) => {
        return date.toLocaleDateString('tr-TR', { weekday: 'short' });
    };

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
            {days.map((date, index) => {
                const isSelected = isSameDay(date, selectedDate);
                return (
                    <TouchableOpacity
                        key={index}
                        style={[styles.dateCard, isSelected && styles.selectedCard]}
                        onPress={() => onSelectDate(date)}
                    >
                        <Text style={[styles.dayName, isSelected && styles.selectedText]}>{getDayName(date)}</Text>
                        <Text style={[styles.dayNum, isSelected && styles.selectedText]}>{date.getDate()}</Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 10,
        gap: 10,
    },
    dateCard: {
        width: 60,
        height: 70,
        borderRadius: 12,
        backgroundColor: Colors.dark.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectedCard: {
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        borderColor: Colors.dark.primary,
    },
    dayName: {
        fontSize: 12,
        color: Colors.dark.textSecondary,
        marginBottom: 4,
    },
    dayNum: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.dark.textPrimary,
    },
    selectedText: {
        color: Colors.dark.primary,
    },
});
