import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { GlassView } from './GlassView';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SegmentedControlProps {
    options: { label?: string; icon?: string; value: string }[];
    selectedValue: string;
    onValueChange: (value: string) => void;
}

export function SegmentedControl({ options, selectedValue, onValueChange }: SegmentedControlProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    return (
        <GlassView intensity={20} style={styles.container}>
            {options.map((option) => {
                const isSelected = selectedValue === option.value;
                return (
                    <TouchableOpacity
                        key={option.value}
                        style={[
                            styles.option,
                            isSelected && { backgroundColor: theme.cardHighlight } // Highlight active
                        ]}
                        onPress={() => onValueChange(option.value)}
                    >
                        {option.icon && (
                            <IconSymbol
                                name={option.icon as any}
                                size={20}
                                color={isSelected ? theme.tint : theme.icon}
                            />
                        )}
                        {option.label && (
                            <Text style={[
                                styles.label,
                                { color: isSelected ? theme.text : theme.icon, fontWeight: isSelected ? '600' : '400' }
                            ]}>
                                {option.label}
                            </Text>
                        )}
                    </TouchableOpacity>
                );
            })}
        </GlassView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
    },
    option: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8,
    },
    label: {
        fontSize: 14,
    },
});
