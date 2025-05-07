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
FieldValue,
} from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

const app = getApp();
const db = getFirestore(app);

// Listen for products
export const setupProductListeners = (userId, userRole) => dispatch => {
const productsCol = collection(db, 'products');
const productsQuery =
userRole === 'farmer'
? query(productsCol, where('farmerId', '==', userId))
: query(productsCol, where('status', '==', 'active'));
return onSnapshot(
productsQuery,
snapshot => {
const products = snapshot.docs.map(docSnap => ({
id: docSnap.id,
...docSnap.data(),
}));
dispatch(setProducts(products));
},
error => console.error('Product listener error:', error)
);
};

// Listen for notifications (convert Timestamp -> Date)
export const setupNotificationListener = (userId, userRole) => dispatch => {
const notificationsCol = collection(db, 'notifications');
const isMerchant = (userRole || '').toLowerCase() === 'merchant';
const notifQuery = isMerchant
? query(notificationsCol, where('recipientType', '==', 'merchant'))
: query(notificationsCol, where('recipientId', '==', userId));
return onSnapshot(
notifQuery,
snapshot => {
const notifications = snapshot.docs.map(docSnap => {
const data = docSnap.data();
return {
id: docSnap.id,
...data,
createdAt: data.createdAt?.toDate?.() ?? new Date(0),
};
});
dispatch(setNotifications(notifications));
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

// Place a bid (exclude originator from price_update)
export const placeBid = createAsyncThunk(
'products/placeBid',
async ({ productId, bidAmount, merchantId }, { rejectWithValue }) => {
try {
const productRef = doc(db, 'products', productId);
const productSnap = await getDoc(productRef);
if (!productSnap.exists()) throw new Error('Product not found');
const data = productSnap.data();
const now = Timestamp.now();
if (now.toMillis() > data.endTime.toMillis()) {
await updateDoc(productRef, {
status: 'closed',
finalPrice: data.highestBid?.amount ?? data.startingPrice,
});
return rejectWithValue('Bidding period has ended');
}
const newBid = { merchantId, amount: bidAmount, timestamp: now };
await updateDoc(productRef, {
bids: FieldValue.arrayUnion(newBid),
highestBid: newBid,
});
// Farmer notification
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
// Merchant notification (with originatorId)
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

// Upload a product (notify merchants)
export const uploadProduct = createAsyncThunk(
'products/uploadProduct',
async ({ farmerId, productData }, { rejectWithValue }) => {
try {
const now = Timestamp.now();
const endTime = Timestamp.fromMillis(
now.toMillis() + productData.duration * 3600 * 1000
);
const productsCol = collection(db, 'products');
const docRef = await addDoc(productsCol, {
farmerId,
name: productData.name,
description: productData.description,
startingPrice: productData.startingPrice,
quantity: productData.quantity,
duration: productData.duration,
images: [],
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
// ... image upload omitted for brevity ...
return { id: docRef.id, ...productData, endTime };
} catch (error) {
console.error('Upload product error:', error);
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
setProducts: (state, action) => { state.items = action.payload },
setNotifications: (state, action) => { state.notifications = action.payload },
clearProductError: state => { state.error = null },
},
extraReducers: builder => {
builder
.addCase(markNotificationAsRead.fulfilled, (state, action) => {
state.notifications = state.notifications.map(n =>
n.id === action.payload ? { ...n, read: true } : n
);
})
.addCase(placeBid.pending, state => { state.loading = true; state.error = null })
.addCase(placeBid.fulfilled, state => { state.loading = false })
.addCase(placeBid.rejected, (state, action) => { state.loading = false; state.error = action.payload })
.addCase(uploadProduct.pending, state => { state.loading = true; state.error = null })
.addCase(uploadProduct.fulfilled, state => { state.loading = false })
.addCase(uploadProduct.rejected, (state, action) => { state.loading = false; state.error = action.payload });
},
});

export const { setProducts, setNotifications, clearProductError } = productSlice.actions;
export default productSlice.reducer;