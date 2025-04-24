import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const auth = getAuth();

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({email, password, role, userName}, thunkAPI) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const { uid }  = userCredential.user;

      await firestore()
        .collection('Users')
        .doc(uid)
        .set({
          uid,
          email,
          userName,
          role,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      return {uid, email, userName, role};
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  },
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({email, password}, thunkAPI) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const { uid } = userCredential.user;

      const userDoc = await firestore()
        .collection('Users')
        .doc(uid)
        .get();

      if (!userDoc.exists) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data();
      return { 
        uid, 
        email: userData.email, 
        userName: userData.userName, 
        role: userData.role 
      };
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

const authSlice = createSlice({
  name: 'auth',
  initialState: {user: null, loading: false, error: null},
  reducers: {},
  extraReducers: builder => {
    builder
      // register
      .addCase(registerUser.pending, s => {
        s.loading = true;
        s.error = null;
      })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.user = a.payload;
        s.loading = false;
      })
      .addCase(registerUser.rejected, (s, a) => {
        s.error = a.payload;
        s.loading = false;
      })

      // login
      .addCase(loginUser.pending, s => {
        s.loading = true;
        s.error = null;
      })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.user = a.payload;
        s.loading = false;
      })
      .addCase(loginUser.rejected, (s, a) => {
        s.error = a.payload;
        s.loading = false;
      })

      // logout
      .addCase(logoutUser.pending, s => {
        s.loading = true;
        s.error = null;
      })
      .addCase(logoutUser.fulfilled, s => {
        s.user = null;
        s.loading = false;
      })
      .addCase(logoutUser.rejected, (s, a) => {
        s.error = a.payload;
        s.loading = false;
      });
  },
});

export default authSlice.reducer;
