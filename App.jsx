import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';

import {getApp} from '@react-native-firebase/app';
import {getAuth, onAuthStateChanged} from '@react-native-firebase/auth';
import {
  HomeScreen,
  LoginScreen,
  RegisterScreen,
  MerchantsHome,
  FarmersHome,
} from './src/screens';
import {Provider} from 'react-redux';
import {store} from './src/redux/store';

const firebaseApp = getApp();
const authh = getAuth(firebaseApp);

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authh, setUser);
    return unsubscribe;
  }, []);

  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="HomeScreen">
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
          <Stack.Screen
            name="HomeScreen"
            component={HomeScreen}
            options={{
              headerLeft: () => null,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="FarmersHome" component={FarmersHome} />
          <Stack.Screen name="MerchantsHome" component={MerchantsHome} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
