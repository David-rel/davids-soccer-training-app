"use client";

type PrintSectionButtonProps = {
  sectionId: string;
  title: string;
};

export default function PrintSectionButton({
  sectionId,
  title,
}: PrintSectionButtonProps) {
  function handlePrint() {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) return;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #9ca3af; padding: 8px; font-size: 12px; vertical-align: top; }
            th { background: #f3f4f6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
            h2, h3 { margin: 0 0 10px; }
            .print-hide { display: none !important; }
            input[type="text"], input[type="number"], input[type="checkbox"] {
              width: 100%;
              border: 1px solid #9ca3af;
              min-height: 20px;
              box-sizing: border-box;
            }
            input[type="checkbox"] { width: 14px; height: 14px; }
          </style>
        </head>
        <body>${section.outerHTML}</body>
      </html>
    `;

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      win.focus();
      win.print();
    };
    win.onload = triggerPrint;

    win.document.open();
    win.document.write(html);
    win.document.close();
    window.setTimeout(triggerPrint, 250);
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400"
    >
      Print
    </button>
  );
}
