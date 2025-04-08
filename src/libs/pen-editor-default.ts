import { PenEditor } from './core/pen-editor'
import parser from './parser'
import renderer from './renderer'
import enterPlugin from './plugins/enter'
export class PenEditorDefault extends PenEditor {
  constructor(options: Pick<PenEditor.Option, 'element' | 'value'>) {
    const plugins: PenEditor.Plugin[] = [
      // enterPlugin()
    ]
    super({
      ...options,
      plugins,
      renderer,
      parser
    })
  }
}
