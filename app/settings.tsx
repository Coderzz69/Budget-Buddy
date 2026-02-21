import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { dataService, UserProfile } from '../utils/dataService';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { GlassView } from '../components/ui/GlassView';
import { IconSymbol } from '../components/ui/icon-symbol';

export default function SettingsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('');

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profile = await dataService.getUserProfile();
                if (profile) {
                    setName(profile.name || '');
                    setCurrency(profile.currency || 'USD');
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
                Alert.alert('Error', 'Failed to load profile data.');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Name cannot be empty.');
            return;
        }

        if (!currency.trim() || currency.length > 5) {
            Alert.alert('Validation Error', 'Please enter a valid currency code (e.g., USD, EUR).');
            return;
        }

        setSaving(true);
        try {
            await dataService.updateUserProfile({
                name: name.trim(),
                currency: currency.trim().toUpperCase(),
            });
            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Failed to update profile:', error);
            Alert.alert('Error', 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Custom Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <IconSymbol name="chevron.left" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
                    <View style={{ width: 40 }} /> {/* Spacer to balance header */}
                </View>

                <GlassView intensity={20} style={styles.formCard}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.icon }]}>Full Name</Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: theme.text + '0A',
                                    color: theme.text,
                                    borderColor: theme.text + '20'
                                }
                            ]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                            placeholderTextColor={theme.icon}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.icon }]}>Preferred Currency</Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: theme.text + '0A',
                                    color: theme.text,
                                    borderColor: theme.text + '20'
                                }
                            ]}
                            value={currency}
                            onChangeText={setCurrency}
                            placeholder="e.g., USD, EUR, GBP"
                            placeholderTextColor={theme.icon}
                            autoCapitalize="characters"
                            maxLength={5}
                        />
                        <Text style={[styles.helperText, { color: theme.icon }]}>
                            This currency will be used for all new transactions and visualizations.
                        </Text>
                    </View>
                </GlassView>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.text + '10' }]}>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.tint, opacity: saving ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(150, 150, 150, 0.1)',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    formCard: {
        padding: 24,
        borderRadius: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        height: 52,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    helperText: {
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
    footer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        borderTopWidth: 1,
    },
    saveButton: {
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
