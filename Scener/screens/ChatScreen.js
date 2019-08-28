import React from "react";
import { observer } from "mobx-react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";

import { User, Conversation } from "../components/DataResolvers";
import { withTheme, Icon, Card, ListItem, Input } from "react-native-elements";
import Theme from "../constants/Theme";
import Text from "../components/Basic/Text";
import Button from "../components/Basic/Button";
import UserAvatar from "../components/UserAvatar";
import HTML from "react-native-render-html";
@observer
class ChatScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isKeyboardShowing: false,
            message: ""
        };
    }

    componentDidMount() {}

    componentWillUnmount() {}

    onMessageChange = (e) => {
        this.setState({ message: e.target.value });
    };

    sendMessage = () => {};

    render() {
        const { navigation } = this.props;
        const conversationId = navigation.getParam("chatId", null);
        return (
            <Conversation conversationId={conversationId}>
                {({ conversation }) =>
                    conversation ? (
                        <KeyboardAvoidingView
                            style={styles.container}
                            behavior="height"
                            enabled
                            keyboardVerticalOffset={84}
                        >
                            <ScrollView
                                style={styles.container}
                                contentContainerStyle={styles.contentContainer}
                            >
                                {conversation.messages.map((m) => {
                                    return <HTML html={m.body} key={m.sid} />;
                                })}
                            </ScrollView>
                            <View
                                style={{
                                    width: "auto",
                                    height: 64,
                                    padding:8,
                                    backgroundColor: "#000",
                                    flexDirection: "row",
                                    flexWrap: "nowrap",
                                    alignItems: "flex-end",
                                    justifyContent: "space-between"
                                }}
                            >
                                <Input
                                    containerStyle={{
                                        flex: 0,
                                        flexShrink: 1,
                                        flexBasis: "100%",
                                        height: 48
                                    }}
                                    inputContainerStyle={{
                                        borderRadius: 1000,
                                        backgroundColor: "#FFF"
                                    }}
                                    inputStyle={{
                                        padding: 8,
                                        height: 48
                                    }}
                                    autoFocus={true}
                                    placeholder="Say something..."
                                    value={this.state.message}
                                    onChange={this.onMessageChange}
                                />
                                <Icon
                                    containerStyle={{
                                        flex: 0,
                                        flexShrink: 0,
                                       
                                    }}
                                    size={24}
                                    name="arrow-up"
                                    type="font-awesome"
                                    color="white"
                                    reverseColor="black"
                                    reverse
                                />
                            </View>
                        </KeyboardAvoidingView>
                    ) : null
                }
            </Conversation>
        );
    }
}
export default withTheme(ChatScreen);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF"
    },
    userHeader: {
        flex: 0,
        flexGrow: 0,
        flexShrink: 1,
        flexBasis: 160,
        padding: Theme.spacing * 2,
        backgroundColor: Theme.palette.primary.darkest,
        flexDirection: "row",
        flexWrap: "nowrap",
        alignItems: "center",
        justifyContent: "space-between"
    },

    userInfo: {
        paddingLeft: Theme.spacing * 2,
        flex: 1,
        color: "#FFF",
        alignItems: "flex-start",
        justifyContent: "center",
        flexGrow: 0,
        height: "100%",
        flexShrink: 1,
        flexBasis: "100%"
    },
    userActions: {
        flex: 0,
        width: "100%",
        flexDirection: "row",
        flexWrap: "nowrap",
        alignItems: "center",
        justifyContent: "space-between"
    },
    reverseText: {
        color: "#FFF"
    }
});
