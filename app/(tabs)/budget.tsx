import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { dataService, Transaction } from '../../utils/dataService';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { GlassView } from '../../components/ui/GlassView';
import { DateNavigator } from '../../components/ui/DateNavigator';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function BudgetScreen() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [chartMode, setChartMode] = useState<'pie' | 'bar'>('pie');

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

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

    // Filter transactions by selected month/year
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentDate.getMonth() &&
                tDate.getFullYear() === currentDate.getFullYear() &&
                t.type === 'expense';
        });
    }, [transactions, currentDate]);

    const totalExpense = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);

    // Prepare Pie Chart Data
    const pieData = useMemo(() => {
        const categoryMap: Record<string, number> = {};
        filteredTransactions.forEach(t => {
            categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        });

        // Vibrant colors from theme.charts, rotating
        const colors = [
            theme.charts?.yellow,
            theme.charts?.blue,
            theme.charts?.pink,
            theme.charts?.green,
            theme.charts?.purple,
        ];

        return Object.keys(categoryMap).map((cat, index) => ({
            value: categoryMap[cat],
            color: colors[index % colors.length],
            text: cat, // For list matching
            amount: categoryMap[cat]
        })).sort((a, b) => b.value - a.value);
    }, [filteredTransactions, theme]);

    // Prepare Bar Chart Data (Daily)
    const barData = useMemo(() => {
        const dailyMap: Record<number, number> = {};
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

        // Initialize all days
        for (let i = 1; i <= daysInMonth; i++) {
            dailyMap[i] = 0;
        }

        filteredTransactions.forEach(t => {
            const day = new Date(t.date).getDate();
            dailyMap[day] += t.amount;
        });

        return Object.keys(dailyMap).map(day => ({
            value: dailyMap[parseInt(day)],
            label: day.toString(),
            frontColor: theme.charts?.blue,
            topLabelComponent: () => null, // clean look
        }));
    }, [filteredTransactions, theme, currentDate]);

    const changeMonth = (direction: -1 | 1) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);

        // Prevent going into the future
        if (newDate > new Date()) return;

        setCurrentDate(newDate);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
            }
        >
            <Text style={[styles.headerTitle, { color: theme.text }]}>Analytics</Text>

            <View style={styles.controlsContainer}>
                <SegmentedControl
                    selectedValue={chartMode}
                    onValueChange={(v) => setChartMode(v as 'pie' | 'bar')}
                    options={[
                        { value: 'pie', icon: 'chart.pie.fill' },
                        { value: 'bar', icon: 'chart.bar.fill' }
                    ]}
                />

                <DateNavigator
                    date={currentDate}
                    onPrev={() => changeMonth(-1)}
                    onNext={() => changeMonth(1)}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.tint} />
            ) : filteredTransactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <GlassView intensity={20} style={styles.emptyCard}>
                        <Text style={[styles.emptyText, { color: theme.icon }]}>No expenses for this month.</Text>
                    </GlassView>
                </View>
            ) : (
                <>
                    <View style={styles.chartContainer}>
                        {chartMode === 'pie' ? (
                            <View style={styles.donutWrapper}>
                                <PieChart
                                    data={pieData}
                                    donut
                                    showGradient
                                    sectionAutoFocus
                                    radius={120}
                                    innerRadius={80}
                                    innerCircleColor={theme.background === '#020617' ? '#020617' : '#F0F9FF'} // Match global background essentially
                                    centerLabelComponent={() => {
                                        return (
                                            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 14, color: theme.icon, fontWeight: '600' }}>Expense</Text>
                                                <Text style={{ fontSize: 24, color: theme.text, fontWeight: 'bold' }}>
                                                    ${totalExpense.toLocaleString()}
                                                </Text>
                                            </View>
                                        );
                                    }}
                                />
                            </View>
                        ) : (
                            <View style={styles.barWrapper}>
                                <BarChart
                                    data={barData.filter((_, i) => i % 3 === 0)} // Sample data to fit screen or use scrollable
                                    barWidth={18}
                                    spacing={14}
                                    roundedTop
                                    roundedBottom
                                    hideRules
                                    xAxisThickness={0}
                                    yAxisThickness={0}
                                    yAxisTextStyle={{ color: theme.icon }}
                                    noOfSections={3}
                                    maxValue={Math.max(...barData.map(b => b.value)) * 1.2}
                                    height={220}
                                    width={width - 80}
                                />
                            </View>
                        )}
                    </View>

                    {/* Category List - Pill Style */}
                    <View style={styles.listContainer}>
                        {pieData.map((item, index) => {
                            const percentage = ((item.value / totalExpense) * 100).toFixed(0);
                            return (
                                <Animated.View key={index} entering={FadeInDown.delay(index * 50).springify()}>
                                    <GlassView intensity={20} style={styles.categoryItem}>
                                        <View style={[styles.pillBadge, { backgroundColor: item.color }]}>
                                            <Text style={styles.pillText}>{item.text} {percentage}%</Text>
                                        </View>
                                        <Text style={[styles.amountText, { color: theme.text }]}>
                                            ${item.amount.toFixed(2)} USD
                                        </Text>
                                    </GlassView>
                                </Animated.View>
                            );
                        })}
                    </View>
                </>
            )}
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
        marginBottom: 20,
        letterSpacing: 0.5,
    },
    controlsContainer: {
        marginBottom: 20,
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        minHeight: 300,
    },
    donutWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    barWrapper: {
        marginTop: 20,
    },
    listContainer: {
        gap: 12,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
    },
    pillBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    pillText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    amountText: {
        fontSize: 16,
        fontWeight: '700',
    },
    emptyContainer: {
        marginTop: 40,
    },
    emptyCard: {
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
    },
});
