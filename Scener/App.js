import { AppLoading } from "expo";
import * as Font from "expo-font";
import React, { useState } from "react";
import { Platform, StatusBar, StyleSheet, View } from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import AppNavigator from "./navigation/AppNavigator";
import { ScenerApp } from "./models/app.model";
import { ApolloProvider } from "react-apollo";
import { ThemeProvider } from "react-native-elements";
global.scener = new ScenerApp();
console.disableYellowBox = true;
import theme from "./constants/Theme";
export default function App(props) {
    const [isLoadingComplete, setLoadingComplete] = useState(false);
    if (!isLoadingComplete && !props.skipLoadingScreen) {
        return (
            <AppLoading
                startAsync={loadResourcesAsync}
                onError={handleLoadingError}
                onFinish={() => handleFinishLoading(setLoadingComplete)}
            />
        );
    } else {
        return (
            <ThemeProvider theme={theme}>
                <ApolloProvider client={global.scener.client}>
                    <View style={styles.container}>
                        {Platform.OS === "ios" && <StatusBar barStyle="default" />}
                        <AppNavigator />
                    </View>
                </ApolloProvider>
            </ThemeProvider>
        );
    }
}

async function loadResourcesAsync() {
    await Promise.all([
        Font.loadAsync({
            // This is the font that we are using for our tab bar
            ...Feather.font,
            ...FontAwesome.font,

            // We include SpaceMono because we use it in HomeScreen.js. Feel free to
            // remove this if you are not using it in your app
            "space-mono": require("./assets/fonts/SpaceMono-Regular.ttf")
        }),
        require("./assets/images/ScenerBrand.png"),
        global.scener.init()
    ]);
}

function handleLoadingError(error) {
    // In this case, you might want to report the error to your error reporting
    // service, for example Sentry
    console.warn(error);
}

function handleFinishLoading(setLoadingComplete) {
    setLoadingComplete(true);
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff"
    }
});
