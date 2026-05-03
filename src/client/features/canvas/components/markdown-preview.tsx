import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownPreviewProps {
    title?: string
    content: string
}

export const MemoizedMarkdownPreview = React.memo(({ title, content }: MarkdownPreviewProps) => {
    let cleanContent = content;
    const t = title?.trim();
    if (t) {
        const lines = cleanContent.split('\n');
        const firstLine = lines[0].trim();
        const headerMatch = firstLine.match(/^#+\s*(.*)$/);
        const firstLineText = headerMatch ? headerMatch[1].trim() : firstLine;
        if (firstLineText.toLowerCase() === t.toLowerCase()) {
            cleanContent = lines.slice(1).join('\n').trim() || "Empty document";
        }
    }
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {cleanContent}
        </ReactMarkdown>
    );
});

MemoizedMarkdownPreview.displayName = 'MemoizedMarkdownPreview';
