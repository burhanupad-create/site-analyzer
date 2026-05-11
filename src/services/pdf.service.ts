import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { PDF_TIMEOUT_MS } from "@/lib/constants";

const CHROMIUM_REMOTE_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar";

async function launchBrowser() {
  const isVercel = !!process.env.VERCEL;
  if (isVercel) {
    const executablePath = await chromium.executablePath(CHROMIUM_REMOTE_URL);
    return puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  }
  // Local dev — use system Chrome
  const { execSync } = await import("child_process");
  let executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  try { execSync(`test -f "${executablePath}"`); } catch {
    executablePath = "/usr/bin/google-chrome";
  }
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
}

// ─── PDF Generation ────────────────────────────────────────────────────────────

export async function generatePdfReport(
  jobId: string,
  baseUrl: string
): Promise<Buffer> {
  const reportUrl = `${baseUrl}/analysis/${jobId}?print=1`;

  const browser = await launchBrowser();

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

export async function captureHomepageScreenshot(
  homepageUrl: string
): Promise<string | null> {
  const browser = await launchBrowser();

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
