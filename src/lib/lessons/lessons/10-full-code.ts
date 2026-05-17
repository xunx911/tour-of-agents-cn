export const lesson10FullCode = `import json

def trace(t, l, data=None):
    evt = {"id": l[:8], "timestamp": 0, "type": t, "label": l}
    if data is not None:
        evt["data"] = data
    print(f'__TRACE__:{json.dumps(evt, ensure_ascii=False)}')

skill_files = {
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
}

skill_assets = {
    "code-review": {
        "script": "code-review/scripts/check_review.py",
        "references": ["code-review/references/review-checklist.md"],
    },
    "meeting-notes": {
        "script": "meeting-notes/scripts/extract_actions.py",
        "references": ["meeting-notes/references/action-format.md"],
    },
}

def read_text(path, purpose):
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
    return index

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
    return {"meta": meta, "instructions": instructions, "references": references, "script": files["script"]}

def run_script(path, payload):
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

print(await agent("审查这段函数：def add(a, b): return a - b"))`;
