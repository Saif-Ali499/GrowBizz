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
  setupNotificationListener,
  cleanupProductListeners,          // utility fn
  cleanupNotificationListeners      // utility fn
} from './src/redux/slices/productSlice';
import { cleanupListeners } from './src/redux/slices/productSlice'; // _action_ from slice
import { cleanupNotificationListeners as cleanupNotifState } from './src/redux/slices/productSlice'; // if you defined an action

function MainApp() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    let prodUnsub;
    let notifUnsub;

    if (user) {
      // Pass an object to match createAsyncThunk signature
      dispatch(setupProductListeners({ uid: user.uid, role: user.role }))
        .unwrap()
        .then(fn => { prodUnsub = fn; })
        .catch(err => console.error('Products listener setup failed:', err));

      dispatch(setupNotificationListener(user.uid))
        .unwrap()
        .then(fn => { notifUnsub = fn; })
        .catch(err => console.error('Notifications listener setup failed:', err));
    }

    return () => {
      // 1) Call the unsubscribe utility directly
      if (typeof prodUnsub === 'function') {
        prodUnsub();
      } else {
        cleanupProductListeners(); 
      }

      if (typeof notifUnsub === 'function') {
        notifUnsub();
      } else {
        cleanupNotificationListeners();
      }

      // 2) If you want to reset state flags in your slice,
      //    dispatch the slice action (not the util fn):
      dispatch(cleanupListeners());
      // dispatch(cleanupNotifState()); // if you have a notification-cleanup action
    };
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
