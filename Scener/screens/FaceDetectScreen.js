import React from "react";
import { StyleSheet, View, Image } from "react-native";

import { ThemeProvider } from "react-native-elements";
import Text from "../components/Basic/Text";
import Button from "../components/Basic/Button";
import { Ionicons } from "@expo/vector-icons";
import * as Permissions from 'expo-permissions';
import { Camera } from 'expo-camera';
// import { FaceDetector } from 'react-native-camera';
import * as FaceDetector from 'expo-face-detector';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

const theme = {
    Button: {
        titleStyle: {
            color: 'black',
        }
    }
}

const landmarkSize = 2;

class FaceDetectScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            type: Camera.Constants.Type.front,
            permissionsGranted: false,
            faces: [],
            isFaceDetected: false,
            barcodeScanning: false,
            faceDetecting: false,
            scanned: false,
            data: null
        };
    }

    toggleFaceDetection = () => { 
        this.setState({ faceDetecting: !this.state.faceDetecting });
        console.log("Face detecting state: ", this.state.faceDetecting);
    }

    handleBarCodeScanned = ({ type, data }) => {
        this.setState({ scanned: true });
        alert(`Bar code with type ${type} and data ${data} has been scanned!`);
    };

    componentDidMount() {
        console.log("Component did mount")
    }

    onFacesDetected = ({faces}) => {
        this.setState({ faces });
        console.log("Face detected");
    }

    onFaceDetectionError = state => console.warn('Faces detection error:', state);

    onUploadImage = () => {
        (async ()=> {
            const image = Asset.fromModule(require('../assets/images/test.jpg'));
            await image.downloadAsync();
            console.log(image.localUri || image.uri);
            let uri = image.localUri || image.uri;

            let options = { encoding: FileSystem.EncodingType.Base64 };
            FileSystem.readAsStringAsync(uri, options)
            .then(data => {
                const base64 = 'data:image/jpg;base64' + data;
                return data;
            })
            .then(base64 => {
                // console.log(base64);
                fetch('https://office.scener.com/test_image.php', {
                    method: 'POST',
                    mode: 'cors',
                    headers: { token: '3157b11953KfScQp5e', facematch: 'matchUser' },
                    body: base64
                })
                .then((response) => response.text())
                .then((base64) => {
                    console.log(base64);
                    // var urlCreator = window.URL || window.webkitURL;
                    // var url = urlCreator.createObjectURL(blob);
                    
                    // console.log(url);
                    this.setState({
                        data: base64
                    })
                })
                .catch((error) => {
                    console.error(error);
                });
            })
            .catch(err => {
                console.log("​getFile -> err", err);
            });            
            
        })();
    }

    onBarCodeScanned = code => {
        this.setState(
            { barcodeScanning: !this.state.barcodeScanning },
            Alert.alert(`Barcode found: ${code.data}`)
        );
    };

    async componentWillMount() {
        const { status } = await Permissions.askAsync(Permissions.CAMERA);
        this.setState({ permissionsGranted: status === 'granted' });
    }

    renderNoPermissions = () => 
    <View style={styles.noPermissions}>
      <Text style={{ color: 'white' }}>
        Camera permissions not granted - cannot open camera preview.
      </Text>
    </View>

    renderCtrl = () =>
    <View style={styles.callCtrl}>
        <ThemeProvider theme={theme}>
        <Button
            onPress={() => {
                this.setState({
                    type:
                      this.state.type === Camera.Constants.Type.back
                        ? Camera.Constants.Type.front
                        : Camera.Constants.Type.back,
                  });
            }}
            buttonStyle={styles.button}
            icon={
                <Ionicons
                    name="ios-reverse-camera"
                    size={ 32 }
                    color="black"
                />
            }
        />
        <Button
            onPress={() => {
                this.toggleFaceDetection();
                this.setState({scanned: false});
            }}
            buttonStyle={styles.button}
            title=" Done "
        />
        <Button
            onPress={this.onUploadImage}
            buttonStyle={styles.button}
            title="Check"
        />
        </ThemeProvider>
    </View>

    renderFace({ bounds, faceID, rollAngle, yawAngle }) {
    return (
        <View
        key={faceID}
        transform={[
            { perspective: 600 },
            { rotateZ: `${rollAngle.toFixed(0)}deg` },
            { rotateY: `${yawAngle.toFixed(0)}deg` },
        ]}
        style={[
            styles.face,
            {
            ...bounds.size,
            left: bounds.origin.x,
            top: bounds.origin.y,
            },
        ]}>
        <Text style={styles.faceText}>ID: {faceID}</Text>
        <Text style={styles.faceText}>rollAngle: {rollAngle.toFixed(0)}</Text>
        <Text style={styles.faceText}>yawAngle: {yawAngle.toFixed(0)}</Text>
        </View>
    );
    }

    renderLandmarksOfFace(face) {
    const renderLandmark = position =>
        position && (
        <View
            style={[
            styles.landmark,
            {
                left: position.x - landmarkSize / 2,
                top: position.y - landmarkSize / 2,
            },
            ]}
        />
        );
    return (
        <View key={`landmarks-${face.faceID}`}>
        {renderLandmark(face.leftEyePosition)}
        {renderLandmark(face.rightEyePosition)}
        {renderLandmark(face.leftEarPosition)}
        {renderLandmark(face.rightEarPosition)}
        {renderLandmark(face.leftCheekPosition)}
        {renderLandmark(face.rightCheekPosition)}
        {renderLandmark(face.leftMouthPosition)}
        {renderLandmark(face.mouthPosition)}
        {renderLandmark(face.rightMouthPosition)}
        {renderLandmark(face.noseBasePosition)}
        {renderLandmark(face.bottomMouthPosition)}
        </View>
    );
    }

    renderFaces = () => 
    <View style={styles.facesContainer} pointerEvents="none">
        {this.state.faces.map(this.renderFace)}
    </View>

    renderLandmarks = () => 
    <View style={styles.facesContainer} pointerEvents="none">
        {this.state.faces.map(this.renderLandmarksOfFace)}
    </View>

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
                    <Camera style={{flex: 1}}
                        type={this.state.type}
                        onFaceDetected={this.state.faceDetecting ? this.onFacesDetected : undefined}
                        onFaceDetectionError={this.onFaceDetectionError}
                    />
                }
                <View style={styles.imageOriginal}>
                    <Image
                        style={{width: 100, height: 100}}
                        source={require('../assets/images/test.jpg')}
                    />
                    <Image
                        style={{width: 100, height: 100}}
                        source={{uri: this.state.data}}
                    />
                </View>
                {
                    this.renderFaces()
                }
                {
                    this.renderLandmarks()
                }
                {
                    this.renderCtrl()
                }
            </View>
        );
    }
}
export default FaceDetectScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ccc"
    },
    callCtrl: {
        display: 'flex',
        position: "absolute",
        bottom: 30,
        left: 0,
        right: 0,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end'
    },
    button: {
        backgroundColor: '#fff',
        borderRadius: 5,
        minHeight: 50,
        marginRight: 15,
        paddingRight: 10,
        paddingLeft: 10,
    },
    facesContainer: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: 0,
      top: 0,
    },
    face: {
      padding: 10,
      borderWidth: 2,
      borderRadius: 2,
      position: 'absolute',
      borderColor: '#FFD700',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    landmark: {
      width: landmarkSize,
      height: landmarkSize,
      position: 'absolute',
      backgroundColor: 'red',
    },
    faceText: {
      color: '#FFD700',
      fontWeight: 'bold',
      textAlign: 'center',
      margin: 10,
      backgroundColor: 'transparent',
    },
    imageOriginal: {
        display: 'flex',
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 100,
        flexDirection: 'column',
        justifyContent: 'flex-start'
    }
});
