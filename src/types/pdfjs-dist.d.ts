declare module 'pdfjs-dist/build/pdf.mjs' {
  type PdfTextItem = {
    str?: string;
  };

  type PdfPage = {
    getTextContent(): Promise<{
      items: Array<
        PdfTextItem & {
          transform?: number[];
          width?: number;
          height?: number;
        }
      >;
    }>;
  };

  type PdfDocument = {
    numPages: number;
    getPage(pageNumber: number): Promise<PdfPage>;
  };

  const pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: string;
    };
    getDocument(options: {
      data: ArrayBuffer | Uint8Array;
      disableWorker?: boolean;
    }): {
      promise: Promise<PdfDocument>;
    };
  };

  export default pdfjs;
}
