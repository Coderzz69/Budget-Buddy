import React from 'react'
import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

export const useWarmUpBrowser = () => {
  React.useEffect(() => {
    // Warm up the android browser to improve performance
    // https://docs.expo.dev/guides/authentication/#improving-the-user-experience
    if (Platform.OS !== 'web') {
      void WebBrowser.warmUpAsync()
    }
    return () => {
      if (Platform.OS !== 'web') {
        void WebBrowser.coolDownAsync()
      }
    }
  }, [])
}
