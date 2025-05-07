import {configureStore} from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import productReducer from './slices/productSlice'
import profileReducer from './slices/userProfile'
const store = configureStore({
  reducer: {
    auth: authReducer,    
    products: productReducer,
    profile:profileReducer
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
