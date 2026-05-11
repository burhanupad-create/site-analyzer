import puppeteer from "puppeteer";
import { PDF_TIMEOUT_MS } from "@/lib/constants";

// ─── PDF Generation ────────────────────────────────────────────────────────────

export async function generatePdfReport(
  jobId: string,
  baseUrl: string
): Promise<Buffer> {
  const reportUrl = `${baseUrl}/analysis/${jobId}?print=1`;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    await page.goto(reportUrl, {
      waitUntil: "networkidle0",
      timeout: PDF_TIMEOUT_MS,
    });

    // Wait for the report content marker; continue anyway if it never appears
    await page
      .waitForSelector("[data-report-ready]", { timeout: 20_000 })
      .catch(() => {});

    // Force dark background on the PDF page itself (covers margin areas)
    await page.addStyleTag({
      content: `
        @page { background: #0f1518; }
        html, body { background: #0f1518 !important; }
      `,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
      displayHeaderFooter: false,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// ─── Homepage Screenshot ───────────────────────────────────────────────────────

/**
 * Captures a compressed JPEG screenshot of the homepage.
 * Returns a base64-encoded string suitable for embedding in an <img> tag.
 *
 * The screenshot is compressed to keep the PDF reasonably sized:
 * - Quality: 70 (JPEG)
 * - Viewport: 1280×800 (standard desktop above the fold)
 */
export async function captureHomepageScreenshot(
  homepageUrl: string
): Promise<string | null> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(homepageUrl, {
      waitUntil: "networkidle2",
      timeout: 15_000,
    });

    const buffer = await page.screenshot({
      type: "jpeg",
      quality: 70,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });

    return `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
  } catch (err) {
    console.warn("[pdf] Homepage screenshot failed:", err);
    return null;
  } finally {
    await browser.close();
  }
}
