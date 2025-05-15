import {configureStore} from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import productReducer from './slices/productSlice'
import profileReducer from './slices/userProfile'
import chatReducer from './slices/chatSlice'
const store = configureStore({
  reducer: {
    auth: authReducer,    
    products: productReducer,
    profile:profileReducer,
    chat:chatReducer
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
