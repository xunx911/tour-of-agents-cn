import { LessonDefinition } from "../types";
import { lesson10FullCode } from "./10-full-code";

export const lesson10: LessonDefinition = {
  slug: "skills",
  number: 10,
  title: "Skill 是标准技能包",
  subtitle: "把工具、提示词、脚本和参考资料打包成可复用能力。",
  difficulty: "advanced",
  concepts: ["Skill Bundle", "SKILL.md", "渐进加载", "脚本接口"],
  graph: {
    nodes: [
      { id: "user", label: "用户任务", icon: "⟩", phase: "input" },
      { id: "discover", label: "发现已安装 Skills", icon: "◇", phase: "input" },
      { id: "index", label: "只读 frontmatter", icon: "≡", phase: "state" },
      { id: "router", label: "匹配触发条件?", shape: "diamond", phase: "policy" },
      { id: "load", label: "加载完整 SKILL.md", icon: "◆", phase: "policy" },
      { id: "reference", label: "按需读取资料", icon: "□", phase: "memory" },
      { id: "script", label: "运行脚本接口", icon: "⚙", phase: "tool" },
      { id: "answer", label: "结构化输出", icon: "✓", phase: "output" },
    ],
    edges: [
      { id: "user-discover", source: "user", target: "discover" },
      { id: "discover-index", source: "discover", target: "index" },
      { id: "index-router", source: "index", target: "router" },
      { id: "router-load", source: "router", target: "load", label: "命中" },
      { id: "load-reference", source: "load", target: "reference" },
      { id: "reference-script", source: "reference", target: "script" },
      { id: "script-answer", source: "script", target: "answer" },
      { id: "router-answer", source: "router", target: "answer", label: "未命中" },
    ],
  },
  frameworkName:
    "标准 Skill Bundle 是 `SKILL.md` + 可选 `scripts/`、`references/`、`assets/`、`templates/`，运行器先索引元数据，再按需加载完整能力包。",
  llmConfig: {
    systemPrompt:
      "You can activate standard skill bundles. Discover installed skills, index only frontmatter first, then load the selected SKILL.md, references, and scripts through sandbox interfaces after activation.",
    tools: [
      {
        name: "run_script",
        description: "Run a script from an activated skill bundle through a sandbox adapter",
        parameters: {
          path: { type: "string" },
          payload: { type: "object" },
        },
      },
    ],
    mockResponses: [],
  },
  steps: [
    {
      id: "standard",
      highlightNodes: ["discover", "index"],
      prose: `# Skill 先是标准，再是具体例子

不要先把 Skill 理解成某一个“代码审查工具”。更准确地说：**Skill 是一个标准化能力包**，它把说明、脚本、参考资料和模板放在一个清晰的目录边界里。

一个通用 Skill Bundle 通常长这样：

\`\`\`text
skill-name/
  SKILL.md              # 必需：metadata + 使用说明
  scripts/              # 可选：确定性程序
  references/           # 可选：长文档、检查清单、规范
  assets/               # 可选：图片、示例文件、静态资源
  templates/            # 可选：输出模板或项目模板
\`\`\`

运行器不会一开始就把所有文件塞进模型上下文。它先读每个 \`SKILL.md\` 顶部的少量 metadata，知道“有哪些 skill、什么时候该用”，命中任务后才加载完整内容。`,
      code: `STANDARD_BUNDLE_SHAPE = {
    "required": ["SKILL.md"],
    "optional": ["scripts/", "references/", "assets/", "templates/"],
    "runtime_rule": "先索引 metadata，命中后再加载完整 bundle",
}

print(STANDARD_BUNDLE_SHAPE["runtime_rule"])`,
    },
    {
      id: "example",
      highlightNodes: ["discover"],
      prose: `## 例子：两个已安装的 skill

下面才进入具体例子。我们模拟系统里安装了两个 skill：\`code-review\` 和 \`meeting-notes\`。注意：此时它们只是“可被发现的目录”，还没有把完整说明、参考资料或脚本加载进来。`,
      code: `skill_files = {
    "code-review/SKILL.md": """---
name: code-review
description: Use when reviewing code for correctness, tests, edge cases, and risks.
keywords: review, 审查, 检查, bug, 风险
---
# Code Review Skill

When active, read the user's code, consult references/review-checklist.md,
then run scripts/check_review.py through the skill runner.
""",
    "code-review/references/review-checklist.md": "- correctness\\n- tests\\n- edge cases\\n- risk",
    "code-review/scripts/check_review.py": "simulated deterministic review script",

    "meeting-notes/SKILL.md": """---
name: meeting-notes
description: Use when turning meeting notes into decisions and action items.
keywords: meeting, 会议, 纪要, action, 决策
---
# Meeting Notes Skill

When active, extract decisions, owners, dates, and action items.
""",
    "meeting-notes/references/action-format.md": "- decision\\n- owner\\n- due date",
    "meeting-notes/scripts/extract_actions.py": "simulated meeting-note script",
}`,
    },
    {
      id: "index",
      highlightNodes: ["discover", "index", "router"],
      prose: `## 第 1 步：只建立轻量索引

专业做法是先读取每个 \`SKILL.md\` 的 frontmatter：\`name\`、\`description\`、\`keywords\`。这一步只够做路由判断，不读取 \`references/\`，也不运行 \`scripts/\`。`,
      code: `def read_text(path, purpose):
    trace("memory_read", f"{purpose}: {path}")
    return skill_files[path]

def parse_frontmatter(markdown):
    block = markdown.split("---", 2)[1]
    meta = {}
    for line in block.strip().split("\\n"):
        key, value = line.split(":", 1)
        value = value.strip()
        if key.strip() == "keywords":
            value = [item.strip().lower() for item in value.split(",")]
        meta[key.strip()] = value
    return meta

def discover_skill_names():
    names = sorted({path.split("/")[0] for path in skill_files if path.endswith("/SKILL.md")})
    trace("state_update", f"发现已安装 Skills: {', '.join(names)}")
    return names

def build_skill_index():
    index = []
    for name in discover_skill_names():
        markdown = read_text(f"{name}/SKILL.md", "只读取索引")
        index.append(parse_frontmatter(markdown))
    trace("state_update", f"索引完成: {len(index)} 个 skill；references/scripts 尚未加载")
    return index`,
    },
    {
      id: "activate",
      highlightNodes: ["router", "load", "reference"],
      prose: `## 第 2 步：命中后再加载完整 bundle

当任务命中某个 skill，运行器才读取完整 \`SKILL.md\` 和相关参考资料。这里的边界很重要：\`load_skill_bundle(name)\` 今天读的是模拟 dict，后面可以替换成真实文件系统、远端包或权限隔离沙箱。`,
      code: `skill_assets = {
    "code-review": {
        "script": "code-review/scripts/check_review.py",
        "references": ["code-review/references/review-checklist.md"],
    },
    "meeting-notes": {
        "script": "meeting-notes/scripts/extract_actions.py",
        "references": ["meeting-notes/references/action-format.md"],
    },
}

def choose_skill(task, index):
    text = task.lower()
    for meta in index:
        trace("policy_check", f"检查 {meta['name']}: {meta['description']}")
        if any(keyword in text for keyword in meta["keywords"]):
            trace("state_update", f"命中 skill: {meta['name']}")
            return meta
    trace("policy_check", "没有 skill 命中，按普通任务处理")
    return None

def load_skill_bundle(meta):
    name = meta["name"]
    files = skill_assets[name]
    instructions = read_text(f"{name}/SKILL.md", "加载完整说明")
    references = [
        read_text(path, "按需读取参考资料")
        for path in files["references"]
    ]
    return {"meta": meta, "instructions": instructions, "references": references, "script": files["script"]}`,
    },
    {
      id: "run",
      highlightNodes: ["user", "discover", "index", "router", "load", "reference", "script", "answer"],
      prose: `## 运行：从 Trace 读出渐进式加载

点击代码审查样例。右侧 Trace 应该按这个顺序出现：发现已安装 skills → 只读 frontmatter 建索引 → 匹配 \`code-review\` → 加载完整 \`SKILL.md\` → 读取 \`references/\` → 通过 \`run_script(path, payload)\` 执行脚本。

这才是 Skill 和普通工具的区别：工具是“可调用函数”，Skill 是“可被发现、可被激活、可按需加载的一组能力”。`,
      code: `def run_script(path, payload):
    trace("tool_call", f"run_script: {path}", {"task": payload["task"]})
    if path.endswith("check_review.py"):
        result = {
            "finding": "函数名是 add，但实现返回 a - b，行为和名字不一致。",
            "test": "补一个断言：add(10, 5) 应该等于 15。",
        }
    else:
        result = {
            "finding": "整理出 1 个决策和 2 个行动项。",
            "test": "确认每个行动项都有负责人和日期。",
        }
    trace("tool_result", f"脚本完成: {result['finding']}")
    return result

async def agent(task):
    trace("agent_start", f"Task: {task}")
    index = build_skill_index()
    meta = choose_skill(task, index)
    if meta is None:
        trace("agent_end", "没有激活 Skill：只完成了轻量索引")
        return "没有匹配的 Skill，所以没有加载任何 references 或 scripts。"
    bundle = load_skill_bundle(meta)
    report = run_script(bundle["script"], {"task": task, "references": bundle["references"]})
    answer = f"激活 {meta['name']}。发现：{report['finding']} 建议：{report['test']}"
    trace("agent_end", answer)
    return answer

print(await agent(USER_INPUT))`,
      inputConfig: {
        placeholder: "试试“审查这段函数：def add(a, b): return a - b”",
        variable: "USER_INPUT",
        samples: [
          "审查这段函数：def add(a, b): return a - b",
          "把这段会议纪要整理成行动项",
          "随便聊聊 Python",
        ],
      },
    },
  ],
  fullCode: lesson10FullCode,
};
