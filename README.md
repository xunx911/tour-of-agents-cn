# A Tour of Agents 中文版

面向中文读者的 LLM Agent 交互式学习网页。课程保留原项目的交互体验：浏览器内运行 Python、右侧展示 Agent 图谱和 Trace 动画、无 API Key 时使用确定性的模拟 LLM。

本分支的目标是先把课程改到中文读者可直接学习，再逐步做品牌和更完整的本地化优化。代码运行部分保持解耦：现在用模拟工具和模拟 LLM 跑通课程，后续可以替换成真实模型、真实代码执行、搜索或文件系统工具。

## 课程内容

九节课从最小 Agent 开始，每节课都能在浏览器里运行：

| # | 课程 | 学到什么 |
|---|---|---|
| 1 | Agent 就是一个函数 | 调用 LLM 并返回结果 |
| 2 | 工具就是一个字典 | LLM 选择工具，程序负责执行 |
| 3 | Agent 循环 | 工具调用、结果回填、继续请求 |
| 4 | 对话就是消息数组 | 用 `messages` 保留当前会话上下文 |
| 5 | 状态就是一个字典 | 记录工具调用、进度和结构化信息 |
| 6 | 跨运行的记忆 | 把长期记忆注入系统提示词 |
| 7 | 策略就是护栏 | 输入关卡和输出关卡 |
| 8 | 计划与执行 | 先生成计划，再逐步执行 |
| 9 | 把所有部件合起来 | 组合工具、循环、记忆、状态、护栏和计划执行 |

## 本地运行

```bash
git clone https://github.com/xunx911/tour-of-agents-cn.git
cd tour-of-agents-cn
npm install
npm run dev
```

打开 http://localhost:3000。首次进入课程时会加载 Pyodide，之后所有示例都在浏览器本地运行。

## 使用真实 LLM

默认使用模拟响应，不需要 API Key。要接入真实模型：

1. 点击页头的 **API Keys**。
2. 选择 provider，填入 key，然后点击 **Test**。
3. Key 只保存在浏览器 `localStorage`，不会发送到本站服务器。

## 技术栈

- **Next.js 16** 静态导出
- **Pyodide** 在浏览器里运行 Python
- **React Flow** 展示 Agent 架构图
- **Tailwind CSS v4** 和 **shadcn/ui**
- **Shiki** 代码高亮
- **Vitest** 单元测试

## 开发命令

```bash
npm test
npm run lint
npm run build
```

## 上游项目

本项目基于 MIT 协议开源项目 `ahumblenerd/tour-of-agents` 二次开发。当前版本重点是中文课程体验、去广告化和可替换的交互式运行接口。

## License

MIT
