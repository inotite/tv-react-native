import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import ProfileButton from "../components/ProfileButton";
import { FlatList } from "react-native-gesture-handler";
import UserListItem from "../components/UserListItem/UserListItem";
import { observer } from "mobx-react";
import { Text, Card, Button, Icon } from "react-native-elements";
import Suggestion from "../components/DataResolvers/SuggestionResolver";

@observer
class DiscoverScreen extends React.Component {
    constructor(props) {
        super(props);
    }

    keyExtractor = (item, index) => item.id;

    renderItem = ({ item }) => {
        if (item.type == "friend") {
            return (
                <Suggestion suggestionId={item.id}>
                    {({ suggestion }) =>
                        suggestion ? (
                            <Card title={"Friendo!"} image={null}>
                                <Text style={{ marginBottom: 10 }}>
                                    The idea with React Native Elements is more about component
                                    structure than actual design.
                                </Text>
                                <Button
                                    icon={<Icon name="code" color="#ffffff" />}
                                    backgroundColor="#03A9F4"
                                    buttonStyle={{
                                        borderRadius: 0,
                                        marginLeft: 0,
                                        marginRight: 0,
                                        marginBottom: 0
                                    }}
                                    title="VIEW NOW"
                                />
                            </Card>
                        ) : null
                    }
                </Suggestion>
            );
        } else if (item.type == "random") {
            return (
                <Suggestion suggestionId={item.id}>
                    {({ suggestion }) =>
                        suggestion ? (
                            <Card title={"Random!"} image={null}>
                                <Text style={{ marginBottom: 10 }}>
                                    The idea with React Native Elements is more about component
                                    structure than actual design.
                                </Text>
                                <Button
                                    icon={<Icon name="code" color="#ffffff" />}
                                    backgroundColor="#03A9F4"
                                    buttonStyle={{
                                        borderRadius: 0,
                                        marginLeft: 0,
                                        marginRight: 0,
                                        marginBottom: 0
                                    }}
                                    title="VIEW NOW"
                                />
                            </Card>
                        ) : null
                    }
                </Suggestion>
            );
        } else if (item.type == "rsvp") {
            return (
                <Suggestion suggestionId={item.id}>
                    {({ suggestion }) =>
                        suggestion ? (
                            <Card title={"Watch Party!"} image={null}>
                                <Text style={{ marginBottom: 10 }}>
                                    The idea with React Native Elements is more about component
                                    structure than actual design.
                                </Text>
                                <Button
                                    icon={<Icon name="code" color="#ffffff" />}
                                    backgroundColor="#03A9F4"
                                    buttonStyle={{
                                        borderRadius: 0,
                                        marginLeft: 0,
                                        marginRight: 0,
                                        marginBottom: 0
                                    }}
                                    title="VIEW NOW"
                                />
                            </Card>
                        ) : null
                    }
                </Suggestion>
            );
        } else {
            return <Text>No Data</Text>;
        }
    };

    render() {
        let { user } = global.scener;
        //console.log(user.suggestions);
        return (
            <ScrollView style={styles.container}>
                {user.loggedIn && user.suggestions && user.suggestions.length ? (
                    <FlatList
                        keyExtractor={this.keyExtractor}
                        data={user.suggestions.slice(10)}
                        renderItem={this.renderItem}
                    />
                ) : (
                    <Text>No suggestions</Text>
                )}
            </ScrollView>
        );
    }
}

DiscoverScreen.navigationOptions = {
    title: "Discover",
    headerLeft: <ProfileButton />
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 15,
        backgroundColor: "#fff"
    }
});

export default DiscoverScreen;
