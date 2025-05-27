import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getApp } from '@react-native-firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
  runTransaction
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

// Initialize Firebase instances
const app = getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Thunk: Fetch wallet transactions ascending by createdAt (matches composite index)
export const fetchTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (_, thunkAPI) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return thunkAPI.rejectWithValue('No authenticated user');

      const txCol = collection(db, 'Transactions');
      const txQ = query(
        txCol,
        where('fromUserId', '==', userId),
        orderBy('createdAt', 'asc')  // must match index
      );
      const snap = await getDocs(txQ);
      const transactions = [];
      snap.forEach(docSnap => {
        transactions.push({ id: docSnap.id, ...docSnap.data() });
      });
      return transactions;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Thunk: Initialize wallet for new user
export const initializeWallet = createAsyncThunk(
  'wallet/initialize',
  async (_, thunkAPI) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return thunkAPI.rejectWithValue('No authenticated user');

      const walletRef = doc(db, 'Wallets', userId);
      const walletSnap = await getDoc(walletRef);
      if (!walletSnap.exists()) {
        await setDoc(walletRef, {
          balance: 0,
          frozenBalance: 0,
          currency: 'INR',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return { balance: 0, frozenBalance: 0, currency: 'INR' };
      }
      return walletSnap.data();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Thunk: Fetch wallet details
export const fetchWalletDetails = createAsyncThunk(
  'wallet/fetchDetails',
  async (_, thunkAPI) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return thunkAPI.rejectWithValue('No authenticated user');

      const walletRef = doc(db, 'Wallets', userId);
      const walletSnap = await getDoc(walletRef);
      if (!walletSnap.exists()) {
        return thunkAPI.dispatch(initializeWallet()).unwrap();
      }
      return walletSnap.data();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Thunk: Add money (deposit)
export const addMoneyToWallet = createAsyncThunk(
  'wallet/addMoney',
  async ({ amount }, thunkAPI) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return thunkAPI.rejectWithValue('No authenticated user');

      const walletRef = doc(db, 'Wallets', userId);
      await runTransaction(db, async tx => {
        const wSnap = await tx.get(walletRef);
        if (!wSnap.exists()) throw new Error('Wallet not found');
        const current = wSnap.data().balance || 0;
        tx.update(walletRef, {
          balance: current + amount,
          updatedAt: new Date()
        });
      });

      const txRef = doc(db, 'Transactions', `${Date.now()}_${userId}`);
      await setDoc(txRef, {
        type: 'deposit',
        amount,
        currency: 'INR',
        fromUserId: userId,
        toUserId: null,
        status: 'completed',
        productId: null,
        createdAt: new Date(),
        completedAt: new Date(),
        metadata: { method: 'direct' }
      });

      return thunkAPI.dispatch(fetchTransactions()).unwrap();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Thunk: Freeze funds for escrow
export const freezeAmount = createAsyncThunk(
  'wallet/freezeAmount',
  async ({ amount, productId, farmerId }, thunkAPI) => {
    try {
      const merchantId = auth.currentUser?.uid;
      if (!merchantId) return thunkAPI.rejectWithValue('No authenticated user');

      const walletRef = doc(db, 'Wallets', merchantId);
      const productRef = doc(db, 'Products', productId);
      let txnId;

      await runTransaction(db, async tx => {
        const wSnap = await tx.get(walletRef);
        if (!wSnap.exists()) throw new Error('Merchant wallet not found');
        const { balance, frozenBalance = 0 } = wSnap.data();
        if (balance < amount) throw new Error('Insufficient funds');

        txnId = `escrow_${Date.now()}_${merchantId}`;
        const tDoc = doc(db, 'Transactions', txnId);

        tx.update(walletRef, {
          balance: balance - amount,
          frozenBalance: frozenBalance + amount,
          updatedAt: new Date()
        });
        tx.update(productRef, {
          paymentStatus: 'escrow',
          escrowTransactionId: txnId
        });
        tx.set(tDoc, {
          type: 'freeze',
          amount,
          currency: 'INR',
          fromUserId: merchantId,
          toUserId: farmerId,
          status: 'pending',
          productId,
          createdAt: new Date(),
          completedAt: null,
          metadata: { bidWinning: true }
        });
      });

      return { transactionId: txnId, amount };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Thunk: Release escrowed funds upon delivery
export const releaseFundsToFarmer = createAsyncThunk(
  'wallet/releaseFunds',
  async ({ productId }, thunkAPI) => {
    try {
      const merchantId = auth.currentUser?.uid;
      if (!merchantId) return thunkAPI.rejectWithValue('No authenticated user');

      const productRef = doc(db, 'Products', productId);
      const pSnap = await getDoc(productRef);
      if (!pSnap.exists()) throw new Error('Product not found');
      const { escrowTransactionId, farmerId } = pSnap.data();
      if (!escrowTransactionId) throw new Error('No escrow transaction');

      const tRef = doc(db, 'Transactions', escrowTransactionId);
      const tSnap = await getDoc(tRef);
      if (!tSnap.exists()) throw new Error('Transaction not found');
      const { amount } = tSnap.data();

      const merchantWalletRef = doc(db, 'Wallets', merchantId);
      const farmerWalletRef = doc(db, 'Wallets', farmerId);

      await runTransaction(db, async tx => {
        const mSnap = await tx.get(merchantWalletRef);
        if (!mSnap.exists()) throw new Error('Merchant wallet missing');

        let fSnap = await tx.get(farmerWalletRef);
        if (!fSnap.exists()) {
          tx.set(farmerWalletRef, {
            balance: 0,
            frozenBalance: 0,
            currency: 'INR',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          fSnap = { data: () => ({ balance: 0, frozenBalance: 0 }) };
        }

        const mData = mSnap.data();
        const fData = fSnap.data();

        tx.update(merchantWalletRef, { frozenBalance: mData.frozenBalance - amount, updatedAt: new Date() });
        tx.update(farmerWalletRef, { balance: (fData.balance || 0) + amount, updatedAt: new Date() });
        tx.update(tRef, { status: 'completed', completedAt: new Date() });
        tx.update(productRef, { paymentStatus: 'completed', deliveryStatus: 'delivered', deliveryConfirmationDate: new Date() });
      });

      return { productId, amount };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Wallet slice
const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    balance: 0,
    frozenBalance: 0,
    currency: 'INR',
    transactions: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchTransactions.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchTransactions.fulfilled, (state, action) => { state.loading = false; state.transactions = action.payload; })
      .addCase(fetchTransactions.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(fetchWalletDetails.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchWalletDetails.fulfilled, (state, action) => { state.loading = false; Object.assign(state, action.payload); })
      .addCase(fetchWalletDetails.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(addMoneyToWallet.pending, state => { state.loading = true; state.error = null; })
      .addCase(addMoneyToWallet.fulfilled, (state, action) => { state.loading = false; state.transactions.unshift(...action.payload); })
      .addCase(addMoneyToWallet.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(freezeAmount.pending, state => { state.loading = true; state.error = null; })
      .addCase(freezeAmount.fulfilled, state => { state.loading = false; })
      .addCase(freezeAmount.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(releaseFundsToFarmer.pending, state => { state.loading = true; state.error = null; })
      .addCase(releaseFundsToFarmer.fulfilled, state => { state.loading = false; })
      .addCase(releaseFundsToFarmer.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  }
});

export default walletSlice.reducer;
