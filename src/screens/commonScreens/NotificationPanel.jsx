// NotificationPanel.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  setupNotificationListener,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  cleanupNotificationListeners,
} from '../../redux/slices/productSlice';

const NotificationPanel = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const user = useSelector((state) => state.auth.user);

  // Default to empty arrays/strings to avoid undefined
  const notifications = useSelector(
    (state) => state.products.notifications || []
  );
  const products = useSelector((state) => state.products.products || []);
  const loading = useSelector(
    (state) => state.products.notificationListenerStatus === 'pending'
  );
  const error = useSelector((state) => state.products.notificationError);

  const [refreshing, setRefreshing] = useState(false);

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;
    
    let unsubFn;
    dispatch(setupNotificationListener(user.uid))
      .unwrap()
      .then((fn) => {
        unsubFn = fn;
      })
      .catch((err) =>
        console.error('Notification listener setup failed:', err)
      );

    return () => {
      if (typeof unsubFn === 'function') {
        unsubFn();
      } else {
        cleanupNotificationListeners();
      }
    };
  }, [dispatch, user?.uid]);

  // Set up header with mark all as read option
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerTitle: `Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}`,
        headerRight: () => (
          unreadCount > 0 ? (
            <TouchableOpacity 
              onPress={handleMarkAllAsRead}
              style={styles.headerButton}
            >
              <Text style={styles.markAllText}>Mark All Read</Text>
            </TouchableOpacity>
          ) : null
        ),
      });
    }, [navigation, unreadCount])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (user) {
      dispatch(setupNotificationListener(user.uid)).finally(() =>
        setRefreshing(false)
      );
    } else {
      setRefreshing(false);
    }
  }, [dispatch, user]);

  const handleMarkAllAsRead = useCallback(() => {
    if (unreadCount > 0) {
      dispatch(markAllNotificationsAsRead(user.uid));
    }
  }, [dispatch, user?.uid, unreadCount]);

  const handleNotificationPress = useCallback((item) => {
    // Mark as read if not already read
    if (!item.read) {
      dispatch(markNotificationAsRead(item.id));
    }

    // Handle different notification types
    switch (item.type) {
      case 'chat':
        // Navigate to specific chat
        navigation.getParent()?.navigate('Chat', {
          screen: 'ChatScreen',
          params: { 
            chatId: item.chatId, 
            otherId: item.originatorId,
            otherUserName: item.senderName || 'Unknown User',
            otherUserType: item.senderType || 'user'
          },
        });
        break;

      case 'product':
        // New product notification: navigate to product detail if available
        const productToView = products.find((p) => p.id === item.productId);
        if (productToView) {
          navigation.navigate('ProductDetailBid', { product: productToView });
        } else {
          navigation.navigate('Home');
          Alert.alert('Info', 'Product may no longer be available. Navigating to products list.');
        }
        break;

      case 'bid':
      case 'bid_accepted':
      case 'bid_rejected':
      case 'outbid':
      case 'payment_released':
      case 'payment_refunded':
      case 'delivery_expired':
        // All other product-related notifications
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          if(user.role ==='Farmer') {
          }else{
          navigation.navigate('ProductDetailBid', { product: prod });
          }
        } else {
          Alert.alert(
            'Product Not Found',
            'This product may no longer be available. Please check the Products tab.'
          );
        }
        break;

      default:
        Alert.alert('Notification', item.message || 'No additional details available.');
    }
  }, [dispatch, navigation, products]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'chat':
        return 'chatbubble-outline';
      case 'product':
        return 'storefront-outline';
      case 'bid':
        return 'pricetag-outline';
      case 'bid_accepted':
        return 'checkmark-circle-outline';
      case 'bid_rejected':
        return 'close-circle-outline';
      case 'outbid':
        return 'trending-up-outline';
      case 'payment_released':
        return 'card-outline';
      case 'payment_refunded':
        return 'return-down-back-outline';
      case 'delivery_expired':
        return 'time-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'chat':
        return '#007AFF';
      case 'product':
        return '#4CAF50';
      case 'bid':
        return '#FF9800';
      case 'bid_accepted':
        return '#4CAF50';
      case 'bid_rejected':
        return '#F44336';
      case 'outbid':
        return '#FF5722';
      case 'payment_released':
        return '#2196F3';
      case 'payment_refunded':
        return '#9C27B0';
      case 'delivery_expired':
        return '#FF9800';
      default:
        return '#666';
    }
  };

  const renderNotificationItem = ({ item }) => {
    const timeAgo = item.createdAt
      ? formatDistanceToNow(item.createdAt.toDate?.() || item.createdAt, { addSuffix: true })
      : 'Just now';

    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationColor(item.type);

    return (
      <TouchableOpacity
        style={[styles.item, !item.read && styles.unread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name={iconName} 
            size={24} 
            color={iconColor} 
            style={styles.typeIcon}
          />
        </View>

        {item.image && (
          <View style={styles.imgWrap}>
            <Image source={{ uri: item.image }} style={styles.img} />
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title || 'Notification'}
          </Text>
          <Text style={styles.msg} numberOfLines={3}>
            {item.message || 'No message content'}
          </Text>
          <View style={styles.footer}>
            <Text style={styles.time}>{timeAgo}</Text>
            {item.type && (
              <Text style={[styles.typeLabel, { color: iconColor }]}>
                {item.type.replace('_', ' ').toUpperCase()}
              </Text>
            )}
          </View>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
          <Text style={styles.error}>Failed to load notifications</Text>
          <Text style={styles.errorDetails}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>
            You'll see updates about your chats, bids, and products here
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={16} color="white" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
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
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  error: {
    color: '#F44336',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  errorDetails: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  list: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
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
  unread: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  iconContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 2,
  },
  typeIcon: {
    // Icon styling handled by Ionicons
  },
  imgWrap: {
    justifyContent: 'flex-start',
    marginRight: 12,
  },
  img: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  msg: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    alignSelf: 'flex-start',
    marginTop: 8,
    marginLeft: 8,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  retryButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationPanel;