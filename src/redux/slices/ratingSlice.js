// src/redux/slices/ratingSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getFirestore, doc, setDoc, getDocs, collection, query, where, orderBy, limit } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

const app = getApp();
const db = getFirestore(app);

// Submit a rating
export const submitRating = createAsyncThunk(
  'rating/submitRating',
  async ({ productId, fromUserId, toUserId, fromRole, toRole, rating, review }, thunkAPI) => {
    try {
      // Create unique rating ID to prevent duplicates
      const ratingId = `${productId}_${fromUserId}_${toUserId}`;
      
      const ratingData = {
        productId,
        from: fromUserId,
        to: toUserId,
        fromRole, // 'farmer' or 'merchant'
        toRole,   // 'merchant' or 'farmer'
        rating,
        review: review || '',
        createdAt: new Date(),
        id: ratingId
      };

      const ratingRef = doc(db, 'ratings', ratingId);
      await setDoc(ratingRef, ratingData);

      return ratingData;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Fetch user ratings (received by user)
export const fetchUserRatings = createAsyncThunk(
  'rating/fetchUserRatings',
  async ({ userId }, thunkAPI) => {
    try {
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('to', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(ratingsQuery);
      const ratings = [];
      
      snapshot.forEach(doc => {
        ratings.push({ id: doc.id, ...doc.data() });
      });

      return ratings;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Check if user can rate for a specific product
export const checkRatingEligibility = createAsyncThunk(
  'rating/checkRatingEligibility',
  async ({ productId, fromUserId, toUserId }, thunkAPI) => {
    try {
      const ratingId = `${productId}_${fromUserId}_${toUserId}`;
      const ratingRef = doc(db, 'ratings', ratingId);
      const ratingSnap = await ratingRef.get();
      
      return {
        canRate: !ratingSnap.exists(),
        hasRated: ratingSnap.exists()
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Get average rating for a user
export const getUserAverageRating = createAsyncThunk(
  'rating/getUserAverageRating',
  async ({ userId }, thunkAPI) => {
    try {
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('to', '==', userId)
      );
      
      const snapshot = await getDocs(ratingsQuery);
      let totalRating = 0;
      let count = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        totalRating += data.rating;
        count++;
      });

      const averageRating = count > 0 ? totalRating / count : 0;
      
      return {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalRatings: count
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const ratingSlice = createSlice({
  name: 'rating',
  initialState: {
    ratings: [],
    averageRating: 0,
    totalRatings: 0,
    loading: false,
    error: null,
    success: false,
    canRate: true,
    hasRated: false
  },
  reducers: {
    clearRatingState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
    resetRatingEligibility: (state) => {
      state.canRate = true;
      state.hasRated = false;
    }
  },
  extraReducers: (builder) => {
    builder
      // Submit Rating
      .addCase(submitRating.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitRating.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.hasRated = true;
        state.canRate = false;
      })
      .addCase(submitRating.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch User Ratings
      .addCase(fetchUserRatings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserRatings.fulfilled, (state, action) => {
        state.loading = false;
        state.ratings = action.payload;
      })
      .addCase(fetchUserRatings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Check Rating Eligibility
      .addCase(checkRatingEligibility.fulfilled, (state, action) => {
        state.canRate = action.payload.canRate;
        state.hasRated = action.payload.hasRated;
      })
      
      // Get Average Rating
      .addCase(getUserAverageRating.fulfilled, (state, action) => {
        state.averageRating = action.payload.averageRating;
        state.totalRatings = action.payload.totalRatings;
      });
  }
});

export const { clearRatingState, resetRatingEligibility } = ratingSlice.actions;
export default ratingSlice.reducer;