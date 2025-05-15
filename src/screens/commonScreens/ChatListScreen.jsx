// src/screens/ChatListScreen.js
import React, { useEffect } from 'react';
import { FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setupChatListeners } from '../../redux/slices/chatSlice';
import { useNavigation } from '@react-navigation/native';

export default function ChatListScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);
  const chats = useSelector(state => state.chat.chats);

  useEffect(() => {
    let unsubscribeFn = null;
    dispatch(setupChatListeners(user.uid))
      .unwrap()
      .then(fn => { unsubscribeFn = fn; })
      .catch(err => console.error('Chat listener failed:', err));
    return () => {
      if (typeof unsubscribeFn === 'function') unsubscribeFn();
    };
  }, [dispatch, user.uid]);

  const renderItem = ({ item }) => {
    const otherId = item.participants.find(id => id !== user.uid);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          navigation.navigate('Chat', {
            screen: 'ChatScreen',
            params: { chatId: item.id, otherId },
          })
        }
      >
        <Text style={styles.title}>Chat with {otherId}</Text>
        <Text style={styles.subtitle}>{item.lastMessage}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={chats}
      keyExtractor={c => c.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={<Text>No chats yet</Text>}
    />
  );
}

const styles = StyleSheet.create({
  row: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontWeight: 'bold' },
  subtitle: { color: '#666', marginTop: 4 },
});
