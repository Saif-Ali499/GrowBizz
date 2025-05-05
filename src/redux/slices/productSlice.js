import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  arrayUnion,
} from '@react-native-firebase/firestore';

const calculateTimeRemaining = endTime => {
  const now = Date.now();
  return Math.max(0, endTime.toDate().getTime() - now);
};

export const setupProductListeners = (userId, userRole) => dispatch => {
  const db = getFirestore();
  const productsCollection = collection(db, 'products');

  const q =
    userRole === 'farmer'
      ? query(productsCollection, where('farmerId', '==', userId))
      : query(productsCollection, where('status', '==', 'active'));

  return onSnapshot(
    q,
    snapshot => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timeRemaining: calculateTimeRemaining(doc.data().endTime),
      }));
      dispatch(setProducts(products));
    },
    error => console.error('Product listener error:', error),
  );
};

export const setupNotificationListener = (userId, userRole) => dispatch => {
  const db = getFirestore();
  const notificationsCollection = collection(db, 'notifications');

  const isMerchant = (userRole || '').toLowerCase() === 'merchant';
  const notificationsQuery = isMerchant
    ? query(notificationsCollection, where('recipientType', '==', 'merchant'))
    : query(notificationsCollection, where('recipientId', '==', userId));

  return onSnapshot(
    notificationsQuery,
    snapshot => {
      console.log(
        `📬 [notifications listener] role=${userRole} matched=${snapshot.docs.length}`,
      );
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));
      dispatch(setNotifications(notifications));
    },
    error => console.error('Notification listener error:', error),
  );
};

// Mark notification as read
export const markNotificationAsRead = createAsyncThunk(
  'products/markNotificationAsRead',
  async (notificationId, {rejectWithValue}) => {
    try {
      const db = getFirestore();
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, {read: true});
      return notificationId;
    } catch (error) {
      console.error('Error marking notification read:', error);
      return rejectWithValue(error.message);
    }
  },
);

//place bid thunk
export const placeBid = createAsyncThunk(
  'products/placeBid',
  async ({ productId, bidAmount, merchantId }, { rejectWithValue }) => {
    try {
      const db = getFirestore();
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) throw new Error('Product not found');
      const data = productSnap.data();

      // Use client-side timestamp
      const newBid = {
        merchantId,
        amount: bidAmount,
        timestamp: Timestamp.fromDate(new Date()),
      };

      // Update product with new bid
      await updateDoc(productRef, {
        bids: arrayUnion(newBid),
        highestBid: newBid,
      });

      // Notify the farmer
      await addDoc(collection(db, 'notifications'), {
        type: 'new_bid',
        recipientType: 'farmer',
        recipientId: data.farmerId,
        productId,
        title: 'New Bid Received',
        message: `₹${bidAmount} bid on ${data.name}`,
        read: false,
        createdAt: Timestamp.fromDate(new Date()), // Also using client timestamp here
      });

      return { productId, newBid };
    } catch (error) {
      console.error('Bid error:', error);
      return rejectWithValue(error.message);
    }
  }
);


const productSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    notifications: [],
    loading: false,
    error: null,
    uploadProgress: 0,
  },
  reducers: {
    setProducts: (state, action) => {
      state.items = action.payload;
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload;
    },
    clearProductError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        state.notifications = state.notifications.map(n =>
          n.id === action.payload ? {...n, read: true} : n,
        );
      })
      .addCase(placeBid.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(placeBid.fulfilled, state => {
        state.loading = false;
      })
      .addCase(placeBid.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {setProducts, setNotifications, clearProductError} =
  productSlice.actions;
export default productSlice.reducer;
