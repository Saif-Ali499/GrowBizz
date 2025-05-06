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
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {uploadProduct} from '../../redux/slices/productSlice';
import {useNavigation} from '@react-navigation/native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {getStorage, ref, getDownloadURL} from '@react-native-firebase/storage';

const UploadProductScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const {user} = useSelector(state => state.auth);
  const {loading, error} = useSelector(state => state.products);

  const [productData, setProductData] = useState({
    name: '',
    description: '',
    startingPrice: '',
    quantity: '',
    duration: '',
    images: [],
  });

  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (error) {
      Alert.alert('Upload Error', error);
    }
  }, [error]);

  // Request CAMERA permission at runtime on Android
  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'AgriBid needs access to your camera to take product photos',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const selectImage = async index => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
      includeBase64: false,
    };

    const handleSelection = async source => {
      try {
        let result;
        if (source === 'camera') {
          const hasPerm = await requestCameraPermission();
          if (!hasPerm) {
            Alert.alert('Permission Denied', 'Cannot open camera without permission');
            return;
          }
          result = await launchCamera(options);
        } else {
          result = await launchImageLibrary(options);
        }

        if (result.didCancel) {
          console.log('User cancelled image picker');
        } else if (result.errorCode) {
          Alert.alert('Image Error', result.errorMessage);
        } else if (result.assets?.length > 0) {
          const updatedImages = [...productData.images];
          updatedImages[index] = result.assets[0];
          setProductData({...productData, images: updatedImages});
        }
      } catch (error) {
        Alert.alert('Error', error.message);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        buttonIndex => {
          if (buttonIndex === 1) handleSelection('camera');
          else if (buttonIndex === 2) handleSelection('gallery');
        }
      );
    } else {
      Alert.alert('Select Image', 'Choose image source', [
        {text: 'Camera', onPress: () => handleSelection('camera')},
        {text: 'Gallery', onPress: () => handleSelection('gallery')},
        {text: 'Cancel', style: 'cancel'},
      ]);
    }
  };

  const uploadImage = async (image, index) => {
    const filename = image.fileName || `product_${Date.now()}_${index}.jpg`;
    const storage = getStorage();
    const reference = ref(storage, `products/${user.uid}/${filename}`);
    await reference.putFile(image.uri);
    return await getDownloadURL(reference);
  };

  const validateForm = () => {
    if (
      !productData.name.trim() ||
      !productData.description.trim() ||
      !productData.startingPrice ||
      !productData.quantity ||
      !productData.duration
    ) {
      Alert.alert('Validation Error', 'All fields are required');
      return false;
    }
    if (productData.images.length < 2) {
      Alert.alert('Validation Error', 'Please upload at least 2 images');
      return false;
    }
    if (isNaN(productData.startingPrice)) {
      Alert.alert('Validation Error', 'Starting price must be a number');
      return false;
    }
    if (isNaN(productData.quantity)) {
      Alert.alert('Validation Error', 'Quantity must be a number');
      return false;
    }
    if (isNaN(productData.duration)) {
      Alert.alert('Validation Error', 'Duration must be a number');
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!validateForm()) return;

    try {
      setUploadProgress(0);

      const imageUrls = await Promise.all(
        productData.images.map(async (image, index) => {
          const url = await uploadImage(image, index);
          setUploadProgress(prev => prev + 50 / productData.images.length);
          return url;
        }),
      );

      await dispatch(
        uploadProduct({
          farmerId: user.uid,
          productData: {
            ...productData,
            startingPrice: parseFloat(productData.startingPrice),
            quantity: parseInt(productData.quantity),
            duration: parseInt(productData.duration),
            images: imageUrls,
          },
        }),
      ).unwrap();

      Alert.alert('Success', 'Product uploaded for bidding!');
      navigation.navigate('Home');
    } catch {
      // Handled in useEffect
    } finally {
      setUploadProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Product for Bidding</Text>

      <TextInput
        style={styles.input}
        placeholder="Product Name"
        value={productData.name}
        onChangeText={text => setProductData({...productData, name: text})}
      />

      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="Product Description"
        multiline
        numberOfLines={4}
        value={productData.description}
        onChangeText={text =>
          setProductData({...productData, description: text})
        }
      />

      <TextInput
        style={styles.input}
        placeholder="Basic Price for all Quantity"
        keyboardType="numeric"
        value={productData.startingPrice}
        onChangeText={text =>
          setProductData({...productData, startingPrice: text})
        }
      />

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
        placeholder="Bidding Duration (hours)"
        keyboardType="numeric"
        value={productData.duration}
        onChangeText={text =>
          setProductData({...productData, duration: text})
        }
      />

      <View style={styles.imageContainer}>
        {[0, 1].map(index => (
          <TouchableOpacity
            key={index}
            style={styles.imageButton}
            onPress={() => selectImage(index)}>
            {productData.images[index] ? (
              <Image
                source={{uri: productData.images[index].uri}}
                style={styles.imagePreview}
              />
            ) : (
              <Text style={styles.imagePlaceholder}>
                Tap to add {index + 1}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {uploadProgress > 0 && (
        <View style={styles.progressContainer}>
          <Text>Upload Progress: {Math.round(uploadProgress)}%</Text>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, {width: `${uploadProgress}%`}]} />
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button
          title="Upload Product"
          onPress={handleUpload}
          disabled={loading || uploadProgress > 0}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
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
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  imageButton: {
    width: '48%',
    height: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  imagePlaceholder: {
    color: '#888',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
    marginTop: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
});

export default UploadProductScreen;
