// screens/FarmerProductsScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { respondToBid, clearBidResponseStatus } from '../../redux/slices/productSlice';

const ProductItem = ({ product, onAccept, onReject, onViewDetails }) => {
  const currentBid = product.highestBid;
  const endTime = product.endTime ? new Date(product.endTime) : null;
  const isExpired = endTime && endTime < new Date();
  const bidAccepted = product.bidAccepted === true;

  return (
    <View style={styles.productCard}>
      <TouchableOpacity onPress={onViewDetails} style={styles.productHeader}>
        <Image 
          source={{ uri: product.images?.[0] }} 
          style={styles.thumbnail} 
          defaultSource={require('../../assets/Images/defaultImg.png')}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text>Starting Price: ₹{product.startingPrice}</Text>
          <Text style={styles.statusText}>
            Status: {" "}
            <Text style={{
              color: product.status === 'active' ? '#28a745' : 
                     product.status === 'sold' ? '#007bff' : '#dc3545',
              fontWeight: 'bold'
            }}>
              {product.status?.toUpperCase()}
            </Text>
          </Text>
          
          {endTime && (
            <Text style={isExpired ? styles.expired : {}}>
              {isExpired ? 'Ended: ' : 'Ends: '} 
              {endTime.toLocaleDateString()} {endTime.toLocaleTimeString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {currentBid ? (
        <View style={styles.bidSection}>
          <Text style={styles.bidInfo}>
            Current Bid: <Text style={styles.bidAmount}>₹{currentBid.amount}</Text>
          </Text>
          
          {product.status === 'active' && !bidAccepted && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.acceptButton]} 
                onPress={onAccept}
              >
                <Text style={styles.buttonText}>Accept Bid</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectButton]}
                onPress={onReject}
              >
                <Text style={styles.buttonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {bidAccepted && (
            <View style={styles.acceptedBanner}>
              <Text style={styles.acceptedText}>✓ Bid Accepted</Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.noBids}>No bids yet</Text>
      )}
    </View>
  );
};

const FarmerProductList = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  
  // Get data from Redux store
  const { 
    products, 
    soldProducts,
    bidResponseStatus, 
    bidResponseError 
  } = useSelector(state => state.products);
  
  const { user } = useSelector(state => state.auth);
  
  // Local state for handling tab view
  const [activeTab, setActiveTab] = useState('active');
  const [isLoading, setIsLoading] = useState(false);

  // Reset bid response status when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      dispatch(clearBidResponseStatus());
      return () => {};
    }, [dispatch])
  );

  // Watch for bid response status changes
  useEffect(() => {
    if (bidResponseStatus === 'succeeded') {
      setIsLoading(false);
      Alert.alert(
        'Success', 
        'Bid response processed successfully',
        [{ text: 'OK', onPress: () => dispatch(clearBidResponseStatus()) }]
      );
    } else if (bidResponseStatus === 'failed' && bidResponseError) {
      setIsLoading(false);
      Alert.alert('Error', bidResponseError, [
        { text: 'OK', onPress: () => dispatch(clearBidResponseStatus()) }
      ]);
    } else if (bidResponseStatus === 'pending') {
      setIsLoading(true);
    }
  }, [bidResponseStatus, bidResponseError, dispatch]);

  // Filter products based on active tab
  const getFilteredProducts = () => {
    // All products where farmerId matches current user
    const farmerProducts = products.filter(p => p.farmerId === user.uid);
    
    switch (activeTab) {
      case 'active':
        return farmerProducts.filter(p => p.status === 'active');
      case 'sold':
        return soldProducts.filter(p => p.farmerId === user.uid);
      case 'all':
      default:
        return farmerProducts;
    }
  };

  const handleAcceptBid = (product) => {
    if (!product.highestBid) {
      Alert.alert('No Bid', 'There is no bid to accept on this product.');
      return;
    }
    
    Alert.alert(
      'Accept Bid',
      `Are you sure you want to accept the bid of ₹${product.highestBid.amount} for ${product.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: () => {
            dispatch(respondToBid({
              productId: product.id,
              accept: true,
              farmerId: user.uid
            }));
          }
        }
      ]
    );
  };

  const handleRejectBid = (product) => {
    if (!product.highestBid) {
      Alert.alert('No Bid', 'There is no bid to reject on this product.');
      return;
    }
    
    Alert.alert(
      'Reject Bid',
      `Are you sure you want to reject the current bid of ₹${product.highestBid.amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          onPress: () => {
            dispatch(respondToBid({
              productId: product.id,
              accept: false,
              farmerId: user.uid
            }));
          }
        }
      ]
    );
  };

  const handleViewDetails = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const renderProductItem = ({ item }) => (
    <ProductItem 
      product={item}
      onAccept={() => handleAcceptBid(item)}
      onReject={() => handleRejectBid(item)}
      onViewDetails={() => handleViewDetails(item)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Products</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('UploadProduct')}
        >
          <Text style={styles.addButtonText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'sold' && styles.activeTab]}
          onPress={() => setActiveTab('sold')}
        >
          <Text style={[styles.tabText, activeTab === 'sold' && styles.activeTabText]}>
            Sold
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Processing bid response...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredProducts()}
          renderItem={renderProductItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'active' 
                  ? "You don't have any active products. Add a product to start receiving bids!"
                  : activeTab === 'sold' 
                  ? "You haven't sold any products yet."
                  : "You don't have any products. Add a product to start receiving bids!"}
              </Text>
              {activeTab !== 'sold' && (
                <TouchableOpacity 
                  style={styles.emptyAddButton}
                  onPress={() => navigation.navigate('UploadProduct')}
                >
                  <Text style={styles.emptyAddButtonText}>+ Add Product</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 16,
    color: '#6c757d',
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  list: {
    padding: 12,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  productHeader: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    marginLeft: 12,
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusText: {
    marginTop: 4,
  },
  bidSection: {
    padding: 12,
  },
  bidInfo: {
    fontSize: 16,
    marginBottom: 8,
  },
  bidAmount: {
    fontWeight: 'bold',
    color: '#28a745',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noBids: {
    padding: 12,
    fontStyle: 'italic',
    color: '#6c757d',
  },
  expired: {
    color: '#dc3545',
  },
  acceptedBanner: {
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  acceptedText: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyAddButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 5,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
});

export default FarmerProductList;