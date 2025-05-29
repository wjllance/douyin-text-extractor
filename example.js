const { DouyinService } = require("./dist/index");

// 配置服务
const douyinService = new DouyinService(
  process.env.SPEECH_API_KEY || "your-speech-api-key",
  process.env.SPEECH_API_BASE_URL ||
    "https://api.siliconflow.cn/v1/audio/transcriptions",
  process.env.SPEECH_MODEL || "FunAudioLLM/SenseVoiceSmall"
);

async function example() {
  try {
    // 示例抖音分享链接
    const shareLink =
      "7.32 复制打开抖音，看看【深度解析：ChatGPT和GPT-4】https://v.douyin.com/iRNBho6G/ 复制此链接，打开Dou音搜索，直接观看视频！";

    console.log("开始解析抖音视频...");

    // 解析视频信息
    const videoInfo = await douyinService.parseShareUrl(shareLink);
    console.log("视频信息:", videoInfo);

    // 下载视频
    console.log("开始下载视频...");
    const videoPath = await douyinService.downloadVideo(
      videoInfo,
      (progress) => {
        console.log(`下载进度: ${progress.progress}% - ${progress.message}`);
      }
    );
    console.log("视频下载完成:", videoPath);

    // 提取文本
    console.log("开始提取音频文本...");
    const result = await douyinService.extractText(shareLink, (progress) => {
      console.log(`处理进度: ${progress.progress}% - ${progress.message}`);
    });
    console.log("文本提取完成:", result.extractedText);
  } catch (error) {
    console.error("处理失败:", error.message);
  }
}

// 运行示例
if (require.main === module) {
  example();
}

module.exports = { example };
