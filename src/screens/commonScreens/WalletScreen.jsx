import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWalletDetails, addMoneyToWallet } from '../../redux/slices/walletSlice';
import { getFirestore, collection, query, where, getDocs, orderBy } from '@react-native-firebase/firestore';

const WalletScreen = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { balance, frozenBalance, loading, error } = useSelector(state => state.wallet);
  
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [addMoneyVisible, setAddMoneyVisible] = useState(false);
  const [amount, setAmount] = useState('');
  
  useEffect(() => {
    dispatch(fetchWalletDetails());
    fetchTransactions();
  }, [dispatch]);
  
  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true);
      const db = getFirestore();
      const transactionsRef = collection(db, 'Transactions');
      const q = query(
        transactionsRef,
        where('fromUserId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const transactionsList = [];
      
      querySnapshot.forEach(doc => {
        transactionsList.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });
      
      setTransactions(transactionsList);
    } catch (err) {
      Alert.alert('Error', 'Failed to load transactions');
      console.error(err);
    } finally {
      setTransactionsLoading(false);
    }
  };
  
  const handleAddMoney = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    
    try {
      await dispatch(addMoneyToWallet({ amount: numAmount })).unwrap();
      setAddMoneyVisible(false);
      setAmount('');
      fetchTransactions();
      Alert.alert('Success', 'Money added to wallet successfully');
    } catch (err) {
      Alert.alert('Error', err || 'Failed to add money');
    }
  };
  
  const renderTransactionItem = ({ item }) => {
    const date = item.createdAt 
      ? new Date(item.createdAt).toLocaleString()
      : 'Unknown date';
      
    let statusColor = '#999';
    switch (item.status) {
      case 'completed':
        statusColor = '#4CAF50';
        break;
      case 'pending':
        statusColor = '#FF9800';
        break;
      case 'failed':
        statusColor = '#F44336';
        break;
    }
    
    let typeText = '';
    switch (item.type) {
      case 'deposit':
        typeText = 'Added to wallet';
        break;
      case 'freeze':
        typeText = 'Reserved for bid';
        break;
      case 'unfreeze':
        typeText = 'Released from hold';
        break;
      case 'transfer':
        typeText = 'Transfer';
        break;
      default:
        typeText = item.type;
    }
    
    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionType}>{typeText}</Text>
          <Text style={[styles.transactionStatus, { color: statusColor }]}>
            {item.status}
          </Text>
        </View>
        <Text style={styles.transactionAmount}>
          {item.type === 'deposit' ? '+' : '-'} ₹{item.amount}
        </Text>
        <Text style={styles.transactionDate}>{date}</Text>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
        
        {frozenBalance > 0 && (
          <View style={styles.frozenBalanceContainer}>
            <Text style={styles.frozenBalanceLabel}>
              Frozen Balance (in escrow):
            </Text>
            <Text style={styles.frozenBalanceAmount}>
              ₹{frozenBalance.toFixed(2)}
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.addMoneyButton}
          onPress={() => setAddMoneyVisible(true)}
        >
          <Text style={styles.addMoneyButtonText}>Add Money</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.transactionsContainer}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        {transactionsLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : transactions.length > 0 ? (
          <FlatList
            data={transactions}
            renderItem={renderTransactionItem}
            keyExtractor={item => item.id}
          />
        ) : (
          <Text style={styles.emptyText}>No transactions yet</Text>
        )}
      </View>
      
      {/* Add Money Modal */}
      <Modal
        visible={addMoneyVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddMoneyVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Money to Wallet</Text>
            
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              placeholder="Enter Amount"
              value={amount}
              onChangeText={setAmount}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setAddMoneyVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddMoney}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Add</Text>
                )}
              </TouchableOpacity>
              
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5'
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666'
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8
  },
  frozenBalanceContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 4
  },
  frozenBalanceLabel: {
    fontSize: 14,
    color: '#666'
  },
  frozenBalanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc'
  },
  addMoneyButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 16
  },
  addMoneyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  transactionsContainer: {
    flex: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 1
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  transactionStatus: {
    fontSize: 14
  },
  transactionAmount: {
    fontSize: 16,
    marginVertical: 4
  },
  transactionDate: {
    fontSize: 12,
    color: '#888'
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    fontSize: 16
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#ccc',
    marginRight: 8
  },
  addButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 8
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});

export default WalletScreen;