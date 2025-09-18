"use client";

import React from 'react';
import { extractProcessNumbers } from '@/lib/utils/process';

type Props = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
    name?: string;
    rows?: number;
};

const preprocessInput = (value: string) => {
    value = value.replaceAll(/(:.*?)$/gm, '')
    value = value.replaceAll('\n\n', '\n').replaceAll('\n', ',').replaceAll(/[^\d,]/g, '').replaceAll(',', ', ')
    return value
}

// A textarea that, on paste, extracts CNJ process numbers from the clipboard text
// and inserts the cleaned, comma-separated list at the cursor position.
const ProcessTextarea: React.FC<Props> = ({ value, onChange, placeholder, className, id, name, rows }) => {
    const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        console.log('Pasting text...');
        event.preventDefault();
        const pastedText = event.clipboardData.getData('text');
        const processedText = extractProcessNumbers(pastedText);
        console.log('Pasted text:', pastedText);

        const target = event.target as HTMLTextAreaElement;
        const { selectionStart, selectionEnd } = target;

        const newValue = value.substring(0, selectionStart) + processedText + value.substring(selectionEnd);
        onChange(newValue);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(preprocessInput(e.target.value));
    };

    console.log('Rendering ProcessTextarea with value:', value);

    return (
        <textarea
            className={className || 'form-control'}
            value={value}
            onChange={handleChange}
            onPaste={handlePaste}
            placeholder={placeholder}
            id={id}
            name={name}
            rows={rows || 8}
        />
    );
};

export default ProcessTextarea;
