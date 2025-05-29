# 🎬 抖音视频处理命令行工具

这个目录包含了一套完整的命令行工具，可以在不启动 HTTP 服务器的情况下直接处理抖音视频。

## 🚀 快速开始

### 1. 使用快速启动脚本 (推荐)

```bash
# 回到项目根目录
cd ..

# 使用快速启动脚本
./douyin-cli status                                    # 检查环境
./douyin-cli download "https://v.douyin.com/xxx"      # 下载视频
./douyin-cli to-text "https://v.douyin.com/xxx"       # 提取文本
```

### 2. 直接使用 Node.js 脚本

```bash
# 检查环境状态
node douyin.js status

# 下载视频
node douyin-download.js "https://v.douyin.com/xxx"

# 提取文本 (需要设置 SPEECH_API_KEY)
node douyin-to-text.js "https://v.douyin.com/xxx"

# 批量处理
node douyin-batch.js ../example-links.txt -m download
```

## 📋 工具列表

| 文件名               | 功能         | 说明                 |
| -------------------- | ------------ | -------------------- |
| `douyin.js`          | 主要工具入口 | 统一界面，环境检查   |
| `douyin-to-text.js`  | 视频转文本   | 完整的语音转文本流程 |
| `douyin-download.js` | 视频下载     | 下载无水印视频       |
| `douyin-batch.js`    | 批量处理     | 处理多个视频链接     |

## 💡 使用技巧

### 1. 环境变量设置

```bash
# 设置API密钥（文本提取功能需要）
export SPEECH_API_KEY="your-siliconflow-api-key"

# 可选：自定义临时目录
export TEMP_DIR="/path/to/temp"
```

### 2. 批量处理示例

```bash
# 创建链接文件
cat > my_videos.txt << EOF
https://v.douyin.com/video1
https://v.douyin.com/video2
https://v.douyin.com/video3
EOF

# 批量下载
node douyin-batch.js my_videos.txt -m download -o ./downloads

# 批量提取文本
node douyin-batch.js my_videos.txt -m text -o ./texts
```

### 3. 输出文件管理

```bash
# 指定输出目录
node douyin-download.js "URL" -o "./videos/$(date +%Y%m%d)/"

# 保存为特定格式
node douyin-to-text.js "URL" -o "result_$(date +%Y%m%d_%H%M%S).json"
```

## 🔧 故障排除

### 常见问题

1. **项目未编译**

   ```bash
   cd .. && npm run build
   ```

2. **FFmpeg 未安装**

   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt install ffmpeg
   ```

3. **API 密钥问题**

   ```bash
   # 设置环境变量
   export SPEECH_API_KEY="your-key"

   # 或创建.env文件
   echo "SPEECH_API_KEY=your-key" > ../.env
   ```

### 调试模式

```bash
# 启用详细日志
LOG_LEVEL=debug node douyin-to-text.js "URL"

# 保存日志到文件
node douyin-batch.js links.txt 2>&1 | tee process.log
```

## 📚 更多信息

- 详细使用说明: `../命令行工具使用说明.md`
- 项目主 README: `../README.md`
- 技术文档: `../技术对比与实现说明.md`

---

💡 **提示**: 这些工具设计为独立运行，不依赖 HTTP 服务器，非常适合脚本化和自动化使用场景。
