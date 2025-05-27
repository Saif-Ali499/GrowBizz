// src/screens/ChatScreen.js
import React, { useEffect, useState, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import {
  setupMessageListener,
  sendMessage,
  deleteChat,
} from '../../redux/slices/chatSlice';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageViewing from 'react-native-image-viewing';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function ChatScreen({ navigation, route }) {
  const { chatId, otherId, otherUserName, otherUserType } = route.params;
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user, shallowEqual);

  const messages = useSelector(
    state => state.chat.messages[chatId] || [],
    shallowEqual
  );

  const [text, setText] = useState('');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const imageItems = useMemo(
    () => messages.filter(m => m.imageUrl),
    [messages]
  );

  useEffect(() => {
    let unsubscribeFn = null;
    dispatch(setupMessageListener(chatId))
      .unwrap()
      .then(fn => { unsubscribeFn = fn; })
      .catch(err => console.error('Message listener failed:', err));
    return () => {
      if (typeof unsubscribeFn === 'function') unsubscribeFn();
    };
  }, [dispatch, chatId]);

  const pickImage = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo' });
    if (res.assets?.length) {
      const uri = res.assets[0].uri;
      dispatch(
        sendMessage({ 
          senderId: user.uid, 
          recipientId: otherId, 
          imageUri: uri,
          senderName: user.name || user.displayName || user.email || 'Unknown User',
          senderType: user.userType || 'user'
        })
      );
    }
  };

  const onSend = () => {
    if (!text.trim()) return;
    dispatch(
      sendMessage({ 
        senderId: user.uid, 
        recipientId: otherId, 
        text,
        senderName: user.name || user.displayName || user.email || 'Unknown User',
        senderType: user.userType || 'user'
      })
    );
    setText('');
  };

  const onDeleteChat = () => {
    Alert.alert(
      'Delete chat?',
      'This will remove all messages and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteChat(chatId))
              .unwrap()
              .then(() => navigation.goBack())
              .catch(err => console.error(err));
          },
        },
      ]
    );
  };

  useLayoutEffect(() => {
    // Set header title to show other user's name
    const headerTitle = otherUserName || `Chat with ${otherId}`;
    const userTypeEmoji = otherUserType === 'farmer' ? '🌾' : 
                         otherUserType === 'merchant' ? '🏪' : '';
    
    navigation.setOptions({
      title: `${headerTitle} ${userTypeEmoji}`,
      headerRight: () => (
        <TouchableOpacity onPress={onDeleteChat} style={{ padding: 8 }}>
          <Ionicons name="trash-outline" size={24} color="#f00" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, onDeleteChat, otherUserName, otherUserType, otherId]);

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.msgRow,
        item.senderId === user.uid ? styles.myMsg : styles.theirMsg,
      ]}
    >
      {item.senderId !== user.uid && (
        <Text style={styles.senderName}>
          {item.senderName || 'Unknown User'}
        </Text>
      )}
      {item.text ? <Text style={styles.messageText}>{item.text}</Text> : null}
      {item.imageUrl ? (
        <TouchableOpacity
          onPress={() => {
            const idx = imageItems.findIndex(i => i.id === item.id);
            setViewerIndex(idx);
            setViewerVisible(true);
          }}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.msgImage} />
        </TouchableOpacity>
      ) : null}
      <Text style={styles.timestamp}>
        {item.createdAt ? 
          new Date(item.createdAt.toDate()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }) : 
          'Sending...'
        }
      </Text>
    </View>
  );

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12 }}
          showsVerticalScrollIndicator={false}
        />
        <View style={styles.inputRow}>
          <TouchableOpacity onPress={pickImage} style={styles.imageButton}>
            <Ionicons name="camera" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            onPress={onSend} 
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={20} color={text.trim() ? "#007AFF" : "#ccc"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ImageViewing
        images={imageItems.map(m => ({ uri: m.imageUrl }))}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  msgRow: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  myMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  theirMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  msgImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  imageButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});