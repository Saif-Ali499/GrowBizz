import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from '@react-native-firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';

// Initialize Firebase services
const auth = getAuth();
const firestore = getFirestore();

// register function
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({email, password, role, userName}, thunkAPI) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const {uid} = userCredential.user;

      await setDoc(doc(firestore, 'Users', uid), {
        uid,
        email,
        userName,
        role,
        createdAt: serverTimestamp(),
      });

      return {uid, email, userName, role};
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  },
);

//Log in function
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, thunkAPI) => {
    try {
      // Initialize Firebase services
      const auth = getAuth();
      const db = getFirestore();

      // User authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Email verification check
      if (!user.emailVerified) {
        await user.sendEmailVerification();
        throw new Error('Email not verified. Verification email resent.');
      }

      // Fetch user data from Firestore
      const userDocRef = doc(db, 'Users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists) {
        throw new Error('User data not found');
      }

      // Combine auth and Firestore data
      return {
        uid: user.uid,
        email: user.email,
        ...userDoc.data(),
        emailVerified: user.emailVerified
      };

    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
)

export const sendVerificationEmail = createAsyncThunk(
  'auth/sendVerificationEmail',
  async (_, thunkAPI) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await user.sendEmailVerification();
        return 'Verification email sent successfully';
      }
      throw new Error('No user logged in');
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  },
);

export const checkEmailVerification = createAsyncThunk(
  'auth/checkEmailVerification',
  async (_, thunkAPI) => {
    try {
      await auth.currentUser.reload();
      return auth.currentUser.emailVerified;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  },
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, thunkAPI) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return 'Password reset email sent successfully';
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  },
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, thunkAPI) => {
    try {
      await signOut(auth);
      return null;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  },
);

export const fetchUserData = createAsyncThunk(
  'auth/fetchUserData',
  async (uid, thunkAPI) => {
    try {
      const userDoc = await getDoc(doc(firestore, 'Users', uid));
      if (!userDoc.exists) {
        throw new Error('User data not found');
      }
      return userDoc.data();
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearUser: state => {
      state.user = null;
    },
  },
  extraReducers: builder => {
    // Shared handler functions
    const handlePending = state => {
      state.loading = true;
      state.error = null;
    };

    const handleRejected = (state, action) => {
      state.loading = false;
      state.error = action.payload;
    };

    builder
      // Register User
      .addCase(registerUser.pending, handlePending)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(registerUser.rejected, handleRejected)

      // Login User
      .addCase(loginUser.pending, handlePending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(loginUser.rejected, handleRejected)

      // Logout User
      .addCase(logoutUser.pending, handlePending)
      .addCase(logoutUser.fulfilled, state => {
        state.user = null;
        state.loading = false;
      })
      .addCase(logoutUser.rejected, handleRejected)

      // Send Verification Email
      .addCase(sendVerificationEmail.pending, handlePending)
      .addCase(sendVerificationEmail.fulfilled, state => {
        state.loading = false;
      })
      .addCase(sendVerificationEmail.rejected, handleRejected)

      // Forgot Password
      .addCase(forgotPassword.pending, handlePending)
      .addCase(forgotPassword.fulfilled, state => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, handleRejected)

      // Check Email Verification
      .addCase(checkEmailVerification.fulfilled, (state, action) => {
        if (action.payload && state.user) {
          state.user.emailVerified = true;
        }
      })

      // Fetch User Data
      .addCase(fetchUserData.pending, handlePending)
      .addCase(fetchUserData.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(fetchUserData.rejected, handleRejected);
  },
});

export default authSlice.reducer;
export const {clearUser} = authSlice.actions;
