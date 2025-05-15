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
  const { chatId, otherId } = route.params;
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
        sendMessage({ senderId: user.uid, recipientId: otherId, imageUri: uri })
      );
    }
  };

  const onSend = () => {
    if (!text.trim()) return;
    dispatch(
      sendMessage({ senderId: user.uid, recipientId: otherId, text })
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
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={onDeleteChat} style={{ padding: 8 }}>
          <Ionicons name="trash-outline" size={24} color="#f00" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, onDeleteChat]);

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.msgRow,
        item.senderId === user.uid ? styles.myMsg : styles.theirMsg,
      ]}
    >
      {item.text ? <Text>{item.text}</Text> : null}
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
        />
        <View style={styles.inputRow}>
          <Button title="📷" onPress={pickImage} />
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
          />
          <Button title="Send" onPress={onSend} />
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
    padding: 10,
    borderRadius: 8,
    maxWidth: '80%',
  },
  myMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  theirMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
  },
  msgImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
});
