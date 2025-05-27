import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setupProductListeners, cleanupProductListeners } from '../../redux/slices/productSlice';
import { useNavigation } from '@react-navigation/native';

const ProductListScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);

  // Instead of returning a brand‑new object each time,
  // use four separate selectors so that React‑Redux can
  // bail out of re‑renders when each slice hasn't changed.
  const products = useSelector(state => state.products.products || []);
  const merchantProducts = useSelector(state => state.products.merchantProducts || []);
  const listenerStatus = useSelector(state => state.products.listenerStatus);
  const error = useSelector(state => state.products.error);

  useEffect(() => {
    if (!user) return;

    let prodCleanupFn;
    dispatch(setupProductListeners({ uid: user.uid, role: user.role }))
      .unwrap()
      .then(fn => {
        prodCleanupFn = fn;
      })
      .catch(err => console.error('Products listener setup failed:', err));

    return () => {
      if (typeof prodCleanupFn === 'function') {
        prodCleanupFn();
      } else {
        dispatch(cleanupProductListeners());
      }
    };
  }, [dispatch, user]);

  const loading = listenerStatus === 'pending';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const currentPrice = item.highestBid?.amount ?? item.startingPrice;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ProductDetailBid', { product: item })}
      >
        <Image source={{ uri: item.images[0] }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.title}>{item.name}</Text>
          <Text>₹{currentPrice}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      ListHeaderComponent={
        <>
          <Text style={styles.heading}>All Active Products</Text>
        </>
      }
      data={products}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      numColumns={2}
      ListFooterComponent={
        user.role.toLowerCase() === 'merchant' && merchantProducts.length > 0 ? (
          <>
            <Text style={[styles.heading, { marginTop: 20 }]}>Your Bids</Text>
            <FlatList
              data={merchantProducts}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              numColumns={2}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  list: { padding: 10 },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 5,
  },
  card: {
    flex: 1,
    margin: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  image: { width: '100%', height: 120 },
  info: { padding: 10 },
  title: { fontSize: 16, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: 'red', textAlign: 'center', marginTop: 20 },
});

export default ProductListScreen;
