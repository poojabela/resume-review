import * as pdfjs from "pdfjs-dist";

export function srcToFile(src: string, fileName: string, mimeType: string) {
  return fetch(src)
    .then(function (res) {
      return res.arrayBuffer();
    })
    .then(function (buf) {
      return new File([buf], fileName, { type: mimeType });
    });
}

export async function pdfToImage(file: File) {
  return new Promise<File[]>((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = async () => {
      try {
        const arrayBuffer = fileReader.result as ArrayBuffer;

        // Load the PDF document
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

        // Get the total number of pages in the PDF
        const numPages = pdf.numPages;

        // Array to store image data URLs
        const images: File[] = [];

        // Iterate through each page and convert it to an image
        for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);

          // Set the scale for the image (adjust as needed)
          const scale = 1.5;

          // Get the viewport
          const viewport = page.getViewport({ scale });

          // Create a canvas element to render the page
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d")!;

          // Set the canvas dimensions
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          // Render the page content into the canvas
          await page.render({ canvasContext: context, viewport }).promise;

          // Convert the canvas content to a data URL (PNG format)
          const imageDataUrl = canvas.toDataURL("image/png");

          // Push the data URL to the array
          images.push(
            await srcToFile(imageDataUrl, `${pageNumber}.png`, "image/png"),
          );
        }

        // Resolve with the array of image data URLs
        resolve(images);
      } catch (error) {
        // Reject with the error if any
        reject(error);
      }
    };

    // Read the file as ArrayBuffer
    fileReader.readAsArrayBuffer(file);
  });
}
