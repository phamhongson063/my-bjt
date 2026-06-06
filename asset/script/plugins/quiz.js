import { SectionPlugin } from "./base.js";
import { renderQuestion } from "./question.js";

export class QuizPlugin extends SectionPlugin {
  static type = "quiz";

  render(section, ctx) {
    const wrap = document.createElement("div");
    section.questions.forEach((q, qIdx) => {
      wrap.appendChild(
        renderQuestion(q, `q${ctx.idx}-${qIdx}`, section.audio, ctx)
      );
    });
    const summary = document.createElement("div");
    summary.className = "quiz-summary hidden";
    summary.id = `summary-${ctx.idx}`;
    wrap.appendChild(summary);
    return wrap;
  }
}
