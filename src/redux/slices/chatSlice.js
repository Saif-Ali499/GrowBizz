// src/redux/slices/chatSlice.js
import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
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
  orderBy,
} from '@react-native-firebase/firestore';

const db = getFirestore();

export function makeChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export async function ensureChatDoc(chatId, userA, userB) {
  try {
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
  } catch (error) {
    console.error('ensureChatDoc error:', error);
    throw error;
  }
}

export const setupChatListeners = createAsyncThunk(
  'chat/setupChatListeners',
  async (userId, {dispatch, rejectWithValue}) => {
    try {
      if (!userId) {
        throw new Error('User ID is required for chat listeners');
      }

      const chatsQ = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId),
        orderBy('lastTimestamp', 'desc'),
      );

      const unsubscribe = onSnapshot(
        chatsQ,
        snapshot => {
          // Add comprehensive null/undefined checks
          if (!snapshot) {
            console.warn('Chat snapshot returned null');
            dispatch(setChats([]));
            return;
          }

          if (!snapshot.docs) {
            console.warn('Chat snapshot has no docs property');
            dispatch(setChats([]));
            return;
          }

          try {
            const chats = snapshot.docs
              .map(docSnap => {
                if (!docSnap.exists()) {
                  return null;
                }
                return {
                  id: docSnap.id,
                  ...docSnap.data(),
                };
              })
              .filter(Boolean); // Remove any null entries

            dispatch(setChats(chats));
          } catch (mapError) {
            console.error('Error mapping chat docs:', mapError);
            dispatch(setChats([]));
          }
        },
        error => {
          console.error('Chat listener error:', error);
          dispatch(setChatError(error.message || 'Failed to load chats'));
          dispatch(setChats([]));
        },
      );

      return unsubscribe;
    } catch (error) {
      console.error('setupChatListeners error:', error);
      return rejectWithValue(error.message || 'Failed to setup chat listeners');
    }
  },
);

export const setupMessageListener = createAsyncThunk(
  'chat/setupMessageListener',
  async (chatId, {dispatch, rejectWithValue}) => {
    try {
      if (!chatId) {
        throw new Error('Chat ID is required for message listener');
      }

      const msgsRef = collection(db, 'chats', chatId, 'messages');
      const msgsQuery = query(msgsRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(
        msgsQuery,
        snapshot => {
          // Add comprehensive null/undefined checks
          if (!snapshot) {
            console.warn('Message snapshot returned null');
            dispatch(setMessages({chatId, messages: []}));
            return;
          }

          if (!snapshot.docs) {
            console.warn('Message snapshot has no docs property');
            dispatch(setMessages({chatId, messages: []}));
            return;
          }

          try {
            const messages = snapshot.docs
              .map(d => {
                if (!d.exists()) {
                  return null;
                }
                return {
                  id: d.id,
                  ...d.data(),
                };
              })
              .filter(Boolean); // Remove any null entries

            dispatch(setMessages({chatId, messages}));
          } catch (mapError) {
            console.error('Error mapping message docs:', mapError);
            dispatch(setMessages({chatId, messages: []}));
          }
        },
        error => {
          console.error('Message listener error:', error);
          dispatch(setChatError(error.message || 'Failed to load messages'));
          dispatch(setMessages({chatId, messages: []}));
        },
      );

      return unsubscribe;
    } catch (error) {
      console.error('setupMessageListener error:', error);
      return rejectWithValue(
        error.message || 'Failed to setup message listener',
      );
    }
  },
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    {senderId, recipientId, text, imageUri, senderName, senderType},
    {rejectWithValue},
  ) => {
    try {
      if (!senderId || !recipientId) {
        throw new Error('Sender ID and Recipient ID are required');
      }

      const chatId = makeChatId(senderId, recipientId);
      const chatRef = await ensureChatDoc(chatId, senderId, recipientId);

      let imageUrl = null;
      if (imageUri) {
        try {
          const filename = `${Date.now()}.jpg`;
          const path = `chats/${chatId}/${filename}`;
          await storage().ref(path).putFile(imageUri);
          imageUrl = await storage().ref(path).getDownloadURL();
        } catch (imageError) {
          console.error('Image upload error:', imageError);
          // Continue without image if upload fails
        }
      }

      const msgData = {
        senderId,
        senderName: senderName || 'Unknown User',
        senderType: senderType || 'user',
        text: text?.trim() || null,
        imageUrl,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), msgData);

      // Update chat document with last message info
      await setDoc(
        chatRef,
        {
          lastMessage: text?.trim() || (imageUrl ? '📷 Photo' : ''),
          lastTimestamp: serverTimestamp(),
        },
        {merge: true},
      );

      // Get recipient details for better notification
      let recipientName = 'Unknown User';
      let recipientType = 'user';
      try {
        const recipientDoc = await getDoc(doc(db, 'users', recipientId));
        if (recipientDoc.exists()) {
          const recipientData = recipientDoc.data();
          recipientName =
            recipientData.name ||
            recipientData.displayName ||
            recipientData.email ||
            'Unknown User';
          recipientType = recipientData.userType || 'user';
        }
      } catch (error) {
        console.warn('Could not fetch recipient details:', error);
      }

      // Create notification for recipient
      try {
        const notificationData = {
          type: 'chat',
          recipientId,
          originatorId: senderId,
          chatId,
          title: `New message from ${senderName}`,
          message: text?.trim() || '📷 Photo',
          senderName: senderName || 'Unknown User',
          senderType: senderType || 'user',
          read: false,
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'notifications'), notificationData);
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
        // Don't fail the entire message send if notification fails
      }

      return {chatId, msg: msgData};
    } catch (err) {
      console.error('sendMessage error:', err);
      return rejectWithValue(err.message || 'Failed to send message');
    }
  },
);

