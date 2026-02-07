import { useAuth } from '@clerk/clerk-expo';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Button,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface User {
    id: string;
    email: string;
    // Add other fields as they appear in the API response
    // For now, I'll assume basic fields or map whatever comes back
    [key: string]: any;
}

export default function DashboardScreen() {
    const { signOut, getToken } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setError(null);
            const token = await getToken();

            const apiUrl = process.env.EXPO_PUBLIC_API_URL;
            if (!apiUrl) {
                throw new Error('EXPO_PUBLIC_API_URL is not defined in .env');
            }

            const response = await fetch(`${apiUrl}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.error || `HTTP error! status: ${response.status}`);
                } catch (e) {
                    // If not JSON (e.g. 404 HTML), throw status and text snippet
                    throw new Error(`HTTP error! status: ${response.status}. Response: ${text.substring(0, 100)}...`);
                }
            }

            const data = await response.json();
            // Assuming the API returns an array or an object with a data property that is an array
            const userList = Array.isArray(data) ? data : (data.data || []);
            setUsers(userList);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    const renderItem = ({ item }: { item: User }) => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>User ID: {item.id}</Text>
            <Text style={styles.cardText}>Email: {item.email || 'N/A'}</Text>
            {/* Render other fields dynamically if needed for debugging/display */}
            <Text style={styles.cardText}>{JSON.stringify(item, null, 2)}</Text>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Dashboard</Text>
                <Button title="Sign Out" onPress={() => signOut()} />
            </View>

            {error ? (
                <View style={styles.centered}>
                    <Text style={styles.errorText}>Error: {error}</Text>
                    <Button title="Retry" onPress={fetchData} />
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text>No users found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginTop: 40, // For status bar
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardText: {
        fontSize: 14,
        color: '#666',
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
        textAlign: 'center',
    },
});
