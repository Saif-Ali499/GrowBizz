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
import {Dropdown} from 'react-native-element-dropdown';
import {useNavigation} from '@react-navigation/native';

import {useDispatch, useSelector} from 'react-redux';
import {registerUser, clearError} from '../../redux/slices/authSlice';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {loading, error} = useSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(null);
  const [isFocus, setIsFocus] = useState(false);

  const roleData = [
    {label: 'Farmer', value: 'Farmer'},
    {label: 'Merchant', value: 'Merchant'},
  ];

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !userName || !role) {
      alert('Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    if (password.length < 6) {
      alert('Password should be at least 6 characters');
      return;
    }

    try {
      await dispatch(registerUser({email, password, role, userName})).unwrap();
      alert('Registration successful! Please login');

      navigation.navigate('Login');
    } catch (error) {
      alert('error');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <TextInput
          placeholder="Full Name"
          value={userName}
          onChangeText={setUserName}
          style={styles.input}
          autoCapitalize="words"
        />

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
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
        />

        <Dropdown
          style={[styles.dropdown, isFocus && {borderColor: '#007bff'}]}
          placeholder="Select Role"
          data={roleData}
          labelField="label"
          valueField="value"
          value={role}
          onFocus={() => setIsFocus(true)}
          onBlur={() => setIsFocus(false)}
          onChange={item => {
            setRole(item.value);
            setIsFocus(false);
          }}
          renderItem={item => (
            <View style={styles.dropdownItem}>
              <Text style={styles.dropdownText}>{item.label}</Text>
            </View>
          )}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <Button
            title="Register"
            onPress={handleRegister}
            color="#007bff"
            disabled={loading}
          />
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.loginLink}>
          <Text style={styles.loginText}>
            Already have an account? Login here
          </Text>
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

export default RegisterScreen;
