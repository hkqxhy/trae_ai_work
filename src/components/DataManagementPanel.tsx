import { useRef, useState, type ChangeEvent } from "react";

interface DataManagementPanelProps {
  candidateCount: number;
  onClearData: () => void;
  onExportData: () => string;
  onImportData: (rawText: string) => { candidateCount: number };
}

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function DataManagementPanel({
  candidateCount,
  onClearData,
  onExportData,
  onImportData,
}: DataManagementPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [message, setMessage] = useState("画像、候选和看房记录只保存在当前浏览器中。");

  function exportData() {
    const blob = new Blob([onExportData()], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `renting-radar-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("本地数据备份已导出。文件可能包含租房材料，请妥善保管。");
  }

  async function selectImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage("导入文件超过 5 MB，请确认选择的是租房雷达 JSON 备份。");
      return;
    }
    setPendingImport(await file.text());
    setMessage("备份文件已读取。确认导入后会覆盖当前本地数据。");
  }

  function confirmImport() {
    if (!pendingImport) {
      return;
    }
    try {
      const result = onImportData(pendingImport);
      setPendingImport(null);
      setMessage(`数据已导入，共恢复 ${result.candidateCount} 套候选房源。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败，请检查备份文件后重试。");
    }
  }

  function confirmClear() {
    onClearData();
    setIsConfirmingClear(false);
    setPendingImport(null);
    setMessage("当前浏览器中的画像、候选和看房记录已清除。");
  }

  return (
    <section className="panel data-management-panel">
      <div className="panel-heading">
        <p className="section-kicker">本地数据与隐私</p>
        <h2>你的资料由你带走</h2>
        <p>导出文件包含需求画像、{candidateCount} 套候选以及对应的看房记录。合同和聊天输入未持久化，不会进入备份。</p>
      </div>
      <div className="data-management-actions">
        <button className="button primary" type="button" onClick={exportData}>
          导出本地备份
        </button>
        <button className="button secondary" type="button" onClick={() => fileInputRef.current?.click()}>
          导入备份
        </button>
        <button className="button secondary danger-button" type="button" onClick={() => setIsConfirmingClear(true)}>
          清除本地数据
        </button>
        <input
          ref={fileInputRef}
          aria-label="选择租房雷达备份文件"
          className="visually-hidden"
          accept="application/json,.json"
          type="file"
          onChange={(event) => void selectImportFile(event)}
        />
      </div>

      {pendingImport ? (
        <div className="inline-confirmation" role="alertdialog" aria-labelledby="import-data-title">
          <div>
            <strong id="import-data-title">用备份覆盖当前数据？</strong>
            <p>当前画像、候选和看房记录会被替换。建议先导出一份现有备份。</p>
          </div>
          <div>
            <button className="button secondary" type="button" onClick={() => setPendingImport(null)}>
              取消
            </button>
            <button className="button primary" type="button" onClick={confirmImport}>
              确认导入
            </button>
          </div>
        </div>
      ) : null}

      {isConfirmingClear ? (
        <div className="inline-confirmation" role="alertdialog" aria-labelledby="clear-local-data-title">
          <div>
            <strong id="clear-local-data-title">清除当前浏览器中的全部数据？</strong>
            <p>画像、候选、看房进度和备注都会删除，操作无法撤销。</p>
          </div>
          <div>
            <button className="button secondary" type="button" onClick={() => setIsConfirmingClear(false)}>
              取消
            </button>
            <button className="button danger-button" type="button" onClick={confirmClear}>
              确认清除
            </button>
          </div>
        </div>
      ) : null}

      <p className="data-management-message" aria-live="polite">{message}</p>
    </section>
  );
}
