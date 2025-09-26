// Utility functions related to process numbers and text handling

// Extracts CNJ process numbers from free text.
// Supports either formatted CNJ numbers (e.g., 0000000-00.0000.0.00.0000)
// or plain 20-digit sequences. Returns a comma-separated string of digits-only numbers.
export const extractProcessNumbers = (text: string): string => {
    const regex = /\b\d{7}\s*-\s*\d{2}\s*\.\s*\d{4}\s*\.\s*\d{1}\s*\.\s*\d{2}\s*\.\s*\d{4}|\d{20}\b/g;
    const matches = text.match(regex);
    const list = matches ? matches.map(match => match.replace(/\D/g, '')) : [];
    const uniqueList = Array.from(new Set(list));
    return uniqueList.join(', ');
}
