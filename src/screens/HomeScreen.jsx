import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import React from 'react';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const navigation = useNavigation()
  return (
    <View style={styles.container}>
      <View style={styles.authContainer}>
        <TouchableOpacity
          onPress={() => navigation.navigate("LoginScreen")}
          style={styles.SignInLink}>
          <Text style={styles.SignInText}>SignIn</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>navigation.navigate("RegisterScreen")}
          style={styles.SignInLink}>
          <Text style={styles.SignInText}>SignUp</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.image}></View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  image: {
    height: 550,
    width: 300,
    backgroundColor: 'rgba(64, 168, 212, 0.92)',
  },
  authContainer: {
    height: 50,
    width: 300,
    flexDirection: 'row',
    justifyContent:'space-between'
  },
  SignInLink: {
    width: '40%',
    justifyContent:'center'
  },
  SignInText: {
    color: '#007bff',
    fontSize: 16,
  },
});

export default HomeScreen;
