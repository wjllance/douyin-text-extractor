#!/usr/bin/env node

/**
 * 抖音视频下载命令行工具
 * 功能：从抖音分享链接下载无水印视频
 * 使用：node scripts/douyin-download.js <抖音链接> [选项]
 */

const path = require("path");
const fs = require("fs");

// 添加TypeScript编译后的路径到模块搜索路径
require("module").globalPaths.push(path.resolve(__dirname, "../dist"));

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

class DouyinDownloader {
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

      // 对于下载功能，不需要语音识别API密钥
      return new DouyinService(
        "dummy-key", // 占位符，下载不需要真实的API密钥
        config.speechApi.baseUrl,
        config.speechApi.model,
        config.cleanup.autoCleanTempFiles
      );
    } catch (error) {
      if (error.code === "MODULE_NOT_FOUND") {
        throw new Error("项目未编译，请先运行: npm run build");
      }
      throw error;
    }
  }

  // 解析视频信息
  async parseVideo(shareLink) {
    this.log("\n🎬 抖音视频下载工具", "bright");
    this.log("=".repeat(50), "cyan");

    try {
      this.logStep("初始化服务");
      const service = await this.initializeService();

      this.logStep("解析视频信息");
      this.logInfo(`视频链接: ${shareLink}`);

      const videoInfo = await service.parseShareUrl(shareLink);

      this.logSuccess("视频信息解析完成");
      this.logInfo(`视频ID: ${videoInfo.videoId}`);
      this.logInfo(`标题: ${videoInfo.title}`);
      this.logInfo(`描述: ${videoInfo.desc || "无描述"}`);

      return { service, videoInfo };
    } catch (error) {
      this.logError(`解析失败: ${error.message}`);
      throw error;
    }
  }

  // 下载视频
  async downloadVideo(shareLink, options = {}) {
    const startTime = Date.now();

    try {
      const { service, videoInfo } = await this.parseVideo(shareLink);

      this.logStep("开始下载视频");

      // 确定输出路径
      let outputPath;
      if (options.output) {
        outputPath = options.output;
        if (options.output.endsWith("/")) {
          // 如果是目录，使用视频标题作为文件名
          outputPath = path.join(options.output, `${videoInfo.title}.mp4`);
        }
      } else {
        // 默认保存到当前目录
        outputPath = `${videoInfo.title}.mp4`;
      }

      // 创建输出目录
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 下载视频（临时路径）
      const tempVideoPath = await service.downloadVideo(
        videoInfo,
        (progress) => {
          this.showProgress(
            progress.stage,
            progress.progress,
            progress.message
          );
        }
      );

      // 移动到目标位置
      fs.renameSync(tempVideoPath, outputPath);

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      // 显示结果
      this.log("\n📊 下载完成", "bright");
      this.log("=".repeat(50), "cyan");
      this.logSuccess(`总耗时: ${duration}秒`);
      this.logSuccess(`文件保存到: ${outputPath}`);

      // 显示文件信息
      const stats = fs.statSync(outputPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      this.logInfo(`文件大小: ${fileSizeMB} MB`);

      return { videoInfo, outputPath, fileSize: fileSizeMB };
    } catch (error) {
      this.logError(`下载失败: ${error.message}`);
      throw error;
    }
  }

  // 仅获取下载链接（不下载）
  async getDownloadLink(shareLink) {
    try {
      const { videoInfo } = await this.parseVideo(shareLink);

      this.log("\n🔗 下载链接信息", "bright");
      this.log("=".repeat(50), "cyan");
      this.logInfo("下载链接:");
      console.log(videoInfo.downloadUrl);

      this.logWarning("注意: 此链接可能有时效性，请及时使用");

      return videoInfo;
    } catch (error) {
      this.logError(`获取下载链接失败: ${error.message}`);
      throw error;
    }
  }
}

// 显示使用说明
function showUsage() {
  console.log(`
🎬 抖音视频下载命令行工具

使用方法:
  node scripts/douyin-download.js <抖音分享链接> [选项]

选项:
  -o, --output <路径>       指定输出文件路径或目录
  -l, --link-only          仅获取下载链接，不实际下载
  -h, --help              显示此帮助信息

示例:
  # 下载到当前目录
  node scripts/douyin-download.js "https://v.douyin.com/xxx"
  
  # 指定输出文件名
  node scripts/douyin-download.js "https://v.douyin.com/xxx" -o "my_video.mp4"
  
  # 指定输出目录
  node scripts/douyin-download.js "https://v.douyin.com/xxx" -o "./downloads/"
  
  # 仅获取下载链接
  node scripts/douyin-download.js "https://v.douyin.com/xxx" --link-only

注意:
  1. 首次使用前请运行: npm run build
  2. 下载的视频为无水印版本
  3. 请遵守抖音的使用条款和版权规定
`);
}

// 解析命令行参数
function parseArgs(args) {
  const options = { output: null, linkOnly: false };
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
          console.error("❌ -o/--output 选项需要指定路径");
          process.exit(1);
        }
        break;
      case "-l":
      case "--link-only":
        options.linkOnly = true;
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

  const downloader = new DouyinDownloader();

  try {
    if (options.linkOnly) {
      await downloader.getDownloadLink(shareLink);
      console.log("\n🎉 获取完成！");
    } else {
      await downloader.downloadVideo(shareLink, options);
      console.log("\n🎉 下载完成！");
    }
  } catch (error) {
    console.error(`\n💥 操作失败: ${error.message}`);
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

module.exports = { DouyinDownloader };
