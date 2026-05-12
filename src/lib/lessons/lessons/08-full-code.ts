export const lesson08FullCode = `import json
from pyodide.http import pyfetch
def trace(t, l):
    print(f'__TRACE__:{json.dumps({"id": l[:8], "timestamp": 0, "type": t, "label": l})}')

def make_plan(task):
    return json.dumps([
        f"明确目标：{task}",
        "拆成 3 个可执行步骤",
        "执行步骤并检查结果",
    ], ensure_ascii=False)

def execute_step(step):
    return f"完成：{step}"

tools = {"make_plan": make_plan, "execute_step": execute_step}
TOOL_DEFS = [
    {"type": "function", "function": {"name": "make_plan", "description": "Create a short execution plan",
        "parameters": {"type": "object", "properties": {"task": {"type": "string"}}}}},
    {"type": "function", "function": {"name": "execute_step", "description": "Execute one planned step",
        "parameters": {"type": "object", "properties": {"step": {"type": "string"}}}}},
]
async def ask_llm(messages):
    resp = await pyfetch(f"{LLM_BASE_URL}/chat/completions",
        method="POST",
        headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
        body=json.dumps({"model": LLM_MODEL, "messages": messages, "tools": TOOL_DEFS}))
    return json.loads(await resp.string())["choices"][0]["message"]
async def agent(task, max_turns=8):
    messages = [{"role": "system", "content": "First make a plan, then execute each step. Be concise."},
                {"role": "user", "content": task}]
    plan, results = [], []
    for turn in range(max_turns):
        msg = await ask_llm(messages)
        if not msg.get("tool_calls"):
            return {"plan": plan, "results": results, "summary": msg.get("content", "")}
        messages.append(msg)
        for tc in msg["tool_calls"]:
            name = tc["function"]["name"]
            args = json.loads(tc["function"]["arguments"])
            result = tools[name](**args)
            if name == "make_plan":
                plan = json.loads(result)
            if name == "execute_step":
                results.append(result)
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": str(result)})
    return {"plan": plan, "results": results, "summary": "Max turns"}
result = await agent("帮我规划学习 Agent")
print("Plan:")
for i, step in enumerate(result["plan"], 1):
    print(f"{i}. {step}")
print("Results:")
for item in result["results"]:
    print(f"- {item}")
print(f">> {result['summary']}")`;
