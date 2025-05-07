// src/redux/slices/userProfile.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getAuth,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  updateEmail
} from '@react-native-firebase/auth';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { updateUserLocally } from './authSlice';

const auth = getAuth();
const firestore = getFirestore();
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async ({ uid, updatedData }, thunkAPI) => {
    try {
      const firestore = getFirestore();
      const userRef = doc(firestore, 'Users', uid);
      await updateDoc(userRef, updatedData);

      // Dispatch local state update
      thunkAPI.dispatch(updateUserLocally(updatedData));

      return 'User profile updated successfully';
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);


// — reauthenticate & change password —
export const changePassword = createAsyncThunk(
  'profile/changePassword',
  async ({ currentPassword, newPassword }, thunkAPI) => {
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      return 'Password updated successfully';
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// — upload profile picture to Storage + link in Firestore —
export const uploadProfilePicture = createAsyncThunk(
  'profile/uploadProfilePicture',
  async ({ uid, imageUri }, thunkAPI) => {
    try {
      const ref = storage().ref(`profile-pictures/${uid}`);
      await ref.putFile(imageUri);
      const url = await ref.getDownloadURL();
      const userDoc = doc(firestore, 'Users', uid);
      await updateDoc(userDoc, { profilePicture: url });
      return url;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    loading: false,
    error: null,
    success: false
  },
  reducers: {
    resetProfileState: state => {
      state.loading = false;
      state.error   = null;
      state.success = false;
    }
  },
  extraReducers: builder => {
    builder
      .addMatcher(a => a.type.endsWith('/pending'), state => {
        state.loading = true;
        state.error   = null;
        state.success = false;
      })
      .addMatcher(a => a.type.endsWith('/rejected'), (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })
      .addMatcher(a => a.type.endsWith('/fulfilled'), state => {
        state.loading = false;
        state.success = true;
      });
  }
});

export const { resetProfileState } = profileSlice.actions;
export default profileSlice.reducer;
