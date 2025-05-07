import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
const SplashScreen = ({ onFinish }) => {
  const { loading } = useSelector(state => state.auth);

  useEffect(() => {
    let timer;

    if (!loading) {
      timer = setTimeout(() => {
        onFinish();
      }, 1000);
    } else {
      timer = setTimeout(() => {
        onFinish();
      }, 2000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, onFinish]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GrowBizz</Text>
      <Text style={styles.subtitle}>Connecting Farmers and Merchants</Text>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "rgba(61, 171, 195, 0.38)",
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'green',
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    marginTop: 10,
  },
});

export default SplashScreen;