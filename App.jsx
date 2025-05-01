import { useState } from 'react';  // Add this import
import {Provider} from 'react-redux';
import store from './src/redux/store';
import {NavigationContainer} from '@react-navigation/native';
import AppNavigation from './src/components/AppNavigation';
import AuthHandler from './src/components/AuthHandler';
import SplashScreen from './src/components/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <Provider store={store}>
      <NavigationContainer>
        {showSplash ? (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        ) : (
          <AppNavigation />
        )}
      </NavigationContainer>
      <AuthHandler />
    </Provider>
  );
}