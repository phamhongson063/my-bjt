import { SectionPlugin } from "./base.js";
import { bilingual } from "../core/utils.js";

export class TipsPlugin extends SectionPlugin {
  static type = "tips";

  render(section) {
    const div = document.createElement("div");
    div.className = "tips";
    div.innerHTML = bilingual(section.content, section.content_jp);
    return div;
  }
}
