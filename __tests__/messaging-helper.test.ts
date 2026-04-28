import { formatHtmlToEprocStandard, formatEprocStandardToHtml } from '../lib/utils/messaging-helper'

describe('formatHtmlToEprocStandard', () => {
	test('converts simple paragraph to paragrafoPadrao', () => {
		const html = '<p>Conteúdo simples</p>'
		const result = formatHtmlToEprocStandard(html)
		expect(result).toBe('<p class="paragrafoPadrao">Conteúdo simples</p>')
	})

	test('converts multiple paragraphs to paragrafoPadrao', () => {
		const html = '<p>Primeiro parágrafo</p><p>Segundo parágrafo</p>'
		const result = formatHtmlToEprocStandard(html)
		expect(result).toBe('<p class="paragrafoPadrao">Primeiro parágrafo</p><p class="paragrafoPadrao">Segundo parágrafo</p>')
	})

	test('converts blockquote with paragraphs to citacao', () => {
		const html = '<blockquote><p>Texto citado</p></blockquote>'
		const result = formatHtmlToEprocStandard(html)
		expect(result).toBe('<p class="citacao">Texto citado</p>')
	})

	test('converts blockquote with multiple paragraphs to citacao', () => {
		const html = '<blockquote><p>Primeira citação</p><p>Segunda citação</p></blockquote>'
		const result = formatHtmlToEprocStandard(html)
		expect(result).toBe('<p class="citacao">Primeira citação</p><p class="citacao">Segunda citação</p>')
	})

	test('converts h1 to titulo', () => {
		const html = '<h1>Título Principal</h1>'
		const result = formatHtmlToEprocStandard(html)
		expect(result).toBe('<p class="titulo">Título Principal</p>')
	})

	test('converts h2 to titulo', () => {
		const html = '<h2>Título Secundário</h2>'
		const result = formatHtmlToEprocStandard(html)
		expect(result).toBe('<p class="titulo">Título Secundário</p>')
	})

	test('converts h3 to subtitulo', () => {
		const html = '<h3>Subtítulo</h3>'
		const result = formatHtmlToEprocStandard(html)
		expect(result).toBe('<p class="subtitulo">Subtítulo</p>')
	})

	test('converts h1 with attributes to titulo', () => {
		const html = '<h1 id="main-title" class="header">Título com atributos</h1>'
		const result = formatHtmlToEprocStandard(html)
		expect(result).toBe('<p class="titulo">Título com atributos</p>')
	})

	test('handles mixed content with paragraphs, blockquotes, and headings', () => {
		const html = '<h2>Título</h2><p>Parágrafo normal</p><blockquote><p>Citação</p></blockquote><h3>Subtítulo</h3>'
		const result = formatHtmlToEprocStandard(html)
		expect(result).toBe('<p class="titulo">Título</p><p class="paragrafoPadrao">Parágrafo normal</p><p class="citacao">Citação</p><p class="subtitulo">Subtítulo</p>')
	})

	test('handles empty string', () => {
		const html = ''
		const result = formatHtmlToEprocStandard(html)
		expect(result).toBe('')
	})

	test('preserves content with line breaks inside blockquote', () => {
		const html = '<blockquote>\n<p>Linha 1</p>\n<p>Linha 2</p>\n</blockquote>'
		const result = formatHtmlToEprocStandard(html)
		expect(result).toContain('<p class="citacao">Linha 1</p>')
		expect(result).toContain('<p class="citacao">Linha 2</p>')
	})

	test('handles nested HTML elements within paragraphs', () => {
		const html = '<p>Texto com <strong>negrito</strong> e <em>itálico</em></p>'
		const result = formatHtmlToEprocStandard(html)
		expect(result).toBe('<p class="paragrafoPadrao">Texto com <strong>negrito</strong> e <em>itálico</em></p>')
	})

	test('handles complex document structure', () => {
		const html = `<h1>Título Principal</h1>
<p>Introdução ao documento.</p>
<h2>Seção 1</h2>
<p>Conteúdo da seção.</p>
<blockquote><p>Uma citação importante</p></blockquote>
<h3>Subseção</h3>
<p>Mais conteúdo.</p>`
		const result = formatHtmlToEprocStandard(html)
		expect(result).toContain('<p class="titulo">Título Principal</p>')
		expect(result).toContain('<p class="paragrafoPadrao">Introdução ao documento.</p>')
		expect(result).toContain('<p class="titulo">Seção 1</p>')
		expect(result).toContain('<p class="citacao">Uma citação importante</p>')
		expect(result).toContain('<p class="subtitulo">Subseção</p>')
	})
})

