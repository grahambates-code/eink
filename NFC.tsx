import React, { useState, useEffect } from 'react';
import { Button, View, Text, StyleSheet, SafeAreaView } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { WebView } from "react-native-webview";

function processBinaryArray(binaryArray, chunk_size = 100) {
    let hexValues = [];
    for (let i = 0; i < binaryArray.length; i += 8) {
        let binaryValue = binaryArray.slice(i, i + 8).join('');
        hexValues.push(parseInt(binaryValue, 2));
    }

    let chunks = [];
    for (let i = 0; i < hexValues.length; i += chunk_size) {
        chunks.push(hexValues.slice(i, i + chunk_size));
    }

    return chunks;
}

const NFCComponent = () => {
    const nfcSetupCommands = [
        [0xCD, 0x0D], [0xCD, 0x00], [0xCD, 0x01], [0xCD, 0x02], [0xCD, 0x03]
    ];

    const nfcCommandsEnd = Array(7).fill([0xCD, 0x08]).concat([[0xCD, 0x06]]);

    const [tagId, setTagId] = useState(null);

    useEffect(() => {
        NfcManager.start();
        return () => {}
    }, []);

    const delay = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

    const sendCommandToCard = async (command) => {
        const result = await NfcManager.sendMifareCommandIOS(command);
        console.log(result);
        return result;
    };

    const readNfc = async (data) => {
        try {
            const red_pixels = [];
            const black_pixels = [];

            for (let i = 0; i < data.length; i += 3) {
                const val = data.slice(i, i + 3);
                red_pixels.push(val[0] === 255 && val[1] === 0 && val[2] === 0 ? 0 : 1);
                black_pixels.push(val[0] === 0 && val[1] === 0 && val[2] === 0 ? 0 : 1);
            }

            const red_chunks = processBinaryArray(red_pixels);
            const black_chunks = processBinaryArray(black_pixels);

            await NfcManager.requestTechnology(NfcTech.MifareIOS);

            for (const command of nfcSetupCommands) {
                await sendCommandToCard(command);
                await delay(20);
            }

            for (const chunk of [black_chunks, red_chunks]) {
                for (const dataChunk of chunk) {
                    await sendCommandToCard([0xcd, 0x5, 0x64].concat(dataChunk));
                    await delay(30);
                }
                await sendCommandToCard([0xCD, 0x04]);
                await delay(200);
            }

            for (const command of nfcCommandsEnd) {
                await sendCommandToCard(command);
                await delay(200);
            }

            console.log("Finished");
        } catch (ex) {
            console.warn(ex.message);
        } finally {
            await NfcManager.cancelTechnologyRequest();
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1, width: '100%' }}>
                <WebView
                    onMessage={async event => {
                        const screenshot = JSON.parse(event.nativeEvent.data);
                        if (screenshot.payload?.length) readNfc(screenshot.payload);
                    }}
                    source={{ uri: 'https://gb-eink-webview.vercel.app/angel' }}
                />
            </SafeAreaView>
            {tagId && <Text style={styles.tagIdText}>Tag ID: {tagId}</Text>}
        </View>
    );
};

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
