import React from "react";
import { observer } from "mobx-react";

@observer
class Content extends React.Component {
    constructor(props) {
        super(props);
        this.state = { content: null, loading: false, error: null };
    }

    fetchContent() {
        if (this.props.contentId) {
            this.setState({ loading: true });
            global.scener.contentStore
                .get({ id: this.props.contentId })
                .then((content) => {
                    if (this._mounted) {
                        this.setState({ content: content, loading: false, error: null });
                    }
                })
                .catch((error) => {
                    console.warn(error);
                    if (this._mounted) {
                        this.setState({ content: null, loading: false, error: error });
                    }
                });
        } else {
            if (this._mounted) {
                this.setState({ content: null, loading: false, error: null });
            }
        }
    }

    componentDidMount() {
        this._mounted = true;
        this.fetchContent();
    }

    componentDidUpdate(prevProps) {
        if (this.props.contentId !== prevProps.contentId) {
            this.fetchContent();
        }
    }

    componentWillUnmount() {
        this._mounted = false;
    }

    render() {
        const { children } = this.props;
        const { content, loading, error } = this.state;
        return children({ content, loading, error });
    }
}

export default Content;
