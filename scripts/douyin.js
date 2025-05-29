#!/usr/bin/env node

/**
 * 抖音视频处理工具套件
 * 功能：统一的命令行工具入口
 * 使用：node scripts/douyin.js <命令> [选项]
 */

const path = require("path");
const { spawn } = require("child_process");

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

function log(message, color = "reset") {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// 显示主要使用说明
function showMainUsage() {
  console.log(`
🎬 抖音视频处理工具套件

使用方法:
  node scripts/douyin.js <命令> [参数]

可用命令:
  to-text     将抖音视频转换为文本
  download    下载抖音视频
  batch       批量处理抖音视频
  help        显示帮助信息

快速开始:
  # 转换视频为文本
  node scripts/douyin.js to-text "https://v.douyin.com/xxx"
  
  # 下载视频
  node scripts/douyin.js download "https://v.douyin.com/xxx"
  
  # 批量处理
  node scripts/douyin.js batch links.txt

获取详细帮助:
  node scripts/douyin.js <命令> --help

环境要求:
  ✅ Node.js 16+
  ✅ FFmpeg (用于音频处理)
  ✅ SPEECH_API_KEY (用于文本提取)

设置步骤:
  1. 编译项目: npm run build
  2. 设置环境变量: export SPEECH_API_KEY="your-key"
  3. 开始使用！
`);
}

// 显示各命令的详细说明
function showCommandHelp(command) {
  switch (command) {
    case "to-text":
      console.log(`
📝 视频转文本命令

用途: 将抖音视频中的语音转换为文本

使用方法:
  node scripts/douyin.js to-text <抖音链接> [选项]

选项:
  -o, --output <文件>    保存结果到文件 (.txt 或 .json)
  -h, --help            显示帮助信息

示例:
  node scripts/douyin.js to-text "https://v.douyin.com/xxx"
  node scripts/douyin.js to-text "https://v.douyin.com/xxx" -o result.txt
`);
      break;

    case "download":
      console.log(`
⬇️ 视频下载命令

用途: 下载抖音无水印视频

使用方法:
  node scripts/douyin.js download <抖音链接> [选项]

选项:
  -o, --output <路径>    指定输出文件或目录
  -l, --link-only       仅获取下载链接
  -h, --help           显示帮助信息

示例:
  node scripts/douyin.js download "https://v.douyin.com/xxx"
  node scripts/douyin.js download "https://v.douyin.com/xxx" -o "./videos/"
  node scripts/douyin.js download "https://v.douyin.com/xxx" --link-only
`);
      break;

    case "batch":
      console.log(`
📦 批量处理命令

用途: 批量处理多个抖音视频

使用方法:
  node scripts/douyin.js batch <链接文件> [选项]

选项:
  -m, --mode <模式>     处理模式: download, text, both
  -o, --output <目录>   输出目录
  -d, --delay <毫秒>    请求延迟
  -h, --help           显示帮助信息

链接文件格式:
  每行一个抖音链接，支持 # 注释

示例:
  node scripts/douyin.js batch links.txt -m download
  node scripts/douyin.js batch links.txt -m both -o ./output
`);
      break;

    default:
      log(`❌ 未知命令: ${command}`, "red");
      showMainUsage();
      break;
  }
}

// 执行子命令
function executeCommand(command, args) {
  let scriptPath;

  switch (command) {
    case "to-text":
      scriptPath = path.join(__dirname, "douyin-to-text.js");
      break;
    case "download":
      scriptPath = path.join(__dirname, "douyin-download.js");
      break;
    case "batch":
      scriptPath = path.join(__dirname, "douyin-batch.js");
      break;
    default:
      log(`❌ 未知命令: ${command}`, "red");
      process.exit(1);
  }

  // 启动子进程
  const child = spawn("node", [scriptPath, ...args], {
    stdio: "inherit", // 继承父进程的标准输入输出
    cwd: process.cwd(),
    env: process.env,
  });

  child.on("close", (code) => {
    process.exit(code);
  });

  child.on("error", (error) => {
    log(`❌ 执行命令失败: ${error.message}`, "red");
    process.exit(1);
  });
}

// 检查环境
function checkEnvironment() {
  const issues = [];

  // 检查Node.js版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
  if (majorVersion < 16) {
    issues.push(`Node.js版本过低 (当前: ${nodeVersion}, 需要: 16+)`);
  }

  // 检查是否已编译
  const distPath = path.join(__dirname, "../dist");
  const fs = require("fs");
  if (!fs.existsSync(distPath)) {
    issues.push("项目未编译，请运行: npm run build");
  }

  if (issues.length > 0) {
    log("⚠️ 环境检查发现问题:", "yellow");
    issues.forEach((issue) => {
      log(`  • ${issue}`, "red");
    });
    console.log();
  }

  return issues.length === 0;
}

// 显示快速状态检查
function showQuickStatus() {
  log("🔍 快速状态检查", "bright");
  log("=".repeat(40), "cyan");

  // 检查编译状态
  const fs = require("fs");
  const distPath = path.join(__dirname, "../dist");
  const compiled = fs.existsSync(distPath);
  log(
    `编译状态: ${compiled ? "✅ 已编译" : "❌ 未编译"}`,
    compiled ? "green" : "red"
  );

  // 检查API密钥 - 直接从环境变量读取
  const hasApiKey = !!process.env.SPEECH_API_KEY;

  log(
    `API密钥: ${hasApiKey ? "✅ 已设置" : "⚠️ 未设置"}`,
    hasApiKey ? "green" : "yellow"
  );

  // 检查FFmpeg (简单检查)
  try {
    require("child_process").execSync("ffmpeg -version", { stdio: "ignore" });
    log("FFmpeg: ✅ 已安装", "green");
  } catch {
    log("FFmpeg: ❌ 未安装", "red");
  }

  console.log();

  if (!compiled) {
    log("请先运行: npm run build", "yellow");
  }
  if (!hasApiKey) {
    log(
      '要使用文本提取功能，请设置: export SPEECH_API_KEY="your-key"',
      "yellow"
    );
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showMainUsage();
    showQuickStatus();
    process.exit(1);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  // 处理帮助命令
  if (command === "help" || command === "-h" || command === "--help") {
    if (commandArgs.length > 0) {
      showCommandHelp(commandArgs[0]);
    } else {
      showMainUsage();
    }
    return;
  }

  // 处理状态检查命令
  if (command === "status" || command === "check") {
    showQuickStatus();
    return;
  }

  // 检查环境（对于实际命令）
  if (!checkEnvironment()) {
    log("\n请解决以上问题后重试", "yellow");
    process.exit(1);
  }

  // 执行命令
  executeCommand(command, commandArgs);
}

// 捕获信号
process.on("SIGINT", () => {
  log("\n\n👋 用户中断，正在退出...", "yellow");
  process.exit(130);
});

process.on("SIGTERM", () => {
  log("\n\n👋 接收到终止信号，正在退出...", "yellow");
  process.exit(143);
});

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  showMainUsage,
  showCommandHelp,
  executeCommand,
  checkEnvironment,
};
