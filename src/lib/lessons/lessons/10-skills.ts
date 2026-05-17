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
      { id: "index", label: "索引 frontmatter", icon: "◇", phase: "input" },
      { id: "router", label: "匹配 Skill?", shape: "diamond", phase: "policy" },
      { id: "load", label: "加载 SKILL.md", icon: "◆", phase: "policy" },
      { id: "script", label: "运行 scripts/", icon: "⚙", phase: "tool" },
      { id: "answer", label: "结构化输出", icon: "✓", phase: "output" },
    ],
    edges: [
      { id: "user-index", source: "user", target: "index" },
      { id: "index-router", source: "index", target: "router" },
      { id: "router-load", source: "router", target: "load", label: "是" },
      { id: "load-script", source: "load", target: "script" },
      { id: "script-answer", source: "script", target: "answer" },
      { id: "router-answer", source: "router", target: "answer", label: "否" },
    ],
  },
  frameworkName:
    "标准 Skill Bundle 的核心是 `SKILL.md` + 可选 `scripts/`、`references/`、`assets/`，运行器按需加载。",
  llmConfig: {
    systemPrompt:
      "You can activate standard skill bundles. Index only metadata first, then load SKILL.md and run scripts through a sandbox interface when a skill matches.",
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
      id: "intro",
      prose: `# Skill 是标准技能包

工具是一个函数，Skill 是一整套可复用能力。一个专业的 Skill Bundle 通常不是只写一句 prompt，而是一个目录：

\`\`\`text
code-review/
  SKILL.md
  scripts/check_review.py
  references/review-checklist.md
\`\`\`

\`SKILL.md\` 负责说明这个 skill 什么时候用、怎么用；\`scripts/\` 放确定性程序；\`references/\`、\`assets/\`、\`templates/\` 放可按需读取的资料。关键点是：**先索引少量元数据，命中后再加载完整技能包**。`,
    },
    {
      id: "bundle",
      highlightNodes: ["index"],
      prose: `## 第 1 步：标准 bundle 结构

这里用一个 dict 模拟文件系统。真实接入时，\`read_bundle(path)\` 可以替换成读本地目录、远端包、对象存储或权限隔离后的沙箱文件。课程里先保留这个接口边界。`,
      code: `skill_bundle = {
    "SKILL.md": """---
name: code-review
description: Use when reviewing code for correctness, tests, edge cases, and risks.
---
# Code Review Skill

When this skill is active:
1. Read the change and the user's goal.
2. Run scripts/check_review.py through the skill runner.
3. Report findings first, then tests and residual risk.
""",
    "scripts/check_review.py": "simulated deterministic review script",
    "references/review-checklist.md": "- correctness\\n- tests\\n- edge cases\\n- risk",
}

def read_bundle(path):
    return skill_bundle[path]`,
    },
    {
      id: "index",
      highlightNodes: ["index", "router"],
      prose: `## 第 2 步：先索引 frontmatter

专业做法不是把所有 skill 的完整说明一次性塞进上下文。运行器先读取 \`SKILL.md\` 顶部的元数据，比如 \`name\` 和 \`description\`，用它来判断是否应该激活。`,
      code: `def parse_frontmatter(markdown):
    block = markdown.split("---", 2)[1]
    meta = {}
    for line in block.strip().split("\\n"):
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()
    return meta

def index_skill():
    meta = parse_frontmatter(read_bundle("SKILL.md"))
    trace("state_update", f"Indexed skill: {meta['name']}")
    return meta

def should_activate(task, meta):
    trace("policy_check", f"Match task against: {meta['description']}")
    text = task.lower()
    return any(word in text for word in ["review", "审查", "检查", "风险", "bug"])`,
    },
    {
      id: "activate",
      highlightNodes: ["load", "script"],
      prose: `## 第 3 步：命中后再加载完整 skill

当任务和 description 匹配，才读取完整 \`SKILL.md\` 和相关参考资料。脚本执行也通过 \`run_script(path, payload)\` 这个接口，不直接和具体运行环境耦合。今天是模拟运行，后面可以替换成真实沙箱。`,
      code: `def load_skill():
    trace("memory_read", "Loaded SKILL.md after activation")
    return {
        "instructions": read_bundle("SKILL.md"),
        "script": "scripts/check_review.py",
        "checklist": read_bundle("references/review-checklist.md"),
    }

def run_script(path, payload):
    trace("tool_call", f"run_script: {path}", {"payload": payload})
    result = {
        "finding": "函数名是 add，但实现返回 a - b，行为和名字不一致。",
        "test": "补一个断言：add(10, 5) 应该等于 15。",
        "risk": "如果上游把它当加法工具使用，会得到错误结果。",
    }
    trace("tool_result", "script_result: 发现 1 个高优先级问题")
    return result`,
    },
    {
      id: "run",
      highlightNodes: ["user", "router", "script", "answer"],
      prose: `## 试一下

点击代码审查样例。你会看到这不是普通工具调用：Agent 先索引 skill 元数据，再激活 \`code-review\`，读取 \`SKILL.md\`，最后通过脚本接口输出结构化发现。`,
      code: `async def agent(task):
    trace("agent_start", f"Task: {task}")
    meta = index_skill()
    if not should_activate(task, meta):
        trace("agent_end", "No skill activated")
        return "没有匹配的 skill，按普通任务处理。"
    skill = load_skill()
    report = run_script(skill["script"], {"task": task, "checklist": skill["checklist"]})
    answer = f"使用 {meta['name']}：{report['finding']} 建议：{report['test']}"
    trace("agent_end", answer)
    return answer

print(await agent(USER_INPUT))`,
      inputConfig: {
        placeholder: "试试“审查这段函数：def add(a, b): return a - b”",
        variable: "USER_INPUT",
        samples: [
          "审查这段函数：def add(a, b): return a - b",
          "检查这段代码有没有风险",
          "随便聊聊 Python",
        ],
      },
    },
  ],
  fullCode: lesson10FullCode,
};
