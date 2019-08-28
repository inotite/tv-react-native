import React from "react";
import { observer } from "mobx-react";

@observer
class Suggestion extends React.Component {
    constructor(props) {
        super(props);
        this.state = { suggestion: null, loading: false, error: null };
    }

    fetchSuggestion() {
        if (!global.scener.user.loggedIn) {
            this.setState({ suggestion: null, loading: false, error: null });
            return;
        }
        if (this.props.suggestionId) {
            this.setState({ loading: true });
            global.scener.user.suggestionStore
                .get({ id: this.props.suggestionId })
                .then((suggestion) => {
                    if (this._mounted) {
                        this.setState({ suggestion: suggestion, loading: false, error: null });
                    }
                })
                .catch((error) => {
                    console.warn(error);
                    if (this._mounted) {
                        this.setState({ suggestion: null, loading: false, error: error });
                    }
                });
        } else {
            this.setState({ suggestion: null, loading: false, error: null });
        }
    }

    componentDidMount() {
        this._mounted = true;
        this.fetchSuggestion();
    }
    componentWillUnmount() {
        this._mounted = false;
    }
    

    componentDidUpdate(prevProps) {
        if (this.props.suggestionId !== prevProps.suggestionId) {
            this.fetchSuggestion();
        }
    }

    render() {
        const { children } = this.props;
        const { suggestion, loading, error } = this.state;
        return children({ suggestion, loading, error });
    }
}

export default Suggestion;
