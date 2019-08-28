import React from "react";
import { observer } from "mobx-react";

@observer
class Conversation extends React.Component {
    constructor(props) {
        super(props);
        this.state = { conversation: null, loading: false, error: null };
    }

    fetchConversation() {
        if (!global.scener.user.loggedIn) {
            this.setState({ conversation: null, loading: false, error: null });
            return;
        }
        if (this.props.conversationId) {
            this.setState({ loading: true });
            global.scener.user.conversationStore
                .get({ id: this.props.conversationId })
                .then((conversation) => {
                    if (this._mounted) {
                        this.setState({ conversation: conversation, loading: false, error: null });
                    }
                })
                .catch((error) => {
                    console.warn(error);
                    if (this._mounted) {
                        this.setState({ conversation: null, loading: false, error: error });
                    }
                });
        } else {
            this.setState({ conversation: null, loading: false, error: null });
        }
    }

    componentDidMount() {
        this._mounted = true;
        this.fetchConversation();
    }
    componentWillUnmount() {
        this._mounted = false;
    }
    

    componentDidUpdate(prevProps) {
        if (this.props.conversationId !== prevProps.conversationId) {
            this.fetchConversation();
        }
    }

    render() {
        const { children } = this.props;
        const { conversation, loading, error } = this.state;
        return children({ conversation, loading, error });
    }
}

export default Conversation;