export const deleteChat = createAsyncThunk(
  'chat/deleteChat',
  async (chatId, {dispatch, rejectWithValue}) => {
    try {
      if (!chatId) {
        throw new Error('Chat ID is required for deletion');
      }

      const msgsRef = collection(db, 'chats', chatId, 'messages');
      const snapshot = await getDocs(msgsRef);

      // Check if snapshot exists and has docs
      if (snapshot && snapshot.docs) {
        const batch = writeBatch(db);

        // Delete all messages
        snapshot.docs.forEach(docSnap => {
          if (docSnap.exists()) {
            batch.delete(docSnap.ref);
          }
        });

        // Delete chat document
        const chatRef = doc(db, 'chats', chatId);
        batch.delete(chatRef);

        await batch.commit();
      }

      dispatch(removeChatFromState(chatId));
      return chatId;
    } catch (err) {
      console.error('deleteChat error', err);
      return rejectWithValue(err.message || 'Failed to delete chat');
    }
  },
);

// Helper function to create a new chat (useful for starting chats from product details)
export const createNewChat = createAsyncThunk(
  'chat/createNewChat',
  async ({userId, otherUserId, initialMessage}, {rejectWithValue}) => {
    try {
      if (!userId || !otherUserId) {
        throw new Error('Both user IDs are required to create a chat');
      }

      const chatId = makeChatId(userId, otherUserId);
      await ensureChatDoc(chatId, userId, otherUserId);

      if (initialMessage) {
        // Get user details for better message context
        let senderName = 'Unknown User';
        let senderType = 'user';
        try {
          const senderDoc = await getDoc(doc(db, 'users', userId));
          if (senderDoc.exists()) {
            const senderData = senderDoc.data();
            senderName =
              senderData.name ||
              senderData.displayName ||
              senderData.email ||
              'Unknown User';
            senderType = senderData.userType || 'user';
          }
        } catch (error) {
          console.warn('Could not fetch sender details:', error);
        }

        const msgData = {
          senderId: userId,
          senderName,
          senderType,
          text: initialMessage,
          imageUrl: null,
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'chats', chatId, 'messages'), msgData);

        // Update chat with initial message
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(
          chatRef,
          {
            lastMessage: initialMessage,
            lastTimestamp: serverTimestamp(),
          },
          {merge: true},
        );

        // Create notification for the other user
        try {
          await addDoc(collection(db, 'notifications'), {
            type: 'chat',
            recipientId: otherUserId,
            originatorId: userId,
            chatId,
            title: `New message from ${senderName}`,
            message: initialMessage,
            senderName,
            senderType,
            read: false,
            createdAt: serverTimestamp(),
          });
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError);
        }
      }

      return {chatId, otherUserId};
    } catch (err) {
      console.error('createNewChat error:', err);
      return rejectWithValue(err.message || 'Failed to create new chat');
    }
  },
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chats: [],
    messages: {},
    loading: false,
    error: null,
  },
  reducers: {
    setChats(state, action) {
      state.chats = Array.isArray(action.payload) ? action.payload : [];
    },
    setMessages(state, action) {
      const {chatId, messages} = action.payload;
      if (chatId && Array.isArray(messages)) {
        state.messages[chatId] = messages;
      }
    },
    removeChatFromState(state, action) {
      const chatId = action.payload;
      if (chatId) {
        state.chats = state.chats.filter(c => c.id !== chatId);
        delete state.messages[chatId];
      }
    },
    clearChatError(state) {
      state.error = null;
    },
    setChatError(state, action) {
      state.error = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(setupChatListeners.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setupChatListeners.fulfilled, state => {
        state.loading = false;
      })
      .addCase(setupChatListeners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to setup chat listeners';
      })
      .addCase(setupMessageListener.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setupMessageListener.fulfilled, state => {
        state.loading = false;
      })
      .addCase(setupMessageListener.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to setup message listener';
      })
      .addCase(sendMessage.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, state => {
        state.loading = false;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to send message';
      })
      .addCase(createNewChat.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewChat.fulfilled, state => {
        state.loading = false;
      })
      .addCase(createNewChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create new chat';
      })
      .addCase(deleteChat.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteChat.fulfilled, state => {
        state.loading = false;
      })
      .addCase(deleteChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to delete chat';
      });
  },
});

export const {
  setChats,
  setMessages,
  removeChatFromState,
  clearChatError,
  setChatError,
} = chatSlice.actions;

export default chatSlice.reducer;
