import React from "react";
import { observer } from "mobx-react";
import User from "../DataResolvers/UserResolver";
import { ListItem } from "react-native-elements";

@observer
class UserListItem extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {}

    render() {
        const { userId, onPress } = this.props;
        return (
            <User userId={userId}>
                {({ user }) =>
                    user ? (
                        <ListItem
                            onPress={onPress}
                            leftAvatar={{
                                title: user.username.substring(0, 1),
                                source:
                                    user.imageThumbUrl.indexOf("default") == -1
                                        ? { uri: user.imageThumbUrl }
                                        : null
                            }}
                            title={user.username}
                            subtitle={user.name}
                            chevron={true}
                        />
                    ) : null
                }
            </User>
        );
    }
}

export default UserListItem;
