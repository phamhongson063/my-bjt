export class SectionPlugin {
  static type = "";

  render(section, ctx) {
    throw new Error(`${this.constructor.name}.render() not implemented`);
  }
}
