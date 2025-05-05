import { View, Text,TouchableOpacity } from 'react-native'
import React from 'react'
import { useDispatch } from 'react-redux';

import {logoutUser} from '../../redux/slices/authSlice';

const ProfileScreen = () => {
   const dispatch = useDispatch();
    const handleLogout = async () => {
      await dispatch(logoutUser());
      alert('you are logged out');
    };
  return (
    <View>
      <Text>ProfileScreen</Text>
      <TouchableOpacity onPress={handleLogout} style={styles.SignOutLink}>
              <Text style={styles.SinOutText}>LogOut</Text>
            </TouchableOpacity>
    </View>
  )
}

export default ProfileScreen