import { describe, it, expect } from "vitest";
import {
  allLessons,
  getLessonBySlug,
  getLessonByNumber,
  getNextLesson,
  getPreviousLesson,
} from "./registry";

describe("lesson registry", () => {
  it("has 10 lessons", () => {
    expect(allLessons).toHaveLength(10);
  });

  it("lessons are numbered 1-10 in order", () => {
    allLessons.forEach((lesson, i) => {
      expect(lesson.number).toBe(i + 1);
    });
  });

  it("every lesson has unique slug", () => {
    const slugs = allLessons.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(10);
  });

  it("every lesson has required fields", () => {
    for (const lesson of allLessons) {
      expect(lesson.title).toBeTruthy();
      expect(lesson.subtitle).toBeTruthy();
      expect(lesson.steps.length).toBeGreaterThan(0);
      expect(lesson.fullCode).toBeTruthy();
      expect(lesson.concepts.length).toBeGreaterThan(0);
      expect(lesson.frameworkName).toBeTruthy();
    }
  });

  it("every step has id and prose", () => {
    for (const lesson of allLessons) {
      for (const step of lesson.steps) {
        expect(step.id).toBeTruthy();
        expect(step.prose).toBeTruthy();
      }
    }
  });

  it("all lessons have llmConfig with systemPrompt", () => {
    for (const lesson of allLessons) {
      expect(lesson.llmConfig).toBeDefined();
      expect(lesson.llmConfig!.systemPrompt).toBeTruthy();
    }
  });

  it("every lesson has at least one step with inputConfig", () => {
    for (const lesson of allLessons) {
      const hasInput = lesson.steps.some((s) => s.inputConfig);
      expect(hasInput).toBe(true);
    }
  });

  it("getLessonBySlug finds lesson 1", () => {
    const lesson = getLessonBySlug("agent-function");
    expect(lesson).toBeDefined();
    expect(lesson!.number).toBe(1);
  });

  it("getLessonBySlug returns undefined for bad slug", () => {
    expect(getLessonBySlug("nonexistent")).toBeUndefined();
  });

  it("getLessonByNumber finds lesson 5", () => {
    const lesson = getLessonByNumber(5);
    expect(lesson).toBeDefined();
    expect(lesson!.slug).toBe("state");
  });

  it("getNextLesson from 1 returns 2", () => {
    const l1 = getLessonByNumber(1)!;
    const l2 = getNextLesson(l1);
    expect(l2).toBeDefined();
    expect(l2!.number).toBe(2);
  });

  it("getNextLesson from 10 returns undefined", () => {
    const last = getLessonByNumber(10)!;
    expect(getNextLesson(last)).toBeUndefined();
  });

  it("getPreviousLesson from 1 returns undefined", () => {
    const l1 = getLessonByNumber(1)!;
    expect(getPreviousLesson(l1)).toBeUndefined();
  });

  it("every lesson has a valid graph definition", () => {
    for (const lesson of allLessons) {
      expect(lesson.graph).toBeDefined();
      const { nodes, edges } = lesson.graph!;
      expect(nodes.length).toBeGreaterThan(0);
      expect(edges.length).toBeGreaterThan(0);
      const nodeIds = new Set(nodes.map((n) => n.id));
      for (const edge of edges) {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
      }
    }
  });

  it("filenames match content", () => {
    const expected = [
      "agent-function", "tools", "agent-loop", "conversation",
      "state", "memory", "policy", "self-scheduling", "the-whole-thing", "skills",
    ];
    allLessons.forEach((lesson, i) => {
      expect(lesson.slug).toBe(expected[i]);
    });
  });

  it("adds a professional skill bundle lesson with standard SKILL.md structure", () => {
    const lesson = getLessonBySlug("skills");

    expect(lesson).toBeDefined();
    expect(lesson!.number).toBe(10);
    expect(lesson!.title).toContain("Skill");
    expect(lesson!.concepts).toEqual(
      expect.arrayContaining(["SKILL.md", "渐进加载", "脚本接口"]),
    );
    expect(lesson!.fullCode).toContain("SKILL.md");
    expect(lesson!.fullCode).toContain("scripts/check_review.py");
    expect(lesson!.steps.map((step) => step.id)).toEqual(
      expect.arrayContaining(["standard", "example", "index", "activate", "run"]),
    );
  });

  it("teaches the standard skill bundle before introducing a concrete skill example", () => {
    const lesson = getLessonBySlug("skills")!;
    const standardStep = lesson.steps.find((step) => step.id === "standard")!;
    const exampleStep = lesson.steps.find((step) => step.id === "example")!;

    expect(standardStep.prose).toContain("skill-name/");
    expect(standardStep.prose).toContain("metadata");
    expect(standardStep.prose).not.toContain("code-review/");
    expect(exampleStep.prose).toContain("code-review");
    expect(lesson.fullCode).toContain("build_skill_index");
    expect(lesson.fullCode).toContain("索引完成: {len(index)} 个 skill；references/scripts 尚未加载");
    expect(lesson.fullCode).toContain("load_skill_bundle");
  });
});
