import React, { Component } from 'react';
import {Button, View, Text, StyleSheet, SafeAreaView} from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import {WebView} from "react-native-webview";

class NFCComponent extends Component {
    constructor(props) {
        super(props);

        this.nfcSetupCommands = [
            [0xCD, 0x0D],
            [0xCD, 0x00],
            [0xCD, 0x01],
            [0xCD, 0x02],
            [0xCD, 0x03]
        ];

        this.nfcCommandsEnd = [
            [0xCD, 0x06],
            [0xCD, 0x08],
            [0xCD, 0x08],
            [0xCD, 0x08],
            [0xCD, 0x08],
            [0xCD, 0x08],
            [0xCD, 0x08],
            [0xCD, 0x08],
        ];

        this.state = {
            tagId: null,
        };
    }

    componentDidMount() {
        NfcManager.start();
    }



    delay = (milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    };

    sendCommandToCard = async (command) => {
        const result =  await NfcManager.sendMifareCommandIOS(command);
        console.log(result);
        return result
    };

    readNfc = async (data) => {
        try {

            let red_pixels = [];
            let black_pixels = [];
            let pixel_count =0;

            for (let i=0; i<data.length; i=i+3) {

                const val = data.slice(i, i+3);

                red_pixels[pixel_count] = 0;
                black_pixels[pixel_count] = 1;

               if (val[0] === 255 && val[1] === 0 && val[2] === 0) {
                   red_pixels[pixel_count] = 1;
               }

               if (val[0] === 0 && val[1] === 0 && val[2] === 0) {
                    black_pixels[pixel_count] = 0;
               }

               pixel_count++;
            }

            function processBinaryArray(binaryArray, chunk_size=100) {
                // Check if the input array length is a multiple of 8

                // Convert groups of 8 binary digits to hex values with "0x" prefix
                let hexValues = [];
                for (let i = 0; i < binaryArray.length; i += 8) {
                    let binaryValue = binaryArray.slice(i, i + 8).join('');
                    let hexValue = parseInt(binaryValue, 2)
                    hexValues.push(hexValue);
                }

                // Split the hex values into 50 chunks
                let chunks = [];
                for (let i = 0; i < hexValues.length; i += chunk_size) {
                    chunks.push(hexValues.slice(i, i + chunk_size));
                }

                return chunks;
            }

            let red_chunks = (processBinaryArray(red_pixels, 100))
            let black_chunks = (processBinaryArray(black_pixels, 100))

            //console.log(red_chunks)
            await NfcManager.requestTechnology(NfcTech.MifareIOS);

            for (const command of this.nfcSetupCommands) {
                await this.sendCommandToCard(command);
                await this.delay(20); // 20-millisecond delay between each command
            }

            for (var i = 0; i < black_chunks.length; i++) {
                await this.sendCommandToCard([0xcd, 0x5, 0x64].concat(black_chunks[i]));
                await this.delay(30);
            }

            await this.sendCommandToCard([0xCD, 0x04]);
            await this.delay(200);

            //black_chunks
            for (var i = 0; i < red_chunks.length; i++) {
                await this.sendCommandToCard([0xcd, 0x5, 0x64].concat(red_chunks[i]));
                await this.delay(30);
            }

            await this.sendCommandToCard([0xCD, 0x04]);
            await this.delay(200);
            //red


            for (const command of this.nfcCommandsEnd) {
                await this.sendCommandToCard(command);
                await this.delay(200); // 100-millisecond delay between each command
            }

            console.log("Finished");

        } catch (ex) {
            console.warn((ex.message));
        }finally {
            await NfcManager.cancelTechnologyRequest();
        }
    };

    render() {
        return (
            <View style={styles.container}>

                <SafeAreaView style={{flex: 1, width: '100%'}}>

                    <WebView
                        onMessage={async event => {

                            const screenshot = JSON.parse(event.nativeEvent.data);

                            if (screenshot.payload?.length) this.readNfc(screenshot.payload);


                        }}
                        source={{uri: 'https://gb-eink-webview.vercel.app/angel'}} />

                </SafeAreaView>

                {this.state.tagId && <Text style={styles.tagIdText}>Tag ID: {this.state.tagId}</Text>}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagIdText: {
        marginTop: 20,
        fontSize: 18,
    },
});

export default NFCComponent;
