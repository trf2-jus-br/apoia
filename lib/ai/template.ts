export function closeTag(s: string, tag: string): string {
    const openTag = `<${tag}`
    const closeTag = `</${tag}>`;
    let searchFrom = 0;
    while (true) {
        const ifOpenIndex = s.indexOf(openTag, searchFrom);
        if (ifOpenIndex === -1) {
            break;
        }

        const nextIfOpenIndex = s.indexOf(openTag, ifOpenIndex + 1);
        const nextIfCloseIndex = s.indexOf(closeTag, ifOpenIndex + 1);

        const minNextOpen = nextIfOpenIndex > -1 ? nextIfOpenIndex : Infinity;
        const minNextClose = nextIfCloseIndex > -1 ? nextIfCloseIndex : Infinity;
        const nextTagIndex = Math.min(minNextOpen, minNextClose);

        if (nextTagIndex === Infinity) {
            // This is the last <if> tag, close it at the end
            s += closeTag;
            break;
        }

        if (nextTagIndex === nextIfOpenIndex) {
            // The next tag is another <if>, so close the current one before it
            s = s.substring(0, nextTagIndex) + closeTag + s.substring(nextTagIndex);
            // Move search position past the inserted </if>
            searchFrom = nextTagIndex + closeTag.length;
        } else { // The next tag is </if>
            // This <if> is already closed, move search position past the closing tag
            searchFrom = nextIfCloseIndex + closeTag.length;
        }
    }
    return s
}

export function preprocessTemplate(template: string): string {
    let s = template
    s = s.replace(/\{\{\{\}\}\}/g, '</outer-if>')
    s = s.replace(/\{\{\{(.*?)\}\}\}/gs, '<outer-if id="ID_PLACEHOLDER" expr="$1">')
    s = s.replace(/\{\{\}\}/g, '</if>')
    s = s.replace(/\{\{(.*?)\}\}/gs, '<if id="ID_PLACEHOLDER" expr="$1">')
    s = s.replace(/\{(.*?)\}/gs, '<snippet id="ID_PLACEHOLDER" expr="$1"></snippet>')

    // Close outer-if tags
    s = closeTag(s, 'outer-if');

    // Close if tags
    s = s.split(/(<\/?outer-if.*?>)/g).map(part => {
        if (part.startsWith('<outer-if') || part.startsWith('</outer-if')) {
            return part;
        }
        return closeTag(part, 'if');
    }).join('');

    // Substitute ID_PLACEHOLDER with actual IDs
    let idCounter = 0; s = s.replace(/ID_PLACEHOLDER/g, () => `${idCounter++}`)

    // If there are <snippet> tags in the beggining of a line, add a sufix "x" to the id
    s = s.replace(/^<snippet id="(\d+)" expr="([^"]*?)">/gm, (match, id, expr) => {
        return `<snippet id="${id}x" expr="${expr}">`
    })

    // Replace outer-if tags with if tags
    s = s.replace(/<(\/?)outer-if/g, '<$1if')

    return s
}

export interface UnclosedMarking {
    kind: '{{{' | '{{' | '{';
    lineNumber: number;
    lineContent: string;
}

export function findUnclosedMarking(template: string): UnclosedMarking | null {
    const lines = template.split('\n');
    const stack: { kind: '{{{' | '{{' | '{', lineNumber: number, charIndex: number }[] = [];

    let currentLineNumber = 1;
    let i = 0;

    while (i < template.length) {
        if (template[i] === '\n') {
            currentLineNumber++;
            i++;
            continue;
        }

        const threeChars = template.substring(i, i + 3);
        const twoChars = template.substring(i, i + 2);

        if (threeChars === '{{{') {
            stack.push({ kind: '{{{', lineNumber: currentLineNumber, charIndex: i });
            i += 3;
        } else if (twoChars === '{{') {
            stack.push({ kind: '{{', lineNumber: currentLineNumber, charIndex: i });
            i += 2;
        } else if (template[i] === '{') {
            stack.push({ kind: '{', lineNumber: currentLineNumber, charIndex: i });
            i++;
        } else if (threeChars === '}}}') {
            if (stack.length > 0 && stack[stack.length - 1].kind === '{{{') {
                stack.pop();
            }
            i += 3;
        } else if (twoChars === '}}') {
            if (stack.length > 0 && stack[stack.length - 1].kind === '{{') {
                stack.pop();
            }
            i += 2;
        } else if (template[i] === '}') {
            if (stack.length > 0 && stack[stack.length - 1].kind === '{') {
                stack.pop();
            }
            i++;
        } else {
            i++;
        }
    }

    if (stack.length > 0) {
        const unclosed = stack[stack.length - 1];
        const lineContent = lines[unclosed.lineNumber - 1];
        
        let lineStartIndex = 0;
        for (let j = 0; j < unclosed.lineNumber - 1; j++) {
            lineStartIndex += lines[j].length + 1; // +1 for the newline character
        }
        
        const columnIndex = unclosed.charIndex - lineStartIndex;
        const highlightedLine = 
            lineContent.substring(0, columnIndex) +
            `<strong>${unclosed.kind}</strong>` +
            lineContent.substring(columnIndex + unclosed.kind.length);

        return {
            kind: unclosed.kind,
            lineNumber: unclosed.lineNumber,
            lineContent: highlightedLine
        };
    }

    return null;
}
