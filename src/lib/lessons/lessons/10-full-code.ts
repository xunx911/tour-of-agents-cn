export const lesson10FullCode = `import json

def trace(t, l, data=None):
    evt = {"id": l[:8], "timestamp": 0, "type": t, "label": l}
    if data is not None:
        evt["data"] = data
    print(f'__TRACE__:{json.dumps(evt)}')

skill_bundle = {
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
    return skill_bundle[path]

def parse_frontmatter(markdown):
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
    return any(word in text for word in ["review", "审查", "检查", "风险", "bug"])

def load_skill():
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
    return result

async def agent(task):
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

print(await agent("审查这段函数：def add(a, b): return a - b"))`;
