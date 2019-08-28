import React from "react";
import { observer } from "mobx-react";

@observer
class User extends React.Component {
    constructor(props) {
        super(props);
        this.state = { user: null, loading: false, error: null };
    }

    fetchUser() {
        if (this.props.userId) {
            if (global.scener.user.loggedIn && this.props.userId == global.scener.user.id) {
                this.setState({ user: global.scener.user, loading: false, error: null });
                return;
            }
            this.setState({ loading: true });
            global.scener.userStore
                .get({ id: this.props.userId })
                .then((user) => {
                    if (this._mounted) {
                        this.setState({ user: user, loading: false, error: null });
                    }
                })
                .catch((error) => {
                    console.warn(error, this.props);
                    if (this._mounted) {
                        this.setState({ user: null, loading: false, error: error });
                    }
                });
        } else {
            this.setState({ user: null, loading: false, error: null });
        }
    }

    componentDidMount() {
        this._mounted = true;
        this.fetchUser();
    }

    componentDidUpdate(prevProps) {
        if (this.props.userId !== prevProps.userId) {
            this.fetchUser();
        }
    }
    componentWillUnmount() {
        this._mounted = false;
    }
    

    render() {
        const { children } = this.props;
        const { user, loading, error } = this.state;
        return children({ user, loading, error });
    }
}

export default User;
