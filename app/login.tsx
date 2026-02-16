import { useAuth, useOAuth, useSignIn } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
// import * as SecureStore from 'expo-secure-store'; // Removing direct import
import React, { useEffect, useState } from 'react';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import CustomAlert from '../components/CustomAlert';
import { useWarmUpBrowser } from '../hooks/useWarmUpBrowser';
import { getItem, removeItem, setItem } from '../utils/storage';

export default function LoginScreen() {
    useWarmUpBrowser();

    const router = useRouter();
    const { signIn, setActive, isLoaded } = useSignIn();
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
    const { getToken } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [rememberMe, setRememberMe] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string }>({
        visible: false,
        title: '',
        message: '',
    });

    const [pendingTwoFactor, setPendingTwoFactor] = useState(false);
    const [code, setCode] = useState('');

    useEffect(() => {
        async function loadSavedEmail() {
            try {
                const savedEmail = await getItem('saved_email');
                if (savedEmail) {
                    setEmail(savedEmail);
                    setRememberMe(true);
                }
            } catch (error) {
                console.log('Error loading saved email:', error);
            }
        }
        loadSavedEmail();
    }, []);

    const handleEmailLogin = async () => {
        if (!email || !password) {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter both email and password' });
            return;
        }

        console.log('Starting login...');
        if (!isLoaded) {
            console.log('Clerk not loaded yet');
            return;
        }

        setLoading(true);
        try {
            console.log('Attempting to create session with:', email);
            const completeSignIn = await signIn.create({
                identifier: email,
                password,
            });
            console.log('Session created:', completeSignIn.status);

            if (completeSignIn.status === 'complete') {
                await setActive({ session: completeSignIn.createdSessionId });
                console.log('Session set active');

                if (rememberMe) {
                    await setItem('saved_email', email);
                } else {
                    await removeItem('saved_email');
                }

                console.log('Redirecting to dashboard...');
                router.replace('/dashboard');
            } else if (completeSignIn.status === 'needs_second_factor') {
                console.log('2FA required...');
                setPendingTwoFactor(true);
            } else {
                console.log('Sign in not complete:', completeSignIn.status);
                setAlertConfig({
                    visible: true,
                    title: 'Login Error',
                    message: 'Login failed. Status: ' + completeSignIn.status
                });
            }
        } catch (err: any) {
            console.error('Login error:', JSON.stringify(err, null, 2));
            const errorMessage = err.errors?.[0]?.message || 'Login failed. Please check your credentials.';
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: errorMessage.includes('CAPTCHA') ? errorMessage + '\n\n(If you are on Web, please disable AdBlockers)' : errorMessage
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTwoFactorVerify = async () => {
        if (!code || code.length !== 6) {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter the 6-digit code' });
            return;
        }

        if (!isLoaded) return;

        setLoading(true);
        try {
            console.log('Verifying 2FA code:', code);
            // Assuming phone_code or totp based on what's enabled. 
            // We can check signIn.supportedSecondFactors to be more robust, 
            // but for now let's try 'totp' as it's common for auth apps, 
            // or we could iterate.
            // Let's try to detect strategy.
            const strategy = signIn.supportedSecondFactors?.find(f => f.strategy === 'totp')?.strategy || 'phone_code';
            console.log('Using strategy:', strategy);

            const completeSignIn = await signIn.attemptSecondFactor({
                strategy: strategy as any,
                code,
            });

            if (completeSignIn.status === 'complete') {
                await setActive({ session: completeSignIn.createdSessionId });
                console.log('Session set active after 2FA');

                if (rememberMe) {
                    await setItem('saved_email', email);
                } else {
                    await removeItem('saved_email');
                }
                router.replace('/dashboard');
            } else {
                console.log('2FA not complete:', completeSignIn.status);
                setAlertConfig({
                    visible: true,
                    title: 'Error',
                    message: 'Verification failed. Status: ' + completeSignIn.status
                });
            }
        } catch (err: any) {
            console.error('2FA error:', JSON.stringify(err, null, 2));
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: err.errors?.[0]?.message || 'Verification failed'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { createdSessionId, setActive, signUp, signIn } = await startOAuthFlow({
                redirectUrl: Linking.createURL('/dashboard', { scheme: 'budgetbuddy' }),
            });

            if (createdSessionId && setActive) {
                console.log('Google Auth success. Session:', createdSessionId);
                await setActive({ session: createdSessionId });
            } else if (signUp && signUp.status === 'missing_requirements') {
                console.log('Google Auth missing requirements. Redirecting to complete-profile.');
                // Redirect to completion screen
                // We don't setActive here because it's not complete.
                router.push('/complete-profile');
            } else {
                // Use signIn or signUp for next steps such as MFA
                console.log('Google Auth status:', {
                    signInStatus: signIn?.status,
                    signUpStatus: signUp?.status
                });
            }
        } catch (err: any) {
            console.error('OAuth error', err);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: err.errors?.[0]?.message || 'Google sign-in failed'
            });
        }
    };

    const goToSignup = () => {
        router.push('/signup');
    };

    const goToForgotPassword = () => {
        router.push('/forgot-password');
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
                    {!pendingTwoFactor ? (
                        <>
                            <Text style={styles.title}>Sign In</Text>

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
                            </View>

                            <View style={styles.optionsRow}>
                                <TouchableOpacity
                                    style={styles.rememberMeContainer}
                                    onPress={() => setRememberMe(!rememberMe)}
                                >
                                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                        {rememberMe && <Ionicons name="checkmark" size={12} color="#000" />}
                                    </View>
                                    <Text style={styles.rememberMeText}>Remember me</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={goToForgotPassword}>
                                    <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={handleEmailLogin}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#F97316', '#FB923C']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.button}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#000" />
                                    ) : (
                                        <Text style={styles.buttonText}>Sign In</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.dividerContainer}>
                                <View style={styles.line} />
                                <Text style={styles.dividerText}>Or Sign In with</Text>
                                <View style={styles.line} />
                            </View>

                            <View style={styles.socialRow}>
                                <TouchableOpacity
                                    style={[styles.socialButton, { backgroundColor: '#FFFFFF', borderWidth: 0 }]}
                                    onPress={handleGoogleLogin}
                                    activeOpacity={0.9}
                                    disabled={loading}
                                >
                                    <Ionicons name="logo-google" size={20} color="#000" />
                                    <Text style={[styles.socialButtonText, { color: '#000', marginLeft: 8 }]}>Sign In with Google</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Don't have an account? </Text>
                                <TouchableOpacity onPress={goToSignup}>
                                    <Text style={styles.signupText}>Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <View style={styles.verificationContainer}>
                            <Text style={styles.title}>2FA Verification</Text>
                            <Text style={styles.subtitle}>
                                Enter the 6 digit code from your authenticator app or received via SMS.
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

                            <TouchableOpacity
                                onPress={handleTwoFactorVerify}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#F97316', '#FB923C']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.button}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#000" />
                                    ) : (
                                        <Text style={styles.buttonText}>Verify</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setPendingTwoFactor(false)} style={styles.footer}>
                                <Text style={styles.footerText}>Back to Login</Text>
                            </TouchableOpacity>
                        </View>
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
        marginBottom: 32,
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
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#F97316',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#F97316',
    },
    rememberMeText: {
        color: '#ccc',
        fontSize: 14,
    },
    forgotPasswordText: {
        color: '#F97316',
        fontSize: 14,
        fontWeight: '600',
    },
    button: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    buttonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#333',
    },
    dividerText: {
        color: '#ccc',
        marginHorizontal: 16,
        fontSize: 14,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 48,
    },
    socialButton: {
        flex: 1,
        height: 52,
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    socialButtonText: {
        color: '#fff',
        fontWeight: '600',
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
        color: '#F97316',
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
        borderColor: '#F97316',
        shadowColor: "#F97316",
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
