// src/components/UserRatingsDisplay.js

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AirbnbRating } from 'react-native-ratings';
import { fetchUserRatings, getUserAverageRating } from '../redux/slices/ratingSlice';

const RatingItem = ({ rating }) => {
  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.ratingItem}>
      <View style={styles.ratingHeader}>
        <View style={styles.ratingStars}>
          <AirbnbRating
            count={5}
            defaultRating={rating.rating}
            size={16}
            showRating={false}
            isDisabled={true}
            selectedColor="#ffd700"
          />
          <Text style={styles.ratingNumber}>({rating.rating})</Text>
        </View>
        <Text style={styles.ratingDate}>
          {formatDate(rating.createdAt)}
        </Text>
      </View>
      
      <Text style={styles.ratingRole}>
        From {rating.fromRole === 'farmer' ? 'Farmer' : 'Merchant'}
      </Text>
      
      {rating.review && (
        <Text style={styles.reviewText}>"{rating.review}"</Text>
      )}
    </View>
  );
};

const UserRatingsDisplay = ({ userId, showTitle = true, maxItems = null }) => {
  const dispatch = useDispatch();
  const { 
    ratings, 
    averageRating, 
    totalRatings, 
    loading 
  } = useSelector(state => state.rating);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserRatings({ userId }));
      dispatch(getUserAverageRating({ userId }));
    }
  }, [userId, dispatch]);

  const displayRatings = maxItems ? ratings.slice(0, maxItems) : ratings;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007bff" />
        <Text style={styles.loadingText}>Loading ratings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <Text style={styles.title}>Ratings & Reviews</Text>
      )}
      
      {totalRatings > 0 ? (
        <>
          <View style={styles.summaryContainer}>
            <View style={styles.averageContainer}>
              <Text style={styles.averageRating}>{averageRating}</Text>
              <AirbnbRating
                count={5}
                defaultRating={averageRating}
                size={20}
                showRating={false}
                isDisabled={true}
                selectedColor="#ffd700"
              />
              <Text style={styles.totalRatings}>
                ({totalRatings} review{totalRatings !== 1 ? 's' : ''})
              </Text>
            </View>
          </View>

          <FlatList
            data={displayRatings}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <RatingItem rating={item} />}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <Text style={styles.noRatings}>No detailed reviews yet</Text>
            }
          />
          
          {maxItems && ratings.length > maxItems && (
            <Text style={styles.showMoreText}>
              +{ratings.length - maxItems} more reviews
            </Text>
          )}
        </>
      ) : (
        <View style={styles.noRatingsContainer}>
          <Text style={styles.noRatings}>No ratings yet</Text>
          <Text style={styles.noRatingsSubtext}>
            Complete transactions to start receiving ratings
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  summaryContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageRating: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  totalRatings: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  ratingItem: {
    paddingVertical: 12,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumber: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  ratingDate: {
    color: '#999',
    fontSize: 12,
  },
  ratingRole: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  noRatingsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noRatings: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noRatingsSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  showMoreText: {
    textAlign: 'center',
    color: '#007bff',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
});

export default UserRatingsDisplay;