import React from 'react';
import { Icon } from 'react-native-elements';
import LoginDialog from '../screens/LoginDialog';

class ProfileButton extends React.Component {

  constructor(props) {
        super(props);
        this.state = {
          showLogin: false,
        };
  };

  onClose() {
    this.setState({showLogin: false});
  }

  render() {
      const { user, userIds } = this.props;
      return (
        <>
        <LoginDialog show={this.state.showLogin} onClose={this.onClose.bind(this)} />
        <Icon
          raised
          name='person'
          type='material'
          color='#f50'
          onPress={() => this.setState({showLogin: true})} />
        </>
      );
    }
}

export default ProfileButton;
