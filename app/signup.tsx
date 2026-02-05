import { useSignUp } from '@clerk/clerk-expo';
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
    View
} from 'react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import CustomAlert from '../components/CustomAlert';
import { syncUser } from '../utils/api';

export default function SignupScreen() {
    const router = useRouter();
    const { signUp, setActive, isLoaded } = useSignUp();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [pendingVerification, setPendingVerification] = useState(false);
    const [loading, setLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string }>({
        visible: false,
        title: '',
        message: '',
    });

    const onSignUpPress = async () => {
        if (!email || !password || !firstName || !lastName) {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter all fields' });
            return;
        }

        if (!isLoaded) {
            return;
        }

        setLoading(true);

        try {
            await signUp.create({
                emailAddress: email,
                password,
                firstName,
                lastName,
            });

            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

            setPendingVerification(true);
            setAlertConfig({
                visible: true,
                title: 'Check Your Email',
                message: 'We sent you a verification code. Please check your email.',
            });
        } catch (err: any) {
            console.error('Signup error:', JSON.stringify(err, null, 2));
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: err.errors?.[0]?.message || 'Signup failed'
            });
        } finally {
            setLoading(false);
        }
    };

    const onPressVerify = async () => {
        if (!code || code.length !== 6) {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter the 6-digit code' });
            return;
        }

        if (!isLoaded) {
            return;
        }

        setLoading(true);

        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            });

            await setActive({ session: completeSignUp.createdSessionId });

            // Sync user to database
            try {
                // Get session token from Clerk
                const token = await completeSignUp.createdSessionId;
                if (token) {
                    await syncUser(token, { email, firstName, lastName });
                    console.log('User synced to database');
                }
            } catch (syncError) {
                console.error('Failed to sync user to database:', syncError);
                // Don't block the user from proceeding even if sync fails
            }

            setAlertConfig({
                visible: true,
                title: 'Success',
                message: 'Email verified successfully!',
            });

            setTimeout(() => {
                // @ts-ignore
                router.replace('/dashboard');
            }, 1500);
        } catch (err: any) {
            console.error('Verification error:', JSON.stringify(err, null, 2));
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: err.errors?.[0]?.message || 'Verification failed'
            });
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
                    {!pendingVerification ? (
                        <>
                            <Text style={styles.title}>Sign Up</Text>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>First Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="John"
                                        placeholderTextColor="#666"
                                        value={firstName}
                                        onChangeText={setFirstName}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Last Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Doe"
                                        placeholderTextColor="#666"
                                        value={lastName}
                                        onChangeText={setLastName}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="john@example.com"
                                    placeholderTextColor="#666"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="*************"
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
                                <Text style={styles.hint}>
                                    Must be at least 8 characters
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={onSignUpPress}
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
                                        <Text style={styles.buttonText}>Sign Up</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Already have an account? </Text>
                                <TouchableOpacity onPress={() => router.back()}>
                                    <Text style={styles.signupText}>Log In</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <Animated.View entering={SlideInRight} style={styles.verificationContainer}>
                            <Text style={styles.title}>Verification</Text>
                            <Text style={styles.subtitle}>
                                Enter the 6 digit code that you received on your email.
                            </Text>

                            <View style={styles.codeContainer}>
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

                            <View style={styles.resendContainer}>
                                <Text style={styles.footerText}>Didn't receive the code? </Text>
                                <TouchableOpacity onPress={onSignUpPress}>
                                    <Text style={styles.resendText}>Resend Code</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={onPressVerify}
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
                                        <Text style={styles.buttonText}>Continue</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </Animated.View>
            </ScrollView>
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
            />
        </KeyboardAvoidingView>
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
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#ccc',
        marginBottom: 48,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    label: {
        color: '#ccc',
        marginBottom: 8,
        fontSize: 14,
    },
    input: {
        backgroundColor: '#3A3A3C',
        borderRadius: 12,
        height: 52,
        paddingHorizontal: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#333',
    },
    passwordContainer: {
        backgroundColor: '#3A3A3C',
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
    hint: {
        color: '#888',
        fontSize: 12,
        marginTop: 4,
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
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        color: '#ccc',
        fontSize: 14,
    },
    signupText: {
        color: '#00E0FF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    verificationContainer: {
        width: '100%',
    },
    codeContainer: {
        marginBottom: 32,
        alignItems: 'center',
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
    resendContainer: {
        flexDirection: 'row',
        marginBottom: 32,
    },
    resendText: {
        color: '#00E0FF',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
