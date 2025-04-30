import {Provider} from 'react-redux';
import store from './src/redux/store'; // Verify correct path
import AppNavigation from './src/components/AppNavigation';
import AuthHandler from './src/components/AuthHandler';

export default function App() {
  return (
    <Provider store={store}>
      <AuthHandler />
      <AppNavigation />
    </Provider>
  );
}
