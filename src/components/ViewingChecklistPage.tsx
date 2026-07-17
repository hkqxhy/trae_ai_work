import { useEffect, useMemo, useState } from "react";
import { checklistCategoryLabels, generalViewingChecklist } from "../data/generalViewingChecklist";
import type { CandidateListing, ViewingChecklistCategory } from "../models/renting";
import { buildCustomViewingChecklist } from "../utils/customViewingChecklist";
import {
  clearViewingChecklistProgress,
  loadViewingChecklistProgress,
  saveViewingChecklistProgress,
  type ViewingChecklistProgress,
} from "../utils/viewingChecklistProgressStorage";
import {
  clearViewingNotes,
  loadViewingNotes,
  saveViewingNotes,
  viewingDecisionLabels,
  type ViewingNotes,
} from "../utils/viewingNotesStorage";

const categoryOrder: ViewingChecklistCategory[] = [
  "identity",
  "cost",
  "condition",
  "environment",
  "evidence",
];

interface ViewingChecklistPageProps {
  candidates: CandidateListing[];
  initialCandidateId?: string;
}

export function ViewingChecklistPage({ candidates, initialCandidateId = "" }: ViewingChecklistPageProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    candidates.some((candidate) => candidate.id === initialCandidateId)
      ? initialCandidateId
      : candidates[0]?.id ?? "",
  );
  const selectedCandidate =
    candidates.find((candidate) => candidate.id === selectedCandidateId) ?? candidates[0];
  const customItems = useMemo(
    () => (selectedCandidate ? buildCustomViewingChecklist(selectedCandidate) : []),
    [selectedCandidate],
  );
  const progressContextId = selectedCandidate?.id ?? "general";
  const [checkedItems, setCheckedItems] = useState<ViewingChecklistProgress>(() =>
    loadViewingChecklistProgress(progressContextId),
  );
  const [viewingNotes, setViewingNotes] = useState<ViewingNotes>(() =>
    loadViewingNotes(progressContextId),
  );
  const [notesStatus, setNotesStatus] = useState("已载入当前备注");
  const allItems = useMemo(
    () => [...customItems, ...generalViewingChecklist],
    [customItems],
  );
  const completedCount = allItems.filter((item) => checkedItems[item.id]).length;
  const completionPercent = allItems.length
    ? Math.round((completedCount / allItems.length) * 100)
    : 0;
  const unresolvedRisks = selectedCandidate?.scanResult.risks.filter(
    (risk) => risk.verificationStatus !== "explained" && risk.verificationStatus !== "not_applicable",
  ) ?? [];
  const criticalUncheckedCount = customItems.filter((item) => !checkedItems[item.id]).length;
  const canContinue = completionPercent >= 80 && criticalUncheckedCount === 0 && unresolvedRisks.length === 0;

  useEffect(() => {
    setCheckedItems(loadViewingChecklistProgress(progressContextId));
    setViewingNotes(loadViewingNotes(progressContextId));
    setNotesStatus("已载入当前备注");
  }, [progressContextId]);

  useEffect(() => {
    if (initialCandidateId && candidates.some((candidate) => candidate.id === initialCandidateId)) {
      setSelectedCandidateId(initialCandidateId);
    }
  }, [candidates, initialCandidateId]);

  function toggleItem(itemId: string) {
    setCheckedItems((current) => {
      const nextProgress = {
        ...current,
        [itemId]: !current[itemId],
      };
      saveViewingChecklistProgress(progressContextId, nextProgress);
      return nextProgress;
    });
  }

  function resetProgress() {
    clearViewingChecklistProgress(progressContextId);
    setCheckedItems({});
  }

  function updateNotes(field: keyof Pick<ViewingNotes, "summary" | "followUps" | "decision">, value: string) {
    setViewingNotes((current) => ({ ...current, [field]: value }));
    setNotesStatus("有未保存修改");
  }

  function saveNotes() {
    saveViewingNotes(progressContextId, viewingNotes);
    setViewingNotes(loadViewingNotes(progressContextId));
    setNotesStatus("备注已保存到本地");
  }

  function clearNotes() {
    clearViewingNotes(progressContextId);
    setViewingNotes({ summary: "", followUps: "", decision: "undecided" });
    setNotesStatus("备注已清空");
  }

  return (
    <div className="viewing-checklist-workspace">
      <section className="panel span-full">
        <div className="panel-heading">
          <p className="section-kicker">通用看房清单</p>
          <h2>第一次看房，也知道该看什么、怎么查</h2>
          <p>
            这份清单适用于大多数线下看房场景。每一项都包含检查方法和异常信号，帮助你减少遗漏。
          </p>
        </div>
        <div className="checklist-summary">
          <div>
            <span>检查项目</span>
            <strong>{generalViewingChecklist.length}</strong>
          </div>
          <div>
            <span>检查分类</span>
            <strong>{categoryOrder.length}</strong>
          </div>
          <div>
            <span>建议用时</span>
            <strong>30 分钟</strong>
          </div>
          <div>
            <span>完成进度</span>
            <strong>{completionPercent}%</strong>
          </div>
        </div>
        <div className="checklist-progress-actions">
          <span>
            已完成 {completedCount} / {allItems.length} 项
          </span>
          <button className="button secondary" type="button" onClick={resetProgress}>
            重置进度
          </button>
        </div>
      </section>

      <section className="panel span-full custom-checklist-panel">
        <div className="panel-heading">
          <p className="section-kicker">房源定制清单</p>
          <h2>把扫描风险变成现场核验任务</h2>
          <p>选择一个候选房源，系统会为其风险点生成额外的看房检查项目。</p>
        </div>

        {candidates.length ? (
          <>
            <label className="candidate-checklist-select">
              <span>选择候选房源</span>
              <select
                value={selectedCandidate?.id ?? ""}
                onChange={(event) => setSelectedCandidateId(event.target.value)}
              >
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title} · 风险分 {candidate.scanResult.score}
                  </option>
                ))}
              </select>
            </label>

            <div className="custom-checklist-summary">
              <div>
                <span>定制项目</span>
                <strong>{customItems.length}</strong>
              </div>
              <div>
                <span>风险等级</span>
                <strong>{selectedCandidate?.scanResult.verdict}</strong>
              </div>
            </div>

            {customItems.length ? (
              <div className="custom-checklist-list">
                {customItems.map((item) => (
                  <article
                    className={checkedItems[item.id] ? "general-checklist-item custom completed" : "general-checklist-item custom"}
                    key={item.id}
                  >
                    <label className="checklist-checkbox">
                      <input
                        checked={Boolean(checkedItems[item.id])}
                        type="checkbox"
                        onChange={() => toggleItem(item.id)}
                      />
                      <span aria-hidden="true"></span>
                    </label>
                    <div>
                      <span className="custom-category">{checklistCategoryLabels[item.category]}</span>
                      <h3>{item.title}</h3>
                      <dl>
                        <div>
                          <dt>怎么检查</dt>
                          <dd>{item.method}</dd>
                        </div>
                        <div>
                          <dt>异常信号</dt>
                          <dd>{item.warningSign}</dd>
                        </div>
                      </dl>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-box">
                <strong>该候选暂无扫描风险</strong>
                <span>仍建议完成下面的通用看房清单。</span>
              </div>
            )}
          </>
        ) : (
          <div className="empty-box">
            <strong>还没有候选房源</strong>
            <span>先到“房源扫描”保存候选，才能生成风险定制清单。</span>
          </div>
        )}
      </section>

      <section className="panel span-full viewing-notes-panel">
        <div className="panel-heading">
          <p className="section-kicker">现场结论</p>
          <h2>把看房结果变成可复核的决定</h2>
          <p>
            结论会按当前候选房源分别保存在本地。系统会同时提示仍未完成的核验，不用只凭印象做决定。
          </p>
        </div>

        <div className={canContinue ? "viewing-readiness ready" : "viewing-readiness blocked"}>
          <div>
            <span>推进条件</span>
            <strong>{canContinue ? "现场核验已具备继续判断的基础" : "仍有事项需要核实"}</strong>
          </div>
          <ul>
            <li>{completionPercent}% 清单已完成</li>
            <li>{criticalUncheckedCount} 项房源定制任务未完成</li>
            <li>{unresolvedRisks.length} 条风险尚未解释或排除</li>
          </ul>
        </div>

        <fieldset className="viewing-decision-fieldset">
          <legend>本次看房结论</legend>
          <div className="viewing-decision-options">
            {(Object.entries(viewingDecisionLabels) as Array<[ViewingNotes["decision"], string]>).map(
              ([value, label]) => (
                <label key={value}>
                  <input
                    checked={viewingNotes.decision === value}
                    name="viewing-decision"
                    type="radio"
                    value={value}
                    onChange={() => updateNotes("decision", value)}
                  />
                  <span>{label}</span>
                </label>
              ),
            )}
          </div>
        </fieldset>

        <div className="viewing-notes-grid">
          <label>
            <span>现场总结</span>
            <textarea
              value={viewingNotes.summary}
              onChange={(event) => updateNotes("summary", event.target.value)}
              placeholder="写下支持当前结论的事实，例如采光、噪声、异味、设施状态和现场证据"
            />
          </label>
          <label>
            <span>待追问或补充证据</span>
            <textarea
              value={viewingNotes.followUps}
              onChange={(event) => updateNotes("followUps", event.target.value)}
              placeholder="例如：索要最近两个月水电账单；确认提前退租违约金；补拍窗外环境"
            />
          </label>
        </div>

        <div className="viewing-notes-actions">
          <div>
            <strong>{notesStatus}</strong>
            <span>
              {viewingNotes.updatedAt
                ? `上次保存：${formatNotesTime(viewingNotes.updatedAt)}`
                : "尚未保存备注"}
            </span>
          </div>
          <div>
            <button className="button secondary" type="button" onClick={clearNotes}>
              清空备注
            </button>
            <button className="button primary" type="button" onClick={saveNotes}>
              保存备注
            </button>
          </div>
        </div>
      </section>

      {categoryOrder.map((category) => {
        const items = generalViewingChecklist.filter((item) => item.category === category);

        return (
          <section className="panel checklist-category" key={category}>
            <div className="checklist-category-header">
              <div>
                <p className="section-kicker">{checklistCategoryLabels[category]}</p>
                <h2>{items.length} 项需要现场确认</h2>
              </div>
              <span>{items.length}</span>
            </div>

            <div className="general-checklist-list">
              {items.map((item) => (
                <article
                  className={checkedItems[item.id] ? "general-checklist-item completed" : "general-checklist-item"}
                  key={item.id}
                >
                  <label className="checklist-checkbox">
                    <input
                      checked={Boolean(checkedItems[item.id])}
                      type="checkbox"
                      onChange={() => toggleItem(item.id)}
                    />
                    <span aria-hidden="true"></span>
                  </label>
                  <div>
                    <h3>{item.title}</h3>
                    <dl>
                      <div>
                        <dt>怎么检查</dt>
                        <dd>{item.method}</dd>
                      </div>
                      <div>
                        <dt>异常信号</dt>
                        <dd>{item.warningSign}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

    </div>
  );
}

function formatNotesTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
