import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { releaseFundsToFarmer } from '../../redux/slices/walletSlice';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { fetchProductById } from '../../redux/slices/productSlice';

const ProductDeliveryScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const dispatch = useDispatch();
  const { loading } = useSelector(state => state.wallet);
  const { currentProduct, loading: productLoading } = useSelector(state => state.products);
  
  const [farmer, setFarmer] = useState(null);
  const [farmerLoading, setFarmerLoading] = useState(false);
  
  useEffect(() => {
    // Fetch product details
    dispatch(fetchProductById(productId));
    
    // If product already in redux state, fetch farmer details immediately
    if (currentProduct?.farmerId) {
      fetchFarmerDetails(currentProduct.farmerId);
    }
  }, [dispatch, productId]);
  
  // If the product data changes or loads, fetch farmer details
  useEffect(() => {
    if (currentProduct?.farmerId && !farmer) {
      fetchFarmerDetails(currentProduct.farmerId);
    }
  }, [currentProduct]);
  
  const fetchFarmerDetails = async (farmerId) => {
    try {
      setFarmerLoading(true);
      const db = getFirestore();
      const farmerDoc = await getDoc(doc(db, 'Users', farmerId));
      
      if (farmerDoc.exists()) {
        setFarmer({
          id: farmerDoc.id,
          ...farmerDoc.data()
        });
      }
    } catch (error) {
      console.error("Error fetching farmer details:", error);
    } finally {
      setFarmerLoading(false);
    }
  };
  
  const handleConfirmDelivery = () => {
    Alert.alert(
      'Confirm Delivery',
      'Are you sure you want to confirm delivery? This will release funds to the farmer and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          style: 'destructive',
          onPress: () => processConfirmDelivery() 
        }
      ]
    );
  };
  
  const processConfirmDelivery = async () => {
    try {
      await dispatch(releaseFundsToFarmer({ productId })).unwrap();
      Alert.alert(
        'Success',
        'Delivery confirmed successfully! Funds have been released to the farmer.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('MerchantPurchases') 
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error || 'Failed to confirm delivery. Please try again.');
    }
  };
  
  if (productLoading || farmerLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }
  
  if (!currentProduct) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const isDelivered = currentProduct.deliveryStatus === 'delivered';
  const isPaymentCompleted = currentProduct.paymentStatus === 'completed';
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Delivery Confirmation</Text>
        </View>
        
        <View style={styles.productCard}>
          <Text style={styles.productName}>{currentProduct.name}</Text>
          
          {currentProduct.imageUrl ? (
            <Image 
              source={{ uri: currentProduct.imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          
          <View style={styles.productInfo}>
            <InfoRow label="Quantity" value={`${currentProduct.quantity} ${currentProduct.unit || 'kg'}`} />
            <InfoRow label="Your Bid" value={`₹${currentProduct.highestBid?.amount.toFixed(2) || 0}`} />
            <InfoRow 
              label="Payment Status" 
              value={currentProduct.paymentStatus} 
              valueStyle={{ 
                color: isPaymentCompleted ? '#4CAF50' : '#FF9800',
                fontWeight: 'bold'
              }} 
            />
            <InfoRow 
              label="Delivery Status" 
              value={currentProduct.deliveryStatus} 
              valueStyle={{ 
                color: isDelivered ? '#4CAF50' : '#FF9800',
                fontWeight: 'bold'
              }} 
            />
          </View>
        </View>
        
        {farmer && (
          <View style={styles.farmerCard}>
            <Text style={styles.sectionTitle}>Farmer Details</Text>
            <InfoRow label="Name" value={farmer.name || 'N/A'} />
            <InfoRow label="Phone" value={farmer.phone || 'N/A'} />
            <InfoRow label="Village" value={farmer.village || 'N/A'} />
          </View>
        )}
        
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>Important</Text>
          <Text style={styles.instructionText}>
            Please confirm delivery only after thoroughly inspecting the product.
            Once you confirm delivery, the funds will be released to the farmer immediately.
          </Text>
        </View>
        
        {!isDelivered && !isPaymentCompleted ? (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmDelivery}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Delivery & Release Payment</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.completedContainer}>
            <Text style={styles.completedText}>
              {isDelivered && isPaymentCompleted 
                ? "Delivery confirmed and payment completed!" 
                : "Delivery status: " + currentProduct.deliveryStatus}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper component for information rows
const InfoRow = ({ label, value, valueStyle = {} }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    color: '#888',
    fontSize: 16,
  },
  productInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  farmerCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  instructionCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#F57C00',
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5D4037',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 32,
    alignItems: 'center',
    elevation: 2,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedContainer: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  completedText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ProductDeliveryScreen;