# 使用官方 Node.js 镜像
FROM node:18-alpine

# 安装 FFmpeg
RUN apk add --no-cache ffmpeg

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY dist ./dist

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S douyin -u 1001

# 创建必要的目录
RUN mkdir -p temp logs && chown -R douyin:nodejs temp logs

# 切换到非 root 用户
USER douyin

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["npm", "start"] 