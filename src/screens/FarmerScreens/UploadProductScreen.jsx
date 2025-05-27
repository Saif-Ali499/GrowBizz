// screens/UploadProductScreen.jsx

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Platform,
  ActionSheetIOS,
  PermissionsAndroid,
  ScrollView,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {useDispatch, useSelector} from 'react-redux';
import {uploadProduct} from '../../redux/slices/productSlice';
import {useNavigation} from '@react-navigation/native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import {getAuth} from '@react-native-firebase/auth';

const UploadProductScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const auth = getAuth();
  const user = auth.currentUser;

  // Extract upload‐specific flags from Redux
  const uploadStatus = useSelector(state => state.products.uploadStatus);
  const uploadError = useSelector(state => state.products.uploadError);

  // Local form state
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    startingPrice: '',
    quantity: '',
    grade: '',
    unitType: '',
    duration: '',
    images: [null, null], // Exactly two slots (you can expand if you want more)
  });
  const [uploadProgress, setUploadProgress] = useState(0);

  // If Redux uploadError changes, show an Alert
  useEffect(() => {
    if (uploadError) {
      Alert.alert('Upload Error', uploadError);
    }
  }, [uploadError]);

  // Request camera permission on Android
  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'App needs access to your camera to take photos',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  // Show ActionSheet on iOS or Alert on Android to pick source
  const selectImage = async index => {
    const options = {mediaType: 'photo', quality: 0.8, selectionLimit: 1};

    const handleSelection = async source => {
      try {
        let result;
        if (source === 'camera') {
          const hasPerm = await requestCameraPermission();
          if (!hasPerm) {
            Alert.alert(
              'Permission Denied',
              'Cannot open camera without permission',
            );
            return;
          }
          result = await launchCamera(options);
        } else {
          result = await launchImageLibrary(options);
        }

        if (result.didCancel) return;
        if (result.errorCode) {
          Alert.alert('Image Error', result.errorMessage);
          return;
        }
        if (result.assets?.length > 0) {
          const updated = [...productData.images];
          updated[index] = result.assets[0]; // includes { uri, fileName, etc. }
          setProductData({...productData, images: updated});
        }
      } catch (err) {
        Alert.alert('Error', err.message);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        idx => {
          if (idx === 1) handleSelection('camera');
          else if (idx === 2) handleSelection('gallery');
        },
      );
    } else {
      Alert.alert('Select Image', 'Choose image source', [
        {text: 'Camera', onPress: () => handleSelection('camera')},
        {text: 'Gallery', onPress: () => handleSelection('gallery')},
        {text: 'Cancel', style: 'cancel'},
      ]);
    }
  };

  /**
   * Upload a single image file to Firebase Storage.
   * Returns a download URL string.
   */
  const uploadImage = async (imageAsset, index, totalImages) => {
    // imageAsset.uri is a file:// URI on the device
    const filename =
      imageAsset.fileName || `product_${Date.now()}_${index}.jpg`;
    const path = `products/${user.uid}/${filename}`; // e.g. "products/uid/abc123.jpg"
    const task = storage().ref(path).putFile(imageAsset.uri);

    // Listen for state changes and update progress
    task.on('state_changed', snapshot => {
      const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      // Distribute total progress equally among all images
      const delta = percent / totalImages;
      setUploadProgress(prev => Math.min(100, prev + delta));
    });

    await task; // wait for upload to finish
    return storage().ref(path).getDownloadURL();
  };

  /**
   * Validate the form before uploading.
   */
  const validateForm = () => {
    const {
      name,
      description,
      startingPrice,
      quantity,
      duration,
      images,
      grade,
      unitType,
    } = productData;

    if (
      !name.trim() ||
      !description.trim() ||
      !startingPrice ||
      !quantity ||
      !grade.trim() ||
      !unitType ||
      !duration
    ) {
      Alert.alert('Validation Error', 'All fields are required');
      return false;
    }
    if (images.filter(img => img !== null).length < 2) {
      Alert.alert('Validation Error', 'Please upload both images');
      return false;
    }
    if (isNaN(startingPrice) || isNaN(quantity) || isNaN(duration)) {
      Alert.alert(
        'Validation Error',
        'Price, quantity, and duration must be valid numbers',
      );
      return false;
    }
    return true;
  };

  /**
   * Main handler for “Upload Product” button.
   */
  const handleUpload = async () => {
    if (!validateForm()) return;

    try {
      setUploadProgress(0);
      const validImages = productData.images.filter(img => img !== null);
      const total = validImages.length;

      // 1) Upload each image to Storage, collect URLs
      const urls = await Promise.all(
        validImages.map((img, idx) => uploadImage(img, idx, total)),
      );

      // 2) Dispatch the uploadProduct thunk
      await dispatch(
        uploadProduct({
          farmerId: user.uid,
          productData: {
            name: productData.name,
            description: productData.description,
            startingPrice: parseFloat(productData.startingPrice),
            quantity: parseInt(productData.quantity, 10),
            grade: productData.grade,
            unitType: productData.unitType,
            duration: parseInt(productData.duration, 10),
            images: urls, // array of “https://…” URLs
          },
        }),
      ).unwrap();

      setUploadProgress(100);
      Alert.alert('Success', 'Product uploaded for bidding!');
      navigation.navigate('HomeAfterUpload');
    } catch (err) {
      Alert.alert('Upload Failed', err.message || String(err));
    } finally {
      setUploadProgress(0);
    }
  };

  return (
    <ScrollView contentContainerStyle={{flexGrow: 1, backgroundColor: '#fff'}}>
      <TouchableOpacity
        style={styles.productListButton}
        onPress={() => navigation.navigate('FarmerProductList')}>
        <Text style={styles.productListText}>Your Products</Text>
      </TouchableOpacity>
      <View style={styles.container}>
        <Text style={styles.title}>Upload Product for Bidding</Text>

        <TextInput
          style={styles.input}
          placeholder="Product Name"
          value={productData.name}
          onChangeText={text => setProductData({...productData, name: text})}
        />

        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Product Description"
          multiline
          numberOfLines={4}
          value={productData.description}
          onChangeText={text =>
            setProductData({...productData, description: text})
          }
        />

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={productData.unitType}
            onValueChange={value =>
              setProductData({...productData, unitType: value})
            }>
            <Picker.Item label="Select Unit of Quantity" value="" />
            <Picker.Item label="Kilograms" value="kg" />
            <Picker.Item label="Boxes" value="box" />
            <Picker.Item label="Dozens" value="dozen" />
          </Picker>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Quantity"
          keyboardType="numeric"
          value={productData.quantity}
          onChangeText={text =>
            setProductData({...productData, quantity: text})
          }
        />

        <TextInput
          style={styles.input}
          placeholder="Grade (e.g. A, B, C)"
          value={productData.grade}
          onChangeText={text => setProductData({...productData, grade: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Starting Price For Whole Quantity (₹)"
          keyboardType="numeric"
          value={productData.startingPrice}
          onChangeText={text =>
            setProductData({...productData, startingPrice: text})
          }
        />

        <TextInput
          style={styles.input}
          placeholder="Set Bidding Duration (hours)"
          keyboardType="numeric"
          value={productData.duration}
          onChangeText={text =>
            setProductData({...productData, duration: text})
          }
        />

        <View style={styles.images}>
          {[0, 1].map(i => (
            <TouchableOpacity
              key={i}
              style={styles.imageBtn}
              onPress={() => selectImage(i)}>
              {productData.images[i] ? (
                <Image
                  source={{uri: productData.images[i].uri}}
                  style={styles.preview}
                />
              ) : (
                <Text style={styles.placeholder}>Tap to add image {i+1}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {uploadProgress > 0 && (
          <View style={styles.progressWrap}>
            <Text>Upload Progress: {Math.round(uploadProgress)}%</Text>
            <View style={styles.bar}>
              <View style={[styles.fill, {width: `${uploadProgress}%`}]} />
            </View>
          </View>
        )}

        {uploadStatus === 'pending' ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Button
            title="Upload Product"
            onPress={handleUpload}
            disabled={uploadProgress > 0}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, backgroundColor: '#fff'},
  productListButton: {
    marginTop: 10,
    height: 50,
    backgroundColor: 'orange',
    width: 200,
    alignSelf: 'center',
    padding: 10,
  },
  productListText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  multiline: {height: 100, textAlignVertical: 'top'},
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
    overflow: 'hidden',
  },
  images: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  imageBtn: {
    width: '48%',
    height: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {width: '100%', height: '100%', borderRadius: 5},
  placeholder: {color: '#888'},
  progressWrap: {marginBottom: 20},
  bar: {
    height: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
    marginTop: 5,
  },
  fill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
});

export default UploadProductScreen;
