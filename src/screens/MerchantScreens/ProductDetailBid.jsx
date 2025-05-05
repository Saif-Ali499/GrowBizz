import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  Button,
  Alert,
  ScrollView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { placeBid } from '../../redux/slices/productSlice'
import { useNavigation } from '@react-navigation/native';

const ProductDetailBid = ({ route }) => {
  const navigation = useNavigation()
  const { product } = route.params;
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [bidAmount, setBidAmount] = useState('');

  const currentPrice = product.highestBid?.amount ?? product.startingPrice;
  const timeLeft = Math.ceil(product.timeRemaining / (1000 * 60));

  const submitBid = async () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= currentPrice) {
      Alert.alert('Invalid Bid', 'Enter a number greater than current price');
      return;
    }
    try {
      await dispatch(placeBid({ productId: product.id, bidAmount: amount, merchantId: user.uid })).unwrap();
      
      Alert.alert('Success', 'Bid placed successfully');
      navigation.navigate('ProductList')
    } catch (err) {
      Alert.alert('Error', err);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: product.images[0] }} style={styles.image} />
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.label}>Current Price: ₹{currentPrice}</Text>
      <Text style={styles.label}>Time Left: {timeLeft} min</Text>
      <TextInput
        style={styles.input}
        placeholder="Your Bid"
        keyboardType="numeric"
        value={bidAmount}
        onChangeText={setBidAmount}
      />
      <Button title="Place Bid" onPress={submitBid} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  image: { width: '100%', height: 250, marginBottom: 20 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  label: { fontSize: 16, marginBottom: 5 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginVertical: 15 }
});

export default ProductDetailBid;