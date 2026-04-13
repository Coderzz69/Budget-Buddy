import { useAuth } from '@clerk/expo'
import { Redirect, Tabs, router } from 'expo-router'
import { View, Pressable, ActivityIndicator } from 'react-native'
import { Home, PieChart, BarChart2, User, Plus } from 'lucide-react-native'
import { Colors } from '../../constants/theme'
import { useColorScheme } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useData } from '../../hooks/useData';
import { useStore } from '../../store/useStore';

export default function Layout() {
  const { isSignedIn, isLoaded } = useAuth()
  const colorScheme = useColorScheme() ?? 'light'
  
  // Call useData to kickstart data fetching
  useData();
  const isLoading = useStore((state) => state.isLoading);

  if (!isLoaded) {
    return null
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  const themeColors = Colors[colorScheme]

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    router.push('/transactions/add')
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: themeColors.background,
          borderTopColor: themeColors.border,
          height: 80,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: themeColors.tint,
        tabBarInactiveTintColor: themeColors.icon,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => <PieChart size={size} color={color} />,
        }}
      />
      
      {/* Ghost tab for FAB positioning */}
      <Tabs.Screen
        name="fab-placeholder"
        options={{
          title: '',
          tabBarButton: (props) => (
            <View className="flex-1 items-center justify-center -mt-8">
              <Pressable
                onPress={handleFabPress}
                className="w-16 h-16 rounded-full bg-primary items-center justify-center shadow-lg shadow-primary/50 border-4 border-slate-900"
              >
                <Plus size={32} color="#FFFFFF" strokeWidth={3} />
              </Pressable>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
