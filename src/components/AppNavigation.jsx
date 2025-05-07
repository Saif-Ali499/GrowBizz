// src/components/AppNavigation.js
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {useSelector} from 'react-redux';
import {ActivityIndicator} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
const Root = createStackNavigator();
const Bid = createStackNavigator();
const Upload = createStackNavigator();
const Notif = createStackNavigator();

// Nested merchant‐bid stack
function MerchantBidStack() {
  return (
    <Bid.Navigator screenOptions={{headerShown: false, unmountOnBlur: true}}>
      <Bid.Screen name="ProductList" component={ProductListScreen} />
      <Bid.Screen name="ProductDetailBid" component={ProductDetailBid} />
    </Bid.Navigator>
  );
}

// Nested farmer‐upload stack
function FarmerUploadStack() {
  return (
    <Upload.Navigator screenOptions={{headerShown: false, unmountOnBlur: true}}>
      <Upload.Screen name="UploadProduct" component={UploadProductScreen} />
      <Upload.Screen name="HomeAfterUpload" component={FarmersHome} />
    </Upload.Navigator>
  );
}

// Nested notifications stack
function NotificationStack() {
  return (
    <Notif.Navigator screenOptions={{headerShown: false, unmountOnBlur: true}}>
      <Notif.Screen name="NotificationPanel" component={NotificationPanel} />
      <Notif.Screen name="ProductDetailBid" component={ProductDetailBid} />
    </Notif.Navigator>
  );
}

const icons = {
  Home: ['home', 'home-outline'],
  Bid: ['pricetag', 'pricetag-outline'],
  Notifications: ['notifications', 'notifications-outline'],
  Upload: ['add-circle', 'add-circle-outline'],
  Chat: ['chatbubble-ellipses-sharp', 'chatbubble-ellipses-outline'],
  Profile: ['person', 'person-outline'],
};

function getIcon(name, focused) {
  const [on, off] = icons[name] || ['ellipse', 'ellipse'];
  return focused ? on : off;
}
function AppTabs() {
  const {user} = useSelector(s => s.auth);

  const FarmerTabs = () => (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        unmountOnBlur: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {backgroundColor: '#fff', paddingBottom: 5, height: 70},
        tabBarIcon: ({focused, color, size}) => (
          <Ionicons
            name={getIcon(route.name, focused)}
            size={size}
            color={color}
          />
        ),
      })}>
      <Tab.Screen name="Home" component={FarmersHome} />
      <Tab.Screen name="Notifications" component={NotificationStack} />
      <Tab.Screen name="Upload" component={FarmerUploadStack} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        
      />
    </Tab.Navigator>
  );

  const MerchantTabs = () => (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        unmountOnBlur: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {backgroundColor: '#fff', paddingBottom: 5, height: 70},
        tabBarIcon: ({focused, color, size}) => (
          <Ionicons
            name={getIcon(route.name, focused)}
            size={size}
            color={color}
          />
        ),
      })}>
      <Tab.Screen name="Home" component={MerchantsHome} />
      <Tab.Screen name="Bid" component={MerchantBidStack} />
      <Tab.Screen name="Notifications" component={NotificationStack} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        
      />
    </Tab.Navigator>
  );      

  // Pick the correct bottom-tabs based on role
  console.log('User role: ', user?.role); // Debug log to check the role
  return user.role?.toLowerCase() === 'farmer' ? (
    <FarmerTabs />
  ) : (
    <MerchantTabs />
  );
}

export default function AppNavigation() {
  const {user, loading} = useSelector(s => s.auth);

  if (loading) {
    return <ActivityIndicator size="large" style={{flex: 1}} />;
  }

  return (
   <Root.Navigator screenOptions={{headerShown: false}}>
      {user ? (
        user.emailVerified ? (<Root.Screen name="AppTabs" component={AppTabs} />
        ) : (
          <Root.Screen
            name="VerifyEmailScreen"
            component={VerifyEmailScreen}
          />
        )
      ) : (
        <>
          <Root.Screen
            name="Login"
            component={LoginScreen}
            options={{headerLeft: null}}
          />
          <Root.Screen name="Register" component={RegisterScreen} />
          <Root.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
        </>
      )}
    </Root.Navigator>
  );
}
