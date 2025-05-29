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

/**
 * DouyinService 构造函数配置选项
 */
export interface DouyinServiceOptions {
  /** 语音识别 API 密钥 */
  speechApiKey: string;
  /** 语音识别 API 基础URL，默认: https://api.siliconflow.cn/v1/audio/transcriptions */
  speechApiBaseUrl?: string;
  /** 语音识别模型，默认: FunAudioLLM/SenseVoiceSmall */
  speechModel?: string;
  /** 是否自动清理临时文件，默认: true */
  autoCleanTempFiles?: boolean;
  /** 下载目录，默认: ./downloads */
  downloadDir?: string;
  /** 临时文件目录，默认: ./temp */
  tempDir?: string;
  /** 自定义 Cookie 字符串，用于绕过反爬机制 */
  customCookies?: string;
}

/**
 * DouyinService 构造函数的简化选项（仅必需参数）
 */
export interface DouyinServiceMinimalOptions {
  /** 语音识别 API 密钥 */
  speechApiKey: string;
}
