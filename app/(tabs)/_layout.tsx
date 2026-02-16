import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GlassView } from '@/components/ui/GlassView';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.tint,
                tabBarInactiveTintColor: theme.tabIconDefault,
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 25,
                    left: 20,
                    right: 20,
                    height: 72,
                    borderRadius: 40,
                    borderTopWidth: 0,
                    backgroundColor: 'transparent',
                    elevation: 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    paddingBottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                tabBarBackground: () => (
                    <GlassView
                        intensity={80}
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            borderRadius: 40,
                            overflow: 'hidden',
                            backgroundColor: theme.background === '#020617' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.75)',
                            borderWidth: 1,
                            borderColor: theme.background === '#020617' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)',
                        }}
                    />
                ),
                tabBarItemStyle: {
                    height: 70,
                    padding: 10,
                }
            }}>
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.activeIcon]}>
                            <IconSymbol size={24} name="house.fill" color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="transactions"
                options={{
                    title: 'Transactions',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.activeIcon]}>
                            <IconSymbol size={24} name="list.bullet.rectangle.fill" color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="add"
                options={{
                    title: 'Add',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, styles.addIcon]}>
                            <IconSymbol size={32} name="plus" color="#fff" />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="budget"
                options={{
                    title: 'Budget',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.activeIcon]}>
                            <IconSymbol size={24} name="chart.pie.fill" color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.activeIcon]}>
                            <IconSymbol size={24} name="person.crop.circle.fill" color={color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    activeIcon: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    addIcon: {
        backgroundColor: '#38BDF8', // Sky Blue
        width: 56,
        height: 56,
        borderRadius: 28,
        marginBottom: 20, // Push up
        shadowColor: '#38BDF8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
    }
});
