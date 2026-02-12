/**
 * Audio recording utility for voice notes on ads.
 * Records audio using MediaRecorder API and returns a File for upload.
 */

export const MAX_AUDIO_DURATION = 60; // seconds
export const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

export interface AudioRecording {
  file: File;
  preview: string; // object URL for playback
  duration: number; // seconds
}

/**
 * VoiceRecorder class — records audio using the browser MediaRecorder API.
 *
 * Usage:
 *   const recorder = new VoiceRecorder();
 *   await recorder.start();
 *   // ... user speaks ...
 *   const recording = await recorder.stop();
 *   // recording.file is ready for upload
 */
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime = 0;

  async start(): Promise<void> {
    this.chunks = [];

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    });

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.start(500);
    this.startTime = Date.now();
  }

  stop(): Promise<AudioRecording> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        reject(new Error("مفيش تسجيل شغال"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const duration = Math.round((Date.now() - this.startTime) / 1000);
        const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });

        if (blob.size > MAX_AUDIO_SIZE) {
          this.cleanup();
          reject(new Error("حجم التسجيل كبير أوي. جرب تسجيل أقصر"));
          return;
        }

        if (blob.size < 1000) {
          this.cleanup();
          reject(new Error("التسجيل فاضي. جرب تاني وتكلم بصوت أعلى"));
          return;
        }

        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: mimeType });
        const preview = URL.createObjectURL(file);

        this.cleanup();
        resolve({ file, preview, duration });
      };

      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Already stopped
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.chunks = [];
    this.mediaRecorder = null;
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  get elapsed(): number {
    if (!this.startTime || !this.isRecording) return 0;
    return Math.round((Date.now() - this.startTime) / 1000);
  }
}
