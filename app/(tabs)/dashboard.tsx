import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, Platform } from 'react-native';
import React, { useState, useCallback, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useRouter, useFocusEffect } from 'expo-router';
import { IconSymbol } from '../../components/ui/icon-symbol';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { dataService, Transaction } from '../../utils/dataService';
import { GlassView } from '../../components/ui/GlassView';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const [refreshing, setRefreshing] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState({
        balance: 0,
        income: 0,
        expense: 0
    });

    const loadData = async () => {
        try {
            const token = await getToken();
            const data = await dataService.getTransactions(token || undefined);
            setTransactions(data);

            // Calculate summary
            let income = 0;
            let expense = 0;
            data.forEach(t => {
                if (t.type === 'income') income += t.amount;
                else expense += t.amount;
            });

            setSummary({
                balance: income - expense,
                income,
                expense
            });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const handleDelete = async (id: string) => {
        // In a real app, use a custom alert component or React Native Alert
        // For now, we'll just delete (or specific confirmation if platform allows)
        // Since we are using CustomAlert in other places, we might need a local state for it here too
        // But for dashboard quick action, let's just delete for now or use window.confirm on web / Alert on native

        // Simplified for this step: direct delete then refresh
        try {
            await dataService.deleteTransaction(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete transaction:', error);
        }
    };

    const renderTransactionItem = ({ item, index }: { item: Transaction, index: number }) => {
        const isIncome = item.type === 'income';
        const color = isIncome ? theme.income : theme.expense;

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                style={[styles.transactionWrapper, {
                    backgroundColor: theme.background === '#020617' ? '#020617' : '#F8FAFC',
                    borderRadius: 24,
                    shadowColor: theme.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: theme.background === '#020617' ? 0.15 : 0.05,
                    shadowRadius: 4,
                    elevation: theme.background === '#020617' ? 5 : 1,
                }]}
            >
                <GlassView intensity={80} tint={theme.background === '#020617' ? "dark" : "light"} style={[styles.transactionItem, {
                    backgroundColor: theme.background === '#020617' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
                    borderWidth: 1,
                    borderColor: theme.background === '#020617' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)',
                    overflow: 'hidden'
                }]}>
                    <View style={[styles.iconContainer, { backgroundColor: isIncome ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)' }]}>
                        <IconSymbol
                            name={getIconName(item.category)}
                            size={28}
                            color={color}
                        />
                    </View>
                    <View style={styles.transactionDetails}>
                        <Text style={[styles.transactionCategory, { color: theme.text }]}>{item.category}</Text>
                        {item.description ? (
                            <Text style={[styles.transactionDescription, { color: theme.text, opacity: 0.7 }]} numberOfLines={1}>
                                {item.description}
                            </Text>
                        ) : (
                            <Text style={[styles.transactionDescription, { color: theme.text, opacity: 0.4, fontStyle: 'italic' }]}>
                                No description
                            </Text>
                        )}
                        <Text style={[styles.transactionDate, { color: theme.icon }]}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 10 }}>
                        <Text style={[
                            styles.transactionAmount,
                            { color: color }
                        ]}>
                            {isIncome ? '+' : '-'}${item.amount.toFixed(2)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={[styles.iconButton, { backgroundColor: theme.background === '#020617' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={() => router.push({ pathname: '/(tabs)/add', params: { id: item.id } })}
                            >
                                <IconSymbol name="pencil" size={14} color={theme.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.iconButton, { backgroundColor: theme.background === '#020617' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.1)' }]}
                                onPress={() => handleDelete(item.id)}
                            >
                                <IconSymbol name="trash" size={14} color={theme.expense} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </GlassView>
            </Animated.View>
        );
    };

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

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
            }
        >
            <SafeAreaView edges={['top']}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Hello,</Text>
                        <Text style={[styles.userName, { color: theme.text }]}>
                            {user?.firstName || 'User'} 👋
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileButton}
                        onPress={() => router.push('/profile')}
                    >
                        <GlassView intensity={30} style={styles.profileGlass}>
                            <IconSymbol name="person.circle" size={24} color={theme.text} />
                        </GlassView>
                    </TouchableOpacity>
                </View>

                {/* Balance Card - Unipay style Gradient */}
                <Animated.View entering={FadeInDown.springify()} style={styles.cardContainer}>
                    <LinearGradient
                        colors={['#4c669f', '#3b5998', '#192f6a']} // Classic Blue Gradient
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.balanceCard}
                    >
                        {/* Noise/Texture overlay could go here if we had an image */}
                        <View style={styles.cardContent}>
                            <View>
                                <Text style={styles.balanceLabel}>Wallet Balance</Text>
                                <Text style={styles.balanceAmount}>${summary.balance.toFixed(2)}</Text>
                            </View>
                            <View style={styles.statsRow}>
                                <GlassView intensity={30} style={styles.statItem}>
                                    <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                        <IconSymbol name="arrow.down" size={20} color="#4ade80" />
                                    </View>
                                    <View>
                                        <Text style={styles.statLabel}>Income</Text>
                                        <Text style={styles.statValue}>${summary.income.toFixed(2)}</Text>
                                    </View>
                                </GlassView>
                                <GlassView intensity={30} style={styles.statItem}>
                                    <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                        <IconSymbol name="arrow.up" size={20} color="#f87171" />
                                    </View>
                                    <View>
                                        <Text style={styles.statLabel}>Expense</Text>
                                        <Text style={styles.statValue}>${summary.expense.toFixed(2)}</Text>
                                    </View>
                                </GlassView>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Quick Actions - Glass Style */}
                <View style={styles.actionRow}>
                    <Animated.View style={[styles.actionButton, { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: theme.background === '#020617' ? 0.2 : 0.08, shadowRadius: 4, elevation: theme.background === '#020617' ? 4 : 1, backgroundColor: theme.background === '#020617' ? '#020617' : '#F8FAFC' }]}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/add')}>
                            <GlassView intensity={50} style={styles.actionGlass}>
                                <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={StyleSheet.absoluteFill} />
                                <IconSymbol name="plus" size={28} color={theme.text} />
                                <Text style={[styles.actionText, { color: theme.text }]}>Add</Text>
                            </GlassView>
                        </TouchableOpacity>
                    </Animated.View>
                    <Animated.View style={[styles.actionButton, { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: theme.background === '#020617' ? 0.2 : 0.08, shadowRadius: 4, elevation: theme.background === '#020617' ? 4 : 1, backgroundColor: theme.background === '#020617' ? '#020617' : '#F8FAFC' }]}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/budget')}>
                            <GlassView intensity={50} style={styles.actionGlass}>
                                <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={StyleSheet.absoluteFill} />
                                <IconSymbol name="chart.pie.fill" size={28} color={theme.text} />
                                <Text style={[styles.actionText, { color: theme.text }]}>Budget</Text>
                            </GlassView>
                        </TouchableOpacity>
                    </Animated.View>
                    <Animated.View style={[styles.actionButton, { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: theme.background === '#020617' ? 0.2 : 0.08, shadowRadius: 4, elevation: theme.background === '#020617' ? 4 : 1, backgroundColor: theme.background === '#020617' ? '#020617' : '#F8FAFC' }]}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(tabs)/transactions')}>
                            <GlassView intensity={50} style={styles.actionGlass}>
                                <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={StyleSheet.absoluteFill} />
                                <IconSymbol name="list.bullet.rectangle.fill" size={28} color={theme.text} />
                                <Text style={[styles.actionText, { color: theme.text }]}>History</Text>
                            </GlassView>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Recent Transactions */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
                    <TouchableOpacity onPress={() => router.push('/transactions')}>
                        <Text style={[styles.seeAllText, { color: theme.expense }]}>See All</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.transactionsList}>
                    {transactions.length === 0 ? (
                        <Text style={{ textAlign: 'center', marginTop: 20, color: theme.icon }}>No transactions yet.</Text>
                    ) : (
                        transactions.slice(0, 5).map((item, index) => (
                            <View key={item.id} style={{ marginBottom: index === Math.min(transactions.length, 5) - 1 ? 100 : 0 }}>
                                {renderTransactionItem({ item, index })}
                            </View>
                        ))
                    )}
                </View>
            </SafeAreaView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Background handled by _layout.tsx
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    greeting: {
        fontSize: 16,
        color: '#94A3B8',
        marginBottom: 4,
    },
    userName: {
        fontSize: 28,
        fontWeight: '700',
    },
    profileButton: {
        // No shadow, handled by glass
    },
    profileGlass: {
        padding: 8,
        borderRadius: 20,
        overflow: 'hidden',
    },
    cardContainer: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    balanceCard: {
        borderRadius: 24,
        padding: 24,
        // Gradient background
    },
    cardContent: {
        // zIndex: 1,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    balanceAmount: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '800',
        marginBottom: 32,
        letterSpacing: 0.5,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 16,
        // Glass effect
    },
    statIcon: {
        padding: 8,
        borderRadius: 10,
    },
    statLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        marginBottom: 2,
    },
    statValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 32,
    },
    actionButton: {
        flex: 1,
        borderRadius: 24,
    },
    actionGlass: {
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 24,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
    },
    actionText: {
        fontSize: 12,
        fontWeight: '500',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '500',
    },
    transactionsList: {
        paddingHorizontal: 20,
    },
    transactionWrapper: {
        marginBottom: 12,
        borderRadius: 16,
        // overflow: 'hidden', // caused shadow clipping often, but okay for glass
    },
    transactionItem: {
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
    transactionDetails: {
        flex: 1,
    },
    transactionCategory: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    transactionDescription: {
        fontSize: 13,
        marginBottom: 2,
        opacity: 0.6,
    },
    transactionDate: {
        fontSize: 12,
        opacity: 0.4,
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: '600',
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
