import { useSignIn } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
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
import { syncUser } from '../utils/api';

export default function LoginScreen() {
    const router = useRouter();
    const { signIn, setActive, isLoaded } = useSignIn();

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
                const savedEmail = await SecureStore.getItemAsync('saved_email');
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

        if (!isLoaded) {
            return;
        }

        setLoading(true);
        try {
            const completeSignIn = await signIn.create({
                identifier: email,
                password,
            });

            await setActive({ session: completeSignIn.createdSessionId });

            // Sync user to database
            try {
                const token = completeSignIn.createdSessionId;
                if (token) {
                    await syncUser(token, { email });
                    console.log('User synced to database');
                }
            } catch (syncError) {
                console.error('Failed to sync user to database:', syncError);
                // Don't block the user from proceeding even if sync fails
            }

            if (rememberMe) {
                await SecureStore.setItemAsync('saved_email', email);
            } else {
                await SecureStore.deleteItemAsync('saved_email');
            }

            // @ts-ignore
            router.replace('/dashboard');
        } catch (err: any) {
            console.error('Login error:', JSON.stringify(err, null, 2));
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: err.errors?.[0]?.message || 'Login failed. Please check your credentials.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!isLoaded) {
            return;
        }

        try {
            setLoading(true);

            // Start Google OAuth flow
            const result = await signIn.create({
                strategy: 'oauth_google',
                redirectUrl: 'exp://192.168.1.1:8081/oauth-callback',
            });

            // If OAuth completes successfully
            if (result.status === 'complete' && setActive) {
                await setActive({ session: result.createdSessionId });

                // Sync user to database
                try {
                    const token = result.createdSessionId;
                    if (token) {
                        // Backend will extract email from session token
                        await syncUser(token, {});
                        console.log('Google user synced to database');
                    }
                } catch (syncError) {
                    console.error('Failed to sync Google user to database:', syncError);
                }

                // @ts-ignore
                router.replace('/dashboard');
            }

        } catch (err: any) {
            console.error('Google OAuth error', err);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: err.errors?.[0]?.message || 'Google sign-in failed'
            });
        } finally {
            setLoading(false);
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
                            colors={['#00E0FF', '#00FFA3']}
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
        borderColor: '#00E0FF',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#00E0FF',
    },
    rememberMeText: {
        color: '#ccc',
        fontSize: 14,
    },
    forgotPasswordText: {
        color: '#00E0FF',
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
        color: '#00E0FF',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
