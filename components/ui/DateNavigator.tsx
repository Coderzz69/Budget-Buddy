import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { GlassView } from './GlassView';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface DateNavigatorProps {
    date: Date;
    onPrev: () => void;
    onNext: () => void;
}

export function DateNavigator({ date, onPrev, onNext }: DateNavigatorProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const formattedDate = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <GlassView intensity={20} style={styles.container}>
            <TouchableOpacity onPress={onPrev} style={styles.button}>
                <IconSymbol name="chevron.left" size={20} color={theme.text} />
            </TouchableOpacity>

            <View style={styles.dateContainer}>
                <Text style={[styles.dateText, { color: theme.text }]}>{formattedDate}</Text>
            </View>

            <TouchableOpacity onPress={onNext} style={styles.button}>
                <IconSymbol name="chevron.right" size={20} color={theme.text} />
            </TouchableOpacity>
        </GlassView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        marginVertical: 16,
    },
    button: {
        padding: 8,
    },
    dateContainer: {
        flex: 1,
        alignItems: 'center',
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
