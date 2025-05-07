import React, {useEffect, useState} from 'react';
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
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {formatDistanceToNow} from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  setupNotificationListener,
  markNotificationAsRead,
} from '../../redux/slices/productSlice';

const NotificationPanel = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const {user} = useSelector(state => state.auth);
  const {notifications, loading, error} = useSelector(state => state.products);
  const products = useSelector(state => state.products.items);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsub = dispatch(setupNotificationListener(user.uid, user.role));
    return () => unsub?.(); // Cleanup
  }, [dispatch, user.uid, user.role]);

  const handleNotificationPress = item => {
    if (!item.read) dispatch(markNotificationAsRead(item.id));
    const prod = products.find(p => p.id === item.productId);
    if (prod) {
      if(user.role === 'Merchant')
        navigation.navigate('ProductDetailBid', {product: prod});
    } else {
      Alert.alert('Error', 'Product data unavailable');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  // Filter out price updates from the user who made the bid
  const filtered = notifications.filter(
    n => !(n.type === 'price_update' && n.originatorId === user.uid),
  );

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  const renderItem = ({item}) => {
    const timeAgo = formatDistanceToNow(new Date(item.createdAt), {
      addSuffix: true,
    });

    return (
      <TouchableOpacity
        style={[styles.item, !item.read && styles.unread]}
        onPress={() => handleNotificationPress(item)}>
        {item.image && (
          <View style={styles.imgWrap}>
            <Image source={{uri: item.image}} style={styles.img} />
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.title}>{item.title || 'Notification'}</Text>
          <Text style={styles.msg}>{item.message}</Text>
          <Text style={styles.time}>{timeAgo}</Text>
        </View>
        {!item.read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={sorted}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => setRefreshing(false)}
        />
      }
      ListEmptyComponent={() => (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No notifications</Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  error: {color: 'red', textAlign: 'center', margin: 20},
  list: {padding: 10},
  item: {
    flexDirection: 'row',
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  unread: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    backgroundColor: '#F5FAFF',
  },
  imgWrap: {justifyContent: 'center', marginRight: 10},
  img: {width: 50, height: 50, borderRadius: 6},
  content: {flex: 1},
  title: {fontSize: 16, fontWeight: '500', marginBottom: 4},
  msg: {fontSize: 14, color: '#666', marginBottom: 6},
  time: {fontSize: 12, color: '#999'},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  empty: {textAlign: 'center', margin: 20, color: '#999'},
});

export default NotificationPanel;
