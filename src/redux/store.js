import {configureStore} from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import productReducer from './slices/productSlice'
import profileReducer from './slices/userProfileSlice'
import chatReducer from './slices/chatSlice'
import walletSlice from './slices/walletSlice'
import ratingSlice from './slices/ratingSlice';
const store = configureStore({
  reducer: {
    auth: authReducer,    
    products: productReducer,
    profile:profileReducer,
    chat:chatReducer,
    wallet:walletSlice,
    rating: ratingSlice,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
