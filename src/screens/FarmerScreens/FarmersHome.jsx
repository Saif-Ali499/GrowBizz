import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import React from 'react';
import {logoutUser} from '../../redux/slices/authSlice';
import {useNavigation} from '@react-navigation/native';
import { useDispatch } from 'react-redux';
const FarmersHome = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const handleLogout = async () => {
    await dispatch(logoutUser());
    alert('you are logged out');
    navigation.replace('HomeScreen');
  };
  return (
    <View>
      <Text>FarmersHome</Text>
      <TouchableOpacity onPress={handleLogout} style={styles.SignOutLink}>
        <Text style={styles.SinOutText}>LogOut</Text>
      </TouchableOpacity>
    </View>
  );
};

styles = StyleSheet.create({
  SignOutLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  SinOutText: {
    color: '#007bff',
    fontSize: 16,
  },
});

export default FarmersHome;
