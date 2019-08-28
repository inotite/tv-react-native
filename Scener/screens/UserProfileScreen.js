import React from "react";
import { observer } from "mobx-react";
import { ScrollView, StyleSheet, View } from "react-native";

import { User } from "../components/DataResolvers";
import { withTheme, Icon, Card, ListItem } from "react-native-elements";
import Theme from "../constants/Theme";
import Text from "../components/Basic/Text";
import Button from "../components/Basic/Button";
import UserAvatar from "../components/UserAvatar";
import UserListItem from "../components/UserListItem/UserListItem";
import { Conversation } from "../models/conversation.model";
import DialogInput from 'react-native-dialog-input';

@observer
class UserProfileScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isInputRoomNameDialogVisible: false,
        }
    }

    componentDidMount() {}

    render() {
        const { navigation, theme } = this.props;
        const userId = navigation.getParam("userId", global.scener.user.id);
        let hash = Conversation.generateUserIdHash([userId]);
        return (
            <User userId={userId}>
                {({ user }) =>
                    user ? (
                        <View style={styles.container}>
                            <View style={styles.userHeader}>
                                <UserAvatar rounded user={user} size={100} showScore />
                                <View style={styles.userInfo}>
                                    <Text style={styles.reverseText} h3>
                                        {user.username}
                                    </Text>
                                    <Text style={styles.reverseText}>{user.name}</Text>
                                    <View style={styles.userActions}>
                                        <Button
                                            onPress={() => {
                                                navigation.navigate("Chat", { chatId: hash });
                                            }}
                                            title="Message"
                                            icon={
                                                <Icon
                                                    type="font-awesome"
                                                    name="comment"
                                                    size={14}
                                                    color="white"
                                                    containerStyle={{ marginRight: 4 }}
                                                />
                                            }
                                        />
                                        <Button
                                            onPress={() => {
                                                this.setState({isInputRoomNameDialogVisible: true});
                                                // navigation.navigate("Video", { userIdVal: userId });
                                            }}
                                            title="Video Call"
                                            icon={
                                                <Icon
                                                    type="font-awesome"
                                                    name="video-camera"
                                                    size={14}
                                                    color="white"
                                                    containerStyle={{ marginRight: 4 }}
                                                />
                                            }
                                            containerStyle={{marginLeft: 10}}
                                        />
                                        <DialogInput isDialogVisible={this.state.isInputRoomNameDialogVisible}
                                                    title={"Scener"}
                                                    message={"Room name to join Video call"}
                                                    hintInput ={"Room name"}
                                                    submitInput={ (inputText) => {
                                                            this.setState({isInputRoomNameDialogVisible: false});
                                                            setTimeout( () => { navigation.navigate("Video", { userId: userId, roomName: inputText }) }, 1500 );
                                                        } 
                                                    }
                                                    submitText={"Connect"}
                                                    closeDialog={ () => {this.setState({isInputRoomNameDialogVisible: false})}}>
                                        </DialogInput>
                                        <Icon
                                            type="feather"
                                            reverse={true}
                                            name="user-check"
                                            size={14}
                                            color="#009900"
                                            reverseColor="white"
                                        />
                                    </View>
                                </View>
                            </View>
                            <ListItem
                                title={user.about}
                                leftIcon={
                                    <Icon
                                        containerStyle={{ width: 32 }}
                                        type="font-awesome"
                                        name="user"
                                    />
                                }
                            />
                            <ListItem
                                title={"School of Hard Knocks"}
                                leftIcon={
                                    <Icon
                                        containerStyle={{ width: 32 }}
                                        type="font-awesome"
                                        name="graduation-cap"
                                    />
                                }
                            />
                            <ListItem
                                title={"@instagram"}
                                leftIcon={
                                    <Icon
                                        containerStyle={{ width: 32 }}
                                        type="font-awesome"
                                        name="instagram"
                                    />
                                }
                            />
                            <ListItem
                                title={"website.com"}
                                leftIcon={
                                    <Icon
                                        containerStyle={{ width: 32 }}
                                        type="font-awesome"
                                        name="link"
                                    />
                                }
                            />
                            <ScrollView
                                style={styles.container}
                                contentContainerStyle={styles.contentContainer}
                            >
                                {user.followingList.map((u) => {
                                    return <UserListItem userId={u.id} key={u.id} />;
                                })}
                            </ScrollView>
                        </View>
                    ) : null
                }
            </User>
        );
    }
}
export default withTheme(UserProfileScreen);

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
