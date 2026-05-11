export function initPostHog() {
  return;
}

export function track(event: string, properties?: Record<string, unknown>) {
  void event;
  void properties;
}

export function trackLessonStarted(lesson: number, lessonId: string) {
  track("lesson_started", { lesson, lesson_id: lessonId });
}

export function trackCodeExecuted(lesson: number, lessonId: string) {
  track("code_executed", { lesson, lesson_id: lessonId });
}

export function trackCodeError(lesson: number, lessonId: string, errorType: string) {
  track("code_error", { lesson, lesson_id: lessonId, error_type: errorType });
}

export function trackLessonCompleted(lesson: number, lessonId: string) {
  track("lesson_completed", { lesson, lesson_id: lessonId });
}

export function trackCourseCompleted() {
  track("course_completed");
}

export function trackGitHubClicked() {
  track("github_clicked");
}

export function trackShareClicked(method: string) {
  track("share_clicked", { method });
}

export function trackProviderSelected(provider: string) {
  track("provider_selected", { provider });
}
