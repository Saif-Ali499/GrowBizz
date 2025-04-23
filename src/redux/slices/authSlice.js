import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@react-native-firebase/auth'; // modular import

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ email, password, role, userName }, thunkAPI) => {
    try {
      const auth = getAuth(); // modular way to get auth instance

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User account created & signed in!', userCredential.user);

      // You can return userCredential.user if needed
      return { uid: userCredential.user.uid, email: userCredential.user.email };

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('That email address is already in use!');
      } else if (error.code === 'auth/invalid-email') {
        console.log('That email address is invalid!');
      }

      return thunkAPI.rejectWithValue(error.message);
    }
  }
);


export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, thunkAPI) => {
    try {
      const auth = getAuth(); // Get the auth instance
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  await signOut(auth); // Use the initialized auth instance
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export default authSlice.reducer;