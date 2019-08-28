import React from "react";
import { Platform, StyleSheet, View, AsyncStorage, TextInput, TouchableOpacity, Dimensions } from "react-native";

import { withTheme } from "react-native-elements";
import Text from "../components/Basic/Text";
import Button from "../components/Basic/Button";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as Permissions from 'expo-permissions';
import { TwilioVideoLocalView, TwilioVideoParticipantView, TwilioVideo } from 'react-native-twilio-video-webrtc';
import CallDetectorManager from 'react-native-call-detection';
import uuid from 'uuid';
// import RNCallKeep from 'react-native-callkeep';

var callDetector = undefined;

// RNCallKeep.setup({
//     ios: {
//         appName: 'Scener'
//     }
// });

// const getNewUuid = () => uuid.v4().toLowerCase();

class VideoScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            permissionGranted: false,
            micState: false,
            cameraState: true,
            twilioToken: "",
            status: "disconnected",
            isAudioEnabled: true,
            isVideoEnabled: true,
            participants: new Map(),
            videoTracks: new Map(),
            roomName: '',
            participantCount: 0,
        };
        this.startListenerTapped = this.startListenerTapped.bind(this);
    }

    startListenerTapped = () => {
        callDetector = new CallDetectorManager((event, number) => {
            if (event === 'Disconnected') {
                // Do something call got disconnected
                console.log("Call disconnected");
            } 
            else if (event === 'Connected') {
                // Do something call got connected
                // This clause will only be executed for iOS
                console.log("Call connected");
                console.log("Twilio status: ", this.state.status);
                if (this.state.status === "connected") {
                    this.endCall();
                    this.props.navigation.navigate("Friends");
                }
            } 
            else if (event === 'Incoming') {
                // Do something call got incoming
                console.log("Call incoming");
            }
            else if (event === 'Dialing') {
                // Do something call got dialing
                // This clause will only be executed for iOS
                console.log("Call dialog");
            } 
            else if (event === 'Offhook') {
                //Device call state: Off-hook. 
                // At least one call exists that is dialing,
                // active, or on hold, 
                // and no calls are ringing or waiting.
                // This clause will only be executed for Android
                console.log("Call Offhook");
            }
            else if (event === 'Missed') {
                // Do something call got missed
                // This clause will only be executed for Android
                console.log("Call missed");
            }
        },
        false,
        () => {},
        {
            title: 'Phone State Permission',
            message: "This app needs access to your phone state in order to react and/or or adapt to incoming calls."
        });
    }

    stopListenerTapped = () => {
        callDetector && callDetector.dispose();
    }

    startCall = ({roomName}) => {
        this.refs.twilioVideo.connect({ roomName: roomName, accessToken: this.state.twilioToken });
        this.setState({status: 'connecting'});
        console.log("-----------------------");
    }

    endCall = () => {
        this.refs.twilioVideo.disconnect();
        console.log("Twilio call ended.");
        this.stopListenerTapped();
        this.setState({status: 'disconnected'});
    }

    _onMuteButtonPress = () => {
      this.refs.twilioVideo.setLocalAudioEnabled(!this.state.isAudioEnabled)
        .then(isEnabled => this.setState({isAudioEnabled: isEnabled}));
    }

    _onRoomDidConnect = () => {
      this.setState({status: 'connected'});
      console.log("Twilio Video Room connected");
      this.startListenerTapped();
    //   RNCallKeep.displayIncomingCall(getNewUuid(), "12345", "12345", 'number', false);
    }

    _onRoomDidDisconnect = ({roomName, error}) => {
        console.log("Disconnect ERROR: ", roomName, error);

        this.setState({status: 'disconnected'});
        alert("Room disconnected: ", roomName);
    }

    _onRoomDidFailToConnect = (error) => {
        console.log("Connect ERROR: ", error);

        this.setState({status: 'disconnected'});
        alert("Failed to connect");
    }

    _onParticipantAddedVideoTrack = ({participant, track}) => {
        console.log("onParticipantAddedVideoTrack: ", participant, track);

        if (this.state.participantCount == 0) {
            this.setState({
                videoTracks: new Map([
                [track.trackSid, { participantSid: participant.sid, videoTrackSid: track.trackSid }]
                ]),
                participantCount: this.state.participantCount + 1
            });
            return ;
        }

        this.setState({
            videoTracks: new Map([
            ...this.state.videoTracks,
            [track.trackSid, { participantSid: participant.sid, videoTrackSid: track.trackSid }]
            ]),
            participantCount: this.state.participantCount + 1
        });
    }

    _onParticipantRemovedVideoTrack = ({participant, track}) => {
        console.log("onParticipantRemovedVideoTrack: ", participant, track);

        const videoTracks = this.state.videoTracks;
        videoTracks.delete(track.trackSid);

        this.setState({videoTracks: { ...videoTracks }});
        this.setState({participantCount: this.state.participantCount - 1});
        alert("Participant disconnected: " + participant)
        console.log("Participant disconnected: ", this.state.participantCount);
        console.log("Participatn tracks: ", this.state.videoTracks);
    }

    _onCameraDidStopRunning = ({error}) => {
        alert("Camera stopped running: ", error);
    }

    componentDidMount() {
        console.log("NAV: ", this.props.navigation.state.params);
        // if (this.state.permissionGranted == false) {
        //     alert("Camera no permission");
        // }
    }

    async componentWillMount() {
        const { status } = await Permissions.askAsync(Permissions.CAMERA);
        this.setState({ permissionsGranted: status === 'granted' });
        // this.state.permissionGranted = (status === 'granted');

        let token = await AsyncStorage.getItem('twilioToken');
        
        this.setState({ twilioToken: token });

        const {navigation} = this.props;
        const roomName = navigation.getParam("roomName", "1234");
        this.startCall({ roomName: roomName });
        console.log("Room Name: ", roomName);

        // for (let i = 0 ; i < 1 ; ++i ) {
        //     var participant = {sid: "123"+i, videoTrackSid: "123"+i};
        //     var track = {trackSid: "123"+i};
        //     this._onParticipantAddedVideoTrack( {participant: participant, track: track} );
        // }
    }

    renderNoPermissions = () => 
    <View style={styles.noPermissions}>
      <Text style={{ color: 'white' }}>
        Camera permissions not granted - cannot open camera preview.
      </Text>
    </View>

    renderBlackScreen = () =>
    <View style={styles.noPermissions}>
      <Text style={{ color: 'white' }}>
        Camera Off
      </Text>
    </View>

    renderWait = () =>
    <View style={styles.noPermissions}>
        <Text style={{ color: 'white' }}>
            Waiting for others to join...
        </Text>
    </View>

    renderConnecting = () =>
    <View style={styles.noPermissions}>
        <Text style={{ color: 'white' }}>
            Connecting...
        </Text>
    </View>

    renderCtrl = () =>
    <View style={styles.callCtrl}>
        <Button
            onPress={this._onMuteButtonPress}
            buttonStyle={this.state.isAudioEnabled ? styles.mic : styles.micOff}
            icon={
                <Ionicons
                    name={this.state.isAudioEnabled ? "ios-mic" : "ios-mic-off"}
                    size={ 32 }
                    color="black"
                />
            }
        />
        <Button
            onPress={() => {
                this.endCall();
                this.props.navigation.navigate("User", {userId: this.props.navigation.getParam("userId")});
            }}
            buttonStyle={styles.hangUp}
            icon={
                <MaterialIcons
                    name="call-end"
                    size={ 32 }
                    color="white"
                />
            }
        />
        <Button
            onPress={() => {
                this.refs.twilioVideo.flipCamera();
            }}
            buttonStyle={styles.video}
            icon={
                <Ionicons
                    name="ios-videocam"
                    size={ 32 }
                    color="black"
                />
            }
        />
    </View>

    renderParticipantGrid = () => {
        var trackSids = [];
        var trackIdentifiers = [];
        var views = [];
        
        Array.from(this.state.videoTracks, ([trackSid, trackIdentifier]) => {
            trackSids.push(trackSid);
            trackIdentifiers.push(trackIdentifier);
        });

        console.log("Participant count: ", this.state.participantCount);
        if (this.state.participantCount <= 2 || this.state.participantCount > 4) {
            return (
                <View style={styles.remoteGrid}>
                    {
                        Array.from(this.state.videoTracks, ([trackSid, trackIdentifier]) => {
                            return (
                                // <TwilioVideoLocalView
                                //     style={styles.remoteVideo}
                                //     enabled={true}
                                // />
                                <TwilioVideoParticipantView
                                    style={styles.remoteVideo}
                                    key={trackSid}
                                    trackIdentifier={trackIdentifier}
                                />
                            )
                        })
                    }
                </View>
            );
        }
        else if (this.state.participantCount == 3) {

            views.push(
                // <TwilioVideoLocalView
                //     style={styles.remoteVideo}
                //     enabled={true}
                // />
                <TwilioVideoParticipantView
                    key={trackSids[0]}
                    trackIdentifier={trackIdentifiers[0]}
                    style={styles.remoteVideo}
                />
            );

            var subviews = [];
            for (let i = 1 ; i < 3 ; i++ ) {
                subviews.push(
                    // <TwilioVideoLocalView
                    //     style={styles.remoteVideo}
                    //     enabled={true}
                    // />
                    <TwilioVideoParticipantView
                        key={trackSids[i]}
                        trackIdentifier={trackIdentifiers[i]}
                        style={styles.remoteVideo}
                    />
                );
            }
            views.push(
                <View style={styles.subRemoteGrid}>
                    {subviews}
                </View>
            )
        }
        else {
            for (let i = 0 ; i < 2 ; ++i ) {
                var subviews = [];
                for (let j = 0 ; j < 2 ; j++ ) {
                    subviews.push(
                        // <TwilioVideoLocalView
                        //     style={styles.remoteVideo}
                        //     enabled={true}
                        // />
                        <TwilioVideoParticipantView
                            key={trackSids[i*2+j]}
                            trackIdentifier={trackIdentifiers[i*2+j]}
                            style={styles.remoteVideo}
                        />
                    );
                }
                views.push(
                    <View style={styles.subRemoteGrid}>
                        {subviews}
                    </View>
                )
            }
        }

        return (
            <View style={styles.remoteGrid}>
                {views}
            </View>
        );

    }

    render() {
        if (!this.state.permissionsGranted) {
            return (
                <View style={styles.container}>
                    {this.renderNoPermissions()}
                </View>
            )
        }
        return (
            <View style={styles.container}>
                {
                    <View style={{flex:1}}>
                        <TwilioVideo
                            ref="twilioVideo"
                            onRoomDidConnect={ this._onRoomDidConnect }
                            onRoomDidDisconnect={ this._onRoomDidDisconnect }
                            onRoomDidFailToConnect={ this._onRoomDidFailToConnect }
                            onCameraDidStopRunning={ this._onCameraDidStopRunning }
                            onParticipantAddedVideoTrack={ this._onParticipantAddedVideoTrack }
                            onParticipantRemovedVideoTrack= { this._onParticipantRemovedVideoTrack }
                        />
                        {
                            (this.state.status === 'connected' || this.state.status === 'connecting') &&
                            <View style={styles.callContainer}>
                                {
                                    this.state.status === 'connecting' &&
                                    this.renderConnecting()
                                }
                                {
                                    this.state.status === 'connected' && this.state.participantCount > 0 &&
                                    this.renderParticipantGrid()
                                }
                                {
                                    this.state.status === 'connected' && this.state.participantCount == 0 &&
                                    this.renderWait()
                                }
                            
                                <TwilioVideoLocalView
                                    enabled={true}
                                    style={styles.localVideo}
                                />
                            </View>
                        }
                    </View>
                }
                {
                    this.renderCtrl()
                }
            </View>
        );
    }
}
export default VideoScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ccc"
    },
    callCtrl: {
        position: "absolute",
        bottom: 30,
        left: 0,
        right: 0,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    hangUp: {
        backgroundColor: "#de4c33",
        width: 80,
        height: 80,
        borderRadius: 40,
        ...Platform.select({
            ios: {
                shadowColor: "black",
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.1,
                shadowRadius: 3
            },
            android: {
                elevation: 20
            }
        }),
    },
    mic: {
        backgroundColor: '#fff',
        width: 80,
        height: 80,
        borderRadius: 40,
        ...Platform.select({
            ios: {
                shadowColor: "black",
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.1,
                shadowRadius: 3
            },
            android: {
                elevation: 20
            }
        }),
    },
    micOff: {
        backgroundColor: "#8c8c8c",
        width: 80,
        height: 80,
        borderRadius: 40,
        ...Platform.select({
            ios: {
                shadowColor: "black",
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.1,
                shadowRadius: 3
            },
            android: {
                elevation: 20
            }
        }),
    },
    video: {
        backgroundColor: "#fff",
        width: 80,
        height: 80,
        borderRadius: 40,
        ...Platform.select({
            ios: {
                shadowColor: "black",
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.1,
                shadowRadius: 3
            },
            android: {
                elevation: 20
            }
        }),
    },
    camera: {
      flex: 1,
      justifyContent: 'space-between',
    },
    noPermissions: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center'
    },
    callContainer: {
        flex: 1,
        position: "absolute",
        bottom: 0,
        top: 0,
        left: 0,
        right: 0
    },
    welcome: {
        fontSize: 30,
        textAlign: 'center',
        paddingTop: 40
    },
    input: {
        height: 50,
        borderWidth: 1,
        marginRight: 70,
        marginLeft: 70,
        marginTop: 50,
        textAlign: 'center',
        backgroundColor: 'white'
    },
    button: {
        marginTop: 100
    },
    localVideo: {
        flex: 1,
        width: 150,
        height: 200,
        position: 'absolute',
        right: 10,
        bottom: 120
    },
    remoteGrid: {
        flex: 1,
        flexDirection: 'column',
        flexWrap: 'wrap',
        display: 'flex',
        width: "100%",
    },
    subRemoteGrid: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        display: 'flex',
        width: '100%',
    },
    remoteVideo: {
        flex: 1,
        backgroundColor: '#999'
    },
});
