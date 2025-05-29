#!/usr/bin/env node

/**
 * 抖音视频转文本命令行工具
 * 功能：直接从抖音分享链接提取视频中的文本内容
 * 使用：node scripts/douyin-to-text.js <抖音链接> [选项]
 */

const path = require("path");
const fs = require("fs");

// 添加TypeScript编译后的路径到模块搜索路径
require("module").globalPaths.push(path.resolve(__dirname, "../dist"));

// load .env
require("dotenv").config();

// 颜色配置
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

class DouyinTextExtractor {
  constructor() {
    this.progressBar = {
      current: 0,
      total: 100,
      width: 40,
    };
  }

  log(message, color = "reset") {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  logSuccess(message) {
    this.log(`✅ ${message}`, "green");
  }

  logError(message) {
    this.log(`❌ ${message}`, "red");
  }

  logWarning(message) {
    this.log(`⚠️  ${message}`, "yellow");
  }

  logInfo(message) {
    this.log(`ℹ️  ${message}`, "blue");
  }

  logStep(message) {
    this.log(`\n🔄 ${message}`, "cyan");
  }

  // 显示进度条
  showProgress(stage, progress, message) {
    const filled = Math.round((this.progressBar.width * progress) / 100);
    const empty = this.progressBar.width - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);

    // 清除当前行并显示进度
    process.stdout.write(
      `\r${COLORS.cyan}[${bar}] ${progress}% - ${message}${COLORS.reset}`
    );

    if (progress >= 100) {
      console.log(); // 换行
    }
  }

  // 加载并初始化服务
  async initializeService() {
    try {
      // 动态导入编译后的模块
      const { DouyinService } = require("../dist/services/DouyinService");
      const { config } = require("../dist/config");

      if (!config.speechApi.key) {
        throw new Error("SPEECH_API_KEY 环境变量未设置，请在 .env 文件中配置");
      }

      return new DouyinService({
        speechApiKey: config.speechApi.key,
        speechApiBaseUrl: config.speechApi.baseUrl,
        speechModel: config.speechApi.model,
        autoCleanTempFiles: config.cleanup.autoCleanTempFiles,
      });
    } catch (error) {
      if (error.code === "MODULE_NOT_FOUND") {
        throw new Error("项目未编译，请先运行: npm run build");
      }
      throw error;
    }
  }

  // 主要的文本提取功能
  async extractText(shareLink, options = {}) {
    this.log("\n🎬 抖音视频转文本工具", "bright");
    this.log("=".repeat(50), "cyan");

    const startTime = Date.now();

    try {
      this.logStep("初始化服务");
      const service = await this.initializeService();

      this.logStep("开始处理视频");
      this.logInfo(`视频链接: ${shareLink}`);

      const result = await service.extractText(shareLink, (progress) => {
        this.showProgress(progress.stage, progress.progress, progress.message);
      });

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      // 显示结果
      this.log("\n📊 处理完成", "bright");
      this.log("=".repeat(50), "cyan");
      this.logSuccess(`总耗时: ${duration}秒`);
      this.logInfo(`视频ID: ${result.videoInfo.videoId}`);
      this.logInfo(`标题: ${result.videoInfo.title}`);
      this.logInfo(`描述: ${result.videoInfo.desc || "无描述"}`);

      this.log("\n📝 提取的文本内容:", "bright");
      this.log("=".repeat(50), "cyan");
      console.log(result.extractedText);

      // 保存到文件（如果指定）
      if (options.output) {
        await this.saveToFile(result, options.output);
      }

      return result;
    } catch (error) {
      this.logError(`处理失败: ${error.message}`);
      throw error;
    }
  }

  // 保存结果到文件
  async saveToFile(result, outputPath) {
    try {
      const content = {
        timestamp: new Date().toISOString(),
        videoInfo: result.videoInfo,
        extractedText: result.extractedText,
      };

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      if (outputPath.endsWith(".json")) {
        fs.writeFileSync(outputPath, JSON.stringify(content, null, 2));
      } else {
        // 默认保存为文本格式
        const textContent = `视频标题: ${result.videoInfo.title}
视频ID: ${result.videoInfo.videoId}
描述: ${result.videoInfo.desc || "无描述"}
提取时间: ${content.timestamp}

提取的文本内容:
${result.extractedText}`;
        fs.writeFileSync(outputPath, textContent);
      }

      this.logSuccess(`结果已保存到: ${outputPath}`);
    } catch (error) {
      this.logWarning(`保存文件失败: ${error.message}`);
    }
  }
}

// 显示使用说明
function showUsage() {
  console.log(`
🎬 抖音视频转文本命令行工具

使用方法:
  node scripts/douyin-to-text.js <抖音分享链接> [选项]

选项:
  -o, --output <文件路径>    保存结果到文件 (.txt 或 .json)
  -h, --help               显示此帮助信息

示例:
  # 基础使用
  node scripts/douyin-to-text.js "https://v.douyin.com/xxx"
  
  # 保存为文本文件
  node scripts/douyin-to-text.js "https://v.douyin.com/xxx" -o result.txt
  
  # 保存为JSON文件
  node scripts/douyin-to-text.js "https://v.douyin.com/xxx" -o result.json

环境变量:
  SPEECH_API_KEY    语音识别API密钥（必需）
  SPEECH_API_BASE_URL    API服务地址（可选）
  SPEECH_MODEL      语音识别模型（可选）

注意:
  1. 首次使用前请运行: npm run build
  2. 确保已安装 FFmpeg: brew install ffmpeg (macOS)
  3. 在项目根目录的 .env 文件中设置 SPEECH_API_KEY
`);
}

// 解析命令行参数
function parseArgs(args) {
  const options = { output: "./result.txt" };
  let shareLink = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "-h":
      case "--help":
        showUsage();
        process.exit(0);
        break;
      case "-o":
      case "--output":
        if (i + 1 < args.length) {
          options.output = args[i + 1];
          i++; // 跳过下一个参数
        } else {
          console.error("❌ -o/--output 选项需要指定文件路径");
          process.exit(1);
        }
        break;
      default:
        if (!shareLink && !arg.startsWith("-")) {
          shareLink = arg;
        }
        break;
    }
  }

  return { shareLink, options };
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showUsage();
    process.exit(1);
  }

  const { shareLink, options } = parseArgs(args);

  if (!shareLink) {
    console.error("❌ 请提供抖音分享链接");
    showUsage();
    process.exit(1);
  }

  if (!shareLink.includes("douyin.com")) {
    console.error("❌ 请提供有效的抖音分享链接");
    process.exit(1);
  }

  const extractor = new DouyinTextExtractor();

  try {
    await extractor.extractText(shareLink, options);
    console.log("\n🎉 处理完成！");
  } catch (error) {
    console.error(`\n💥 处理失败: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ 程序执行失败:", error.message);
    process.exit(1);
  });
}

module.exports = { DouyinTextExtractor };
