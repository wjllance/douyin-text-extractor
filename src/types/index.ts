export interface DouyinVideoInfo {
  videoId: string;
  title: string;
  downloadUrl: string;
  desc?: string;
}

export interface ParseUrlResponse {
  status: "success" | "error";
  data?: DouyinVideoInfo;
  error?: string;
}

export interface ExtractTextResponse {
  status: "success" | "error";
  videoInfo?: DouyinVideoInfo;
  extractedText?: string;
  error?: string;
  processingTime?: number;
}

export interface SpeechApiResponse {
  text: string;
  [key: string]: any;
}

export interface ProcessingProgress {
  stage:
    | "parsing"
    | "downloading"
    | "extracting_audio"
    | "speech_recognition"
    | "cleaning"
    | "completed";
  progress: number;
  message: string;
}

export interface ApiConfig {
  speechApiKey: string;
  speechApiBaseUrl: string;
  speechModel: string;
  tempDir: string;
  maxFileSize: string;
}