describe('formatEprocStandardToHtml', () => {
	test('converts paragrafoPadrao to simple paragraph', () => {
		const html = '<p class="paragrafoPadrao">Conteúdo simples</p>'
		const result = formatEprocStandardToHtml(html)
		expect(result).toBe('<p>Conteúdo simples</p>')
	})

	test('converts multiple paragrafoPadrao to simple paragraphs', () => {
		const html = '<p class="paragrafoPadrao">Primeiro</p><p class="paragrafoPadrao">Segundo</p>'
		const result = formatEprocStandardToHtml(html)
		expect(result).toBe('<p>Primeiro</p><p>Segundo</p>')
	})

	test('converts single citacao to blockquote', () => {
		const html = '<p class="citacao">Texto citado</p>'
		const result = formatEprocStandardToHtml(html)
		expect(result).toBe('<blockquote><p>Texto citado</p></blockquote>')
	})

	test('converts multiple consecutive citacao to single blockquote', () => {
		const html = '<p class="citacao">Primeira citação</p><p class="citacao">Segunda citação</p>'
		const result = formatEprocStandardToHtml(html)
		expect(result).toBe('<blockquote><p>Primeira citação</p><p>Segunda citação</p></blockquote>')
	})

	test('converts multiple consecutive citacao with whitespace to single blockquote', () => {
		const html = '<p class="citacao">Primeira citação</p>  \n  <p class="citacao">Segunda citação</p>'
		const result = formatEprocStandardToHtml(html)
		expect(result).toContain('<blockquote>')
		expect(result).toContain('<p>Primeira citação</p>')
		expect(result).toContain('<p>Segunda citação</p>')
		expect(result).toContain('</blockquote>')
	})

	test('converts titulo to h2', () => {
		const html = '<p class="titulo">Título</p>'
		const result = formatEprocStandardToHtml(html)
		expect(result).toBe('<h2>Título</h2>')
	})

	test('converts subtitulo to h3', () => {
		const html = '<p class="subtitulo">Subtítulo</p>'
		const result = formatEprocStandardToHtml(html)
		expect(result).toBe('<h3>Subtítulo</h3>')
	})

	test('handles mixed content correctly', () => {
		const html = '<p class="titulo">Título</p><p class="paragrafoPadrao">Parágrafo</p><p class="citacao">Citação</p><p class="subtitulo">Subtítulo</p>'
		const result = formatEprocStandardToHtml(html)
		expect(result).toContain('<h2>Título</h2>')
		expect(result).toContain('<p>Parágrafo</p>')
		expect(result).toContain('<blockquote><p>Citação</p></blockquote>')
		expect(result).toContain('<h3>Subtítulo</h3>')
	})

	test('handles empty string', () => {
		const html = ''
		const result = formatEprocStandardToHtml(html)
		expect(result).toBe('')
	})

	test('handles null or undefined input', () => {
		const result1 = formatEprocStandardToHtml(null as any)
		const result2 = formatEprocStandardToHtml(undefined as any)
		expect(result1).toBeFalsy()
		expect(result2).toBeFalsy()
	})

	test('preserves nested HTML elements', () => {
		const html = '<p class="paragrafoPadrao">Texto com <strong>negrito</strong> e <em>itálico</em></p>'
		const result = formatEprocStandardToHtml(html)
		expect(result).toBe('<p>Texto com <strong>negrito</strong> e <em>itálico</em></p>')
	})

	test('handles complex document structure', () => {
		const html = `<p class="titulo">Título Principal</p>
<p class="paragrafoPadrao">Introdução ao documento.</p>
<p class="titulo">Seção 1</p>
<p class="paragrafoPadrao">Conteúdo da seção.</p>
<p class="citacao">Uma citação importante</p>
<p class="subtitulo">Subseção</p>
<p class="paragrafoPadrao">Mais conteúdo.</p>`
		const result = formatEprocStandardToHtml(html)
		expect(result).toContain('<h2>Título Principal</h2>')
		expect(result).toContain('<p>Introdução ao documento.</p>')
		expect(result).toContain('<h2>Seção 1</h2>')
		expect(result).toContain('<blockquote><p>Uma citação importante</p></blockquote>')
		expect(result).toContain('<h3>Subseção</h3>')
	})

	test('separates non-consecutive citacao into different blockquotes', () => {
		const html = '<p class="citacao">Primeira citação</p><p class="paragrafoPadrao">Parágrafo normal</p><p class="citacao">Segunda citação</p>'
		const result = formatEprocStandardToHtml(html)
		// Should have two separate blockquotes
		expect((result.match(/<blockquote>/g) || []).length).toBe(2)
		expect((result.match(/<\/blockquote>/g) || []).length).toBe(2)
	})
})

