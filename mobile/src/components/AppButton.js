import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/Theme';

export const AppButton = ({ title, onPress, variant = 'primary', style }) => {
    const isPrimary = variant === 'primary';

    return (
        <TouchableOpacity
            style={[
                styles.button,
                isPrimary ? styles.primary : styles.outline,
                style
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textOutline]}>
                {title.toUpperCase()}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: theme.layout.radius,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 150,
    },
    primary: {
        backgroundColor: theme.colors.primary,
        ...theme.layout.shadow,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    text: {
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 1,
    },
    textPrimary: {
        color: '#000000',
    },
    textOutline: {
        color: theme.colors.primary,
    }
});
