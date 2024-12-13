// File: src/pages/AudioSettings.tsx
import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonRange,
  IonButton,
  IonIcon,
} from "@ionic/react";
import { volumeHigh, volumeLow } from "ionicons/icons";

const AudioSettings: React.FC = () => {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>("");
  const [selectedOutput, setSelectedOutput] = useState<string>("");
  const [inputVolume, setInputVolume] = useState<number>(50);
  const [outputVolume, setOutputVolume] = useState<number>(50);

  useEffect(() => {
    debugger;
    // Fetch available devices on component load
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const inputs = devices.filter((device) => device.kind === "audioinput");
      const outputs = devices.filter((device) => device.kind === "audiooutput");
      setInputDevices(inputs);
      setOutputDevices(outputs);
      if (inputs.length > 0) setSelectedInput(inputs[0].deviceId);
      if (outputs.length > 0) setSelectedOutput(outputs[0].deviceId);
    });
    if (!HTMLAudioElement.prototype.hasOwnProperty("setSinkId")) {
      alert(
        "setSinkId is not supported in your browser. Please use Chrome or Edge for full functionality."
      );
    }
  }, []);

  const handleTestMic = () => {
    debugger;
    navigator.mediaDevices
      .getUserMedia({ audio: { deviceId: selectedInput } })
      .then((stream) => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        alert("Testing mic! Speak to see input levels.");
      })
      .catch((err) => {
        alert("Error accessing microphone: " + err.message);
      });
  };

  const handleTestSpeaker = async () => {
    const audio = new Audio("https://www.soundjay.com/button/beep-07.wav");
    audio.volume = outputVolume / 100;

    if ("setSinkId" in audio) {
      try {
        await (audio as any).setSinkId(selectedOutput); // Type assertion
        audio.play();
        alert("Playing test sound...");
      } catch (err: any) {
        alert("Error testing speaker: " + err.message);
      }
    } else {
      alert("setSinkId is not supported in your browser.");
      audio.play(); // Play sound without routing to specific output device
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel>
            <strong>Audio Input</strong>
          </IonLabel>
        </IonItem>
        <IonItem>
          <IonLabel>Device</IonLabel>
          <IonSelect
            value={selectedInput}
            onIonChange={(e) => setSelectedInput(e.detail.value)}
          >
            {inputDevices.map((device) => (
              <IonSelectOption key={device.deviceId} value={device.deviceId}>
                {device.label || "Unknown Input Device"}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel>Input Volume:</IonLabel>
          <IonRange
            min={0}
            max={100}
            value={inputVolume}
            onIonChange={(e) => setInputVolume(e.detail.value as number)}
          >
            <IonIcon slot="start" icon={volumeLow} />
            <IonIcon slot="end" icon={volumeHigh} />
          </IonRange>
        </IonItem>
        <IonButton expand="block" onClick={handleTestMic}>
          Test Mic
        </IonButton>

        <IonItem>
          <IonLabel>
            <strong>Audio Output</strong>
          </IonLabel>
        </IonItem>
        <IonItem>
          <IonLabel>Device</IonLabel>
          <IonSelect
            value={selectedOutput}
            onIonChange={(e) => setSelectedOutput(e.detail.value)}
          >
            {outputDevices.map((device) => (
              <IonSelectOption key={device.deviceId} value={device.deviceId}>
                {device.label || "Unknown Output Device"}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel>Output Volume:</IonLabel>
          <IonRange
            min={0}
            max={100}
            value={outputVolume}
            onIonChange={(e) => setOutputVolume(e.detail.value as number)}
          >
            <IonIcon slot="start" icon={volumeLow} />
            <IonIcon slot="end" icon={volumeHigh} />
          </IonRange>
        </IonItem>
        <IonButton expand="block" onClick={handleTestSpeaker}>
          Test Speaker
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default AudioSettings;
