import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { AuthSDK } from '../lib/AuthSDK';

// Ensure the browser closes automatically on web after auth
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    useWarmUpBrowser();

    const router = useRouter();

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

        setLoading(true);
        try {
            console.log('Attempting to create session with:', email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            console.log('Session created:', data.session?.user.id);

            if (data.session) {
                if (rememberMe) {
                    await setItem('saved_email', email);
                } else {
                    await removeItem('saved_email');
                }

                console.log('Redirecting to dashboard...');
                router.replace('/(tabs)/dashboard');
            } else {
                setAlertConfig({
                    visible: true,
                    title: 'Login Error',
                    message: 'Login failed. No session returned.'
                });
            }
        } catch (err: any) {
            console.error('Login error:', err.message);
            const errorMessage = err.message || 'Login failed. Please check your credentials.';
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: errorMessage
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const session = await AuthSDK.signInWithGoogle();
            if (session) {
                // Navigate on successful session creation
                router.replace('/(tabs)/dashboard');
            }
        } catch (err: any) {
            console.error('[Error] Google Login error:', err.message);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: err.message || 'Google Sign In failed.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Keep deep link listener as fallback or for direct external app launches
    useEffect(() => {
        const handleDeepLink = async (event: Linking.EventType) => {
            if (!event.url) return;
            try {
                // Ignore standard expo dev client loads, only process auth links
                if (event.url.includes('access_token') || event.url.includes('code=')) {
                    await AuthSDK.createSessionFromUrl(event.url);
                }
            } catch (err) {
                console.log('Error catching deep link initial session:', err);
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);

        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url });
        });

        return () => subscription.remove();
    }, []);

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
                            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
                            <TouchableOpacity onPress={goToSignup}>
                                <Text style={styles.signupText}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </>
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
