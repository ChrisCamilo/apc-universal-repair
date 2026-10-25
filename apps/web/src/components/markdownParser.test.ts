import { expect, test } from 'vitest'
import { parseInline, parseMarkdown } from './markdownParser.ts'

// Reads a release's notes as they are written, and checks the heading, the paragraph joined from its lines, and the
// list with its nested items under the one before them, back at the top level after them; the "---" line adds nothing.
test('Web: Markdown reads headings, paragraphs and nested lists', () => {
  const notes = [
    '**Windows:** os apps instalados',
    'se atualizam sozinhos.',
    '',
    '### Novidades',
    '- **Primeiro** (#298):',
    '  - um;',
    '  - dois.',
    '- Segundo,',
    '  que continua.',
    '',
    '---',
  ].join('\r\n')
  expect(parseMarkdown(notes)).toEqual([
    { kind: 'paragraph', text: '**Windows:** os apps instalados se atualizam sozinhos.' },
    { kind: 'heading', text: 'Novidades' },
    {
      kind: 'list',
      ordered: false,
      items: [
        {
          text: '**Primeiro** (#298):',
          lists: [{ kind: 'list', ordered: false, items: [{ text: 'um;', lists: [] }, { text: 'dois.', lists: [] }] }],
        },
        { text: 'Segundo, que continua.', lists: [] },
      ],
    },
  ])
})

// Reads numbered steps, and a bulleted list nested in one of them, and checks each list says whether it is numbered.
test('Web: Markdown reads numbered lists', () => {
  expect(parseMarkdown('1. Pare o servidor.\n   - pelo script;\n2. Abra o app.')).toEqual([
    {
      kind: 'list',
      ordered: true,
      items: [
        { text: 'Pare o servidor.', lists: [{ kind: 'list', ordered: false, items: [{ text: 'pelo script;', lists: [] }] }] },
        { text: 'Abra o app.', lists: [] },
      ],
    },
  ])
})

// Reads a line with every kind of run, and checks bold, italic, both at once, inline code and a web link, with plain
// text kept between them.
test('Web: Markdown reads bold, italic, code and links', () => {
  expect(parseInline('**Novo:** o *Sobre*, ***já***, `config.json` e o [guia](https://github.com/x).')).toEqual([
    { kind: 'strong', children: [{ kind: 'text', text: 'Novo:' }] },
    { kind: 'text', text: ' o ' },
    { kind: 'em', children: [{ kind: 'text', text: 'Sobre' }] },
    { kind: 'text', text: ', ' },
    { kind: 'strong', children: [{ kind: 'em', children: [{ kind: 'text', text: 'já' }] }] },
    { kind: 'text', text: ', ' },
    { kind: 'code', text: 'config.json' },
    { kind: 'text', text: ' e o ' },
    { kind: 'link', href: 'https://github.com/x', children: [{ kind: 'text', text: 'guia' }] },
    { kind: 'text', text: '.' },
  ])
  expect(parseInline('**Ver *todas* as versões**')).toEqual([
    { kind: 'strong', children: [{ kind: 'text', text: 'Ver ' }, { kind: 'em', children: [{ kind: 'text', text: 'todas' }] }, { kind: 'text', text: ' as versões' }] },
  ])
})

// Reads marks with nothing to close them, a link that isn't a web address and HTML, and checks they stay plain text,
// so nothing written in the notes runs or opens anything but a web page.
test('Web: Markdown keeps what it does not read as plain text', () => {
  expect(parseInline('2 * 3 e `aberto')).toEqual([{ kind: 'text', text: '2 * 3 e `aberto' }])
  expect(parseInline('[clique](javascript:alert(1))')).toEqual([{ kind: 'text', text: '[clique](javascript:alert(1))' }])
  expect(parseInline('<script>alert(1)</script>')).toEqual([{ kind: 'text', text: '<script>alert(1)</script>' }])
})
