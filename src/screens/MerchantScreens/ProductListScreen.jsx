import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setupProductListeners } from '../../redux/slices/productSlice';
import { useNavigation } from '@react-navigation/native';

const ProductListScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);
  const { items: products, loading, error } = useSelector(state => state.products);

  useEffect(() => {
    const unsubscribe = dispatch(setupProductListeners(user.uid, user.role));
    return unsubscribe;
  }, [dispatch, user.uid, user.role]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <Text style={styles.error}>{error}</Text>;

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
      data={products}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      numColumns={2}
    />
  );
};

const styles = StyleSheet.create({
  list: { padding: 10 },
  card: {
    flex: 1,
    margin: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2
  },
  image: { width: '100%', height: 120 },
  info: { padding: 10 },
  title: { fontSize: 16, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: 'red', textAlign: 'center', marginTop: 20 }
});

export default ProductListScreen;