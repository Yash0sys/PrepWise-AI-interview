import { useState, useEffect } from "react";
import { Camera, Mic, AlertCircle, RefreshCw, XCircle, ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";

const MediaPermissionModal = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [cameraStatus, setCameraStatus] = useState("denied");
  const [micStatus, setMicStatus] = useState("denied");
  const [errorMessage, setErrorMessage] = useState(
    "Hardware Error: Microphone is not accessible! Even after giving access, microphone input could not be acquired. You cannot log into the project without verified microphone access."
  );
  const [isRequesting, setIsRequesting] = useState(false);
  const [attemptCount, setAttemptCount] = useState(1);
  const [secretClicks, setSecretClicks] = useState(0);

  const requestPermissions = async () => {
    setIsRequesting(true);
    setErrorMessage("");

    try {
      // Trigger actual browser prompt if available
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          // Release immediately
          testStream.getTracks().forEach((track) => track.stop());
        }
      } catch {
        // intentionally caught
      }

      // Realistic testing delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Always enforce inaccessible state by design (prank mode)
      setCameraStatus("denied");
      setMicStatus("denied");
      setAttemptCount((prev) => prev + 1);

      const prankErrors = [
        "Hardware Error: Microphone is not accessible! Even after giving permission, access could not be acquired by choice.",
        "System Error: Audio stream failed handshake. Microphone is blocked or inaccessible.",
        "Verification Failed: Both Camera and Microphone are reporting as not accessible. Access is blocked.",
        "Security Error: Microphone access rejected by device policy. Cannot proceed to the project workspace.",
      ];

      setErrorMessage(prankErrors[attemptCount % prankErrors.length]);
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  // Secret bypass for the owner: 4 clicks on the shield icon unlocks the project
  const handleSecretClick = () => {
    const next = secretClicks + 1;
    setSecretClicks(next);
    if (next >= 4) {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 animate-fadeIn">
      <div className="card-border max-w-lg w-full">
        <div className="card p-8 flex flex-col gap-6 text-center border-2 border-destructive-100/50 shadow-2xl">
          {/* Header */}
          <div className="flex flex-col items-center gap-2">
            <div
              onClick={handleSecretClick}
              title="PrepWise Hardware Check"
              className="size-16 rounded-full bg-destructive-100/10 border border-destructive-100/40 flex items-center justify-center text-destructive-100 mb-2 cursor-pointer transition-transform active:scale-95"
            >
              <ShieldAlert className="size-8 text-destructive-100 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Hardware Access Denied
            </h2>
            <p className="text-sm text-light-100 max-w-md">
              PrepWise requires active microphone and camera inputs to verify your identity and conduct AI interviews. You cannot proceed to the project.
            </p>
          </div>

          {/* Device Badges - Always showing Not Accessible */}
          <div className="grid grid-cols-2 gap-4">
            {/* Camera Status */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-destructive-100/15 border-destructive-100/50 text-destructive-100">
              <Camera className="size-5 shrink-0" />
              <div className="text-left">
                <p className="text-[11px] text-light-400 font-semibold uppercase tracking-wider">
                  Camera
                </p>
                <p className="text-sm font-bold">Not Accessible</p>
              </div>
              <XCircle className="size-5 ml-auto text-destructive-100" />
            </div>

            {/* Mic Status */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-destructive-100/15 border-destructive-100/50 text-destructive-100">
              <Mic className="size-5 shrink-0" />
              <div className="text-left">
                <p className="text-[11px] text-light-400 font-semibold uppercase tracking-wider">
                  Microphone
                </p>
                <p className="text-sm font-bold">Not Accessible</p>
              </div>
              <XCircle className="size-5 ml-auto text-destructive-100" />
            </div>
          </div>

          {/* Persistent Error Notice */}
          <div className="p-4 bg-destructive-100/15 border border-destructive-100/40 rounded-xl text-left flex items-start gap-3 text-xs text-destructive-100 leading-relaxed">
            <AlertCircle className="size-5 shrink-0 mt-0.5 text-destructive-100" />
            <div>
              <p className="font-bold text-sm mb-1 text-white">Login Blocked:</p>
              <p>{errorMessage}</p>
              <p className="mt-2 text-light-400 text-[11px]">
                Check attempts: <span className="font-mono text-white">{attemptCount}</span> • Hardware status: <span className="text-destructive-100 font-semibold">Refused</span>
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={requestPermissions}
              disabled={isRequesting}
              className="btn-primary !bg-gray-600 !text-white hover:!bg-gray-500 active:!bg-gray-700 w-full h-11 text-base font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className={`size-4 ${isRequesting ? "animate-spin" : ""}`} />
              {isRequesting ? "Checking Hardware Inputs..." : "Retry Giving Access"}
            </Button>

            <p className="text-xs text-light-400">
              Even after giving browser access, the system reports microphone as not accessible. Please reconnect your audio device and retry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPermissionModal;
