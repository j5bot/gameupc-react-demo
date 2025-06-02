import { BarcodeScanner, type BarcodeScannerProps } from '@react-barcode-scanner/components/dist';
import { useState } from 'react';

type ExtendedProps = BarcodeScannerProps & { scanLine?: string };

export const Scanner = (props: ExtendedProps) => {
    const {
        scanLine = 'none',
        canvasHeight = 480,
        canvasWidth = 640,
        videoHeight = 480,
        videoWidth = 640,
        videoCropHeight,
        videoCropWidth,
        zoom = 1,
        blur = 0,
        onScan = undefined,
    } = props;

    const [codes, setCodes] = useState<string[]>([]);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

    const onScanned = onScan ? onScan : (code: string) => {
        setCodes(codes.concat(code));
    };

    const onDevices = (devices: MediaDeviceInfo[]) => {
        setDevices(devices);
    };

    return (
        <BarcodeScanner
            devices={devices}
            onDevices={onDevices}
            onScan={onScanned}
            settings={{
                scanLine,
            }}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            videoCropHeight={videoCropHeight}
            videoCropWidth={videoCropWidth}
            zoom={zoom}
            blur={blur}
        />
    );
};