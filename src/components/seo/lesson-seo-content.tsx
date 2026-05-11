import Link from "next/link";
import type { LessonDefinition } from "@/lib/lessons/types";
import { getLessonSeo } from "@/lib/seo/lesson-seo";
import { allLessons } from "@/lib/lessons/registry";

/**
 * Server-rendered, visually-hidden lesson content for search and accessibility.
 */
export function LessonSeoContent({ lesson }: { lesson: LessonDefinition }) {
  const seo = getLessonSeo(lesson);
  const firstStep = lesson.steps[0];

  const plainProse = firstStep?.prose
    ?.replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .trim();

  return (
    <aside className="sr-only" aria-label="课程内容摘要">
      <h1>
        第 {lesson.number} 课：{lesson.title} — A Tour of Agents
      </h1>
      <p>{seo.description}</p>
      {plainProse && <p>{plainProse}</p>}
      <h2>本课概念</h2>
      <ul>
        {lesson.concepts.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <p>对应框架概念：{lesson.frameworkName}</p>
      <h2>全部课程</h2>
      <nav aria-label="课程导航">
        <ol>
          {allLessons.map((entry) => (
            <li key={entry.slug}>
              <Link href={`/lesson/${entry.slug}`}>
                第 {entry.number} 课：{entry.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
