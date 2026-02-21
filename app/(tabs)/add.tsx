import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
    const [dynamicCategories, setDynamicCategories] = useState<{ id: string, name: string, icon: string, color?: string, type: 'expense' | 'income' | 'both' }[]>([]);

    const [editCategoryModalVisible, setEditCategoryModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ id: string, name: string, icon: string, color?: string } | null>(null);

    const ICON_OPTIONS = [
        'tag.fill', 'cart.fill', 'house.fill', 'car.fill', 'bolt.fill', 'heart.fill', 'book.fill', 'gamecontroller.fill',
        'wineglass.fill', 'bag.fill', 'dollarsign.circle.fill', 'chart.pie.fill', 'gift.fill', 'airplane',
        'desktopcomputer', 'briefcase.fill', 'graduationcap.fill', 'cross.case.fill', 'pawprint.fill', 'flame.fill'
    ];

    const COLOR_OPTIONS = [
        '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#10B981',
        '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
        '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#94A3B8'
    ];

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
                const [defaultAccount, existingTransactions, fetchedCategories] = await Promise.all([
                    dataService.ensureDefaultAccount(),
                    dataService.getTransactions(),
                    dataService.getCategories()
                ]);
                setAccount(defaultAccount);

                // Extract unique dynamic categories
                const staticNames = new Set(STATIC_CATEGORIES.map(c => c.name));
                const customCats = new Map<string, { id: string, name: string, icon: string, color?: string, type: 'expense' | 'income' | 'both' }>();

                // First load explicit custom categories from the backend
                fetchedCategories.forEach((c: any) => {
                    if (!staticNames.has(c.name)) {
                        // Attempt to deduce the type from existing transactions. If it's used for income, mark it as income. 
                        // If used for both, marking it as 'both' would require more complex filtering, so we check if any income tx exists.
                        const hasIncome = existingTransactions.some(t => t.category === c.name && t.type === 'income');
                        const hasExpense = existingTransactions.some(t => t.category === c.name && t.type === 'expense');

                        // Default to the current view type if it has no transactions yet so it shows up everywhere until used
                        const deducedType = hasIncome && !hasExpense ? 'income' : hasExpense && !hasIncome ? 'expense' : 'both';

                        customCats.set(c.name, {
                            id: c.id,
                            name: c.name,
                            icon: c.icon || 'tag',
                            color: c.color,
                            type: deducedType as any
                        });
                    }
                });

                // Then fall back to transaction scanning for any orphans
                existingTransactions.forEach(t => {
                    if (!staticNames.has(t.category)) {
                        const existingCat = customCats.get(t.category);
                        if (!existingCat) {
                            customCats.set(t.category, {
                                id: `custom-${t.category}`,
                                name: t.category,
                                icon: 'tag',
                                type: t.type as 'expense' | 'income' | 'both'
                            });
                        } else if ((existingCat.type as string) !== 'both' && existingCat.type !== t.type) {
                            // If we found conflicting transaction types later on for an orphan, mark it as both
                            customCats.set(t.category, { ...existingCat, type: 'both' as any });
                        }
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
    }, [id, isEditing]);

    useFocusEffect(
        useCallback(() => {
            // If the user navigates here via the Tab bar (no ID) while an old ID was present,
            // or we just want to ensure a clean slate for a new translation, reset the form.
            if (!id && !isEditing) {
                setAmount('');
                setCategory('');
                setDate(new Date().toISOString().split('T')[0]);
                setNote('');
                setType('expense');
            }
        }, [id, isEditing])
    );

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

    const handleSaveCategory = async () => {
        if (!editingCategory) return;
        setLoading(true);
        try {
            // Check if it's a real custom category or just a local placeholder
            if (!editingCategory.id.startsWith('custom-')) {
                await dataService.updateCategory(editingCategory.id, {
                    name: editingCategory.name,
                    icon: editingCategory.icon,
                    color: editingCategory.color || '#38BDF8',
                });

                // Update local state for immediate feedback
                setDynamicCategories(prev => prev.map(c =>
                    c.id === editingCategory.id ? { ...c, ...editingCategory } as any : c
                ));

                // If the user renamed the currently selected category, update the `category` text state so it stays selected
                if (category === editingCategory.id.replace('custom-', '') ||
                    dynamicCategories.find(c => c.id === editingCategory.id)?.name === category) {
                    setCategory(editingCategory.name);
                }
            } else {
                setAlertConfig({ visible: true, title: 'Notice', message: 'Cannot edit automatically generated placeholder categories. Please assign them a real transaction first.' });
            }
            setEditCategoryModalVisible(false);
        } catch (error) {
            console.error('Failed to save category:', error);
            setAlertConfig({ visible: true, title: 'Error', message: 'Failed to update category.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async () => {
        if (!editingCategory) return;

        // Use a generic logic flow instead of an actual Alert since Alert is strictly iOS/Android native
        // and we have a custom CustomAlert component. For simplicity, we directly invoke CustomAlert state.

        setAlertConfig({
            visible: true,
            title: 'Delete Category',
            message: 'Are you sure you want to delete this custom category? It will be removed permanently.',
            onPress: async () => {
                setAlertConfig({ ...alertConfig, visible: false }); // Hide alert
                setLoading(true);
                try {
                    if (!editingCategory.id.startsWith('custom-')) {
                        await dataService.deleteCategory(editingCategory.id);

                        // Update local State
                        setDynamicCategories(prev => prev.filter(c => c.id !== editingCategory.id));

                        // Clear selection if deleted
                        if (category === editingCategory.name) {
                            setCategory('');
                        }
                    } else {
                        setAlertConfig({ visible: true, title: 'Notice', message: 'Placeholder categories are deleted by deleting their underlying transactions.' });
                    }
                    setEditCategoryModalVisible(false);
                } catch (error) {
                    console.error('Failed to delete category:', error);
                    setAlertConfig({ visible: true, title: 'Error', message: 'Failed to delete category. Ensure it is not in use.' });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</Text>

            <View style={styles.typeContainer}>
                <TouchableOpacity
                    style={styles.typeButtonWrapper}
                    onPress={() => {
                        setType('expense');
                        setCategory('');
                    }}
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
                    onPress={() => {
                        setType('income');
                        setCategory('');
                    }}
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
                statusBarTranslucent={true}
                navigationBarTranslucent={true}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCategoryModalVisible(false)}>
                    <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#FFFFFF' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Category</Text>
                            <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={styles.closeButton}>
                                <IconSymbol name="xmark.circle.fill" size={24} color={theme.icon} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={[
                                ...STATIC_CATEGORIES.filter(c => c.name !== 'Others'),
                                ...dynamicCategories,
                                ...STATIC_CATEGORIES.filter(c => c.name === 'Others')
                            ].filter(c => c.type === type || c.type === 'both' || c.name === 'Others')} // Optional: filter by type
                            keyExtractor={(item) => item.id}
                            numColumns={2}
                            columnWrapperStyle={{ justifyContent: 'space-between', gap: 12, paddingHorizontal: 20 }}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            renderItem={({ item }: { item: { id: string, name: string, icon: string, type: string, color?: string } }) => {
                                const isSelected = category === item.name;

                                // Generate a unique vibrant color based on category name
                                const getCategoryColor = (name: string, isDark: boolean) => {
                                    const palette = isDark
                                        ? ['#38BDF8', '#34D399', '#F472B6', '#FCD34D', '#A78BFA', '#FB7185', '#2DD4BF']
                                        : ['#0284C7', '#059669', '#DB2777', '#D97706', '#7C3AED', '#E11D48', '#0D9488'];
                                    let hash = 0;
                                    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
                                    return palette[Math.abs(hash) % palette.length];
                                };
                                const activeColor = item.color || getCategoryColor(item.name, colorScheme === 'dark');

                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.categoryItem,
                                            {
                                                backgroundColor: isSelected
                                                    ? activeColor + '33' // 20% opacity hex
                                                    : (colorScheme === 'light' ? '#FFFFFF' : 'rgba(255,255,255,0.05)'),
                                                borderColor: isSelected
                                                    ? activeColor
                                                    : (colorScheme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'),
                                            }
                                        ]}
                                        onPress={() => {
                                            if (isSelected) {
                                                // Second tap (already selected): confirm and close
                                                setCategoryModalVisible(false);
                                            } else {
                                                // First tap: select it
                                                setCategory(item.name);
                                            }
                                        }}
                                        onLongPress={() => {
                                            // Only allow editing dynamic custom categories
                                            if (!STATIC_CATEGORIES.some(c => c.name === item.name)) {
                                                setEditingCategory({
                                                    id: item.id,
                                                    name: item.name,
                                                    icon: item.icon,
                                                    color: item.color || activeColor
                                                });
                                                setEditCategoryModalVisible(true);
                                            }
                                        }}
                                    >
                                        <IconSymbol
                                            name={item.icon as any}
                                            size={24}
                                            color={isSelected ? activeColor : theme.text}
                                            style={{ marginBottom: 8 }}
                                        />
                                        <Text style={[
                                            styles.categoryText,
                                            { color: theme.text, fontWeight: isSelected ? '700' : '400' }
                                        ]}>
                                            {item.name}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            }}
                        />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Edit Category Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={editCategoryModalVisible}
                onRequestClose={() => setEditCategoryModalVisible(false)}
                statusBarTranslucent={true}
                navigationBarTranslucent={true}
            >
                <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]} activeOpacity={1} onPress={() => setEditCategoryModalVisible(false)}>
                    <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#FFFFFF', paddingBottom: 30 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { margin: 0, color: theme.text }]}>Edit Category</Text>
                            <TouchableOpacity onPress={() => setEditCategoryModalVisible(false)} style={styles.closeButton}>
                                <IconSymbol name="xmark.circle.fill" size={24} color={theme.icon} />
                            </TouchableOpacity>
                        </View>

                        {editingCategory && (
                            <ScrollView style={{ paddingHorizontal: 20 }}>
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[styles.label, { color: theme.text, marginBottom: 8 }]}>Name</Text>
                                    <GlassView intensity={20} style={[styles.inputContainer, { marginBottom: 0 }]}>
                                        <TextInput
                                            style={[styles.input, { color: theme.text }]}
                                            value={editingCategory.name}
                                            onChangeText={(text) => setEditingCategory({ ...editingCategory, name: text })}
                                            placeholder="Category Name"
                                            placeholderTextColor={theme.icon}
                                        />
                                    </GlassView>
                                </View>

                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[styles.label, { color: theme.text, marginBottom: 8 }]}>Icon</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                        {ICON_OPTIONS.map(icon => (
                                            <TouchableOpacity
                                                key={icon}
                                                onPress={() => setEditingCategory({ ...editingCategory, icon })}
                                                style={{
                                                    padding: 12,
                                                    borderRadius: 12,
                                                    backgroundColor: editingCategory.icon === icon ? (editingCategory.color || theme.tint) + '33' : (colorScheme === 'dark' ? '#1E293B' : '#F1F5F9'),
                                                    borderWidth: 1,
                                                    borderColor: editingCategory.icon === icon ? (editingCategory.color || theme.tint) : 'transparent',
                                                }}
                                            >
                                                <IconSymbol
                                                    name={icon as any}
                                                    size={24}
                                                    color={editingCategory.icon === icon ? (editingCategory.color || theme.tint) : theme.icon}
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={{ marginBottom: 30 }}>
                                    <Text style={[styles.label, { color: theme.text, marginBottom: 8 }]}>Color (Select or Hex)</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                                        {COLOR_OPTIONS.map(color => (
                                            <TouchableOpacity
                                                key={color}
                                                onPress={() => setEditingCategory({ ...editingCategory, color })}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 20,
                                                    backgroundColor: color,
                                                    borderWidth: 3,
                                                    borderColor: editingCategory.color === color ? theme.text : 'transparent',
                                                    shadowColor: color,
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.3,
                                                    shadowRadius: 4,
                                                    elevation: 2,
                                                }}
                                            />
                                        ))}
                                    </View>
                                    <GlassView intensity={20} style={[styles.inputContainer, { marginBottom: 0 }]}>
                                        <Text style={[styles.currencyPrefix, { color: theme.icon, fontSize: 16 }]}>#</Text>
                                        <TextInput
                                            style={[styles.input, { color: theme.text }]}
                                            value={editingCategory.color?.replace('#', '')}
                                            onChangeText={(text) => setEditingCategory({ ...editingCategory, color: `#${text}` })}
                                            placeholder="HEX Color Code"
                                            placeholderTextColor={theme.icon}
                                            maxLength={6}
                                        />
                                    </GlassView>
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitButton, { backgroundColor: theme.tint, width: '100%', borderRadius: 16, marginBottom: 12 }]}
                                    onPress={handleSaveCategory}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Save Changes</Text>
                                    )}
                                </TouchableOpacity>

                                {!editingCategory.id.startsWith('custom-') && (
                                    <TouchableOpacity
                                        style={[styles.submitButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#EF4444', width: '100%', borderRadius: 16 }]}
                                        onPress={handleDeleteCategory}
                                        disabled={loading}
                                    >
                                        <Text style={[styles.submitButtonText, { color: '#EF4444' }]}>Delete Category</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
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
        paddingBottom: 120, // Added padding to prevent Other input from overlapping the save button under the tab bar
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
        borderRadius: 24,
        maxHeight: '80%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
        flexShrink: 1,
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
        padding: 20,
        paddingBottom: 16,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 0, // Removed elevation to fix Android dark smudge
    },
    categoryText: {
        fontSize: 14,
        textAlign: 'center',
    }
});
