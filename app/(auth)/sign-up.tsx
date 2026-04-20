import React from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignUp, useOAuth } from '@clerk/expo';
import { Link, router, type Href } from 'expo-router';
import { Mail, Lock, User, ShieldPlus, ArrowRight } from 'lucide-react-native';
import { NeonInput } from '../../components/NeonInput';
import { NeonButton } from '../../components/NeonButton';
import { GlassCard } from '../../components/GlassCard';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';
import { Image } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function SignUp() {
  useWarmUpBrowser();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const [fullName, setFullName] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await signUp.password({
      emailAddress,
      password,
    });
    
    if (error) {
      console.error(JSON.stringify(error, null, 2));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!error) {
       await signUp.verifications.sendEmailCode();
       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const onGoogleSignUp = React.useCallback(async () => {
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
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === 'complete') {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl('/');
          router.push(url as Href);
        },
      });
    }
  };

  if (signUp.status === 'missing_requirements' && signUp.unverifiedFields.includes('email_address')) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-12">
          <Text className="text-white text-3xl font-bold mb-2">Verify Account</Text>
          <Text className="text-slate-400 mb-8">Enter the code sent to {emailAddress}.</Text>
          
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
              <ShieldPlus size={40} color="#10B981" />
            </View>
            <Text className="text-white text-3xl font-bold mt-6 tracking-tight">Create Vault</Text>
            <Text className="text-slate-400 mt-2 text-center">Start your journey to financial supremacy.</Text>
          </View>

          {/* Form */}
          <GlassCard className="p-8 gap-6 border-slate-900/50 bg-slate-900/10">
            <NeonInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Adrian Smith"
              leftIcon={<User size={18} color="#475569" />}
            />

            <NeonInput
              label="Email Address"
              value={emailAddress}
              onChangeText={setEmailAddress}
              placeholder="name@example.com"
              keyboardType="email-address"
              leftIcon={<Mail size={18} color="#475569" />}
              error={errors.fields.emailAddress?.message}
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

            <NeonButton
              title="Create your vault"
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
              onPress={onGoogleSignUp}
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
            <Text className="text-slate-400">Already a member? </Text>
            <Link href="/sign-in" asChild>
              <Pressable>
                <Text className="text-primary font-bold">Access Vault</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
