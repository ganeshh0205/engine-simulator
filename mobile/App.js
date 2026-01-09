import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import AcademyScreen from './src/screens/AcademyScreen';
import SimulationScreen from './src/screens/SimulationScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />

        <Stack.Navigator
          initialRouteName="Auth"
          screenOptions={{
            headerShown: false, // Custom headers or none
            cardStyle: { backgroundColor: '#050505' },
            animationEnabled: true,
          }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Algorithm" component={AcademyScreen} />
          <Stack.Screen name="Simulation" component={SimulationScreen} />
        </Stack.Navigator>

      </NavigationContainer>
    </SafeAreaProvider>
  );
}
