import React, {useEffect} from 'react';
import {View, Text, Button, ActivityIndicator, StyleSheet} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {
  sendVerificationEmail,
  checkEmailVerification,
} from '../redux/slices/authSlice';

const VerifyEmailScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {user, loading, error} = useSelector(state => state.auth);

  // Automatically check verification every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.emailVerified) {
        const homeScreen =
          user.role === 'farmer' ? 'FarmersHome' : 'MerchantsHome';
        navigation.replace(homeScreen);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.emailVerified, user?.role]);

  const handleResendEmail = async () => {
    try {
      await dispatch(sendVerificationEmail()).unwrap();
      alert('Verification email resent! Check your inbox.');
    } catch (err) {
      alert(err.message || 'Failed to resend verification email');
    }
  };

  const handleCheckVerification = async () => {
    try {
      const verified = await dispatch(checkEmailVerification()).unwrap();
      if (verified) {
        const homeScreen =
          user.role === 'farmer' ? 'FarmersHome' : 'MerchantsHome';
        navigation.replace(homeScreen);
      }
    } catch (err) {
      alert(err.message || 'Verification check failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Email Address</Text>
      <Text style={styles.description}>
        We've sent a verification email to {user?.email}. Please check your
        inbox and follow the instructions to verify your account.
      </Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.buttonContainer}>
        <Button
          title="Resend Verification Email"
          onPress={handleResendEmail}
          color="#007bff"
          disabled={loading}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="I've Verified My Email"
          onPress={handleCheckVerification}
          color="#28a745"
          disabled={loading}
        />
      </View>

      {loading && (
        <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
      )}

      <Text style={styles.note}>
        Note: You'll be automatically redirected once we detect your email
        verification. This may take a few seconds after verification.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  description: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
  note: {
    marginTop: 30,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default VerifyEmailScreen;
