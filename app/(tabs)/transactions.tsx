import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect, useRouter } from 'expo-router';
import { dataService, Transaction } from '../../utils/dataService';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { GlassView } from '../../components/ui/GlassView';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function TransactionsScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    const loadData = async () => {
        try {
            const data = await dataService.getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const filteredTransactions = transactions.filter(t =>
        (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Helper to map categories to icons
    const getIconName = (category: string): any => {
        const map: Record<string, string> = {
            'Salary': 'dollarsign.circle.fill',
            'Income': 'dollarsign.circle.fill',
            'Food': 'cart.fill',
            'Shopping': 'cart.fill',
            'Transport': 'car.fill',
            'Entertainment': 'gamecontroller.fill',
            'Utilities': 'bolt.fill',
            'Health': 'heart.fill',
            'Education': 'book.fill',
            'Investment': 'chart.pie.fill',
        };
        return map[category] || 'creditcard';
    };

    const handleDelete = async (id: string) => {
        try {
            await dataService.deleteTransaction(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete transaction:', error);
        }
    };

    const renderItem = ({ item, index }: { item: Transaction, index: number }) => {
        const isIncome = item.type === 'income';
        const color = isIncome ? theme.income : theme.expense;

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 50).springify()}
                style={[styles.itemWrapper, {
                    backgroundColor: colorScheme === 'dark' ? '#020617' : '#F8FAFC',
                    borderRadius: 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: colorScheme === 'light' ? 0.02 : 0.08,
                    shadowRadius: 4,
                    elevation: colorScheme === 'light' ? 1 : 3,
                }]}
            >
                <GlassView intensity={60} tint="default" style={[styles.transactionCard, {
                    backgroundColor: colorScheme === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
                    overflow: 'hidden'
                }]}>
                    <View style={[styles.iconContainer, { backgroundColor: isIncome ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)' }]}>
                        <IconSymbol
                            name={getIconName(item.category)}
                            size={24}
                            color={color}
                        />
                    </View>
                    <View style={styles.detailsContainer}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.transactionTitle, { color: theme.text }]}>{item.category}</Text>
                            <GlassView intensity={10} style={[styles.typeBadge, { backgroundColor: isIncome ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)' }]}>
                                <Text style={[styles.typeText, { color: isIncome ? theme.income : theme.expense }]}>
                                    {isIncome ? 'Income' : 'Expense'}
                                </Text>
                            </GlassView>
                        </View>
                        {item.description ? <Text style={[styles.transactionDescription, { color: theme.text }]} numberOfLines={1}>{item.description}</Text> : null}
                        <Text style={[styles.transactionDate, { color: theme.icon }]}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                        <Text style={[styles.amount, { color: color }]}>
                            {isIncome ? '+' : '-'}${item.amount.toFixed(2)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => {
                                // Need to cast params to any to avoid type error if routes not fully typed
                                const params: any = { id: item.id };
                                router.push({ pathname: '/(tabs)/add', params });
                            }}>
                                <IconSymbol name="pencil" size={16} color={theme.text} style={{ opacity: 0.6 }} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                <IconSymbol name="trash" size={16} color={theme.expense} style={{ opacity: 0.6 }} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </GlassView>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Transactions</Text>
            </View>

            <View style={styles.searchWrapper}>
                <GlassView intensity={30} style={styles.searchContainer}>
                    <IconSymbol name="magnifyingglass" size={20} color={theme.icon} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search transactions..."
                        placeholderTextColor={theme.icon}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </GlassView>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.tint} />
                </View>
            ) : (
                <FlatList
                    data={filteredTransactions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
                    }
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <Text style={[styles.emptyText, { color: theme.icon }]}>No transactions found.</Text>
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
        // Background handled by _layout
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    searchWrapper: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 16,
        flexGrow: 1,
    },
    itemWrapper: {
        marginBottom: 12,
    },
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 24,
    },
    iconContainer: {
        padding: 10,
        borderRadius: 16,
        marginRight: 12,
    },
    detailsContainer: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginLeft: 8,
        overflow: 'hidden',
    },
    typeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    transactionDescription: {
        fontSize: 13,
        marginBottom: 2,
        opacity: 0.7,
    },
    transactionDate: {
        fontSize: 12,
        opacity: 0.5,
    },
    amount: {
        fontSize: 16,
        fontWeight: '700',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyText: {
        fontSize: 16,
    },
});
