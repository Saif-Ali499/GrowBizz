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
  FarmerUploadScreen,
  MerchantProductScreen,
} from '../screens';

const Stack = createNativeStackNavigator();
// AppNavigation.js
export default function AppNavigation() {
  const {user, loading} = useSelector(state => state.auth);

  if (loading) {
    return <ActivityIndicator size="large" style={{flex: 1}} />;
  }

  return (
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {user ? (
          user.emailVerified ? (
            user.role === 'Farmer' ? (
              <>
              <Stack.Screen name="FarmersHome" component={FarmersHome} />
              <Stack.Screen name="FarmerUploadScreen" component={FarmerUploadScreen} />
              </>
              
            ) : (
              <>
              <Stack.Screen name="MerchantsHome" component={MerchantsHome} />
              <Stack.Screen name="MerchantProductScreen" component={MerchantProductScreen} />

              </>
              
            )
          ) : (
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            
          )
        ) : (
          // Unauthenticated screens
          <>
            <Stack.Screen name="LoginScreen" component={LoginScreen} options={{
            headerLeft: () => null,
          }}/>
            <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        )}
      </Stack.Navigator>
  );
}
