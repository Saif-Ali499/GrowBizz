// src/screens/ProductDetailBid.js

import React, {useState, useEffect, useRef} from 'react';
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
  InteractionManager,
  ActivityIndicator,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {
  placeBid,
  confirmProductReceived,
  clearBidStatus,
  clearProductReceivedStatus,
} from '../../redux/slices/productSlice';
import {
  submitRating,
  checkRatingEligibility,
  clearRatingState,
} from '../../redux/slices/ratingSlice';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import {getApp} from '@react-native-firebase/app';
import {getFirestore, doc, getDoc} from '@react-native-firebase/firestore';
import ImageViewing from 'react-native-image-viewing';
import RatingModal from '../../components/RatingModel';
import UserRatingsDisplay from '../../components/UserRatingsDisplay';

const {width, height} = Dimensions.get('window');
const app = getApp();
const db = getFirestore(app);

const ProductDetailBid = ({route}) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const dispatch = useDispatch();
  const {user} = useSelector(state => state.auth);
  const bidStatus = useSelector(state => state.products.bidStatus);
  const bidError = useSelector(state => state.products.bidError);
  const productReceivedStatus = useSelector(
    state => state.products.productReceivedStatus,
  );
  const productReceivedError = useSelector(
    state => state.products.productReceivedError,
  );
  
  // Rating state
  const { loading: ratingLoading, success: ratingSuccess, canRate, hasRated } = useSelector(state => state.rating);

  const {product} = route.params;
  const [bidAmount, setBidAmount] = useState('');
  const [showFarmerDetails, setShowFarmerDetails] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [farmer, setFarmer] = useState(product.farmer || null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [productDeliveryConfirmed, setProductDeliveryConfirmed] = useState(false);

  // Keep a ref to know if component is mounted
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear statuses when unmounting
      dispatch(clearBidStatus());
      dispatch(clearProductReceivedStatus());
      dispatch(clearRatingState());
    };
  }, [dispatch]);

  // Check rating eligibility when component mounts
  useEffect(() => {
    if (user && product && farmer) {
      dispatch(checkRatingEligibility({
        productId: product.id,
        fromUserId: user.uid,
        toUserId: product.farmerId
      }));
    }
  }, [user, product, farmer, dispatch]);

  // Fetch farmer details if not already passed in product
  useEffect(() => {
    if (!farmer && product.farmerId) {
      const fetchFarmer = async () => {
        try {
          const farmerRef = doc(db, 'Users', product.farmerId);
          const snap = await getDoc(farmerRef);
          if (snap.exists()) {
            const data = snap.data();
            setFarmer({
              id: product.farmerId,
              name: data.userName, 
              email: data.email,
              role: data.role || 'farmer'
            });
          }
        } catch (e) {
          console.error('Error fetching farmer details:', e);
        }
      };
      fetchFarmer();
    }
  }, [farmer, product.farmerId]);

  // Compute current price and time left
  const currentPrice = product.highestBid?.amount ?? product.startingPrice;
  const details = product.description || '';
  const timeLeft = (() => {
    if (!product.endTime) return 'N/A';
    const endDate =
      product.endTime instanceof Date
        ? product.endTime
        : new Date(product.endTime);
    const msRemaining = endDate.getTime() - Date.now();
    if (msRemaining <= 0) return 0;
    return Math.ceil(msRemaining / (1000 * 60));
  })();

  // When `bidStatus` or `bidError` changes, show Alert **only if this screen is focused + mounted**
  useEffect(() => {
    if (!mountedRef.current || !isFocused) return;

    if (bidStatus === 'succeeded') {
      InteractionManager.runAfterInteractions(() => {
        Alert.alert('Success', 'Bid placed successfully', [
          {
            text: 'OK',
            onPress: () => {
              if (mountedRef.current && isFocused) {
                dispatch(clearBidStatus());
                navigation.goBack();
              }
            },
          },
        ]);
      });
    } else if (bidStatus === 'failed' && bidError) {
      InteractionManager.runAfterInteractions(() => {
        if (mountedRef.current && isFocused) {
          Alert.alert('Error', bidError);
          dispatch(clearBidStatus());
        }
      });
    }
  }, [bidStatus, bidError, isFocused, dispatch]);

  // Handle product received status changes
  useEffect(() => {
    if (!mountedRef.current || !isFocused) return;

    if (productReceivedStatus === 'succeeded') {
      InteractionManager.runAfterInteractions(() => {
        setProductDeliveryConfirmed(true);
        Alert.alert(
          'Success',
          'Product delivery confirmed. Payment released to farmer!',
          [
            {
              text: 'Rate Farmer',
              onPress: () => {
                if (mountedRef.current && isFocused) {
                  dispatch(clearProductReceivedStatus());
                  // Show rating modal
                  setShowRatingModal(true);
                }
              },
            },
            {
              text: 'Skip Rating',
              style: 'cancel',
              onPress: () => {
                if (mountedRef.current && isFocused) {
                  dispatch(clearProductReceivedStatus());
                  navigation.goBack();
                }
              },
            },
          ],
        );
      });
    } else if (productReceivedStatus === 'failed' && productReceivedError) {
      InteractionManager.runAfterInteractions(() => {
        if (mountedRef.current && isFocused) {
          Alert.alert('Error', productReceivedError);
          dispatch(clearProductReceivedStatus());
        }
      });
    }
  }, [productReceivedStatus, productReceivedError, isFocused, dispatch]);

  // Handle rating success
  useEffect(() => {
    if (ratingSuccess) {
      Alert.alert('Success', 'Rating submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            dispatch(clearRatingState());
            setShowRatingModal(false);
            navigation.goBack();
          },
        },
      ]);
    }
  }, [ratingSuccess, dispatch, navigation]);

  // Called when user taps "Place Bid."
  const submitBid = async () => {
    if(timeLeft<=0){
      Alert.alert("Bid Time Ends")
      return;
    }
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= currentPrice) {
      if (mountedRef.current && isFocused) {
        Alert.alert(
          'Invalid Bid',
          `Enter a number greater than ₹${currentPrice}`,
        );
      }
      return;
    }
    dispatch(
      placeBid({
        productId: product.id,
        bidAmount: amount,
        merchantId: user.uid,
      }),
    );
  };

  // Called when user confirms product received
  const handleProductReceived = () => {
    Alert.alert(
      'Confirm Product Receipt',
      'Are you sure you have received this product? This will release payment to the farmer.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm',
          style: 'default',
          onPress: () => {
            dispatch(
              confirmProductReceived({
                productId: product.id,
                merchantId: user.uid,
              }),
            );
          },
        },
      ],
    );
  };

  // Handle rating submission
  const handleRatingSubmit = (rating, review) => {
    if (!farmer) return;

    dispatch(submitRating({
      productId: product.id,
      fromUserId: user.uid,
      toUserId: farmer.id,
      fromRole: user.role || 'merchant',
      toRole: farmer.role || 'farmer',
      rating,
      review
    }));
  };

  // Open chat to farmer
  const handleChat = () => {
    if (!product.farmerId) {
      if (mountedRef.current && isFocused) {
        Alert.alert('Error', 'Farmer ID not available for chat');
      }
      return;
    }
    const chatId = [user.uid, product.farmerId].sort().join('_');
    navigation.navigate('Chat', {
      screen: 'ChatScreen',
      params: {chatId, otherId: product.farmerId},
    });
  };

  // Full‐screen image viewer
  const openImageModal = index => {
    setSelectedIndex(index);
    setIsImageViewerVisible(true);
  };

  // Check if current user is the winning bidder on an accepted bid
  const isWinningBidder = product.highestBid?.merchantId === user.uid;
  const isBidAccepted = product.bidAccepted === true;
  const isProductDelivered = product.productDelivered === true;
  const canConfirmDelivery =
    isWinningBidder && isBidAccepted && !isProductDelivered;

  // Show rating button if product is delivered and user can rate
  const canShowRatingButton = isWinningBidder && isProductDelivered && canRate && !hasRated;

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <FlatList
          horizontal
          data={product.images}
          keyExtractor={(uri, idx) => idx.toString()}
          renderItem={({item, index}) => (
            <TouchableOpacity onPress={() => openImageModal(index)}>
              <Image source={{uri: item}} style={styles.image} />
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          style={{marginBottom: 20}}
        />

        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.label}>Current Price: ₹{currentPrice}</Text>
        {product.status === 'active'?
        (<Text style={styles.label}>Time Left: {timeLeft} min</Text>):""
        }
        {/* Product status information */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status: </Text>
          <Text
            style={[
              styles.statusValue,
              {
                color:
                  product.status === 'active'
                    ? '#28a745'
                    : product.status === 'sold'
                    ? '#007bff'
                    : '#dc3545',
              },
            ]}>
            {product.status?.toUpperCase() || 'ACTIVE'}
          </Text>
        </View>

        {product.status === 'active' && !isWinningBidder && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Your Bid"
              keyboardType="numeric"
              value={bidAmount}
              onChangeText={setBidAmount}
            />
            <TouchableOpacity
              style={styles.bidButton}
              onPress={submitBid}
              disabled={bidStatus === 'pending'}>
              {bidStatus === 'pending' ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Place Bid</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Show "Product Received" button for accepted bids that merchant has won */}
        {canConfirmDelivery && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleProductReceived}
            disabled={productReceivedStatus === 'pending'}>
            {productReceivedStatus === 'pending' ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Confirm Product Received</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Show message if product is already delivered */}
        {isWinningBidder && isProductDelivered && (
          <View style={styles.deliveredContainer}>
            <Text style={styles.deliveredText}>
              ✓ Product delivery confirmed
            </Text>
            <Text style={styles.deliveredSubtext}>
              Payment has been released to the farmer
            </Text>
          </View>
        )}

        {/* Show rating button if eligible */}
        {canShowRatingButton && (
          <TouchableOpacity
            style={styles.ratingButton}
            onPress={() => setShowRatingModal(true)}>
            <Text style={styles.buttonText}>Rate Farmer</Text>
          </TouchableOpacity>
        )}

        {/* Show if already rated */}
        {isWinningBidder && isProductDelivered && hasRated && (
          <View style={styles.ratedContainer}>
            <Text style={styles.ratedText}>✓ You have rated this farmer</Text>
          </View>
        )}

        <ScrollView style={styles.description}>
          <Text style={styles.label}>Details</Text>
          <Text>Quantity: -  {product.quantity} ({product.unitType}es)</Text>
          <Text>Grade: -  {product.grade}</Text>
          <Text>Base Price: -  {product.startingPrice}</Text>
          <Text>{details}</Text>
        </ScrollView>

        <TouchableOpacity
          onPress={() => setShowFarmerDetails(p => !p)}
          style={styles.toggleButton}>
          <Text style={styles.toggleText}>
            {showFarmerDetails ? 'Hide' : 'Show'} Farmer Details
          </Text>
        </TouchableOpacity>

        {showFarmerDetails &&
          (farmer ? (
            <View style={styles.farmerDetails}>
              <Text style={styles.label}>Name: {farmer.name}</Text>
              <Text style={styles.label}>Email: {farmer.email}</Text>
              
              {/* Show farmer's ratings */}
              <UserRatingsDisplay 
                userId={farmer.id} 
                showTitle={true}
                maxItems={3}
              />
              
              <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
                <Text style={styles.buttonText}>Chat with Farmer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.loadingText}>Loading farmer details...</Text>
          ))}
      </ScrollView>

      {/* Rating Modal */}
      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRatingSubmit}
        recipientName={farmer?.name || 'Farmer'}
        recipientRole="farmer"
        loading={ratingLoading}
      />

      <ImageViewing
        images={product.images.map(uri => ({uri}))}
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
  wrapper: {flex: 1, backgroundColor: '#fff'},
  container: {padding: 20, alignItems: 'center'},
  image: {width: 300, height: 200, marginRight: 10, borderRadius: 10},
  name: {fontSize: 24, fontWeight: 'bold', marginBottom: 10},
  label: {fontSize: 16, marginBottom: 5},
  loadingText: {fontSize: 16, marginTop: 10},
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 15,
  },
  description: {
    height: 200,
    width: '100%',
  },
  toggleButton: {
    marginTop: 15,
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
  },
  toggleText: {color: '#fff', fontWeight: 'bold'},
  farmerDetails: {
    marginTop: 10,
    backgroundColor: '#f2f2f2',
    padding: 10,
    borderRadius: 5,
    width: '100%',
  },
  chatButton: {
    marginTop: 10,
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {color: '#fff', fontWeight: 'bold'},
  bidButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  confirmButton: {
    marginTop: 15,
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  ratingButton: {
    marginTop: 15,
    backgroundColor: '#ffc107',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deliveredContainer: {
    marginTop: 15,
    backgroundColor: '#e6fff2',
    padding: 15,
    borderRadius: 5,
    borderColor: '#28a745',
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  deliveredText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  deliveredSubtext: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  ratedContainer: {
    marginTop: 15,
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 5,
    borderColor: '#ffc107',
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  ratedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
  },
});

export default ProductDetailBid;