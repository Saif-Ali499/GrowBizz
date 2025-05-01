import { useEffect } from 'react';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { useDispatch } from 'react-redux';
import { fetchUserData, clearUser } from '../redux/slices/authSlice';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';

const firestore = getFirestore();
// AuthHandler.js
export default function AuthHandler() {
  const dispatch = useDispatch();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(firestore, 'Users', user.uid));
          if (!userDoc.exists) {
            await auth.signOut();
            dispatch(clearUser());
            return;
          }
          
          const userData = userDoc.data();
          dispatch(fetchUserData.fulfilled({
            ...userData,
            emailVerified: user.emailVerified
          }));
          
        } catch (error) {
          console.error(error);
          await auth.signOut();
          dispatch(clearUser());
        }
      } else {
        dispatch(clearUser());
      }
    });
    return unsubscribe;
  }, [dispatch]);

  return null;
}