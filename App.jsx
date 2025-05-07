// App.js
import 'react-native-gesture-handler'; 
import React, { useState, useEffect } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './src/redux/store';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigation from './src/components/AppNavigation';
import AuthHandler from './src/components/AuthHandler';
import SplashScreen from './src/components/SplashScreen';
import {
  setupProductListeners,
  setupNotificationListener
} from './src/redux/slices/productSlice';

function MainApp() {
  const dispatch = useDispatch();
  const user     = useSelector(state => state.auth.user);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (user) {
      const unsubProd  = dispatch(setupProductListeners(user.uid, user.role));
      const unsubNotif = dispatch(setupNotificationListener(user.uid));
      return () => {
        unsubProd();
        unsubNotif();
      };
    }
  }, [user, dispatch]);

  return (
    <NavigationContainer>
      {showSplash
        ? <SplashScreen onFinish={() => setShowSplash(false)} />
        : <>
            <AppNavigation />
            {!user && <AuthHandler />}
          </>
      }
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <MainApp />
    </Provider>
  );
}
