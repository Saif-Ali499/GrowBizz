// src/redux/slices/chatSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import storage from '@react-native-firebase/storage';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  writeBatch,
} from '@react-native-firebase/firestore';

const db = getFirestore();

export function makeChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export async function ensureChatDoc(chatId, userA, userB) {
  const chatRef = doc(db, 'chats', chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists()) {
    await setDoc(chatRef, {
      participants: [userA, userB],
      lastMessage: null,
      lastTimestamp: serverTimestamp(),
    });
  }
  return chatRef;
}

export const setupChatListeners = createAsyncThunk(
  'chat/setupChatListeners',
  async (userId, { dispatch }) => {
    const chatsQ = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );
    const unsubscribe = onSnapshot(chatsQ, snapshot => {
      const chats = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      dispatch(setChats(chats));
    });
    return unsubscribe;
  }
);

export const setupMessageListener = createAsyncThunk(
  'chat/setupMessageListener',
  async (chatId, { dispatch }) => {
    const msgsRef = collection(db, 'chats', chatId, 'messages');
    const unsubscribe = onSnapshot(msgsRef, snapshot => {
      const messages = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return ta - tb;
        });
      dispatch(setMessages({ chatId, messages }));
    });
    return unsubscribe;
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ senderId, recipientId, text, imageUri }, { rejectWithValue }) => {
    try {
      const chatId = makeChatId(senderId, recipientId);
      const chatRef = await ensureChatDoc(chatId, senderId, recipientId);

      let imageUrl = null;
      if (imageUri) {
        const filename = `${Date.now()}.jpg`;
        const path = `chats/${chatId}/${filename}`;
        await storage().ref(path).putFile(imageUri);
        imageUrl = await storage().ref(path).getDownloadURL();
      }

      const msgData = {
        senderId,
        text: text?.trim() || null,
        imageUrl,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'chats', chatId, 'messages'), msgData);

      await setDoc(
        chatRef,
        {
          lastMessage: text?.trim() || (imageUrl ? '📷 Photo' : ''),
          lastTimestamp: serverTimestamp(),
        },
        { merge: true }
      );

      await addDoc(collection(db, 'notifications'), {
        type: 'chat',
        recipientId,
        originatorId: senderId,
        chatId,
        title: 'New message',
        message: text?.trim() || '📷 Photo',
        read: false,
        createdAt: serverTimestamp(),
      });

      return { chatId, msg: msgData };
    } catch (err) {
      console.error('sendMessage error:', err);
      return rejectWithValue(err.message);
    }
  }
);

export const deleteChat = createAsyncThunk(
  'chat/deleteChat',
  async (chatId, { dispatch, rejectWithValue }) => {
    try {
      const msgsRef = collection(db, 'chats', chatId, 'messages');
      const snapshot = await getDocs(msgsRef);
      const batch = writeBatch(db);
      snapshot.forEach(docSnap => batch.delete(docSnap.ref));

      const chatRef = doc(db, 'chats', chatId);
      batch.delete(chatRef);

      await batch.commit();
      dispatch(removeChatFromState(chatId));
      return chatId;
    } catch (err) {
      console.error('deleteChat error', err);
      return rejectWithValue(err.message);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chats: [],
    messages: {},
  },
  reducers: {
    setChats(state, action) {
      state.chats = action.payload;
    },
    setMessages(state, action) {
      const { chatId, messages } = action.payload;
      state.messages[chatId] = messages;
    },
    removeChatFromState(state, action) {
      const chatId = action.payload;
      state.chats = state.chats.filter(c => c.id !== chatId);
      delete state.messages[chatId];
    },
  },
});

export const { setChats, setMessages, removeChatFromState } = chatSlice.actions;
export default chatSlice.reducer;
