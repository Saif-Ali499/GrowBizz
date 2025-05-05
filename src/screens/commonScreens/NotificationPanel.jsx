// src/components/NotificationPanel.jsx
import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { setupNotificationListener, markNotificationAsRead } from '../../redux/slices/productSlice';

const NotificationPanel = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);
  const { notifications, loading, error } = useSelector(state => state.products);
  const products = useSelector(state => state.products.items);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    const unsubscribe = dispatch(setupNotificationListener(user.uid, user.role));
    return unsubscribe;
  }, [dispatch, user.uid, user.role]);

  const handleNotificationPress = notification => {
    // mark read
    if (!notification.read) {
      dispatch(markNotificationAsRead(notification.id));
    }
    // find product in store
    const product = products.find(p => p.id === notification.productId);
    if (product) {
      navigation.navigate('ProductDetailBid', { product });
    } else {
      // product not loaded yet, could fetch or alert
      Alert.alert('Error', 'Product data not available');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.imageContainer}>
        {item.image
          ? <Image source={{ uri: item.image }} style={styles.notificationImage} />
          : <Icon name="notifications" size={40} color="#666" />}
      </View>

      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>
          {formatDistanceToNow(item.createdAt, { addSuffix: true })}
        </Text>
      </View>

      {!item.read && (
        <View style={styles.unreadIndicatorContainer}>
          <View style={styles.unreadIndicator} />
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading notifications: {error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={[...notifications].sort((a, b) => b.createdAt - a.createdAt)}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => setRefreshing(false)}
          colors={['#007AFF']}
          tintColor={'#007AFF'}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notifications found</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    backgroundColor: '#F5FAFF',
  },
  imageContainer: {
    marginRight: 15,
    justifyContent: 'center',
  },
  notificationImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadIndicatorContainer: {
    justifyContent: 'center',
    paddingLeft: 10,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});

export default NotificationPanel;
