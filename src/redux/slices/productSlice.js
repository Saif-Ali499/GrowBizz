// src/redux/slices/productSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getApp } from '@react-native-firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from '@react-native-firebase/firestore';

const app = getApp();
const db = getFirestore(app);

// Upload a product (with grade & unitType) and notify merchants
export const uploadProduct = createAsyncThunk(
  'products/uploadProduct',
  async ({ farmerId, productData }, { rejectWithValue }) => {
    try {
      const now = Timestamp.now();
      const endTime = Timestamp.fromMillis(
        now.toMillis() + productData.duration * 3600 * 1000
      );

      const docRef = await addDoc(collection(db, 'products'), {
        farmerId,
        name: productData.name,
        description: productData.description,
        startingPrice: productData.startingPrice,
        quantity: productData.quantity,
        duration: productData.duration,
        images: productData.images,
        // ⬇️ new fields
        grade: productData.grade,
        unitType: productData.unitType,
        endTime,
        status: 'active',
        createdAt: serverTimestamp(),
        bids: [],
        highestBid: null,
        finalPrice: null,
      });

      // Notify all merchants of new product
      await addDoc(collection(db, 'notifications'), {
        type: 'new_product',
        recipientType: 'merchant',
        productId: docRef.id,
        title: 'New Item Live',
        message: `${productData.name} is now up for bidding!`,
        read: false,
        createdAt: serverTimestamp(),
      });

      return {
        id: docRef.id,
        ...productData,
        // ensure we return the same new fields
        grade: productData.grade,
        unitType: productData.unitType,
        endTime,
      };
    } catch (error) {
      console.error('Upload product error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Listen for products and enrich with farmer details
export const setupProductListeners = (userId, userRole) => dispatch => {
  const productsCol = collection(db, 'products');
  const productsQuery =
    userRole === 'farmer'
      ? query(productsCol, where('farmerId', '==', userId))
      : query(productsCol, where('status', '==', 'active'));

  return onSnapshot(
    productsQuery,
    async snapshot => {
      const products = await Promise.all(
        snapshot.docs.map(async docSnap => {
          const data = docSnap.data();
          let farmer = null;
          try {
            const farmerRef = doc(db, 'users', data.farmerId);
            const farmerSnap = await getDoc(farmerRef);
            if (farmerSnap.exists()) {
              const { userName: name, email } = farmerSnap.data();
              farmer = { name, email };
            }
          } catch (e) {
            console.error('Failed to fetch farmer data:', e);
          }
          return {
            id: docSnap.id,
            ...data,
            farmer,
          };
        })
      );
      dispatch(setProducts(products));
    },
    error => console.error('Product listener error:', error)
  );
};

// Place a bid and notify farmer + merchants
export const placeBid = createAsyncThunk(
  'products/placeBid',
  async ({ productId, bidAmount, merchantId }, { rejectWithValue }) => {
    try {
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) throw new Error('Product not found');
      const data = productSnap.data();
      const now = Timestamp.now();

      // If bidding time is over, close and reject
      if (now.toMillis() > data.endTime.toMillis()) {
        await updateDoc(productRef, {
          status: 'closed',
          finalPrice: data.highestBid?.amount ?? data.startingPrice,
        });
        return rejectWithValue('Bidding period has ended');
      }

      const newBid = { merchantId, amount: bidAmount, timestamp: now };
      await updateDoc(productRef, {
        bids: [...(data.bids || []), newBid],
        highestBid: newBid,
      });

      // Notify farmer
      await addDoc(collection(db, 'notifications'), {
        type: 'new_bid',
        recipientType: 'farmer',
        recipientId: data.farmerId,
        productId,
        title: 'New Bid Received',
        message: `₹${bidAmount} bid on ${data.name}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      // Notify other merchants
      await addDoc(collection(db, 'notifications'), {
        type: 'price_update',
        recipientType: 'merchant',
        productId,
        title: 'Price Updated',
        message: `New highest bid ₹${bidAmount} on ${data.name}`,
        read: false,
        originatorId: merchantId,
        createdAt: serverTimestamp(),
      });

      return { productId, newBid };
    } catch (error) {
      console.error('Bid error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Listen for notifications (product + chat) and filter on client
export const setupNotificationListener = (userId, userRole) => dispatch => {
  const notificationsCol = collection(db, 'notifications');
  const isMerchant = (userRole || '').toLowerCase() === 'merchant';

  return onSnapshot(
    notificationsCol,
    snapshot => {
      const all = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() ?? new Date(0),
        };
      });

      const filtered = all.filter(n => {
        if (isMerchant) {
          // merchants see:
          //  • all new_product
          //  • price_update from others only
          //  • direct chats (recipientId)
          if (n.recipientType === 'merchant') {
            if (n.type === 'price_update' && n.originatorId === userId) {
              return false;
            }
            return true;
          }
          return n.recipientId === userId;
        } else {
          // farmers see bids + direct chats
          if (n.recipientType === 'farmer') return true;
          return n.recipientId === userId;
        }
      });

      const sorted = filtered.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      dispatch(setNotifications(sorted));
    },
    error => console.error('Notification listener error:', error)
  );
};

// Mark notification as read
export const markNotificationAsRead = createAsyncThunk(
  'products/markNotificationAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
      return notificationId;
    } catch (error) {
      console.error('Error marking notification read:', error);
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
  },
  reducers: {
    setProducts: (state, action) => {
      state.items = action.payload;
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      // uploadProduct
      .addCase(uploadProduct.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadProduct.fulfilled, state => {
        state.loading = false;
      })
      .addCase(uploadProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // placeBid
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
      })

      // markNotificationAsRead
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        state.notifications = state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        );
      });
  },
});

export const { setProducts, setNotifications } = productSlice.actions;
export default productSlice.reducer;
