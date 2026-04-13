import React from 'react';
import { View, Text, ScrollView, Pressable, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/expo';
import { GlassCard } from '../../components/GlassCard';
import { useStore } from '../../store/useStore';
import { Colors } from '../../constants/theme';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { 
  User, 
  Settings, 
  ShieldCheck, 
  CreditCard, 
  Bell, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  Fingerprint,
  Moon,
  Layers
} from 'lucide-react-native';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (val: boolean) => void;
  isLast?: boolean;
  destructive?: boolean;
}

const MenuItem = ({ 
  icon, 
  label, 
  value, 
  onPress, 
  isSwitch, 
  switchValue, 
  onSwitchChange, 
  isLast,
  destructive
}: MenuItemProps) => (
  <Pressable 
    onPress={onPress}
    className={cn(
      'flex-row items-center py-4',
      !isLast && 'border-b border-slate-900'
    )}
  >
    <View className={cn(
      'w-10 h-10 rounded-xl items-center justify-center mr-4',
      destructive ? 'bg-red-500/10' : 'bg-slate-900'
    )}>
      {icon}
    </View>
    <View className="flex-1">
      <Text className={cn(
        'font-medium text-base',
        destructive ? 'text-red-400' : 'text-white'
      )}>
        {label}
      </Text>
    </View>
    {isSwitch ? (
      <Switch 
        value={switchValue} 
        onValueChange={onSwitchChange}
        trackColor={{ false: '#1E293B', true: '#10B981' }}
        thumbColor="#FFFFFF"
      />
    ) : (
      <View className="flex-row items-center">
        {value && <Text className="text-slate-400 text-sm mr-2">{value}</Text>}
        {!destructive && <ChevronRight size={18} color="#475569" />}
      </View>
    )}
  </Pressable>
);

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const colorScheme = useColorScheme() ?? 'dark';
  const { accounts } = useStore();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Profile Header */}
        <View className="items-center py-8">
          <View className="relative">
            <View className="w-28 h-28 rounded-full border-4 border-primary shadow-[0_0_20px_rgba(16,185,129,0.4)] overflow-hidden">
              <Image 
                source={{ uri: user?.imageUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop' }} 
                className="w-full h-full"
              />
            </View>
            <View className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full items-center justify-center border-4 border-slate-950">
              <Settings size={14} color="#FFFFFF" />
            </View>
          </View>
          <Text className="text-white text-2xl font-bold mt-4">{user?.fullName || 'Adrian'}</Text>
          <Text className="text-secondary text-sm font-medium tracking-widest uppercase">Sovereign Member</Text>
        </View>

        {/* Menu Groups */}
        <View className="px-6 gap-6 mb-24">
          {/* Account Section */}
          <View>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Account settings</Text>
            <GlassCard className="px-5">
              <MenuItem 
                icon={<User size={20} color="#10B981" />} 
                label="Personal Information" 
                onPress={() => {}}
              />
              <MenuItem 
                icon={<CreditCard size={20} color="#38BDF8" />} 
                label="Linked Accounts" 
                value={`${accounts.length} Active`}
                onPress={() => router.push('/accounts')}
              />
              <MenuItem 
                icon={<Bell size={20} color="#F59E0B" />} 
                label="Notifications" 
                isLast
                onPress={() => {}}
              />
            </GlassCard>
          </View>

          {/* Manage */}
          <View>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Manage</Text>
            <GlassCard className="px-5">
              <MenuItem 
                icon={<CreditCard size={20} color="#38BDF8" />} 
                label="Accounts" 
                onPress={() => router.push('/accounts')}
              />
              <MenuItem 
                icon={<Layers size={20} color="#10B981" />} 
                label="Categories" 
                onPress={() => router.push('/categories')}
              />
              <MenuItem 
                icon={<Layers size={20} color="#F59E0B" />} 
                label="Budgets" 
                isLast
                onPress={() => router.push('/budgets/add')}
              />
            </GlassCard>
          </View>

          {/* Security & Preferences */}
          <View>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Security & Preferences</Text>
            <GlassCard className="px-5">
              <MenuItem 
                icon={<Fingerprint size={20} color="#10B981" />} 
                label="Biometric Lock" 
                isSwitch
                switchValue={true}
              />
              <MenuItem 
                icon={<Moon size={20} color="#8B5CF6" />} 
                label="Dark Mode" 
                isSwitch
                switchValue={true}
              />
              <MenuItem 
                icon={<ShieldCheck size={20} color="#38BDF8" />} 
                label="Privacy Policy" 
                isLast
                onPress={() => {}}
              />
            </GlassCard>
          </View>

          {/* Support */}
          <View>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Support</Text>
            <GlassCard className="px-5">
              <MenuItem 
                icon={<HelpCircle size={20} color="#94A3B8" />} 
                label="Help Center" 
                onPress={() => {}}
              />
              <MenuItem 
                icon={<LogOut size={20} color="#EF4444" />} 
                label="Logout" 
                destructive
                isLast
                onPress={handleLogout}
              />
            </GlassCard>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
