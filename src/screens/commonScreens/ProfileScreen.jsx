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
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import * as ImagePicker from 'react-native-image-picker';
import {
  uploadProfilePicture,
  changePassword,
  resetProfileState,
} from '../../redux/slices/userProfile';
import {
  updateUserProfile,
  fetchUserData,
  logoutUser,
} from '../../redux/slices/authSlice';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {user} = useSelector(state => state.auth);
  const {loading, error, success} = useSelector(state => state.profile);

  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Redirect unverified users to VerifyEmail modal
  useEffect(() => {
    if (user && !user.emailVerified) {
      navigation.navigate('VerifyEmail');
    }
  }, [user?.emailVerified]);

  // Initialize form from user data
  useEffect(() => {
    if (user) {
      setFormData({
        userName: user.userName || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [user]);

  // Show alerts on error/success and refresh user data
  // useEffect(() => {
  //   if (error) {
  //     Alert.alert('Error', error);
  //     dispatch(resetProfileState());
  //   }
  //   if (success) {
  //     Alert.alert('Success', 'Profile updated');
  //     dispatch(fetchUserData(user.uid));
  //     dispatch(resetProfileState());
  //   }
  // }, [error, success]);
  const handleLogout = async () => {
    await dispatch(logoutUser());
    alert('you are logged out');
  };

  const handleImageUpload = async () => {
    const res = await ImagePicker.launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });
    if (!res.didCancel && res.assets?.[0]?.uri) {
      dispatch(
        uploadProfilePicture({uid: user.uid, imageUri: res.assets[0].uri}),
      );
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await dispatch(
        updateUserProfile({
          uid: user.uid,
          updatedData: {
            userName: formData.userName,
          },
        }),
      ).unwrap();
      Alert.alert('Success', 'Profile updated');
      dispatch(fetchUserData(user.uid));
      setEditMode(false);
    } catch (err) {
      Alert.alert('Error', err);
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

  return (
    <View style={styles.container}>
      {/* Profile picture */}
      <TouchableOpacity onPress={handleImageUpload}>
        <Image
          source={
            user?.profilePicture
              ? {uri: user.profilePicture}
              : require('../../assets/Images/defaultImg.png')
          }
          style={styles.profileImage}
        />
      </TouchableOpacity>

      {/* View vs. Edit form */}
      {editMode ? (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            value={formData.userName}
            onChangeText={val => setFormData({...formData, userName: val})}
            placeholder="Username"
          />
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={val => setFormData({...formData, email: val})}
            placeholder="Email"
            keyboardType="email-address"
          />
        </View>
      ) : (
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{user?.userName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      )}

      {/* Edit / Save buttons */}
      <View style={styles.buttonRow}>
        {editMode ? (
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
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setEditMode(true)}>
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Change password toggle */}
      <TouchableOpacity
        style={styles.passwordBtn}
        onPress={() => setShowPasswordForm(true)}>
        <Text style={styles.buttonText}>Change Password</Text>
      </TouchableOpacity>

      {/* Password form */}
      {showPasswordForm && (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Current Password"
            value={formData.currentPassword}
            onChangeText={val =>
              setFormData({...formData, currentPassword: val})
            }
          />
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="New Password"
            value={formData.newPassword}
            onChangeText={val => setFormData({...formData, newPassword: val})}
          />
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Confirm New Password"
            value={formData.confirmPassword}
            onChangeText={val =>
              setFormData({...formData, confirmPassword: val})
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
      )}
      
      <TouchableOpacity onPress={handleLogout} style={styles.SignOutLink}>
        <Text style={styles.SinOutText}>LogOut</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  formContainer: {
    width: '100%',
    margin:25,
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
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 15,
  },
  cancel: {
    backgroundColor: '#ff4444',
  },
  passwordBtn: {
    backgroundColor: '#4CAF50',
    marginTop:20,
    paddingHorizontal:100,
    width:325,
    height:25,
    textAlign:'center',
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  SignOutLink: {
    marginTop:380,
    width:100,
    alignItems: 'center',
    backgroundColor:"orange"
  },
  SignOutText: {
    color: 'orange',
    fontSize: 24,
  },
});

export default ProfileScreen;
