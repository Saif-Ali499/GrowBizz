// src/components/RatingModal.js

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AirbnbRating } from 'react-native-ratings';

const RatingModal = ({ 
  visible, 
  onClose, 
  onSubmit, 
  recipientName, 
  recipientRole,
  loading = false 
}) => {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please provide a rating before submitting.');
      return;
    }

    if (review.trim().length < 10) {
      Alert.alert('Review Required', 'Please write at least 10 characters for your review.');
      return;
    }

    onSubmit(rating, review.trim());
    
    // Reset form after submission
    setRating(5);
    setReview('');
  };

  const handleClose = () => {
    setRating(5);
    setReview('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>
            Rate {recipientName}
          </Text>
          
          <Text style={styles.subtitle}>
            How was your experience with this {recipientRole}?
          </Text>

          <View style={styles.ratingContainer}>
            <AirbnbRating
              count={5}
              reviews={['Terrible', 'Bad', 'OK', 'Good', 'Excellent']}
              defaultRating={5}
              size={30}
              onFinishRating={setRating}
              showRating={true}
              selectedColor="#FFD700"  // Yellow color for selected stars
              unSelectedColor="#C0C0C0"  // Gray color for unselected stars
              ratingContainerStyle={styles.ratingStyle}
            />
            <Text style={styles.selectedRating}>Selected rating: {rating}</Text>
          </View>

          <View style={styles.reviewContainer}>
            <Text style={styles.reviewLabel}>Write a review:</Text>
            <TextInput
              style={styles.reviewInput}
              multiline={true}
              numberOfLines={4}
              placeholder={`Share your experience with ${recipientName}...`}
              value={review}
              onChangeText={setReview}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {review.length}/200 characters
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  ratingStyle: {
    paddingVertical: 10,
  },
  selectedRating: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
  },
  reviewContainer: {
    marginBottom: 25,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#fafafa',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#007bff',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default RatingModal;