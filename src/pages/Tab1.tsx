import React, { useState, useEffect, useRef } from "react";
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
  IonCheckbox,
  IonRow,
  IonCol,
  IonToggle,
  IonIcon,
  IonSegment,
  IonSegmentButton,
} from "@ionic/react";
import { volumeLow, volumeHigh, alertCircleOutline } from "ionicons/icons"; // Import volume icons
import "./Tab1.css";

const AudioSettings: React.FC = () => {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>("");
  const [selectedOutput, setSelectedOutput] = useState<string>("");
  const [inputVolume, setInputVolume] = useState<number>(50);
  const [outputVolume, setOutputVolume] = useState<number>(50);
  const [inputLevel, setInputLevel] = useState<number>(0);
  const [outputLevel, setOutputLevel] = useState<number>(0);
  const [backgroundNoiseRemoval, setBackgroundNoiseRemoval] = useState(false);
  const [autoAdjustMic, setAutoAdjustMic] = useState(false);
  const [tempUnmute, setTempUnmute] = useState(true);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [segment, setSegment] = useState<string>("audio");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null); // Gain node for volume control

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const inputs = devices.filter((device) => device.kind === "audioinput");
      const outputs = devices.filter((device) => device.kind === "audiooutput");
      setInputDevices(inputs);
      setOutputDevices(outputs);
      if (inputs.length > 0) setSelectedInput(inputs[0].deviceId);
      if (outputs.length > 0) setSelectedOutput(outputs[0].deviceId);
    });

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const [isAudioOverflowing, setAudioOverflowing] = useState(false);
  const [isCameraOverflowing, setCameraOverflowing] = useState(false);
  const audioLabelRef = useRef<HTMLIonLabelElement>(null);
  const cameraLabelRef = useRef<HTMLIonLabelElement>(null);

  const checkOverflow = (ref: React.RefObject<HTMLIonLabelElement>) => {
    const element = ref.current?.shadowRoot?.querySelector("div");
    return element ? element.scrollWidth > element.clientWidth : false;
  };
  useEffect(() => {
    const updateOverflowStates = () => {
      setAudioOverflowing(checkOverflow(audioLabelRef));
      setCameraOverflowing(checkOverflow(cameraLabelRef));
    };

    // Initial check
    updateOverflowStates();

    // Listen for resize events
    window.addEventListener("resize", updateOverflowStates);

    return () => {
      window.removeEventListener("resize", updateOverflowStates);
    };
  }, []);

  const handleTestMic = async () => {
    if (isTestingMic) {
      stopMicTest();
      return;
    }

    setIsTestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedInput },
      });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = inputVolume / 100; // Initial volume setting
      gainNodeRef.current = gainNode;

      const destination = audioContext.destination;

      source.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(destination);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const visualize = () => {
        analyser.getByteFrequencyData(dataArray);
        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setInputLevel(average); // Update input level
        requestAnimationFrame(visualize);
      };

      visualize();
    } catch (err: any) {
      alert("Error accessing microphone: " + err.message);
      stopMicTest();
    }
  };

  const stopMicTest = () => {
    setIsTestingMic(false);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setInputLevel(0); // Reset input level
  };

  const handleTestSpeaker = () => {
    const audio = new Audio("/assets/sounds/beep-07.mp3"); // Use local sound file
    audio.volume = outputVolume / 100;
    audio
      .play()
      .then(() => setOutputLevel(100)) // Simulate output level
      .catch((err) => alert("Error playing sound: " + err.message));
    setTimeout(() => setOutputLevel(0), 1000); // Reset after 1 second
  };
  const handleVolumeChange = (volume: number, type: "input" | "output") => {
    if (type === "input" && gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
    if (type === "output") {
      const audio = new Audio("/assets/sounds/beep-07.mp3");
      audio.volume = volume / 100; // Adjust playback volume
      setOutputVolume(volume);
    }
  };

  const renderLevelIndicator = (level: number) => {
    return (
      <div
        className="level-indicator"
        style={{
          display: "flex",
          //  gap: "20px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="level-bar"
            style={{
              backgroundColor: level > i * 5 ? "#007bff" : "#ccc",
            }}
          />
        ))}
      </div>
    );
  };
  const handleDeviceChange = async (deviceId: string) => {
    try {
      // Stop the current stream if active
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Request a new stream with the selected device
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId },
      });
      mediaStreamRef.current = stream;

      // Initialize audio context
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Reconnect analyser and gain node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = inputVolume / 100; // Set initial volume
      gainNodeRef.current = gainNode;

      source.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Restart visualization
      //
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const visualize = () => {
        analyser.getByteFrequencyData(dataArray);
        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setInputLevel(average); // Update input level
        requestAnimationFrame(visualize);
      };
      visualize();
    } catch (err: any) {
      alert(`Error switching to device: ${err.message}`);
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
        <div className="tab-selector-container">
          <IonSegment
            value={segment}
            onIonChange={(e) => setSegment(e.detail.value! as string)}
            className="custom-segment"
          >
            <IonSegmentButton
              value="audio"
              className="custom-segment-button with-divider"
            >
              {isAudioOverflowing ? (
                <IonIcon icon={alertCircleOutline} />
              ) : (
                <IonLabel ref={audioLabelRef}>Audio</IonLabel>
              )}
              <div className="divider"></div>
            </IonSegmentButton>

            <IonSegmentButton
              value="camera"
              className="custom-segment-button with-divider"
            >
              {isCameraOverflowing ? (
                <IonIcon icon={alertCircleOutline} />
              ) : (
                <IonLabel ref={cameraLabelRef}>Camera</IonLabel>
              )}
              <div className="divider"></div>
            </IonSegmentButton>

            <IonSegmentButton value="general" className="custom-segment-button">
              <IonLabel>General</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>
        {segment === "audio" && (
          <>
            <IonRow>
              {/* Audio Input Section */}
              <IonCol size="12" size-lg="6">
                <IonRow>
                  <IonCol size="12">
                    <IonLabel>
                      <strong>Audio Input</strong>
                    </IonLabel>
                    <IonItem>
                      <IonSelect
                        value={selectedInput}
                        onIonChange={(e) => {
                          setSelectedInput(e.detail.value);
                          handleDeviceChange(e.detail.value); // Switch input device dynamically
                        }}
                      >
                        {inputDevices.map((device) => (
                          <IonSelectOption
                            key={device.deviceId}
                            value={device.deviceId}
                          >
                            {device.label || "Unknown Input Device"}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="12" size-lg="6">
                    <IonLabel>Input Level:</IonLabel>
                  </IonCol>
                  <IonCol size="12" size-lg="6">
                    <div className="level-indicator-container">
                      {renderLevelIndicator(inputLevel)}
                    </div>
                  </IonCol>
                </IonRow>
                <IonItem>
                  <IonLabel>Input Volume:</IonLabel>
                  <IonRange
                    min={0}
                    max={100}
                    value={inputVolume}
                    onIonChange={(e) =>
                      handleVolumeChange(e.detail.value as number, "input")
                    }
                  >
                    <IonIcon slot="start" icon={volumeLow} />
                    <IonIcon slot="end" icon={volumeHigh} />
                  </IonRange>
                </IonItem>
                <IonButton expand="block" onClick={handleTestMic}>
                  {isTestingMic ? "Stop Mic Test" : "Test Mic"}
                </IonButton>
              </IonCol>

              {/* Audio Output Section */}
              <IonCol size="12" size-lg="6">
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
                      <IonSelectOption
                        key={device.deviceId}
                        value={device.deviceId}
                      >
                        {device.label || "Unknown Output Device"}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                <IonItem className="level-item">
                  <IonLabel>Output Level:</IonLabel>
                  <div className="level-indicator-container">
                    {renderLevelIndicator(outputLevel)}
                  </div>
                </IonItem>
                <IonItem>
                  <IonLabel>Output Volume:</IonLabel>
                  <IonRange
                    min={0}
                    max={100}
                    value={outputVolume}
                    onIonChange={(e) =>
                      setOutputVolume(e.detail.value as number)
                    }
                  >
                    <IonIcon slot="start" icon={volumeLow} />
                    <IonIcon slot="end" icon={volumeHigh} />
                  </IonRange>
                </IonItem>
                <IonButton expand="block" onClick={handleTestSpeaker}>
                  Test Speaker
                </IonButton>
              </IonCol>
            </IonRow>
            <IonItem>
              <IonLabel>Background Noise Removal</IonLabel>
              <IonToggle
                checked={backgroundNoiseRemoval}
                onIonChange={(e) => setBackgroundNoiseRemoval(e.detail.checked)}
              />
            </IonItem>
            <IonItem>
              <IonCheckbox
                checked={autoAdjustMic}
                onIonChange={(e) => setAutoAdjustMic(e.detail.checked)}
              />
              <IonLabel>Automatically adjust microphone volume</IonLabel>
            </IonItem>
            <IonItem>
              <IonCheckbox
                checked={tempUnmute}
                onIonChange={(e) => setTempUnmute(e.detail.checked)}
              />
              <IonLabel>Unmute temporarily by holding the space bar</IonLabel>
            </IonItem>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default AudioSettings;
