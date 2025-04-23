
import React from 'react'
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import { HomeScreen,LoginScreen,RegisterScreen,MerchantsHome,FarmersHome } from './src/screens';
import { Provider } from 'react-redux'
import { store } from './src/redux/store'
const Stack = createNativeStackNavigator()
const App = () => {

  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="HomeScreen">
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen name="FarmersHome" component={FarmersHome} />
          <Stack.Screen name="MerchantsHome" component={MerchantsHome} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  )
}

export default App