#!/bin/bash

# 抖音视频文本提取 API 测试脚本
# 使用方法: ./test.sh <抖音分享链接>

# 颜色配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
API_BASE_URL=${API_BASE_URL:-"http://localhost:3000"}
TIMEOUT=30

# 辅助函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_step() {
    echo -e "\n${CYAN}📋 步骤 $1: $2${NC}"
}

# 检查依赖
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        log_error "curl 未安装，请先安装 curl"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_warning "jq 未安装，JSON 输出将不会格式化"
        JQ_AVAILABLE=false
    else
        JQ_AVAILABLE=true
    fi
}

# 格式化 JSON 输出
format_json() {
    if [ "$JQ_AVAILABLE" = true ]; then
        echo "$1" | jq '.'
    else
        echo "$1"
    fi
}

# 测试健康状态
test_health() {
    log_step 1 "测试服务健康状态"
    
    response=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT \
        "$API_BASE_URL/health" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        http_code="${response: -3}"
        body="${response%???}"
        
        if [ "$http_code" = "200" ]; then
            log_success "服务状态正常"
            log_info "响应内容:"
            format_json "$body"
            return 0
        else
            log_error "服务返回错误状态码: $http_code"
            return 1
        fi
    else
        log_error "无法连接到服务，请确保服务正在运行在 $API_BASE_URL"
        return 1
    fi
}

# 测试API信息
test_api_info() {
    log_step 2 "获取API信息"
    
    response=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT \
        "$API_BASE_URL/api/info" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        http_code="${response: -3}"
        body="${response%???}"
        
        if [ "$http_code" = "200" ]; then
            log_success "获取API信息成功"
            log_info "API信息:"
            format_json "$body"
            return 0
        else
            log_error "获取API信息失败，状态码: $http_code"
            return 1
        fi
    else
        log_error "无法获取API信息"
        return 1
    fi
}

# 测试解析链接
test_parse_url() {
    local share_link="$1"
    log_step 3 "解析抖音链接"
    
    start_time=$(date +%s%N)
    response=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT \
        -H "Content-Type: application/json" \
        -d "{\"shareLink\": \"$share_link\"}" \
        "$API_BASE_URL/api/parse" 2>/dev/null)
    end_time=$(date +%s%N)
    
    if [ $? -eq 0 ]; then
        http_code="${response: -3}"
        body="${response%???}"
        duration=$(( (end_time - start_time) / 1000000 ))
        
        if [ "$http_code" = "200" ]; then
            log_success "链接解析成功 (${duration}ms)"
            log_info "解析结果:"
            format_json "$body"
            return 0
        else
            log_error "链接解析失败，状态码: $http_code"
            log_error "错误信息: $body"
            return 1
        fi
    else
        log_error "解析链接时发生网络错误"
        return 1
    fi
}

# 测试获取下载链接
test_download_link() {
    local share_link="$1"
    log_step 4 "获取下载链接"
    
    start_time=$(date +%s%N)
    response=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT \
        -H "Content-Type: application/json" \
        -d "{\"shareLink\": \"$share_link\"}" \
        "$API_BASE_URL/api/download-link" 2>/dev/null)
    end_time=$(date +%s%N)
    
    if [ $? -eq 0 ]; then
        http_code="${response: -3}"
        body="${response%???}"
        duration=$(( (end_time - start_time) / 1000000 ))
        
        if [ "$http_code" = "200" ]; then
            log_success "获取下载链接成功 (${duration}ms)"
            log_info "下载链接信息:"
            format_json "$body"
            return 0
        else
            log_error "获取下载链接失败，状态码: $http_code"
            log_error "错误信息: $body"
            return 1
        fi
    else
        log_error "获取下载链接时发生网络错误"
        return 1
    fi
}

# 测试文本提取
test_extract_text() {
    local share_link="$1"
    log_step 5 "提取视频文本"
    
    if [ -z "$SPEECH_API_KEY" ]; then
        log_warning "未设置 SPEECH_API_KEY 环境变量，跳过文本提取测试"
        return 2
    fi
    
    log_info "开始文本提取流程，这可能需要较长时间..."
    
    start_time=$(date +%s%N)
    response=$(curl -s -w "%{http_code}" --connect-timeout 120 \
        -H "Content-Type: application/json" \
        -d "{\"shareLink\": \"$share_link\"}" \
        "$API_BASE_URL/api/extract-text" 2>/dev/null)
    end_time=$(date +%s%N)
    
    if [ $? -eq 0 ]; then
        http_code="${response: -3}"
        body="${response%???}"
        duration=$(( (end_time - start_time) / 1000000 ))
        
        if [ "$http_code" = "200" ]; then
            log_success "文本提取成功 (${duration}ms)"
            log_info "提取结果:"
            format_json "$body"
            return 0
        else
            log_error "文本提取失败，状态码: $http_code"
            log_error "错误信息: $body"
            return 1
        fi
    else
        log_error "文本提取时发生网络错误"
        return 1
    fi
}

