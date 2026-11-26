import { mount } from '@vue/test-utils'
import { Editor } from '@tiptap/core'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import SafeRichTextContent from '~/components/challenges/SafeRichTextContent.vue'

describe('SafeRichTextContent', () => {
  it('keeps editor marks through Tiptap Markdown serialization and public rendering', () => {
    const editor = new Editor({
      extensions: [StarterKit.configure({ heading: { levels: [2, 3] } }), Markdown.configure({ indentation: { style: 'space', size: 2 } })],
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Texto ', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'anidado', marks: [{ type: 'bold' }, { type: 'italic' }] },
            { type: 'text', text: ' y ' },
            { type: 'text', text: 'tachado', marks: [{ type: 'strike' }] },
          ],
        }, {
          type: 'orderedList',
          attrs: { start: 3 },
          content: [{
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: 'tercero' }],
            }, {
              type: 'bulletList',
              content: [{
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'subnivel' }] }],
              }],
            }],
          }],
        }, { type: 'horizontalRule' }],
      },
    })
    const wrapper = mount(SafeRichTextContent, { props: { content: editor.getMarkdown() } })
    expect(wrapper.get('strong em').text()).toBe('anidado')
    expect(wrapper.get('s').text()).toBe('tachado')
    expect(wrapper.get('ol').attributes('start')).toBe('3')
    expect(wrapper.get('ol ul li').text()).toBe('subnivel')
    expect(wrapper.find('hr').exists()).toBe(true)
    wrapper.unmount()
    editor.destroy()
  })

  it('keeps escapes, nested marks, list numbering and code literal in the DOM', () => {
    const wrapper = mount(SafeRichTextContent, { props: { content: [
      '**texto *en cursiva* final** y ~~tachado~~',
      '',
      '3. tercero',
      '   - nivel inferior con `List<String> users`',
      '4. cuarto',
      '',
      String.raw`Texto \*literal\*`,
      '',
      '```html',
      '<strong>solo código</strong>',
      '```',
    ].join('\n') } })

    expect(wrapper.get('strong').text()).toBe('texto en cursiva final')
    expect(wrapper.get('strong em').text()).toBe('en cursiva')
    expect(wrapper.get('s').text()).toBe('tachado')
    expect(wrapper.get('ol').attributes('start')).toBe('3')
    expect(wrapper.get('ol li ul li code').text()).toBe('List<String> users')
    expect(wrapper.text()).toContain('Texto *literal*')
    expect(wrapper.findAll('em')).toHaveLength(1)
    expect(wrapper.get('pre code').text()).toBe('<strong>solo código</strong>')
    wrapper.unmount()
  })

  it('renders legacy ordered lists and allowed tags without retaining active attributes or URLs', () => {
    const wrapper = mount(SafeRichTextContent, { props: { content: [
      '<ol start="4"><li>Primero<ul><li><b>Uno</b></li></ul></li><li>Segundo</li></ol>',
      '',
      '<p onclick="fail()"><a href="javascript&#58;void(0)">No</a> <a href="https://example.test/">Sí</a>',
      '<img src="x" onerror="fail()"><script>fail()</script></p>',
      '',
      'Texto con <em>énfasis</em> y [credenciales](https://u:p@example.test/).',
    ].join('\n') } })

    expect(wrapper.get('ol').attributes('start')).toBe('4')
    expect(wrapper.get('ol li ul li strong').text()).toBe('Uno')
    expect(wrapper.get('ol > li:nth-child(2)').text()).toBe('Segundo')
    expect(wrapper.get('a').attributes('href')).toBe('https://example.test/')
    expect(wrapper.findAll('a')).toHaveLength(1)
    expect(wrapper.get('em').text()).toBe('énfasis')
    expect(wrapper.find('img, script, [onclick], [onerror]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('fail()')
    wrapper.unmount()
  })
})
