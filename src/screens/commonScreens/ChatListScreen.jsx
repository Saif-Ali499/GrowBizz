// src/screens/ChatListScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { 
  FlatList, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  View,
  RefreshControl,
  Alert,
  SafeAreaView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setupChatListeners, clearChatError } from '../../redux/slices/chatSlice';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';

const db = getFirestore();

export default function ChatListScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);
  const { chats, loading, error } = useSelector(state => state.chat);
  const [userDetails, setUserDetails] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Setup chat listeners
  useEffect(() => {
    if (!user?.uid) {
      setInitialLoading(false);
      return;
    }

    let unsubscribeFn = null;
    
    const setupListeners = async () => {
      try {
        const result = await dispatch(setupChatListeners(user.uid)).unwrap();
        unsubscribeFn = result;
      } catch (err) {
        console.error('Chat listener failed:', err);
        Alert.alert(
          'Connection Error',
          'Failed to load chats. Please check your internet connection and try again.',
          [
            { text: 'OK', onPress: () => setInitialLoading(false) }
          ]
        );
      } finally {
        setInitialLoading(false);
      }
    };

    setupListeners();
    
    return () => {
      if (typeof unsubscribeFn === 'function') {
        try {
          unsubscribeFn();
        } catch (error) {
          console.warn('Error unsubscribing chat listener:', error);
        }
      }
    };
  }, [dispatch, user?.uid]);

  // Clear error when component focuses
  useFocusEffect(
    useCallback(() => {
      if (error) {
        dispatch(clearChatError());
      }
    }, [dispatch, error])
  );

  // Fetch user details for each chat participant
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!chats || !Array.isArray(chats) || chats.length === 0) {
        return;
      }

      const uniqueUserIds = new Set();
      
      // Collect all unique user IDs from chats
      chats.forEach(chat => {
        if (chat.participants && Array.isArray(chat.participants)) {
          chat.participants.forEach(participantId => {
            if (participantId && participantId !== user?.uid) {
              uniqueUserIds.add(participantId);
            }
          });
        }
      });

      // Fetch details for users we don't already have
      const newUserDetails = { ...userDetails };
      const fetchPromises = Array.from(uniqueUserIds)
        .filter(userId => !newUserDetails[userId])
        .map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              newUserDetails[userId] = {
                name: userData.name || userData.displayName || userData.email || 'Unknown User',
                email: userData.email || '',
                userType: userData.userType || 'user'
              };
            } else {
              newUserDetails[userId] = {
                name: 'Unknown User',
                email: '',
                userType: 'user'
              };
            }
          } catch (error) {
            // console.error('Error fetching user details for', userId, ':', error);
            newUserDetails[userId] = {
              name: 'Unknown User',
              email: '',
              userType: 'user'
            };
          }
        });

      if (fetchPromises.length > 0) {
        try {
          await Promise.all(fetchPromises);
          setUserDetails(newUserDetails);
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      }
    };

    fetchUserDetails();
  }, [chats, user?.uid]);

  const onRefresh = useCallback(async () => {
    if (!user?.uid) return;
    
    setRefreshing(true);
    try {
      await dispatch(setupChatListeners(user.uid)).unwrap();
    } catch (error) {
      console.error('Refresh failed:', error);
      Alert.alert('Refresh Failed', 'Could not refresh chats. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, user?.uid]);

  const renderItem = ({ item }) => {
    if (!item || !item.participants || !Array.isArray(item.participants)) {
      return null;
    }

    const otherId = item.participants.find(id => id !== user?.uid);
    if (!otherId) {
      return null;
    }

    const otherUser = userDetails[otherId];
    const displayName = otherUser?.name || otherId;
    const userTypeEmoji = otherUser?.userType === 'farmer' ? '🌾' : 
                         otherUser?.userType === 'merchant' ? '🏪' : '';
    const userTypeLabel = otherUser?.userType === 'farmer' ? 'Farmer' : 
                         otherUser?.userType === 'merchant' ? 'Merchant' : '';

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '';
      
      try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
          return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        } else {
          return date.toLocaleDateString();
        }
      } catch (error) {
        console.warn('Error formatting timestamp:', error);
        return '';
      }
    };

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          navigation.navigate('Chat', {
            screen: 'ChatScreen',
            params: { 
              chatId: item.id, 
              otherId,
              otherUserName: displayName,
              otherUserType: otherUser?.userType
            },
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userTypeEmoji || displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {displayName}
            </Text>
            {userTypeLabel && (
              <Text style={styles.userType}>{userTypeLabel}</Text>
            )}
          </View>
          <Text style={styles.subtitle} numberOfLines={2}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>
        
        <View style={styles.timestampContainer}>
          {item.lastTimestamp && (
            <Text style={styles.timestamp}>
              {formatTimestamp(item.lastTimestamp)}
            </Text>
          )}
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color="#ccc" 
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Show loading state for initial load
  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  // Show error state
  if (error && !refreshing) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
        <Text style={styles.errorTitle}>Failed to Load Chats</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show empty state
  if (!chats || !Array.isArray(chats) || chats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No chats yet</Text>
        <Text style={styles.emptyText}>
          Start a conversation by contacting someone from the products section
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={16} color="white" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item?.id || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  list: {
    padding: 16,
  },
  row: { 
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16, 
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  chatInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { 
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  userType: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500',
  },
  subtitle: { 
    color: '#666', 
    fontSize: 14,
    lineHeight: 18,
  },
  timestampContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timestamp: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  chevron: {
    marginTop: 2,
  },
  separator: {
    height: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});