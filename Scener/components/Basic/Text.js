import React from "react";
import { Text } from "react-native-elements";
class ScenerText extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return <Text {...this.props} />;
    }
}

export default ScenerText;
