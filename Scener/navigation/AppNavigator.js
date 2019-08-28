import React from 'react';
import { createAppContainer, createSwitchNavigator } from 'react-navigation';

import { tabNavigator, VideoScreen } from './MainTabNavigator';
import FaceDetectScreen from '../screens/FaceDetectScreen';

export default createAppContainer(
  createSwitchNavigator({
    // You could add another route here for authentication.
    // Read more at https://reactnavigation.org/docs/en/auth-flow.html
    Main: tabNavigator,
    Video: VideoScreen,
    Face: FaceDetectScreen,
  })
);
