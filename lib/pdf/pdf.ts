import pdf from 'pdf-parse'

function render_page(pageData) {
    //check documents https://mozilla.github.io/pdf.js/
    let render_options = {
        //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
        normalizeWhitespace: true,
        //do not attempt to combine same line TextItem's. The default value is `false`.
        disableCombineTextItems: false
    }

    return pageData.getTextContent(render_options)
        .then(function (textContent) {
            let lastY
            let text = `<page number="${pageData.pageIndex + 1}">\n`
            for (let item of textContent.items) {
                if (lastY == item.transform[5] || !lastY) {
                    text += item.str
                }
                else {
                    text += '\n' + item.str
                }
                lastY = item.transform[5]
            }
            return text + '\n</page>'
        })
}

export async function pdfToText(blob: ArrayBuffer, options): Promise<string> {
    const data = await pdf(blob, { pagerender: render_page })
    const text = data.text
        .replace(/\n\n\<page number/gm, '<page number')
        .replace(/\<\/page\><page/gm, '</page>\n<page')
        .replace(/\s+\<\/page\>/gm, '\n</page>')
        .replace(/\<page number="(\d+)"\>\s+/gm, '<page number="$1">\n')
    return text
}
