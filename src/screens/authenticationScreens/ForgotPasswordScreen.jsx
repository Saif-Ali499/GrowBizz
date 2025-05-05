import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword } from '../../redux/slices/authSlice';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.auth);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    try {
      await dispatch(forgotPassword(email)).unwrap();
      Alert.alert('Success', 'Password reset email sent! Check your inbox');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <Button
          title="Send Reset Email"
          onPress={handleResetPassword}
          color="#007bff"
        />
      )}
      
      <Button
        title="Back to Login"
        onPress={() => navigation.goBack()}
        color="#6c757d"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    gap:20
  },
  input: {
    height: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
});

export default ForgotPasswordScreen;