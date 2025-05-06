import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';
import {ActivityIndicator} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import screens
import {
  LoginScreen,
  RegisterScreen,
  MerchantsHome,
  FarmersHome,
  ForgotPasswordScreen,
  VerifyEmailScreen,
  UploadProductScreen,
  ProfileScreen,
  NotificationPanel,
  ChatScreen,
  ProductListScreen,
  ProductDetailBid,
} from '../screens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const BidStack = createNativeStackNavigator();

// Merchant bidding flow stack
const MerchantBidStack = () => (
  <BidStack.Navigator screenOptions={{headerShown: false}}>
    <BidStack.Screen name="ProductList" component={ProductListScreen} />
    <BidStack.Screen name="ProductDetailBid" component={ProductDetailBid} />
  </BidStack.Navigator>
);

// Notifications stack to enable detail navigation
const NotificationStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="NotificationPanel" component={NotificationPanel} />
    <Stack.Screen name="ProductDetailBid" component={ProductDetailBid} />
  </Stack.Navigator>
);

const FarmerTabs = () => (
  <Tab.Navigator
    screenOptions={({route}) => ({
      tabBarIcon: ({focused, color, size}) => {
        let iconName;
        switch (route.name) {
          case 'Home':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'Notifications':
            iconName = focused ? 'notifications' : 'notifications-outline';
            break;
          case 'Upload':
            iconName = focused ? 'add-circle' : 'add-circle-outline';
            break;
          case 'Chat':
            iconName = focused
              ? 'chatbubble-ellipses-sharp'
              : 'chatbubble-ellipses-outline';
            break;
          case 'Profile':
            iconName = focused ? 'person' : 'person-outline';
            break;
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: 'tomato',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {backgroundColor: '#fff', paddingBottom: 5, height: 70},
      // Hide tab bar when keyboard is open
      tabBarHideOnKeyboard: true,
      headerShown: false,
    })}>
    <Tab.Screen name="Home" component={FarmersHome} />
    <Tab.Screen name="Notifications" component={NotificationPanel} />
    <Tab.Screen name="Upload" component={UploadProductScreen} />
    <Tab.Screen name="Chat" component={ChatScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const MerchantTabs = () => (
  <Tab.Navigator
    screenOptions={({route}) => ({
      tabBarIcon: ({focused, color, size}) => {
        let iconName;
        switch (route.name) {
          case 'Home':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'Bid':
            iconName = focused ? 'pricetag' : 'pricetag-outline';
            break;
          case 'Notifications':
            iconName = focused ? 'notifications' : 'notifications-outline';
            break;
          case 'Chat':
            iconName = focused
              ? 'chatbubble-ellipses-sharp'
              : 'chatbubble-ellipses-outline';
            break;
          case 'Profile':
            iconName = focused ? 'person' : 'person-outline';
            break;
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: 'tomato',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {backgroundColor: '#fff', paddingBottom: 5, height: 70},
      // Hide tab bar when keyboard is open
      tabBarHideOnKeyboard: true,
      headerShown: false,
    })}>
    <Tab.Screen name="Home" component={MerchantsHome} />
    <Tab.Screen name="Bid" component={MerchantBidStack} />
    <Tab.Screen name="Notifications" component={NotificationStack} />
    <Tab.Screen name="Chat" component={ChatScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default function AppNavigation() {
  const {user, loading} = useSelector(state => state.auth);

  if (loading) {
    return <ActivityIndicator size="large" style={{flex: 1}} />;
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {user ? (
        user.emailVerified ? (
          (user.role || '').toLowerCase() === 'farmer' ? (
            <Stack.Screen name="FarmerApp" component={FarmerTabs} />
          ) : (
            <Stack.Screen name="MerchantApp" component={MerchantTabs} />
          )
        ) : (
          <Stack.Screen
            name="VerifyEmailScreen"
            component={VerifyEmailScreen}
          />
        )
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{headerLeft: null}}
          />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
