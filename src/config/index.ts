import path from "path";

export const config = {
  // 语音识别 API 配置
  speechApi: {
    key: process.env.SPEECH_API_KEY || "",
    baseUrl:
      process.env.SPEECH_API_BASE_URL ||
      "https://api.siliconflow.cn/v1/audio/transcriptions",
    model: process.env.SPEECH_MODEL || "FunAudioLLM/SenseVoiceSmall",
  },

  // 文件配置
  tempDir: process.env.TEMP_DIR || path.join(process.cwd(), "temp"),
  downloadDir:
    process.env.DOWNLOAD_DIR || path.join(process.cwd(), "downloads"),
  maxFileSize: process.env.MAX_FILE_SIZE || "100MB",

  // 临时文件管理配置
  cleanup: {
    autoCleanTempFiles: process.env.AUTO_CLEAN_TEMP_FILES !== "false", // 默认为true，只有明确设为false才禁用
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || path.join(process.cwd(), "logs", "app.log"),
  },

  // 请求头配置
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/121.0.2277.107 Version/17.0 Mobile/15E148 Safari/604.1",
};

// 验证必要的环境变量
export function validateConfig(): void {
  const requiredEnvVars = ["SPEECH_API_KEY"];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Required environment variable ${envVar} is not set`);
    }
  }
}
