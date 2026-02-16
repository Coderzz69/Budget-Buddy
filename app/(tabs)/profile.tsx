import { useAuth, useUser } from '@clerk/clerk-expo';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator, Switch, Appearance } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { dataService, UserProfile } from '../../utils/dataService';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { GlassView } from '@/components/ui/GlassView';

export default function ProfileScreen() {
    const { signOut } = useAuth();
    const { user } = useUser();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await dataService.getUserProfile();
                setProfile(data);
            } catch (error) {
                console.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const toggleTheme = () => {
        const newScheme = isDark ? 'light' : 'dark';
        Appearance.setColorScheme(newScheme);
    };

    const menuItems = [
        { icon: 'gear', title: 'Settings' },
        { icon: 'creditcard', title: 'Payment Methods' },
        { icon: 'bell', title: 'Notifications' },
        { icon: 'lock', title: 'Security' },
        { icon: 'questionmark.circle', title: 'Help & Support' },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>

            <GlassView intensity={20} style={styles.profileCard}>
                <Image
                    source={{ uri: user?.imageUrl || 'https://via.placeholder.com/100' }}
                    style={styles.avatar}
                />
                <Text style={[styles.name, { color: theme.text }]}>{user?.fullName || 'User Name'}</Text>
                <Text style={[styles.email, { color: theme.icon }]}>{user?.primaryEmailAddress?.emailAddress || 'user@example.com'}</Text>

                {loading ? (
                    <ActivityIndicator size="small" color={theme.tint} style={{ marginTop: 10 }} />
                ) : (
                    <View style={[styles.currencyBadge, { backgroundColor: theme.tint + '20' }]}>
                        <Text style={[styles.currencyText, { color: theme.tint }]}>Currency: {profile?.currency || 'USD'}</Text>
                    </View>
                )}
            </GlassView>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
            <GlassView intensity={20} style={styles.menuContainer}>
                <View style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                        <View style={[styles.menuIconContainer, { backgroundColor: theme.text + '10' }]}>
                            <IconSymbol name="moon.fill" size={20} color={theme.text} />
                        </View>
                        <Text style={[styles.menuItemText, { color: theme.text }]}>Dark Mode</Text>
                    </View>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#767577', true: theme.tint }}
                        thumbColor={isDark ? '#fff' : '#f4f3f4'}
                    />
                </View>
            </GlassView>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>General</Text>
            <GlassView intensity={20} style={styles.menuContainer}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity key={index} style={[styles.menuItem, index === menuItems.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIconContainer, { backgroundColor: theme.text + '10' }]}>
                                <IconSymbol name={item.icon as any} size={20} color={theme.text} />
                            </View>
                            <Text style={[styles.menuItemText, { color: theme.text }]}>{item.title}</Text>
                        </View>
                        <IconSymbol name="chevron.right" size={16} color={theme.icon} />
                    </TouchableOpacity>
                ))}
            </GlassView>

            <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>Version 1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 100,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 24,
        letterSpacing: 0.5,
    },
    profileCard: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 24,
        marginBottom: 32,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    email: {
        fontSize: 16,
        marginBottom: 12,
    },
    currencyBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    currencyText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        marginLeft: 4,
    },
    menuContainer: {
        borderRadius: 20,
        padding: 8,
        marginBottom: 24,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150, 150, 150, 0.1)',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    signOutButton: {
        backgroundColor: '#fee2e2',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    signOutText: {
        color: '#dc2626',
        fontSize: 16,
        fontWeight: 'bold',
    },
    versionText: {
        textAlign: 'center',
        color: '#ccc',
        fontSize: 12,
    },
});
