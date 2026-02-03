import { useSignIn } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CustomAlert from '../components/CustomAlert';

export default function ForgotPasswordScreen() {
    const { signIn, setActive, isLoaded } = useSignIn();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [successfulCreation, setSuccessfulCreation] = useState(false);
    const [loading, setLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string }>({
        visible: false,
        title: '',
        message: '',
    });

    // Request the password reset code
    const onRequestReset = async () => {
        if (!isLoaded) return;
        if (!email) {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter your email address' });
            return;
        }

        setLoading(true);
        try {
            await signIn.create({
                strategy: 'reset_password_email_code',
                identifier: email,
            });
            setSuccessfulCreation(true);
            setAlertConfig({ visible: true, title: 'Check your email', message: 'We sent you a verification code.' });
        } catch (err: any) {
            console.error('Request reset error:', JSON.stringify(err, null, 2));
            setAlertConfig({ visible: true, title: 'Error', message: err.errors?.[0]?.message || 'Failed to send reset code' });
        } finally {
            setLoading(false);
        }
    };

    // Reset the password with code and new password
    const onReset = async () => {
        if (!isLoaded) return;
        if (!code || !password) {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter the code and your new password' });
            return;
        }

        setLoading(true);
        try {
            const result = await signIn.attemptFirstFactor({
                strategy: 'reset_password_email_code',
                code,
                password,
            });

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                setAlertConfig({ visible: true, title: 'Success', message: 'Your password has been reset.' });
                // @ts-ignore
                router.replace('/dashboard');
            } else {
                console.error(JSON.stringify(result, null, 2));
                setAlertConfig({ visible: true, title: 'Error', message: 'Failed to reset password. Please try again.' });
            }
        } catch (err: any) {
            console.error('Reset error:', JSON.stringify(err, null, 2));
            setAlertConfig({ visible: true, title: 'Error', message: err.errors?.[0]?.message || 'Failed to reset password' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    entering={FadeInDown.duration(600).springify()}
                    style={styles.formContainer}
                >
                    <Text style={styles.title}>Reset Password</Text>

                    {!successfulCreation ? (
                        <>
                            <Text style={styles.subtitle}>
                                Enter the email address associated with your account and we'll send you a link to reset your password.
                            </Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="serena88@gmail.com"
                                    placeholderTextColor="#666"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            <TouchableOpacity
                                onPress={onRequestReset}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#00E0FF', '#00FFA3']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.button}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#000" />
                                    ) : (
                                        <Text style={styles.buttonText}>Send Reset Code</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.subtitle}>
                                Check your email for the verification code.
                            </Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Verification Code</Text>
                                <View style={{ position: 'relative', height: 55 }}>
                                    <View style={styles.otpContainer}>
                                        {Array(6).fill(0).map((_, index) => (
                                            <View
                                                key={index}
                                                style={[
                                                    styles.otpBox,
                                                    code.length === index && styles.otpBoxActive
                                                ]}
                                            >
                                                <Text style={styles.otpText}>
                                                    {code[index] || ''}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                    <TextInput
                                        style={styles.hiddenInput}
                                        value={code}
                                        onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                                        keyboardType="numeric"
                                        maxLength={6}
                                        autoFocus
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>New Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="New Password"
                                        placeholderTextColor="#666"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-off" : "eye"}
                                            size={20}
                                            color="#666"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={onReset}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#00E0FF', '#00FFA3']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.button}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#000" />
                                    ) : (
                                        <Text style={styles.buttonText}>Set New Password</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color="#00E0FF" />
                        <Text style={styles.backButtonText}>Back to Sign In</Text>
                    </TouchableOpacity>

                </Animated.View>
            </ScrollView>
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
            />
        </KeyboardAvoidingView >
    );
}

const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    formContainer: {
        width: '100%',
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 14,
        color: '#ccc',
        marginBottom: 32,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#ccc',
        marginBottom: 8,
        fontSize: 14,
    },
    input: {
        backgroundColor: '#3A3A3C', // Lighter background
        borderRadius: 12,
        height: 52,
        paddingHorizontal: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#333',
    },
    passwordContainer: {
        backgroundColor: '#3A3A3C', // Lighter background
        borderRadius: 12,
        height: 52,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#333',
        flexDirection: 'row',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
        height: '100%',
        color: '#fff',
    },
    eyeIcon: {
        padding: 4,
    },
    button: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 32,
    },
    buttonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    backButtonText: {
        color: '#00E0FF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 8,
    },
    otpBox: {
        width: 45,
        height: 55,
        backgroundColor: '#3A3A3C',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    otpBoxActive: {
        borderColor: '#00E0FF',
        shadowColor: "#00E0FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    otpText: {
        fontSize: 24,
        color: '#fff',
        fontWeight: 'bold',
    },
    hiddenInput: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0,
    },
});
