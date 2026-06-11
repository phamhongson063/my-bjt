import { SectionPlugin } from "./base.js";
import { bilingualRich } from "../core/utils.js";

export class TipsPlugin extends SectionPlugin {
  static type = "tips";

  render(section) {
    const div = document.createElement("div");
    div.className = "tips";
    div.innerHTML = bilingualRich(section.content, section.content_jp);
    return div;
  }
}
