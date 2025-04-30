import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';
import {ActivityIndicator} from 'react-native';

// Import all screens
import {
  LoginScreen,
  RegisterScreen,
  MerchantsHome,
  FarmersHome,
  ForgotPasswordScreen,
  VerifyEmailScreen,
} from '../screens';

const Stack = createNativeStackNavigator();
// AppNavigation.js
export default function AppNavigation() {
  const {user, loading} = useSelector(state => state.auth);

  if (loading) {
    return <ActivityIndicator size="large" style={{flex: 1}} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: true}}>
        {user ? (
          user.emailVerified ? (
            user.role === 'Farmer' ? (
              <Stack.Screen name="FarmersHome" component={FarmersHome} />
            ) : (
              <Stack.Screen name="MerchantsHome" component={MerchantsHome} />
            )
          ) : (
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          )
        ) : (
          // Unauthenticated screens
          <>
            <Stack.Screen name="LoginScreen" component={LoginScreen} />
            <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
