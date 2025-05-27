// redux/slices/productSlice.js

import {createSlice, createAsyncThunk, createAction} from '@reduxjs/toolkit';
import {getApp} from '@react-native-firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  runTransaction,
  getDoc,
} from '@react-native-firebase/firestore';

// ───────────────────────────────────────────────────────────────
// Custom actions for notification updates (if needed)
// ───────────────────────────────────────────────────────────────
export const updateNotifications = createAction(
  'notifications/updateNotifications',
);
export const notificationsError = createAction('notifications/error');

// ───────────────────────────────────────────────────────────────
// Listener cleanup arrays
// ───────────────────────────────────────────────────────────────
let productListeners = [];
let notificationListeners = [];

/**
 * Creates a notification for the specified user
 */
const createNotification = async (userId, notificationData) => {
  try {
    const app = getApp();
    const db = getFirestore(app);

    // Make sure createdAt is using serverTimestamp()
    await addDoc(collection(db, 'Notifications'), {
      userId,
      ...notificationData,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error; // Re-throw to handle upstream
  }
};

/**
 * Thunk: Upload a new product to Firestore.
**/
export const uploadProduct = createAsyncThunk(
  'products/uploadProduct',
  async ({farmerId, productData}, thunkAPI) => {
    try {
      const app = getApp();
      const db = getFirestore(app);

      const {
        name,
        description,
        startingPrice,
        quantity,
        grade,
        unitType,
        duration,
        images,
      } = productData;

      // Compute endTime as a JS Date (serverTimestamp will convert it)
      const endTime = new Date(Date.now() + duration * 60 * 60 * 1000);

      const newProduct = {
        farmerId,
        name: name.trim(),
        description: description.trim(),
        startingPrice,
        quantity,
        grade: grade.trim(),
        unitType,
        duration,
        images, // array of download URLs
        createdAt: serverTimestamp(),
        endTime, // stored as Firestore Timestamp
        status: 'active',
        highestBid: null,
        bidAccepted: false,
        productDelivered: false,
        paymentReleased: false,
      };

      // 1) Add the product document under “Products”
      const docRef = await addDoc(collection(db, 'Products'), newProduct);
      console.log('Product added with ID:', docRef.id);

      // 2) Search for all merchants whose role field is exactly “merchant” or “Merchant”
      //    (this covers cases where user.role might be capitalized differently)
      const merchantsQueryLower = query(
        collection(db, 'Users'),
        where('role', '==', 'merchant'),
      );
      const merchantsQueryUpper = query(
        collection(db, 'Users'),
        where('role', '==', 'Merchant'),
      );
      const [lowerSnap, upperSnap] = await Promise.all([
        getDocs(merchantsQueryLower),
        getDocs(merchantsQueryUpper),
      ]);

      // Merge the two query snapshots into a single list of merchant docs
      const allMerchants = [];
      lowerSnap.forEach(doc => allMerchants.push(doc));
      upperSnap.forEach(doc => {
        // Avoid duplicates if a document appeared in both snapshots (unlikely, but just in case)
        if (!allMerchants.some(d => d.id === doc.id)) {
          allMerchants.push(doc);
        }
      });

      console.log('Found merchants:', allMerchants.length);

      // 3) Create one notification per merchant
      const merchantPromises = allMerchants.map(merchantDoc => {
        const merchantId = merchantDoc.id;
        console.log('Creating notification for merchant:', merchantId);
        return createNotification(merchantId, {
          title: 'New Product Available',
          message: `A new product "${name}" is available for bidding!`,
          type: 'product',
          productId: docRef.id,
          originatorId: farmerId,
          image: images[0],
        }).catch(err => {
          console.error(
            `Failed to create notification for merchant ${merchantId}:`,
            err,
          );
          return null;
        });
      });

      await Promise.all(merchantPromises);
      console.log('All merchant notifications created');

      return {id: docRef.id, ...newProduct};
    } catch (err) {
      console.error('Upload product error:', err);
      return thunkAPI.rejectWithValue(err.message);
    }
  },
);

/**
 * Thunk: Mark a notification as read
 */
export const markNotificationAsRead = createAsyncThunk(
  'products/markNotificationAsRead',
  async (notificationId, thunkAPI) => {
    try {
      const app = getApp();
      const db = getFirestore(app);

      await updateDoc(doc(db, 'Notifications', notificationId), {
        read: true,
      });

      return notificationId;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  },
);

/**
 * Thunk: Place a bid on a product (atomic via transaction).
 */
export const placeBid = createAsyncThunk(
  'products/placeBid',
  async ({productId, bidAmount, merchantId}, thunkAPI) => {
    try {
      const app = getApp();
      const db = getFirestore(app);
      const productRef = doc(db, 'Products', productId);

      // Run as transaction to ensure atomicity
      await runTransaction(db, async transaction => {
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) {
          throw new Error('Product does not exist');
        }

        const productData = productSnap.data();
        const currentHighest =
          productData.highestBid?.amount ?? productData.startingPrice;

        if (bidAmount <= currentHighest) {
          throw new Error(
            `Your bid must be higher than the current price (${currentHighest})`,
          );
        }

        // Update product with new bid
        transaction.update(productRef, {
          highestBid: {
            amount: bidAmount,
            merchantId: merchantId,
            timestamp: serverTimestamp(),
          },
        });
      });

      // Get product data to use in notifications
      const productSnap = await getDoc(productRef);
      const productData = productSnap.data();

      // Create notification for the farmer
      await createNotification(productData.farmerId, {
        title: 'New Bid Received',
        message: `You received a new bid of ₹${bidAmount} on your product "${productData.name}"`,
        type: 'bid',
        productId,
        originatorId: merchantId,
        image: productData.images[0],
      });

      // Notify other merchants who have bid on this product
      if (productData.previousBids && productData.previousBids.length > 0) {
        const uniqueMerchants = new Set();
        productData.previousBids.forEach(bid =>
          uniqueMerchants.add(bid.merchantId),
        );

        // Remove current bidder from notifications
        uniqueMerchants.delete(merchantId);

        const notificationPromises = [];
        uniqueMerchants.forEach(otherMerchantId => {
          notificationPromises.push(
            createNotification(otherMerchantId, {
              title: 'Product Outbid',
              message: `Someone placed a higher bid (₹${bidAmount}) on "${productData.name}"`,
              type: 'outbid',
              productId,
              originatorId: merchantId,
              image: productData.images[0],
            }),
          );
        });

        await Promise.all(notificationPromises);
      }

      // Update the product to track previous bids
      const previousBids = productData.previousBids || [];
      if (productData.highestBid) {
        previousBids.push(productData.highestBid);
      }

      await updateDoc(productRef, {
        previousBids,
      });

      return {productId, bidAmount, merchantId};
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  },
);

/**
 * Thunk: Farmer accepts or rejects a bid
 */
export const respondToBid = createAsyncThunk(
  'products/respondToBid',
  async ({productId, accept, farmerId}, thunkAPI) => {
    try {
      const app = getApp();
      const db = getFirestore(app);
      const productRef = doc(db, 'Products', productId);

      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) {
        throw new Error('Product does not exist');
      }

      const productData = productSnap.data();

      if (!productData.highestBid) {
        throw new Error('No bid exists on this product');
      }

      if (productData.farmerId !== farmerId) {
        throw new Error('Only the product owner can accept or reject bids');
      }

      // Update product status
      await updateDoc(productRef, {
        status: accept ? 'sold' : 'active',
        bidAccepted: accept,
        bidRespondedAt: serverTimestamp(),
      });

      // If accepted, create notification for the merchant
      if (accept) {
        await createNotification(productData.highestBid.merchantId, {
          title: 'Bid Accepted',
          message: `Your bid of ₹${productData.highestBid.amount} for "${productData.name}" has been accepted!`,
          type: 'bid_accepted',
          productId,
          originatorId: farmerId,
          image: productData.images[0],
        });

        // Create payment record with frozen status
        await addDoc(collection(db, 'Payments'), {
          productId,
          farmerId: productData.farmerId,
          merchantId: productData.highestBid.merchantId,
          amount: productData.highestBid.amount,
          status: 'frozen',
          createdAt: serverTimestamp(),
        });
      } else {
        // If rejected, notify the merchant
        await createNotification(productData.highestBid.merchantId, {
          title: 'Bid Rejected',
          message: `Your bid for "${productData.name}" was not accepted.`,
          type: 'bid_rejected',
          productId,
          originatorId: farmerId,
          image: productData.images[0],
        });
      }

      return {productId, accepted: accept};
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  },
);

/**
 * Thunk: Merchant confirms product received
 */
export const confirmProductReceived = createAsyncThunk(
  'products/confirmProductReceived',
  async ({productId, merchantId}, thunkAPI) => {
    try {
      const app = getApp();
      const db = getFirestore(app);

      // Get the product
      const productRef = doc(db, 'Products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        throw new Error('Product does not exist');
      }

      const productData = productSnap.data();

      if (!productData.bidAccepted) {
        throw new Error('Bid has not been accepted yet');
      }

      if (productData.highestBid.merchantId !== merchantId) {
        throw new Error('Only the winning bidder can confirm receipt');
      }

      // Update product status
      await updateDoc(productRef, {
        productDelivered: true,
        deliveredAt: serverTimestamp(),
      });

      // Find and update payment record
      const paymentsQuery = query(
        collection(db, 'Payments'),
        where('productId', '==', productId),
        where('status', '==', 'frozen'),
      );

      const paymentsSnap = await getDocs(paymentsQuery);

      if (paymentsSnap.empty) {
        throw new Error('No payment record found');
      }

      // Update payment to released
      await updateDoc(doc(db, 'Payments', paymentsSnap.docs[0].id), {
        status: 'released',
        releasedAt: serverTimestamp(),
      });

      // Notify farmer about payment release
      await createNotification(productData.farmerId, {
        title: 'Payment Released',
        message: `Payment of ₹${productData.highestBid.amount} for "${productData.name}" has been released to you!`,
        type: 'payment_released',
        productId,
        originatorId: merchantId,
        image: productData.images[0],
      });

      return {productId};
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  },
);

/**
 * Thunk: Automatically release payment after deadline
 */
export const checkDeliveryDeadlines = createAsyncThunk(
  'products/checkDeliveryDeadlines',
  async (_, thunkAPI) => {
    try {
      const app = getApp();
      const db = getFirestore(app);

      // Find all products with accepted bids but not delivered
      const productsQuery = query(
        collection(db, 'Products'),
        where('bidAccepted', '==', true),
        where('productDelivered', '==', false),
      );

      const productsSnap = await getDocs(productsQuery);
      const now = new Date();
      const processedProducts = [];

      for (const docSnap of productsSnap.docs) {
        const productData = docSnap.data();
        const bidRespondedAt = productData.bidRespondedAt?.toDate();

        if (!bidRespondedAt) continue;

        // Check if delivery window has passed (default 48 hours)
        const deliveryWindow = 48 * 60 * 60 * 1000; // 48 hours in ms
        const deadlineTime = new Date(
          bidRespondedAt.getTime() + deliveryWindow,
        );

        if (now > deadlineTime) {
          // Find frozen payment
          const paymentsQuery = query(
            collection(db, 'Payments'),
            where('productId', '==', docSnap.id),
            where('status', '==', 'frozen'),
          );

          const paymentsSnap = await getDocs(paymentsQuery);

          if (!paymentsSnap.empty) {
            // Refund to merchant - update payment to refunded
            await updateDoc(doc(db, 'Payments', paymentsSnap.docs[0].id), {
              status: 'refunded',
              refundedAt: serverTimestamp(),
              reason: 'delivery_deadline_passed',
            });

            // Update product status
            await updateDoc(doc(db, 'Products', docSnap.id), {
              status: 'expired',
              deliveryExpiredAt: serverTimestamp(),
            });

            // Notify both parties
            await createNotification(productData.highestBid.merchantId, {
              title: 'Payment Refunded',
              message: `Your payment for "${productData.name}" has been refunded due to delivery deadline expiry.`,
              type: 'payment_refunded',
              productId: docSnap.id,
              originatorId: 'system',
              image: productData.images[0],
            });

            await createNotification(productData.farmerId, {
              title: 'Delivery Deadline Missed',
              message: `The delivery deadline for "${productData.name}" has expired. Payment was refunded to buyer.`,
              type: 'delivery_expired',
              productId: docSnap.id,
              originatorId: 'system',
              image: productData.images[0],
            });

            processedProducts.push(docSnap.id);
          }
        }
      }

      return {processedProducts};
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  },
);

/**
 * Thunk: Setup real-time product listeners.
 */
export const setupProductListeners = createAsyncThunk(
  'products/setupListeners',
  async ({uid, role}, thunkAPI) => {
    try {
      cleanupProductListeners();

      const app = getApp();
      const db = getFirestore(app);
      const productsRef = collection(db, 'Products');
      let q;

      if (role.toLowerCase() === 'farmer') {
        q = query(
          productsRef,
          where('farmerId', '==', uid),
          orderBy('createdAt', 'desc'),
        );
      } else {
        q = query(
          productsRef,
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
        );
      }

      const unsubAll = onSnapshot(
        q,
        snap => {
          const list = [];
          snap.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
              ...data,
              createdAt: data.createdAt?.toDate(),
              endTime: data.endTime?.toDate(),
              bidRespondedAt: data.bidRespondedAt?.toDate(),
              deliveredAt: data.deliveredAt?.toDate(),
            });
          });
          thunkAPI.dispatch(updateProductsFromListener(list));
        },
        err => thunkAPI.dispatch(listenerError(err.message)),
      );
      productListeners.push(unsubAll);

      if (role.toLowerCase() === 'merchant') {
        const bidsQ = query(
          productsRef,
          where('highestBid.merchantId', '==', uid),
          orderBy('endTime', 'desc'),
        );
        const unsubBids = onSnapshot(
          bidsQ,
          snap => {
            const list = [];
            snap.forEach(d => {
              const data = d.data();
              list.push({
                id: d.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                endTime: data.endTime?.toDate(),
                bidRespondedAt: data.bidRespondedAt?.toDate(),
                deliveredAt: data.deliveredAt?.toDate(),
              });
            });
            thunkAPI.dispatch(updateMerchantProducts(list));
          },
          err => thunkAPI.dispatch(listenerError(err.message)),
        );
        productListeners.push(unsubBids);
      }

      // Add listener for sold products if user is farmer
      if (role.toLowerCase() === 'farmer') {
        const soldQ = query(
          productsRef,
          where('farmerId', '==', uid),
          where('status', '==', 'sold'),
        );

        const unsubSold = onSnapshot(
          soldQ,
          snap => {
            const list = [];
            snap.forEach(d => {
              const data = d.data();
              list.push({
                id: d.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                endTime: data.endTime?.toDate(),
                bidRespondedAt: data.bidRespondedAt?.toDate(),
                deliveredAt: data.deliveredAt?.toDate(),
              });
            });
            thunkAPI.dispatch(updateSoldProducts(list));
          },
          err => thunkAPI.dispatch(listenerError(err.message)),
        );
        productListeners.push(unsubSold);
      }

      return () => cleanupProductListeners();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  },
);

/**
 * Thunk: Setup real-time notifications listener.
 */
export const setupNotificationListener = createAsyncThunk(
  'products/setupNotificationListener',
  async (uid, thunkAPI) => {
    try {
      cleanupNotificationListeners();
      const app = getApp();
      const db = getFirestore(app);
      const notifRef = collection(db, 'Notifications');
      const q = query(
        notifRef,
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
      );

      console.log(`Setting up notification listener for user: ${uid}`);

      const unsub = onSnapshot(
        q,
        snap => {
          const list = [];
          snap.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
              ...data,
              createdAt: data.createdAt?.toDate(),
            });
          });
          console.log(`Received ${list.length} notifications for user: ${uid}`);
          thunkAPI.dispatch(updateNotifications(list));
        },
        err => {
          console.error(`Notification listener error for user ${uid}:`, err);
          thunkAPI.dispatch(notificationsError(err.message));
        },
      );

      notificationListeners.push(unsub);
      return unsub;
    } catch (err) {
      console.error(`Setup notification listener error for user ${uid}:`, err);
      return thunkAPI.rejectWithValue(err.message);
    }
  },
);