# 显示使用说明
show_usage() {
    echo "🎬 抖音视频文本提取 API 测试脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 <抖音分享链接> [选项]"
    echo ""
    echo "选项:"
    echo "  --skip-text     跳过文本提取测试"
    echo "  --api-url URL   指定API服务地址（默认: http://localhost:3000）"
    echo "  --help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 \"https://v.douyin.com/xxx\""
    echo "  $0 \"https://v.douyin.com/xxx\" --skip-text"
    echo "  API_BASE_URL=http://192.168.1.100:3000 $0 \"https://v.douyin.com/xxx\""
    echo ""
    echo "环境变量:"
    echo "  API_BASE_URL    API服务地址"
    echo "  SPEECH_API_KEY  语音识别API密钥（用于文本提取功能）"
    echo ""
}

# 主函数
main() {
    local share_link=""
    local skip_text=false
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help)
                show_usage
                exit 0
                ;;
            --skip-text)
                skip_text=true
                shift
                ;;
            --api-url)
                API_BASE_URL="$2"
                shift 2
                ;;
            *)
                if [ -z "$share_link" ]; then
                    share_link="$1"
                else
                    log_error "未知参数: $1"
                    show_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # 检查参数
    if [ -z "$share_link" ]; then
        log_error "请提供抖音分享链接"
        show_usage
        exit 1
    fi
    
    if [[ ! "$share_link" =~ douyin\.com ]]; then
        log_error "请提供有效的抖音分享链接"
        exit 1
    fi
    
    # 检查依赖
    check_dependencies
    
    # 开始测试
    echo -e "\n${CYAN}🚀 开始抖音视频处理功能测试${NC}"
    echo -e "${CYAN}$(printf '=%.0s' {1..50})${NC}"
    log_info "测试链接: $share_link"
    log_info "API地址: $API_BASE_URL"
    
    local test_results=()
    
    # 执行测试
    test_health && test_results+=("健康检查:✅") || test_results+=("健康检查:❌")
    
    if [ ${#test_results[@]} -eq 1 ] && [[ "${test_results[0]}" =~ ✅ ]]; then
        test_api_info && test_results+=("API信息:✅") || test_results+=("API信息:❌")
        test_parse_url "$share_link" && test_results+=("链接解析:✅") || test_results+=("链接解析:❌")
        test_download_link "$share_link" && test_results+=("下载链接:✅") || test_results+=("下载链接:❌")
        
        if [ "$skip_text" = true ]; then
            test_results+=("文本提取:⏭️")
            log_step 5 "跳过文本提取测试"
        else
            test_extract_text "$share_link"
            case $? in
                0) test_results+=("文本提取:✅") ;;
                2) test_results+=("文本提取:⏭️") ;;
                *) test_results+=("文本提取:❌") ;;
            esac
        fi
    else
        log_error "服务不可用，跳过其他测试"
    fi
    
    # 显示测试总结
    echo -e "\n${CYAN}📊 测试结果总结${NC}"
    echo -e "${CYAN}$(printf '=%.0s' {1..50})${NC}"
    
    local success_count=0
    local total_count=${#test_results[@]}
    
    for result in "${test_results[@]}"; do
        name="${result%:*}"
        status="${result#*:}"
        case $status in
            "✅") 
                log_success "$name: 通过"
                ((success_count++))
                ;;
            "⏭️") 
                log_warning "$name: 跳过"
                ((success_count++))
                ;;
            "❌") 
                log_error "$name: 失败"
                ;;
        esac
    done
    
    echo ""
    if [ $success_count -eq $total_count ]; then
        log_success "🎯 测试完成: $success_count/$total_count 项通过"
    else
        log_warning "🎯 测试完成: $success_count/$total_count 项通过"
    fi
}

# 运行主函数
main "$@" 