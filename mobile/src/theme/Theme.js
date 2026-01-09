export const theme = {
    colors: {
        background: '#050505',
        surface: '#121212',
        surfaceHighlight: '#1E1E1E',
        primary: '#00D4FF', // Cyan
        primaryDark: '#0090B0',
        accent: '#FF3300', // Combustion Orange
        text: '#FFFFFF',
        textSecondary: '#AAAAAA',
        border: '#333333',
        success: '#00FF88',
        error: '#FF4444',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
    },
    typography: {
        h1: {
            fontSize: 32,
            fontWeight: '700',
            color: '#FFFFFF',
        },
        h2: {
            fontSize: 24,
            fontWeight: '600',
            color: '#FFFFFF',
        },
        body: {
            fontSize: 16,
            color: '#CCCCCC',
        },
        caption: {
            fontSize: 12,
            color: '#888888',
        },
        mono: {
            fontFamily: 'monospace',
            fontSize: 14,
        }
    },
    layout: {
        shadow: {
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.30,
            shadowRadius: 4.65,
            elevation: 8,
        },
        radius: 12,
    }
};
