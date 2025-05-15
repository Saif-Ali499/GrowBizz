// src/screens/ProductDetailBid.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  Button,
  Alert,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { placeBid } from '../../redux/slices/productSlice';
import { useNavigation } from '@react-navigation/native';
import { getApp } from '@react-native-firebase/app';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import ImageViewing from 'react-native-image-viewing';

const { width, height } = Dimensions.get('window');
const app = getApp();
const db = getFirestore(app);

const ProductDetailBid = ({ route }) => {
  const navigation = useNavigation();
  const { product } = route.params;
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  const [bidAmount, setBidAmount] = useState('');
  const [showFarmerDetails, setShowFarmerDetails] = useState(false);

  // For image viewer
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  const [farmer, setFarmer] = useState(product.farmer || null);

  // Fetch farmer details if missing
  useEffect(() => {
    if (!farmer && product.farmerId) {
      const fetchFarmer = async () => {
        try {
          const farmerRef = doc(db, 'Users', product.farmerId);
          const snap = await getDoc(farmerRef);
          if (snap.exists()) {
            const data = snap.data();
            setFarmer({ name: data.userName, email: data.email });
          }
        } catch (e) {
          console.error('Error fetching farmer details:', e);
        }
      };
      fetchFarmer();
    }
  }, [farmer, product.farmerId]);

  const currentPrice = product.highestBid?.amount ?? product.startingPrice;
  const details = product.description;
  const timeLeft = product.endTime
    ? Math.max(
        Math.ceil((new Date(product.endTime.toMillis()) - Date.now()) / (1000 * 60)),
        0
      )
    : 'N/A';

  const submitBid = async () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= currentPrice) {
      Alert.alert('Invalid Bid', 'Enter a number greater than current price');
      return;
    }
    try {
      await dispatch(
        placeBid({ productId: product.id, bidAmount: amount, merchantId: user.uid })
      ).unwrap();
      Alert.alert('Success', 'Bid placed successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to place bid');
    }
  };

  // Opens the image viewer at given index
  const openImageModal = index => {
    setSelectedIndex(index);
    setIsImageViewerVisible(true);
  };

  // Navigate into the Chat tab's ChatScreen
  const handleChat = () => {
    if (!product.farmerId) {
      Alert.alert('Error', 'Farmer ID not available for chat');
      return;
    }
    const chatId = [user.uid, product.farmerId].sort().join('_');
    navigation.navigate('Chat', {
      screen: 'ChatScreen',
      params: { chatId, otherId: product.farmerId },
    });
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <FlatList
          horizontal
          data={product.images}
          keyExtractor={(uri, idx) => idx.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity onPress={() => openImageModal(index)}>
              <Image source={{ uri: item }} style={styles.image} />
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
        />

        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.label}>Current Price: ₹{currentPrice}</Text>
        <Text style={styles.label}>Product Details: {details}</Text>
        <Text style={styles.label}>Time Left: {timeLeft} min</Text>

        <TextInput
          style={styles.input}
          placeholder="Your Bid"
          keyboardType="numeric"
          value={bidAmount}
          onChangeText={setBidAmount}
        />
        <Button title="Place Bid" onPress={submitBid} />

        <TouchableOpacity
          onPress={() => setShowFarmerDetails(p => !p)}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>
            {showFarmerDetails ? 'Hide' : 'Show'} Farmer Details
          </Text>
        </TouchableOpacity>

        {showFarmerDetails && (
          farmer ? (
            <View style={styles.farmerDetails}>
              <Text style={styles.label}>Name: {farmer.name}</Text>
              <Text style={styles.label}>Email: {farmer.email}</Text>
              <TouchableOpacity
                style={styles.emailButton}
                onPress={handleChat}
              >
                <Text style={styles.emailButtonText}>Chat with Farmer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.loadingText}>
              Loading farmer details...
            </Text>
          )
        )}
      </ScrollView>

      {/* Full-screen, zoomable image viewer */}
      <ImageViewing
        images={product.images.map(uri => ({ uri }))}
        imageIndex={selectedIndex}
        visible={isImageViewerVisible}
        onRequestClose={() => setIsImageViewerVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, alignItems: 'center' },
  image: { width: 300, height: 200, marginRight: 10, borderRadius: 10 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  label: { fontSize: 16, marginBottom: 5 },
  loadingText: { fontSize: 16, marginTop: 10 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 15,
  },
  toggleButton: {
    marginTop: 15,
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
  },
  toggleText: { color: '#fff', fontWeight: 'bold' },
  farmerDetails: {
    marginTop: 10,
    backgroundColor: '#f2f2f2',
    padding: 10,
    borderRadius: 5,
    width: '100%',
  },
  emailButton: {
    marginTop: 10,
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  emailButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default ProductDetailBid;
