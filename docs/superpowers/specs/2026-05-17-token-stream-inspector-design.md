# Token Stream Inspector Design

日期：2026-05-17

## 目标

在现有课程的 Trace 面板里加入专业的 Token 视图，让中文读者能看懂：一个 OpenAI 兼容的 HTTP 请求发出去以后，在进入模型之前还会被模板化、序列化，并最终变成连续的 token 序列。

这个功能不是独立的 tokenizer 玩具页。它必须嵌入现有 `Request` / `Response` 详情区，并保持当前课程的 lesson 流程、图动画、运行全部、逐步运行和 Trace 可读性不被破坏。

## 产品形态

只对 LLM 请求和响应的 Trace 行增加新视图。

`→ Request` 行保留当前 JSON 详情，并增加三个页签：

- `请求 JSON`
- `序列化文本`
- `Token 序列`

`← Response` 行保留当前 JSON 详情，并增加两个页签：

- `响应 JSON`
- `输出 Token`

`Token 序列` 主视图必须展示一条完整、连续、有顺序的 token 流。它不能把主显示拆成 system / user / tool 分组，因为模型实际看到的是连续序列，不是页面上的分栏。颜色、hover 文案和图例可以说明 token 来源，但只能作为标注，不能改变连续流的呈现。

## Token 语义边界

Token 视图必须绑定具体模型族、chat template 和 tokenizer。不同模型的 token 边界、特殊 token、消息模板都可能不同。

对于有公开 chat template 的模型族，例如 Qwen：

- 用该模型族公开的 chat template 序列化 `messages` 和 `tools`
- 在 tokenizer 定义了特殊 token 时，显示真实的特殊 token，例如 `<|im_start|>` 和 `<|im_end|>`
- 用匹配 tokenizer 对序列化文本编码
- 渲染 token id、解码文本、来源标注，并保持一个连续序列

对于内部 chat 序列化不公开的闭源或兼容提供商：

- 不伪造特殊 token
- 保留 `请求 JSON` 作为真实 HTTP 视角
- 展示公开的模型名、encoding 信息和 API 返回的 `usage.prompt_tokens` / `usage.completion_tokens`
- 如需展示“可见文本 tokenization”，必须明确标注它不是提供商内部完整 chat 序列
- 对“完整 special-token 流”显示不可用状态，而不是用自造占位 token 替代

这条边界是硬要求：不能出现 `<assistant_turn>` 这类看起来专业但并非 tokenizer/chat template 真实产物的 token。

## 架构

新增两个小接口，隔离模板序列化和 tokenizer。这样课程可以先用模拟/教学实现，后续再替换成真实 tokenizer 接入。

`ChatTemplateAdapter`

```ts
interface SerializedChat {
  text: string;
  spans: Array<{
    start: number;
    end: number;
    source:
      | "special"
      | "role"
      | "system"
      | "user"
      | "assistant"
      | "tool"
      | "tool_result"
      | "newline";
    label: string;
  }>;
}

interface ChatTemplateAdapter {
  id: string;
  label: string;
  supports(model: string): boolean;
  serialize(input: {
    messages: Array<{ role: string; content?: unknown }>;
    tools?: unknown[];
    addGenerationPrompt?: boolean;
  }): SerializedChat;
}
```

`TokenizerAdapter`

```ts
interface TokenizedChat {
  tokenizer: string;
  tokens: Array<{
    id: number;
    text: string;
    source: SerializedChat["spans"][number]["source"];
    label: string;
  }>;
}

interface TokenizerAdapter {
  id: string;
  label: string;
  supports(model: string): boolean;
  tokenize(serialized: SerializedChat): TokenizedChat;
}
```

首版实现包含三个适配器：

- `QwenChatTemplateAdapter`：教学/演示路径，展示带真实 special token 的完整连续流
- `OpenAiPublicEncodingAdapter`：只展示公开 encoding、可见文本 tokenization 和 API usage，不展示伪造内部 special token
- `UnsupportedTokenizerAdapter`：对未知模型显示清晰的不可用状态

## UI 细节

Token 视图要融入现有课程界面，而不是插入一个风格突兀的新组件。

- token chip 使用紧凑等宽字体
- 圆角控制在约 8px，细边框、轻填充
- 不做大卡片套小卡片
- 当前页签使用现有深色激活态
- 来源颜色保持克制，只服务于理解
- token 区域在详情面板内部换行展示，超过最大高度后内部滚动
- 窄屏下页签可以换行，但不能挤压 Trace 主列或图动画

每个 token chip 展示：

- token id
- 解码后的 token 文本
- hover title 或 aria label，说明来源和含义

特殊 token 使用独立但克制的颜色。来源颜色只是解释层，不能暗示模型接收了多个分离输入。

## 数据流

1. Pyodide bootstrap 已经在 `llm_request` 里记录 URL、model、messages 和 tools。
2. `useMonitor` 把 trace 转成 `MonitorEntry.detail`。
3. `TraceLog` 当前渲染 `MonitorJsonBlock`。
4. 新增或替换为 LLM-aware detail 组件：
   - 非 LLM trace 行保持当前 JSON 行为
   - `llm_request` 渲染 `请求 JSON` / `序列化文本` / `Token 序列`
   - `llm_response` 渲染 `响应 JSON` / `输出 Token`
5. tokenization 在浏览器端基于 trace detail 数据运行。mock/demo 课程必须可确定复现，不能依赖随机或网络结果。

## 错误状态

页面必须显式展示以下状态：

- `tokenizer unavailable`：当前模型没有支持的 tokenizer adapter
- `chat template unavailable`：有公开 encoding，但完整内部 chat 序列化不可用
- `usage unavailable`：provider 没有返回 usage
- `tokenization failed`：message 或 tool payload 格式异常

任何情况下都不能静默回退到伪造 special token。

## 测试与验收

单元测试覆盖：

- Qwen template 能把 messages 序列化成包含真实 special token 的连续流
- token provenance span 能映射回正确来源，并保持 token 顺序
- 未知模型渲染不可用状态
- OpenAI 兼容闭源模式不会伪造 special token
- 现有 JSON 详情仍可访问

浏览器验收覆盖：

- mock 模式下运行一课
- 展开 `→ Request`
- 切到 `Token 序列`
- 确认展示的是连续 token 流，而不是 system/user/tool 分组
- 切到 `请求 JSON` 后原 JSON 仍可读
- 展开 `← Response` 并查看 `输出 Token`
- 在窄屏视口确认 Trace 布局不溢出、不遮挡图动画

## 参考资料

- OpenAI Cookbook: [How to count tokens with tiktoken](https://developers.openai.com/cookbook/examples/how_to_count_tokens_with_tiktoken)
- Qwen docs: [Key concepts](https://qwen.readthedocs.io/en/latest/getting_started/concepts.html)
- Qwen tokenizer examples and config references showing `<|im_start|>` / `<|im_end|>` chat-template behavior
