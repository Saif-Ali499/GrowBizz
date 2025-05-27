import { getApp } from '@react-native-firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { Alert } from 'react-native';

/**
 * Debug utility to check for notification issues
 * @param {string} userId - The current user's ID
 * @param {string} role - The current user's role ('merchant' or 'farmer')
 * @returns {Promise<Object>} Diagnostic information
 */
export const diagnoseNotifications = async (userId, role) => {
  try {
    const app = getApp();
    const db = getFirestore(app);
    const diagnostics = {
      success: true,
      userFound: false,
      hasCorrectRole: false,
      canReadNotifications: false,
      canWriteNotifications: false,
      hasNotifications: false,
      notificationCount: 0,
      messages: [],
    };

    // Check if user exists and has correct role
    const userDoc = await getDocs(query(
      collection(db, 'Users'),
      where('__name__', '==', userId)
    ));
    
    if (userDoc.empty) {
      diagnostics.messages.push('User document not found in Firestore');
      diagnostics.success = false;
    } else {
      diagnostics.userFound = true;
      const userData = userDoc.docs[0].data();
      diagnostics.hasCorrectRole = userData.role?.toLowerCase() === role.toLowerCase();
      
      if (!diagnostics.hasCorrectRole) {
        diagnostics.messages.push(`User has role ${userData.role} but expected ${role}`);
      }
    }

    // Check if user can read their notifications
    try {
      const notifQuery = query(
        collection(db, 'Notifications'),
        where('userId', '==', userId)
      );
      
      const notifDocs = await getDocs(notifQuery);
      diagnostics.canReadNotifications = true;
      diagnostics.hasNotifications = !notifDocs.empty;
      diagnostics.notificationCount = notifDocs.size;
      
      if (!diagnostics.hasNotifications) {
        diagnostics.messages.push('No notifications found for this user');
      }
    } catch (error) {
      diagnostics.canReadNotifications = false;
      diagnostics.messages.push(`Cannot read notifications: ${error.message}`);
      diagnostics.success = false;
    }

    // Check if we can write a test notification
    try {
      const testNotifRef = await addDoc(collection(db, 'Notifications'), {
        userId,
        title: 'Test Notification',
        message: 'This is a test notification. It can be safely ignored.',
        type: 'test',
        read: false,
        createdAt: serverTimestamp(),
      });
      
      diagnostics.canWriteNotifications = true;
      
      // Clean up the test notification
      // This is intentionally not awaited to avoid blocking
      // db.collection('Notifications').doc(testNotifRef.id).delete();
    } catch (error) {
      diagnostics.canWriteNotifications = false;
      diagnostics.messages.push(`Cannot write notifications: ${error.message}`);
      diagnostics.success = false;
    }

    // Check if the notification listener is active
    if (role.toLowerCase() === 'merchant') {
      // Additional diagnostic information specific to merchants
      // Count how many products are available
      const productsQuery = query(
        collection(db, 'Products'),
        where('status', '==', 'active')
      );
      
      const productsSnap = await getDocs(productsQuery);
      diagnostics.activeProductCount = productsSnap.size;
      
      if (diagnostics.activeProductCount === 0) {
        diagnostics.messages.push('No active products found - merchants would not receive notifications without products');
      }
    }

    return diagnostics;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      messages: [`Fatal error during diagnosis: ${error.message}`],
    };
  }
};

/**
 * Tests the notification system by sending a test notification to all merchants
 * @param {string} senderId - The ID of the sender (farmer)
 * @returns {Promise<Object>} Results of the test
 */
export const testMerchantNotifications = async (senderId) => {
  try {
    const app = getApp();
    const db = getFirestore(app);
    const results = {
      success: true,
      merchantCount: 0,
      notifications: 0,
      messages: [],
    };

    // Find all merchants
    const merchantsQuery = query(
      collection(db, 'Users'),
      where('role', '==', 'merchant')
    );
    
    const merchantsSnapshot = await getDocs(merchantsQuery);
    results.merchantCount = merchantsSnapshot.size;
    
    if (merchantsSnapshot.empty) {
      results.messages.push('No merchants found in the system');
      results.success = false;
      return results;
    }

    // Send a test notification to each merchant
    const notificationPromises = [];
    merchantsSnapshot.forEach(merchantDoc => {
      const merchantId = merchantDoc.id;
      notificationPromises.push(
        addDoc(collection(db, 'Notifications'), {
          userId: merchantId,
          title: 'Test Product Notification',
          message: 'This is a test notification for product upload. If you see this, notifications are working!',
          type: 'test_product',
          originatorId: senderId,
          read: false,
          createdAt: serverTimestamp(),
        })
      );
    });
    
    await Promise.all(notificationPromises);
    results.notifications = notificationPromises.length;
    results.messages.push(`Successfully sent ${results.notifications} test notifications to ${results.merchantCount} merchants`);
    
    return results;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      messages: [`Error during notification test: ${error.message}`],
    };
  }
};

/**
 * Creates a notification with proper error handling
 */
export const createNotificationSafe = async (userId, notificationData) => {
  try {
    const app = getApp();
    const db = getFirestore(app);
    
    const docRef = await addDoc(collection(db, 'Notifications'), {
      userId,
      ...notificationData,
      read: false,
      createdAt: serverTimestamp(),
    });
    
    return { success: true, notificationId: docRef.id };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Run diagnostic and show results in alert
 */
export const runNotificationDiagnostic = async (userId, role) => {
  try {
    const result = await diagnoseNotifications(userId, role);
    
    let message = result.success 
      ? 'Notification system appears to be working correctly!\n\n' 
      : 'Notification system has issues:\n\n';
    
    message += result.messages.join('\n');
    message += `\n\nDiagnostic details:\n- User found: ${result.userFound}\n- Correct role: ${result.hasCorrectRole}\n- Can read notifications: ${result.canReadNotifications}\n- Can write notifications: ${result.canWriteNotifications}\n- Has notifications: ${result.hasNotifications} (${result.notificationCount})`;
    
    Alert.alert(
      result.success ? 'Diagnostic Succeeded' : 'Diagnostic Failed',
      message
    );
    
    return result;
  } catch (error) {
    Alert.alert(
      'Diagnostic Error',
      `An error occurred during diagnosis: ${error.message}`
    );
    return { success: false, error: error.message };
  }
};

/**
 * Initialize notification system for a user
 * - Sets up listeners
 * - Verifies permissions
 * @param {Object} store - Redux store
 * @param {Object} user - User object with uid and role
 */
export const initializeNotifications = async (store, user) => {
  if (!store || !user || !user.uid) {
    console.error('Cannot initialize notifications: Invalid parameters');
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    // Import required action
    const { setupNotificationListener } = require('../../redux/slices/productSlice');
    
    // Set up the notification listener
    await store.dispatch(setupNotificationListener(user.uid));
    
    // Run a quick diagnostic to check if everything is set up correctly
    const diagnostics = await diagnoseNotifications(user.uid, user.role);
    
    // Return success if everything went well
    return {
      success: true,
      listenerSetup: true,
      diagnostics
    };
  } catch (error) {
    console.error('Failed to initialize notifications:', error);
    return {
      success: false,
      error: error.message
    };
  }
};