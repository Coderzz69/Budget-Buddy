import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    onClose: () => void;
    buttons?: {
        text: string;
        onPress: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }[];
}

export default function CustomAlert({ visible, title, message, onClose, buttons }: CustomAlertProps) {
    const isError = title.toLowerCase().includes('error') || title.toLowerCase().includes('failed');

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <Animated.View
                    entering={ZoomIn.duration(200)}
                    style={styles.alertContainer}
                >
                    <View style={styles.header}>
                        <Ionicons
                            name={isError ? "warning-outline" : "information-circle-outline"}
                            size={24}
                            color="#00E0FF"
                        />
                        <Text style={styles.title}>{title}</Text>
                    </View>

                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {buttons && buttons.length > 0 ? (
                            buttons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        btn.onPress();
                                        onClose();
                                    }}
                                    activeOpacity={0.8}
                                    style={styles.buttonWrapper}
                                >
                                    <View style={[
                                        styles.button,
                                        btn.style === 'cancel' ? styles.cancelButton : styles.defaultButton
                                    ]}>
                                        <Text style={
                                            btn.style === 'cancel' ? styles.cancelButtonText : styles.defaultButtonText
                                        }>
                                            {btn.text}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <TouchableOpacity
                                onPress={onClose}
                                activeOpacity={0.8}
                                style={styles.buttonWrapper}
                            >
                                <LinearGradient
                                    colors={['#00E0FF', '#00FFA3']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.button, styles.gradientButton]}
                                >
                                    <Text style={styles.defaultButtonText}>OK</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    alertContainer: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#151515',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 15,
        color: '#A0A0A0',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        width: '100%',
    },
    buttonWrapper: {
        minWidth: 80,
    },
    button: {
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    gradientButton: {
        borderRadius: 8,
    },
    defaultButton: {
        backgroundColor: '#00E0FF',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#444',
    },
    defaultButtonText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 14,
    },
    cancelButtonText: {
        color: '#ccc',
        fontWeight: '600',
        fontSize: 14,
    },
});
