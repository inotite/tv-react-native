import React from "react";
import { Platform } from "react-native";
import { createStackNavigator, createBottomTabNavigator } from "react-navigation";

import TabBarIcon from "../components/TabBarIcon";
import HomeScreen from "../screens/HomeScreen";
import DiscoverScreen from "../screens/DiscoverScreen";
import FriendsScreen from "../screens/FriendsScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import Theme from "../constants/Theme";
import ChatScreen from "../screens/ChatScreen";
import VideoScreen from "../screens/VideoScreen";
import FaceDetectScreen from "../screens/FaceDetectScreen";

const config = Platform.select({
    web: { headerMode: "screen" },
    default: {
        defaultNavigationOptions: {
            headerTintColor: "#fff",
            headerTitleStyle: {
                fontWeight: "bold"
            },
            headerStyle: {
                backgroundColor: Theme.palette.primary.dark
            }
        }
    }
});

const HomeStack = createStackNavigator(
    {
        Home: HomeScreen,
        User: { screen: UserProfileScreen },
        Chat: { screen: ChatScreen }
    },
    config
);

HomeStack.navigationOptions = {
    tabBarLabel: "Home",
    tabBarIcon: ({ focused }) => (
        <TabBarIcon focused={focused} name={Platform.OS === "ios" ? "home" : "home"} />
    )
};

HomeStack.path = "";

const DiscoverStack = createStackNavigator(
    {
        Discover: DiscoverScreen,
        User: { screen: UserProfileScreen },
        Chat: { screen: ChatScreen }
    },
    config
);

DiscoverStack.navigationOptions = {
    tabBarLabel: "Discover",
    tabBarIcon: ({ focused }) => (
        <TabBarIcon focused={focused} name={Platform.OS === "ios" ? "tv" : "v"} />
    )
};

DiscoverStack.path = "";

const FriendsStack = createStackNavigator(
    {
        Friends: FriendsScreen,
        User: { screen: UserProfileScreen },
        Chat: { screen: ChatScreen },
    },
    config
);

FriendsStack.navigationOptions = {
    tabBarLabel: "Friends",
    tabBarIcon: ({ focused }) => (
        <TabBarIcon focused={focused} name={Platform.OS === "ios" ? "users" : "users"} />
    )
};

FriendsStack.path = "";

const tabNavigator = createBottomTabNavigator({
    HomeStack,
    DiscoverStack,
    FriendsStack,
});

tabNavigator.path = "";

export { tabNavigator, VideoScreen, FaceDetectScreen };
