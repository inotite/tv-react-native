import React from "react";
import { Button } from "react-native-elements";

class ScenerButton extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return <Button {...this.props} />;
    }
}

export default ScenerButton;
