"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function FeedbackMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mt-5 text-2xl font-extrabold text-gray-900 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-5 text-xl font-bold text-gray-900">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 text-lg font-semibold text-gray-900">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="mt-4 text-base font-semibold text-gray-900">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="mt-2 leading-relaxed text-gray-800">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-3 list-disc space-y-1 pl-6 text-gray-800">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-3 list-decimal space-y-1 pl-6 text-gray-800">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto">
            <table className="min-w-full border-collapse overflow-hidden rounded-xl border border-emerald-200 bg-white">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-emerald-50">{children}</thead>,
        th: ({ children }) => (
          <th className="border border-emerald-200 px-3 py-2 text-left text-sm font-semibold text-gray-900">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-emerald-200 px-3 py-2 text-sm text-gray-800">
            {children}
          </td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-4 border-emerald-300 pl-3 text-gray-700">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-700 underline"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.9em] text-gray-900">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-3 overflow-x-auto rounded-xl bg-gray-900 p-3 text-sm text-gray-100">
            {children}
          </pre>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
