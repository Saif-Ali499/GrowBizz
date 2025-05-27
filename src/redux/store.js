import {configureStore} from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import productReducer from './slices/productSlice'
import profileReducer from './slices/userProfileSlice'
import chatReducer from './slices/chatSlice'
import walletSlice from './slices/walletSlice'
const store = configureStore({
  reducer: {
    auth: authReducer,    
    products: productReducer,
    profile:profileReducer,
    chat:chatReducer,
    wallet:walletSlice
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