describe('bidirectional conversion', () => {
	test('standard to eproc and back preserves structure for simple paragraph', () => {
		const original = '<p>Conteúdo simples</p>'
		const eproc = formatHtmlToEprocStandard(original)
		const backToStandard = formatEprocStandardToHtml(eproc)
		expect(backToStandard).toBe(original)
	})

	test('standard to eproc and back preserves structure for blockquote', () => {
		const original = '<blockquote><p>Citação</p></blockquote>'
		const eproc = formatHtmlToEprocStandard(original)
		const backToStandard = formatEprocStandardToHtml(eproc)
		expect(backToStandard).toBe(original)
	})

	test('standard to eproc and back preserves structure for h2', () => {
		const original = '<h2>Título</h2>'
		const eproc = formatHtmlToEprocStandard(original)
		const backToStandard = formatEprocStandardToHtml(eproc)
		expect(backToStandard).toBe(original)
	})

	test('standard to eproc and back preserves structure for h3', () => {
		const original = '<h3>Subtítulo</h3>'
		const eproc = formatHtmlToEprocStandard(original)
		const backToStandard = formatEprocStandardToHtml(eproc)
		expect(backToStandard).toBe(original)
	})

	test('standard to eproc and back preserves complex structure', () => {
		const original = '<h2>Título</h2><p>Parágrafo</p><blockquote><p>Citação</p></blockquote><h3>Subtítulo</h3>'
		const eproc = formatHtmlToEprocStandard(original)
		const backToStandard = formatEprocStandardToHtml(eproc)
		expect(backToStandard).toBe(original)
	})

	test('eproc to standard and back preserves eproc structure', () => {
		const original = '<p class="titulo">Título</p><p class="paragrafoPadrao">Texto</p><p class="citacao">Citação</p>'
		const standard = formatEprocStandardToHtml(original)
		const backToEproc = formatHtmlToEprocStandard(standard)
		expect(backToEproc).toBe(original)
	})

	test('handles multiple consecutive blockquotes bidirectionally', () => {
		const original = '<blockquote><p>Primeira citação</p><p>Segunda citação</p></blockquote>'
		const eproc = formatHtmlToEprocStandard(original)
		const backToStandard = formatEprocStandardToHtml(eproc)
		expect(backToStandard).toBe(original)
	})
})
