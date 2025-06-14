// src/screens/ProfileScreen.js

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import * as ImagePicker from 'react-native-image-picker';

// ─── IMPORTS ───────────────────────────────────────────────────────────────────
import {
  uploadProfilePicture,
  changePassword,
  resetProfileState,
  updateUserProfile,
} from '../../redux/slices/userProfileSlice';

import {fetchUserData, logoutUser} from '../../redux/slices/authSlice';

import {
  fetchWalletDetails,
  addMoneyToWallet,
} from '../../redux/slices/walletSlice';

import {
  fetchUserRatings,
  getUserAverageRating,
} from '../../redux/slices/ratingSlice';

import UserRatingsDisplay from '../../components/UserRatingsDisplay';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const {user} = useSelector(state => state.auth);
  const {loading, error, success} = useSelector(state => state.profile);
  const {balance, frozenBalance} = useSelector(state => state.wallet);
  const {averageRating, totalRatings} = useSelector(state => state.rating);

  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [showAddMoneyForm, setShowAddMoneyForm] = useState(false);

  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // ─── REDIRECT UNVERIFIED USERS ───────────────────────────────────────────────
  useEffect(() => {
    if (user && !user.emailVerified) {
      navigation.navigate('VerifyEmail');
    }
  }, [user?.emailVerified, navigation]);

  // ─── INITIALIZE FORM & LOAD RATINGS ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setFormData({
        userName: user.userName || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      dispatch(fetchWalletDetails());

      // Load user ratings
      dispatch(fetchUserRatings({userId: user.uid}));
      dispatch(getUserAverageRating({userId: user.uid}));
    }
  }, [user, dispatch]);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await dispatch(logoutUser());
    Alert.alert('Success', 'You are logged out');
  };

  const handleImageUpload = async () => {
    const res = await ImagePicker.launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });
    if (!res.didCancel && res.assets?.[0]?.uri) {
      dispatch(
        uploadProfilePicture({
          uid: user.uid,
          imageUri: res.assets[0].uri,
        }),
      );
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await dispatch(
        updateUserProfile({
          uid: user.uid,
          updatedData: {userName: formData.userName},
        }),
      ).unwrap();

      Alert.alert('Success', 'Profile updated');
      dispatch(fetchUserData(user.uid));
      setEditMode(false);
    } catch (err) {
      let message = '';
      if (typeof err === 'string') {
        message = err;
      } else if (err && err.message) {
        message = err.message;
      } else {
        message = JSON.stringify(err);
      }
      Alert.alert('Error', message);
    }
  };

  const handleChangePassword = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      return Alert.alert('Error', 'Passwords do not match');
    }
    dispatch(
      changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      }),
    );
    setShowPasswordForm(false);
  };

  const handleAddMoney = async () => {
    const numAmount = parseFloat(addMoneyAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      await dispatch(addMoneyToWallet({amount: numAmount})).unwrap();
      setShowAddMoneyForm(false);
      setAddMoneyAmount('');
      Alert.alert('Success', 'Money added to wallet successfully');
    } catch (err) {
      let message = '';
      if (typeof err === 'string') {
        message = err;
      } else if (err && err.message) {
        message = err.message;
      } else {
        message = 'Failed to add money: ' + JSON.stringify(err);
      }
      Alert.alert('Error', message);
    }
  };

  const navigateToFullWallet = () => {
    navigation.navigate('WalletScreen');
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Profile Picture */}
        <TouchableOpacity
          onPress={handleImageUpload}
          style={{borderWidth: 1, borderRadius: 75, marginBottom: 20}}>
          <Image
            source={
              user?.profilePicture
                ? {uri: user.profilePicture}
                : require('../../assets/Images/defaultImg.png')
            }
            style={styles.profileImage}
          />
        </TouchableOpacity>

        {/* View vs. Edit Mode */}
        {editMode ? (
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              value={formData.userName}
              onChangeText={val =>
                setFormData(prev => ({...prev, userName: val}))
              }
              placeholder="Username"
            />

            <TextInput
              style={styles.input}
              value={formData.email}
              placeholder="Email"
              keyboardType="email-address"
              editable={false}
            />
          </View>
        ) : (
          <View style={styles.infoContainer}>
            <Text style={styles.name}>{user?.userName}</Text>
            <Text style={styles.email}>{user?.email}</Text>

            {/* User Role Badge */}
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role === 'Farmer' ? '🌾 Farmer' : '🏪 Merchant'}
              </Text>
            </View>
          </View>
        )}

        {/* Edit / Save Buttons */}
        <View style={styles.buttonRow}>
          
          {editMode ||showPasswordForm?(
            editMode?(
            <>
              <TouchableOpacity
                style={styles.button}
                onPress={handleUpdateProfile}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancel]}
                onPress={() => setEditMode(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </>
            ):(showPasswordForm && (
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Current Password"
              value={formData.currentPassword}
              onChangeText={val =>
                setFormData(prev => ({...prev, currentPassword: val}))
              }
            />
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="New Password"
              value={formData.newPassword}
              onChangeText={val =>
                setFormData(prev => ({...prev, newPassword: val}))
              }
            />
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Confirm New Password"
              value={formData.confirmPassword}
              onChangeText={val =>
                setFormData(prev => ({...prev, confirmPassword: val}))
              }
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleChangePassword}>
                <Text style={styles.buttonText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancel]}
                onPress={() => setShowPasswordForm(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
          ) : (
            <View  style={{flex:2,flexDirection:'row', justifyContent:'space-around'}}>
              <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setEditMode(true)}>
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setShowPasswordForm(true)}>
          <Text style={styles.buttonText}>Change Password</Text>
        </TouchableOpacity>
            </View>
            
          )}
        </View>

        {/* Wallet Section */}
        <View style={styles.walletContainer}>
          <Text style={styles.walletTitle}>My Wallet</Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceBox}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>
                ₹{balance?.toFixed(2) || '0.00'}
              </Text>
            </View>

            {frozenBalance > 0 && (
              <View style={styles.balanceBox}>
                <Text style={styles.balanceLabel}>In Escrow</Text>
                <Text style={styles.frozenAmount}>
                  ₹{frozenBalance?.toFixed(2) || '0.00'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.walletButtonRow}>
            <TouchableOpacity
              style={[styles.walletButton, {backgroundColor: '#2196F3'}]}
              onPress={navigateToFullWallet}>
              <Text style={styles.buttonText}>Wallet Details</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Money Form */}
        {showAddMoneyForm && (
          <View style={styles.addMoneyForm}>
            <Text style={styles.formTitle}>Add Money to Wallet</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Enter Amount"
              value={addMoneyAmount}
              onChangeText={setAddMoneyAmount}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.button} onPress={handleAddMoney}>
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancel]}
                onPress={() => setShowAddMoneyForm(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        
        

       
        {/* Ratings Display Section */}
        <View style={styles.ratingContainer}>
          <UserRatingsDisplay
            userId={user?.uid}
            showTitle={true}
            maxItems={3} // Show first 3 reviews on profile
          />
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={styles.signOutLink}>
          <Text style={styles.signOutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    alignItems: 'center',
    padding: 20,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  roleText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancel: {
    backgroundColor: '#ff4444',
  },
  editBtn:{
    backgroundColor: '#4CAF50',
    padding: 10,
    width: '40%',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  signOutLink: {
    marginTop: 30,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'orange',
    padding: 10,
    borderRadius: 5,
  },
  signOutText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  walletContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  walletTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  balanceBox: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    marginRight: 5,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  frozenAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  walletButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  addMoneyForm: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  ratingContainer: {
    width: '100%',
    marginHorizontal: 5,
  },
});

export default ProfileScreen;
