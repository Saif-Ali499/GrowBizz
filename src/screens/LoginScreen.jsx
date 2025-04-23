import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Button,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {loginUser, clearError} from '../redux/slices/authSlice';
import {useNavigation} from '@react-navigation/native';

export const LoginScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {loading, error} = useSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please fill all fields');
      return;
    }

    try {
      await dispatch(loginUser({email, password})).unwrap();
      alert('Login successful!');
      navigation.navigate('FarmersHome');
    } catch (error) {
      alert(error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <Button
            title="Login"
            onPress={handleLogin}
            color="#007bff"
            disabled={loading}
          />
        )}

        <TouchableOpacity
          onPress={() => alert('LoginScreen')}
          style={styles.loginLink}>
          <Text style={styles.loginText}>Create an Account or SignUp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
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
  dropdown: {
    height: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ced4da',
  },
  dropdownText: {
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    color: '#007bff',
    fontSize: 16,
  },
});
