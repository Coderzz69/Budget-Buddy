import React from 'react';
import { StyleSheet, View, Platform, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassViewProps extends ViewProps {
    intensity?: number;
    tint?: 'light' | 'dark' | 'default' | 'systemUltraThinMaterial' | 'systemThinMaterial' | 'systemMaterial' | 'systemThickMaterial' | 'systemChromeMaterial' | 'systemUltraThinMaterialDark' | 'systemThinMaterialDark' | 'systemMaterialDark' | 'systemThickMaterialDark' | 'systemChromeMaterialDark' | 'systemUltraThinMaterialLight' | 'systemThinMaterialLight' | 'systemMaterialLight' | 'systemThickMaterialLight' | 'systemChromeMaterialLight';
}

import { useColorScheme } from '@/hooks/use-color-scheme';

export function GlassView({ style, intensity = 20, tint, children, ...props }: GlassViewProps) {
    const colorScheme = useColorScheme();
    const effectiveTint = tint || (colorScheme === 'dark' ? 'dark' : 'light');

    if (Platform.OS === 'web') {
        return (
            <View
                style={[
                    style,
                    styles.webGlass,
                    {
                        backgroundColor: effectiveTint === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)',
                        borderColor: effectiveTint === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                    }
                ]}
                {...props}
            >
                {children}
            </View>
        );
    }

    return (
        <BlurView
            intensity={intensity}
            tint={effectiveTint as any}
            style={[styles.nativeGlass, style, {
                borderColor: effectiveTint === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
            }]}
            {...props}
        >
            {children}
        </BlurView>
    );
}

const styles = StyleSheet.create({
    webGlass: {
        // @ts-ignore: standard web property
        backdropFilter: 'blur(10px)',
        // @ts-ignore: safari support
        WebkitBackdropFilter: 'blur(10px)', // Safari support
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        overflow: 'hidden',
    },
    nativeGlass: {
        overflow: 'hidden',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
    },
});
