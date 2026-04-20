import React from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useOAuth } from '@clerk/expo';
import { Link, router, type Href } from 'expo-router';
import { Mail, Lock, ArrowRight, ShieldCheck, Fingerprint } from 'lucide-react-native';
import { NeonInput } from '../../components/NeonInput';
import { NeonButton } from '../../components/NeonButton';
import { GlassCard } from '../../components/GlassCard';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  useWarmUpBrowser();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await signIn.password({
      emailAddress,
      password,
    });
    
    if (error) {
      console.error(JSON.stringify(error, null, 2));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl('/');
          router.push(url as Href);
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const onGoogleSignIn = React.useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsGoogleLoading(true);
      const { createdSessionId, setActive } = await startOAuthFlow();

      if (createdSessionId) {
        setActive!({ session: createdSessionId });
        router.replace('/');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('OAuth error', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [router, startOAuthFlow]);

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl('/');
          router.push(url as Href);
        },
      });
    }
  };

  if (signIn.status === 'needs_client_trust') {
    return (
      <SafeAreaView className="flex-1 bg-slate-950">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-12">
          <Text className="text-white text-3xl font-bold mb-2">Verify Account</Text>
          <Text className="text-slate-400 mb-8">Enter the code sent to your email.</Text>
          
          <NeonInput
            label="Verification Code"
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="numeric"
            containerClassName="mb-10"
          />

          <NeonButton 
            title="Verify Code" 
            onPress={handleVerify} 
            isLoading={fetchStatus === 'fetching'}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }} 
          className="px-6 py-10"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Header */}
          <View className="items-center mt-10 mb-12">
            <View className="w-20 h-20 bg-primary/20 rounded-3xl items-center justify-center border border-primary/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <ShieldCheck size={40} color="#10B981" />
            </View>
            <Text className="text-white text-3xl font-bold mt-6 tracking-tight">Welcome Back</Text>
            <Text className="text-slate-400 mt-2 text-center">Your financial vault is waiting.</Text>
          </View>

          {/* Form */}
          <GlassCard className="p-8 gap-6 border-slate-900/50 bg-slate-900/10">
            <NeonInput
              label="Email Address"
              value={emailAddress}
              onChangeText={setEmailAddress}
              placeholder="name@example.com"
              keyboardType="email-address"
              leftIcon={<Mail size={18} color="#475569" />}
              error={errors.fields.identifier?.message}
            />

            <NeonInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              leftIcon={<Lock size={18} color="#475569" />}
              error={errors.fields.password?.message}
            />

            <Pressable className="self-end -mt-2">
              <Text className="text-secondary font-medium">Forgot Password?</Text>
            </Pressable>

            <NeonButton
              title="Enter your vault"
              onPress={handleSubmit}
              className="mt-4 h-16"
              isLoading={fetchStatus === 'fetching'}
              disabled={!emailAddress || !password}
              rightIcon={<ArrowRight size={20} color="#000" />}
            />

            <View className="flex-row items-center gap-4 my-2">
              <View className="flex-1 h-[1px] bg-slate-800" />
              <Text className="text-slate-500 font-medium text-xs">OR CONTINUE WITH</Text>
              <View className="flex-1 h-[1px] bg-slate-800" />
            </View>

            <Pressable 
              onPress={onGoogleSignIn}
              disabled={isGoogleLoading}
              className="active:opacity-70"
            >
              <GlassCard className="flex-row items-center justify-center gap-3 py-4 border-slate-800/50">
                <Image 
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} 
                  className="w-5 h-5"
                />
                <Text className="text-white font-semibold">Google</Text>
              </GlassCard>
            </Pressable>
          </GlassCard>

          {/* Footer */}
          <View className="flex-row justify-center mt-12 mb-10">
            <Text className="text-slate-400">Don't have an account? </Text>
            <Link href="/sign-up" asChild>
              <Pressable>
                <Text className="text-primary font-bold">Create Vault</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
