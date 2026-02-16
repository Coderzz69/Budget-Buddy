import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { dataService, Account } from '../../utils/dataService';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import CustomAlert from '../../components/CustomAlert';
import { GlassView } from '../../components/ui/GlassView';
import { LinearGradient } from 'expo-linear-gradient';

export default function AddTransactionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { id } = params;
    const isEditing = !!id;

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [customCategory, setCustomCategory] = useState('');

    const [loading, setLoading] = useState(false);
    const [account, setAccount] = useState<Account | null>(null);

    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; onPress?: () => void }>({
        visible: false,
        title: '',
        message: '',
    });

    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [dynamicCategories, setDynamicCategories] = useState<{ id: string, name: string, icon: string, type: 'expense' | 'income' }[]>([]);

    const STATIC_CATEGORIES = [
        { id: '1', name: 'Salary', icon: 'dollarsign.circle.fill', type: 'income' },
        { id: '2', name: 'Income', icon: 'dollarsign.circle.fill', type: 'income' },
        { id: '3', name: 'Food', icon: 'fork.knife', type: 'expense' },
        { id: '4', name: 'Shopping', icon: 'bag.fill', type: 'expense' },
        { id: '5', name: 'Transport', icon: 'car.fill', type: 'expense' },
        { id: '6', name: 'Entertainment', icon: 'gamecontroller.fill', type: 'expense' },
        { id: '7', name: 'Utilities', icon: 'bolt.fill', type: 'expense' },
        { id: '8', name: 'Health', icon: 'heart.fill', type: 'expense' },
        { id: '9', name: 'Education', icon: 'book.fill', type: 'expense' },
        { id: '10', name: 'Investment', icon: 'chart.pie.fill', type: 'income' },
        { id: '11', name: 'Rent', icon: 'house.fill', type: 'expense' },
        { id: '12', name: 'Groceries', icon: 'cart.fill', type: 'expense' },
        { id: '13', name: 'Dining Out', icon: 'wineglass.fill', type: 'expense' },
        { id: '14', name: 'Others', icon: 'circle.grid.2x2.fill', type: 'expense' },
    ];

    useEffect(() => {
        const init = async () => {
            try {
                // Load account and transactions for dynamic categories
                const [defaultAccount, existingTransactions] = await Promise.all([
                    dataService.ensureDefaultAccount(),
                    dataService.getTransactions()
                ]);
                setAccount(defaultAccount);

                // Extract unique dynamic categories
                const staticNames = new Set(STATIC_CATEGORIES.map(c => c.name));
                const customCats = new Map<string, { id: string, name: string, icon: string, type: 'expense' | 'income' }>();

                existingTransactions.forEach(t => {
                    if (!staticNames.has(t.category)) {
                        customCats.set(t.category, {
                            id: `custom-${t.category}`,
                            name: t.category,
                            icon: 'tag', // Generic icon for custom categories
                            type: t.type as 'expense' | 'income' // Assume type matches transaction type
                        });
                    }
                });
                setDynamicCategories(Array.from(customCats.values()));

                // If editing, load transaction details
                if (isEditing) {
                    setLoading(true);
                    const transaction = existingTransactions.find(t => t.id === id);

                    if (transaction) {
                        setAmount(transaction.amount.toString());
                        setCategory(transaction.category);
                        setDate(new Date(transaction.date).toISOString().split('T')[0]);
                        setNote(transaction.description || '');
                        setType(transaction.type);
                    } else {
                        setAlertConfig({ visible: true, title: 'Error', message: 'Transaction not found.' });
                    }
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to initialize:', error);
                setAlertConfig({ visible: true, title: 'Error', message: 'Failed to load information.' });
                setLoading(false);
            }
        };
        init();
    }, [id]);

    const handleSubmit = async () => {
        if (!amount || !category) {
            setAlertConfig({ visible: true, title: 'Missing Fields', message: 'Please fill in at least the amount and category.' });
            return;
        }

        if (!account) {
            setAlertConfig({ visible: true, title: 'Error', message: 'No account selected.' });
            return;
        }

        setLoading(true);
        try {
            const transactionData = {
                amount: parseFloat(amount),
                category: category === 'Others' ? customCategory : category,
                date: new Date(date).toISOString(),
                description: note,
                type,
                accountId: account.id
            };

            if (isEditing) {
                await dataService.updateTransaction(id as string, transactionData);
            } else {
                await dataService.addTransaction(transactionData);
            }

            setAlertConfig({
                visible: true,
                title: 'Success',
                message: `Transaction ${isEditing ? 'updated' : 'added'} successfully!`,
                onPress: () => {
                    // Reset form if adding, or just navigate back
                    setAmount('');
                    setCategory('');
                    setNote('');
                    setAlertConfig({ ...alertConfig, visible: false }); // Close alert first
                    router.back();
                    // Use router.back() to return to previous screen (could be dashboard or transactions list)
                    // If we want to force dashboard: router.push('/(tabs)/dashboard');
                }
            });
        } catch (error) {
            console.error('Failed to save transaction:', error);
            setAlertConfig({ visible: true, title: 'Error', message: 'Failed to save transaction. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</Text>

            <View style={styles.typeContainer}>
                <TouchableOpacity
                    style={styles.typeButtonWrapper}
                    onPress={() => setType('expense')}
                >
                    <GlassView
                        intensity={type === 'expense' ? 40 : 10}
                        style={[
                            styles.typeButton,
                            type === 'expense' && { borderColor: theme.expense, borderWidth: 1 }
                        ]}
                    >
                        <Text style={[
                            styles.typeText,
                            { color: type === 'expense' ? theme.expense : theme.text }
                        ]}>Expense</Text>
                    </GlassView>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.typeButtonWrapper}
                    onPress={() => setType('income')}
                >
                    <GlassView
                        intensity={type === 'income' ? 40 : 10}
                        style={[
                            styles.typeButton,
                            type === 'income' && { borderColor: theme.income, borderWidth: 1 }
                        ]}
                    >
                        <Text style={[
                            styles.typeText,
                            { color: type === 'income' ? theme.income : theme.text }
                        ]}>Income</Text>
                    </GlassView>
                </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Amount</Text>
                <GlassView intensity={20} style={styles.inputContainer}>
                    <Text style={[styles.currencyPrefix, { color: theme.text }]}>$</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="0.00"
                        placeholderTextColor={theme.icon}
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                    />
                </GlassView>
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                <TouchableOpacity onPress={() => setCategoryModalVisible(true)}>
                    <GlassView intensity={20} style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            placeholder="Select Category"
                            placeholderTextColor={theme.icon}
                            value={category}
                            editable={false}
                            pointerEvents="none"
                        />
                        <IconSymbol name="chevron.down" size={20} color={theme.icon} style={{ marginRight: 8 }} />
                    </GlassView>
                </TouchableOpacity>
                {category === 'Others' && (
                    <GlassView intensity={20} style={[styles.inputContainer, { marginTop: 8 }]}>
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            placeholder="Enter custom category"
                            placeholderTextColor={theme.icon}
                            value={customCategory}
                            onChangeText={setCustomCategory}
                        />
                    </GlassView>
                )}
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Date</Text>
                <GlassView intensity={20} style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.icon}
                        value={date}
                        onChangeText={setDate}
                    />
                </GlassView>
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Note (Optional)</Text>
                <GlassView intensity={20} style={styles.inputContainer}>
                    <TextInput
                        placeholder="Add a note..."
                        placeholderTextColor={theme.icon}
                        multiline
                        value={note}
                        onChangeText={setNote}
                        style={[styles.input, { color: theme.text, height: 100, textAlignVertical: 'top' }]}
                    />
                </GlassView>
            </View>

            <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={type === 'expense' ? ['#F97316', '#EA580C'] : ['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.submitButton, loading && styles.disabledButton]}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>{isEditing ? 'Update Transaction' : 'Save Transaction'}</Text>
                    )}
                </LinearGradient>
            </TouchableOpacity>

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => {
                    if (alertConfig.onPress) {
                        alertConfig.onPress();
                    } else {
                        setAlertConfig({ ...alertConfig, visible: false });
                    }
                }}
            />


            <Modal
                animationType="slide"
                transparent={true}
                visible={categoryModalVisible}
                onRequestClose={() => setCategoryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <GlassView intensity={95} style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Category</Text>
                            <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={styles.closeButton}>
                                <IconSymbol name="xmark.circle.fill" size={24} color={theme.icon} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={[...STATIC_CATEGORIES, ...dynamicCategories].filter(c => c.type === type || c.name === 'Others')} // Optional: filter by type
                            keyExtractor={(item) => item.id}
                            numColumns={2}
                            columnWrapperStyle={{ justifyContent: 'space-between', gap: 12 }}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.categoryItem,
                                        {
                                            backgroundColor: category === item.name
                                                ? (type === 'income' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)')
                                                : 'rgba(255,255,255,0.05)',
                                            borderColor: category === item.name
                                                ? (type === 'income' ? theme.income : theme.expense)
                                                : 'rgba(255,255,255,0.1)',
                                        }
                                    ]}
                                    onPress={() => {
                                        setCategory(item.name);
                                        setCategoryModalVisible(false);
                                    }}
                                >
                                    <IconSymbol
                                        name={item.icon as any}
                                        size={24}
                                        color={category === item.name
                                            ? (type === 'income' ? theme.income : theme.expense)
                                            : theme.text}
                                        style={{ marginBottom: 8 }}
                                    />
                                    <Text style={[
                                        styles.categoryText,
                                        { color: theme.text, fontWeight: category === item.name ? '700' : '400' }
                                    ]}>
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </GlassView>
                </View>
            </Modal>
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
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 32,
        letterSpacing: 0.5,
    },
    typeContainer: {
        flexDirection: 'row',
        marginBottom: 32,
        gap: 16,
    },
    typeButtonWrapper: {
        flex: 1,
    },
    typeButton: {
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 16,
    },
    typeText: {
        fontWeight: '600',
        fontSize: 16,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        opacity: 0.9,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 4, // TextInput inside has explicit padding/height usually, but flex handles it
    },
    currencyPrefix: {
        fontSize: 20,
        marginRight: 8,
        fontWeight: '500',
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 14,
    },
    submitButton: {
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    disabledButton: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalCloseButton: {
        marginTop: 16,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    closeButton: {
        padding: 4,
    },
    categoryItem: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginBottom: 12,
    },
    categoryText: {
        fontSize: 14,
        textAlign: 'center',
    }
});
