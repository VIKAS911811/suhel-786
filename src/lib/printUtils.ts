import jsPDF from 'jspdf';

/**
 * Triggers native browser print dialog for a generated jsPDF document
 * Works smoothly in modern browsers and iframes.
 */
export function printJsPdfDocument(doc: jsPDF, documentTitle: string = 'SR_GROUP_DOCUMENT'): void {
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    // Create an invisible iframe to host the PDF and trigger print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe contentWindow print blocked, attempting fallback window:', e);
          const printWindow = window.open(blobUrl, '_blank');
          if (printWindow) {
            printWindow.onload = () => {
              try {
                printWindow.print();
              } catch (err) {
                console.error('Window print error:', err);
              }
            };
          } else {
            console.warn('Popup window blocked, please allow popups or use in-page preview to print.');
          }
        }
      }, 350);
    };

    // Clean up DOM and blob URL after 2 minutes
    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        // Ignored
      }
    }, 120000);
  } catch (err) {
    console.error('Failed to initiate PDF print:', err);
  }
}
