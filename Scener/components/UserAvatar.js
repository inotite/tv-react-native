import React from "react";
import { observer } from "mobx-react";
import { Avatar } from "react-native-elements";
import { View } from "react-native";
import Text from "../components/Basic/Text";
import ScenerTheme from "../constants/Theme";
@observer
class UserAvatar extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {}

    render() {
        const { user, showScore, ...others } = this.props;
        console.log(user);
        return (
            <View
                style={{
                    position: "relative",
                    height: "auto",
                    width: "auto",
                    flex: 0,
                    flexGrow: 0,
                    flexShrink: 0,
                    flexBasis: 100
                }}
            >
                <Avatar
                    rounded
                    title={user.username[0]}
                    {...(user.imageLargeUrl.indexOf("default") == -1
                        ? { source: { uri: user.imageLargeUrl } }
                        : {})}
                    {...others}
                />
                {showScore && user.relationship.score ? (
                    <View
                        style={{
                            position: "absolute",
                            display: "flex",
                            zIndex: 1,
                            right: -4,
                            bottom: -4,
                            borderRadius: 100,
                            overflow: "hidden",

                            padding: 4,

                            backgroundColor: ScenerTheme.palette.secondary.dark,
                            borderColor: ScenerTheme.palette.secondary.light,
                            borderStyle:"solid",
                            borderWidth:2
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 14,
                                color: "#FFF"
                            }}
                        >
                            {Math.round(user.relationship.score * 5000) / 100}%
                        </Text>
                    </View>
                ) : null}
            </View>
        );
    }
}

export default UserAvatar;
