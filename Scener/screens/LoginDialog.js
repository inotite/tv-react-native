import React from 'react';
import { Text, View } from 'react-native';
import { Icon, Overlay, Input, Button } from 'react-native-elements';
import { observer } from 'mobx-react';

@observer
class LoginDialog extends React.Component {

  constructor(props) {
        super(props);
        this.state = {
          username: null,
          password: null,
          usernameError: null,
          passwordError: null,
          busy: false
        };
  };

  logIn() {
    const { onClose } = this.props;

    this.setState(
      {
        usernameError: null,
        passwordError: null,
        busy: true
      }
    );

    if (this.state.username && this.state.password) {
      global.scener.user.signin(this.state.username, this.state.password).then(({data}) => {
          if (data && data.UserSignIn) {
            onClose();
          }
          this.setState({busy: false});
      }).catch((e) => {
          console.log('** LOGIN ERROR **', e);
          this.setState({passwordError: "Invalid username or password", busy: false});
      });
    } else {
      this.setState(
        {
          usernameError: this.state.username ? null : "Required",
          passwordError: this.state.password ? null : "Required",
          busy: false
        }
      );
    }
  }

  logOut() {
    global.scener.signout();
  }

  render() {
      const { show, onClose } = this.props;
      return (
        <Overlay
          isVisible={show}
          onBackdropPress={onClose}
          height="50%"
          >
            {global.scener.user.loggedIn ?
              <View>
                <Text style={{padding: 20, textAlign: "center", fontSize: 20}}>Logged in as {global.scener.user.username}</Text>
                <Button type="clear" title="Edit Profile" />
                <Button onPress={this.logOut.bind(this)} raised title="Log Out" />
              </View>
              :
              <View>
                <Text style={{padding: 20, textAlign: "center", fontSize: 20}}>Login</Text>
                <Input
                    placeholder=' Username, email, or phone'
                    errorMessage={this.state.usernameError}
                    onChangeText={(text) => this.setState({usernameError: null, username: text})}
                    value={this.state.username}
                    leftIcon={ <Icon name='person' size={24} color='black' /> } />
                <Input
                    placeholder=' Password'
                    type="password"
                    errorMessage={this.state.passwordError}
                    onChangeText={(text) => this.setState({passwordError: null, password: text})}
                    value={this.state.password}
                    leftIcon={ <Icon name='lock' size={24} color='black' /> } />

                  <Button onPress={this.logIn.bind(this)} raised title="Log In" loading={this.state.busy} />
                  <Button type="clear" title="Create Account" />
                  <Button type="clear" title="Forgot Password" />
                </View>  }
        </Overlay>
      );
    }
}

export default LoginDialog;
