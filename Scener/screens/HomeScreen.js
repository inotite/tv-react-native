import React from "react";
import { observer } from "mobx-react";
import { Image, Platform, Button, ScrollView, StyleSheet, Text, View } from "react-native";
import ProfileButton from "../components/ProfileButton";
@observer
class HomeScreen extends React.Component {
    render() {
        return (
            <View style={styles.container}>
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.contentContainer}
                >
                    <View style={styles.welcomeContainer}>
                        <Image
                            source={
                                __DEV__
                                    ? require("../assets/images/robot-dev.png")
                                    : require("../assets/images/robot-prod.png")
                            }
                            style={styles.welcomeImage}
                        />
                    </View>

                    <View style={styles.getStartedContainer}>
                        <Text style={styles.getStartedText}>Swiping Page</Text>
                        <Text style={styles.getStartedText}>
                            {global.scener.user ? global.scener.user.username : "Not signed in"}
                        </Text>
                        <Button
                            onPress={() =>
                                global.scener.user.setProps({
                                    id: global.scener.user.id,
                                    username: "john2"
                                })
                            }
                            title="Change name"
                        />
                        <Button
                            onPress={() => {
                                    this.props.navigation.navigate("Face");
                                }
                            }
                            title="Face detect"
                        />
                    </View>
                </ScrollView>

                <View style={styles.tabBarInfoContainer}>
                    <Text style={styles.tabBarInfoText}>I love Scener</Text>
                </View>
            </View>
        );
    }
}
export default HomeScreen;

HomeScreen.navigationOptions = {
    headerLeft: <ProfileButton />,
    headerTitle: () => <Image source={require("../assets/images/ScenerBrand.png")} style={{ width: 80, height: 30 }} />
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff"
    },
    developmentModeText: {
        marginBottom: 20,
        color: "rgba(0,0,0,0.4)",
        fontSize: 14,
        lineHeight: 19,
        textAlign: "center"
    },
    contentContainer: {
        paddingTop: 30
    },
    welcomeContainer: {
        alignItems: "center",
        marginTop: 10,
        marginBottom: 20
    },
    welcomeImage: {
        width: 100,
        height: 80,
        resizeMode: "contain",
        marginTop: 3,
        marginLeft: -10
    },
    getStartedContainer: {
        alignItems: "center",
        marginHorizontal: 50
    },
    homeScreenFilename: {
        marginVertical: 7
    },
    codeHighlightText: {
        color: "rgba(96,100,109, 0.8)"
    },
    codeHighlightContainer: {
        backgroundColor: "rgba(0,0,0,0.05)",
        borderRadius: 3,
        paddingHorizontal: 4
    },
    getStartedText: {
        fontSize: 17,
        color: "rgba(96,100,109, 1)",
        lineHeight: 24,
        textAlign: "center"
    },
    tabBarInfoContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        ...Platform.select({
            ios: {
                shadowColor: "black",
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.1,
                shadowRadius: 3
            },
            android: {
                elevation: 20
            }
        }),
        alignItems: "center",
        backgroundColor: "#fbfbfb",
        paddingVertical: 20
    },
    tabBarInfoText: {
        fontSize: 17,
        color: "rgba(96,100,109, 1)",
        textAlign: "center"
    },
    navigationFilename: {
        marginTop: 5
    },
    helpContainer: {
        marginTop: 15,
        alignItems: "center"
    },
    helpLink: {
        paddingVertical: 15
    },
    helpLinkText: {
        fontSize: 14,
        color: "#2e78b7"
    }
});
