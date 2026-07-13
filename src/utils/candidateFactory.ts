import type { CandidateListing, ListingScanInput, ListingScanResult } from "../models/renting";

export function createCandidateFromScan(
  scanInput: ListingScanInput,
  scanResult: ListingScanResult,
  note: string,
): CandidateListing {
  return {
    id: crypto.randomUUID(),
    title: inferCandidateTitle(scanInput),
    sourceLabel: inferSourceLabel(scanInput),
    createdAt: new Date().toISOString(),
    note: note.trim(),
    comparison: inferComparison(scanInput),
    scanInput: cloneScanInputForStorage(scanInput),
    scanResult,
  };
}

function inferCandidateTitle(scanInput: ListingScanInput) {
  const text = [scanInput.text, scanInput.imageNotes].filter(Boolean).join(" ");
  const rentMatch = text.match(/(?:月租|租金|房租)?\s*(\d{3,5})\s*(?:元|块)?/);
  const rentText = rentMatch ? `${rentMatch[1]} 元/月` : "";
  const sourceText = scanInput.mode === "link" ? "链接房源" : scanInput.mode === "image" ? "图片房源" : "文字房源";
  const summaryText = text.replace(/\s+/g, " ").slice(0, 18);

  return [rentText, summaryText || sourceText].filter(Boolean).join(" · ");
}

function inferSourceLabel(scanInput: ListingScanInput) {
  if (scanInput.mode === "image") {
    return `${scanInput.images.length} 张图片`;
  }

  if (!scanInput.url.trim()) {
    return scanInput.mode === "text" ? "文字输入" : "未提供链接";
  }

  try {
    return new URL(scanInput.url.trim()).hostname;
  } catch {
    return "链接格式待确认";
  }
}

function inferComparison(scanInput: ListingScanInput) {
  const text = [scanInput.text, scanInput.imageNotes].filter(Boolean).join(" ");
  const rentMatch = text.match(/(?:月租|租金|房租)?\s*(\d{3,5})\s*(?:元|块)?/);
  const commuteMatch = text.match(/(?:通勤|到公司|到学校|车程|地铁)\D{0,8}(\d{1,3})\s*(?:分钟|分|min)/i);
  const metroMatch = text.match(/(?:地铁|站)\D{0,8}(\d{2,4})\s*(?:米|m)/i);

  return {
    monthlyRent: rentMatch ? Number(rentMatch[1]) : undefined,
    totalMonthlyCost: rentMatch ? Number(rentMatch[1]) : undefined,
    commuteMinutes: commuteMatch ? Number(commuteMatch[1]) : undefined,
    metroDistanceMeters: metroMatch ? Number(metroMatch[1]) : undefined,
  };
}

function cloneScanInputForStorage(scanInput: ListingScanInput): ListingScanInput {
  return {
    ...scanInput,
    images: scanInput.images.map((image) => ({
      ...image,
      previewUrl: "",
    })),
  };
}
