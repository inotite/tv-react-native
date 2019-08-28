import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import ProfileButton from "../components/ProfileButton";
import { FlatList } from "react-native-gesture-handler";
import UserListItem from "../components/UserListItem/UserListItem";
import { observer } from "mobx-react";
import Text from "../components/Basic/Text";
@observer
class FriendsScreen extends React.Component {
    constructor(props) {
        super(props);
    }

    keyExtractor = (item, index) => item.id;

    renderItem = ({ item }) => {
        const { navigation } = this.props;

        return (
            <UserListItem
                onPress={() => navigation.navigate("User", { userId: item.id })}
                userId={item.id}
            />
        );
    };

    render() {
        let { user } = global.scener;
        return (
            <ScrollView style={styles.container}>
                {user.loggedIn && user.friends.length ? (
                    <FlatList
                        keyExtractor={this.keyExtractor}
                        data={user.friends}
                        renderItem={this.renderItem}
                    />
                ) : (
                    <Text>No friends</Text>
                )}
            </ScrollView>
        );
    }
}

FriendsScreen.navigationOptions = {
    title: "Friends",
    headerLeft: <ProfileButton />,
   
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 15,
        backgroundColor: "#fff"
    }
});

export default FriendsScreen;