// ───────────────────────────────────────────────────────────────
// Cleanup utilities
// ───────────────────────────────────────────────────────────────
export const cleanupProductListeners = () => {
  productListeners.forEach(fn => {
    if (typeof fn === 'function') {
      fn();
    }
  });
  productListeners = [];
};

export const cleanupNotificationListeners = () => {
  notificationListeners.forEach(fn => {
    if (typeof fn === 'function') {
      fn();
    }
  });
  notificationListeners = [];
};

// ───────────────────────────────────────────────────────────────
// Initial state
// ───────────────────────────────────────────────────────────────
const initialState = {
  products: [],
  merchantProducts: [],
  soldProducts: [],
  notifications: [],

  error: null,
  listenerStatus: null,
  notificationListenerStatus: null,
  notificationError: null,

  uploadStatus: 'idle',
  uploadError: null,

  bidStatus: 'idle',
  bidError: null,

  bidResponseStatus: 'idle',
  bidResponseError: null,

  productReceivedStatus: 'idle',
  productReceivedError: null,
};

// ───────────────────────────────────────────────────────────────
// Create slice
// ───────────────────────────────────────────────────────────────
const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    clearBidStatus: state => {
      state.bidStatus = 'idle';
      state.bidError = null;
    },
    clearBidResponseStatus: state => {
      state.bidResponseStatus = 'idle';
      state.bidResponseError = null;
    },
    clearProductReceivedStatus: state => {
      state.productReceivedStatus = 'idle';
      state.productReceivedError = null;
    },
    updateProductsFromListener: (state, action) => {
      state.products = action.payload;
    },
    updateMerchantProducts: (state, action) => {
      state.merchantProducts = action.payload;
    },
    updateSoldProducts: (state, action) => {
      state.soldProducts = action.payload;
    },
    listenerError: (state, action) => {
      state.error = action.payload;
      state.listenerStatus = 'error';
    },
    cleanupListeners: state => {
      state.listenerStatus = 'cleaned';
    },
  },
  extraReducers: builder => {
    builder
      // setupProductListeners
      .addCase(setupProductListeners.pending, state => {
        state.listenerStatus = 'pending';
        state.error = null;
      })
      .addCase(setupProductListeners.fulfilled, state => {
        state.listenerStatus = 'active';
      })
      .addCase(setupProductListeners.rejected, (state, action) => {
        state.listenerStatus = 'error';
        state.error = action.payload;
      })

      // setupNotificationListener
      .addCase(setupNotificationListener.pending, state => {
        state.notificationListenerStatus = 'pending';
        state.notificationError = null;
      })
      .addCase(setupNotificationListener.fulfilled, state => {
        state.notificationListenerStatus = 'active';
      })
      .addCase(setupNotificationListener.rejected, (state, action) => {
        state.notificationListenerStatus = 'error';
        state.notificationError = action.payload;
      })

      // uploadProduct
      .addCase(uploadProduct.pending, state => {
        state.uploadStatus = 'pending';
        state.uploadError = null;
      })
      .addCase(uploadProduct.fulfilled, (state, action) => {
        state.uploadStatus = 'succeeded';
        state.products.unshift(action.payload);
      })
      .addCase(uploadProduct.rejected, (state, action) => {
        state.uploadStatus = 'failed';
        state.uploadError = action.payload;
      })

      // placeBid
      .addCase(placeBid.pending, state => {
        state.bidStatus = 'pending';
        state.bidError = null;
      })
      .addCase(placeBid.fulfilled, state => {
        state.bidStatus = 'succeeded';
      })
      .addCase(placeBid.rejected, (state, action) => {
        state.bidStatus = 'failed';
        state.bidError = action.payload;
      })

      // markNotificationAsRead
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        // Update the notification in state
        state.notifications = state.notifications.map(notification =>
          notification.id === action.payload
            ? {...notification, read: true}
            : notification,
        );
      })

      // respondToBid
      .addCase(respondToBid.pending, state => {
        state.bidResponseStatus = 'pending';
        state.bidResponseError = null;
      })
      .addCase(respondToBid.fulfilled, state => {
        state.bidResponseStatus = 'succeeded';
      })
      .addCase(respondToBid.rejected, (state, action) => {
        state.bidResponseStatus = 'failed';
        state.bidResponseError = action.payload;
      })

      // confirmProductReceived
      .addCase(confirmProductReceived.pending, state => {
        state.productReceivedStatus = 'pending';
        state.productReceivedError = null;
      })
      .addCase(confirmProductReceived.fulfilled, state => {
        state.productReceivedStatus = 'succeeded';
      })
      .addCase(confirmProductReceived.rejected, (state, action) => {
        state.productReceivedStatus = 'failed';
        state.productReceivedError = action.payload;
      })

      // notification actions
      .addCase(updateNotifications, (state, action) => {
        state.notifications = action.payload;
      })
      .addCase(notificationsError, (state, action) => {
        state.notificationError = action.payload;
      });
  },
});

// ───────────────────────────────────────────────────────────────
// Export slice reducer & actions
// ───────────────────────────────────────────────────────────────
export const {
  clearError,
  clearBidStatus,
  clearBidResponseStatus,
  clearProductReceivedStatus,
  updateProductsFromListener,
  updateMerchantProducts,
  updateSoldProducts,
  listenerError,
  cleanupListeners,
} = productSlice.actions;

export default productSlice.reducer;
