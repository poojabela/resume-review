import { useState } from "react";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { pdfToImage } from "./utils/pdf";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-pro-vision",
  generationConfig: {
    temperature: 0.4,
    topP: 1,
    topK: 32,
    maxOutputTokens: 4096,
  },
});

const prompt_professional =
  "Create a well-organized HTML-formatted review for this resume. Include sections for Overall, Resume Format, Grammar/Spelling, Content, Style, and any other relevant areas. Ensure a visually appealing layout and provide constructive insights or recommendations where applicable. Be honest and straightforward in your feedback.";

const prompt_roast =
  "Embrace your inner critic and let loose! Generate a hilariously sarcastic HTML-formatted roast for this resume. Tear apart the Overall, Resume Format, Grammar/Spelling, Content, Style, and any other aspects you find amusing. Add a touch of humor and wit, but make sure it's all in good fun. Roast away!";

type GenerativePart = { inlineData: { data: string; mimeType: string } };
function fileToGenerativePart(file: File) {
  return new Promise<GenerativePart>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === "string") {
        const base64Data = btoa(event.target.result);
        const mimeType = file.type;

        resolve({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        });
      } else {
        reject(new Error("Error reading file"));
      }
    };

    reader.onerror = (event) => {
      console.error(event);
      reject(new Error("Error reading file"));
    };

    reader.readAsBinaryString(file);
  });
}

export default function Root() {
  const [review, setReview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);

  const [mode, setMode] = useState<"professional" | "roast">("roast");

  const handleFileUpload = async (file: File) => {
    const imageParts = await Promise.all(
      file.type === "pdf" || file.type === "application/pdf"
        ? (await pdfToImage(file)).map(fileToGenerativePart)
        : [fileToGenerativePart(file)],
    );
    const { response } = await model.generateContent([
      ...imageParts,
      mode === "roast" ? prompt_roast : prompt_professional,
    ]);

    const outputRaw = response.text();

    setReview(outputRaw);
  };

  return (
    <div className="flex flex-col items-stretch justify-start gap-16 p-8 container mx-auto">
      <div className="flex flex-row items-center justify-start gap-4 mx-auto">
        <img src="/logo.svg" width={32} height={32} alt="logo" />
        <h1 className="text-xl font-bold">Resume Review</h1>
        <p className="text-sm opacity-50">(or roast if you prefer)</p>
      </div>
      <form
        className="flex flex-col items-stretch justify-start gap-4 mx-auto max-w-sm w-full"
        onSubmit={(event) => {
          event.preventDefault();

          const formData = new FormData(event.target as HTMLFormElement);
          const file = formData.get("resume") as File;

          if (!file) {
            return;
          }

          setLoading(true);

          handleFileUpload(file).finally(() => {
            setLoading(false);
            (event.target as HTMLFormElement)?.reset?.();
          });
        }}
      >
        <fieldset disabled={loading} className="contents">
          <select
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as "professional" | "roast")
            }
            className="px-3 py-1.5"
            required
          >
            <option value="professional">Professional</option>
            <option value="roast">Roast</option>
          </select>
          <label
            className="w-full border border-slate-400 rounded-lg px-3 py-1.5 border-dashed cursor-pointer text-center"
            htmlFor="resume"
          >
            <span className="text-sm opacity-50">
              {resumeFileName ? resumeFileName : "Upload Resume"}
            </span>
            <input
              id="resume"
              type="file"
              accept="image/*,.pdf"
              name="resume"
              required
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  setResumeFileName(file.name);
                }
              }}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 font-medium text-white bg-gradient-to-br from-pink-400 to-pink-600 hover:opacity-40 duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating..." : "Generate Review"}
          </button>
        </fieldset>
      </form>

      {review ? (
        <div
          className="prose prose-neutral prose-sm prose-pink prose-invert mx-auto w-full max-w-2xl rounded-lg bg-neutral-900 p-6"
          dangerouslySetInnerHTML={{ __html: review }}
        ></div>
      ) : null}
    </div>
  );
}
