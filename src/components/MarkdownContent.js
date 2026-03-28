"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import CopyButtonComponent from "./CopyButtonComponent";
import styles from "./MarkdownContent.module.css";

function FencedCodeBlock({ language, children }) {
  const codeString = String(children).replace(/\n$/, "");

  let displayLabel = language;
  let syntaxLang = language;
  if (language.startsWith("exec-")) {
    syntaxLang = language.replace("exec-", "");
    displayLabel = `${syntaxLang.toUpperCase()} — EXECUTABLE CODE`;
  } else if (language.startsWith("execresult-")) {
    syntaxLang = language.replace("execresult-", "") || "text";
    displayLabel = `${(syntaxLang || "PYTHON").toUpperCase()} — CODE EXECUTION RESULT`;
  }

  return (
    <div className={styles.codeBlockWrapper}>
      <div className={styles.codeBlockHeader}>
        <span className={styles.codeBlockLang}>{displayLabel}</span>
        <CopyButtonComponent
          text={codeString}
          size={12}
          showLabel
          className={styles.codeBlockCopy}
        />
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={syntaxLang}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0 0 8px 8px",
          fontSize: "13px",
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
}

function CodeBlock({ children, className, ...rest }) {
  const match = /language-(\w+)/.exec(className || "");
  if (!match) {
    return (
      <code className={`${styles.inlineCode} ${className || ""}`} {...rest}>
        {children}
      </code>
    );
  }
  return <FencedCodeBlock language={match[1]}>{children}</FencedCodeBlock>;
}

function ImageOrEmbed({ src, alt, ...rest }) {
  // Detect map embed URLs and render as interactive iframe
  if (src && src.includes("/utility/map/embed")) {
    return (
      <div className={styles.mapEmbedWrapper}>
        <iframe
          src={src}
          className={styles.mapEmbed}
          title={alt || "Map"}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img src={src} alt={alt} {...rest} />;
}

export default function MarkdownContent({ content, className, children }) {
  if (!content) return null;
  return (
    <div className={`${styles.text} ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ code: CodeBlock, img: ImageOrEmbed }}
      >
        {content}
      </ReactMarkdown>
      {children}
    </div>
  );
}
