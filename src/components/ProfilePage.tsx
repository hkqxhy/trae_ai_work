import { useEffect, useMemo, useState } from "react";
import { starterProfile } from "../data/mockData";
import type { PriorityLevel, RentingProfile, UserPreference } from "../models/renting";
import {
  buildProfileSummary,
  groupPreferences,
  priorityLabels,
  priorityOrder,
  sortPreferences,
} from "../utils/profileSummary";
import { emptyRentingProfile } from "../utils/profileStorage";
import { isProfileComplete } from "../utils/decisionProgress";

interface ProfilePageProps {
  profile: RentingProfile;
  onSave: (profile: RentingProfile) => void;
  onReset: () => void;
}

export function ProfilePage({ profile, onSave, onReset }: ProfilePageProps) {
  const [draft, setDraft] = useState<RentingProfile>(profile);
  const [newPreference, setNewPreference] = useState("");
  const [saveMessage, setSaveMessage] = useState(profile.city ? "已载入本地画像" : "尚未保存画像");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const summary = useMemo(() => buildProfileSummary(draft), [draft]);
  const groupedPreferences = useMemo(() => groupPreferences(draft.preferences), [draft.preferences]);
  const hasCompleteDraft = isProfileComplete(draft);

  useEffect(() => {
    setDraft(profile);
    setSaveMessage(profile.city ? "已载入本地画像" : "尚未保存画像");
    setValidationErrors([]);
  }, [profile]);

  function updateField<Key extends keyof RentingProfile>(key: Key, value: RentingProfile[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaveMessage("有未保存修改");
  }

  function updatePreferenceLevel(id: string, level: PriorityLevel) {
    setDraft((current) => ({
      ...current,
      preferences: current.preferences.map((preference) =>
        preference.id === id ? { ...preference, level } : preference,
      ),
    }));
    setSaveMessage("有未保存修改");
  }

  function removePreference(id: string) {
    setDraft((current) => ({
      ...current,
      preferences: current.preferences.filter((preference) => preference.id !== id),
    }));
    setSaveMessage("有未保存修改");
  }

  function addPreference() {
    const label = newPreference.trim();

    if (!label || draft.preferences.some((preference) => preference.label === label)) {
      return;
    }

    const preference: UserPreference = {
      id: `preference-${Date.now()}`,
      label,
      level: "preferred",
    };

    setDraft((current) => ({
      ...current,
      preferences: sortPreferences([...current.preferences, preference]),
    }));
    setNewPreference("");
    setSaveMessage("有未保存修改");
  }

  function saveProfile() {
    const errors = validateProfile(draft);
    if (errors.length) {
      setValidationErrors(errors);
      setSaveMessage("请先修正未完成项");
      return;
    }

    const normalizedProfile: RentingProfile = {
      ...draft,
      city: draft.city.trim(),
      commuteTarget: draft.commuteTarget.trim(),
      monthlyBudgetMin: draft.monthlyBudgetMin,
      monthlyBudgetMax: draft.monthlyBudgetMax,
      maxCommuteMinutes: Math.max(10, draft.maxCommuteMinutes),
      preferences: sortPreferences(draft.preferences),
    };

    setDraft(normalizedProfile);
    onSave(normalizedProfile);
    setValidationErrors([]);
    setSaveMessage("画像已保存到本地");
  }

  function resetProfile() {
    setDraft(emptyRentingProfile);
    setNewPreference("");
    onReset();
    setValidationErrors([]);
    setSaveMessage("画像已清空");
  }

  function loadExampleProfile() {
    setDraft(starterProfile);
    setNewPreference("");
    setValidationErrors([]);
    setSaveMessage("示例已填入，保存后才会成为你的画像");
  }

  return (
    <div className="profile-workspace">
      <section className="panel profile-form-panel">
        <div className="panel-heading">
          <p className="section-kicker">租房需求画像</p>
          <h2>先把你的租房目标说清楚</h2>
          <p>这些信息会成为后续区域推荐、房源扫描和候选对比的基础。数据会保存在本地，不会上传。</p>
        </div>

        <form className="profile-form" onSubmit={(event) => event.preventDefault()} noValidate>
          {validationErrors.length ? (
            <div className="form-error-summary" role="alert">
              <strong>还不能保存画像</strong>
              <ul>
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <label>
            <span>目标城市</span>
            <input
              required
              value={draft.city}
              onChange={(event) => updateField("city", event.target.value)}
              placeholder="例如：杭州"
            />
          </label>

          <label>
            <span>通勤目标</span>
            <input
              required
              value={draft.commuteTarget}
              onChange={(event) => updateField("commuteTarget", event.target.value)}
              placeholder="公司、学校或常去地点"
            />
          </label>

          <div className="form-row">
            <label>
              <span>最低预算</span>
              <input
                required
                min="0"
                step="100"
                type="number"
                value={draft.monthlyBudgetMin}
                onChange={(event) => updateField("monthlyBudgetMin", Number(event.target.value))}
              />
            </label>

            <label>
              <span>最高预算</span>
              <input
                required
                min="0"
                step="100"
                type="number"
                value={draft.monthlyBudgetMax}
                onChange={(event) => updateField("monthlyBudgetMax", Number(event.target.value))}
              />
            </label>
          </div>

          <label>
            <span>最长通勤时间：{draft.maxCommuteMinutes} 分钟</span>
            <input
              min="10"
              max="90"
              step="5"
              type="range"
              value={draft.maxCommuteMinutes}
              onChange={(event) => updateField("maxCommuteMinutes", Number(event.target.value))}
            />
          </label>

          <fieldset className="segmented-field">
            <legend>居住方式</legend>
            <button
              className={!draft.acceptsSharedHousing ? "segment active" : "segment"}
              type="button"
              onClick={() => updateField("acceptsSharedHousing", false)}
            >
              优先整租
            </button>
            <button
              className={draft.acceptsSharedHousing ? "segment active" : "segment"}
              type="button"
              onClick={() => updateField("acceptsSharedHousing", true)}
            >
              可接受合租
            </button>
          </fieldset>

          <div className="preference-editor">
            <div>
              <span className="field-label">偏好与优先级</span>
              <p>把条件分成必须满足、比较重要和可以妥协，后续对比房源时会优先使用这个顺序。</p>
            </div>
            <div className="add-preference">
              <input
                aria-label="添加租房偏好"
                value={newPreference}
                onChange={(event) => setNewPreference(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addPreference();
                  }
                }}
                placeholder="添加偏好，如：可办居住证"
              />
              <button className="button secondary" type="button" onClick={addPreference}>
                添加
              </button>
            </div>
            <div className="preference-list">
              {sortPreferences(draft.preferences).map((preference) => (
                <article className="preference-row" key={preference.id}>
                  <strong>{preference.label}</strong>
                  <select
                    aria-label={`${preference.label}的优先级`}
                    value={preference.level}
                    onChange={(event) => updatePreferenceLevel(preference.id, event.target.value as PriorityLevel)}
                  >
                    {priorityOrder.map((level) => (
                      <option key={level} value={level}>
                        {priorityLabels[level]}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removePreference(preference.id)}>
                    删除
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <span aria-live="polite">{saveMessage}</span>
            <div>
              <button className="button secondary" type="button" onClick={resetProfile}>
                清空画像
              </button>
              <button className="button secondary" type="button" onClick={loadExampleProfile}>
                填入示例
              </button>
              <button className="button primary" type="button" onClick={saveProfile}>
                保存画像
              </button>
            </div>
          </div>
        </form>
      </section>

      <aside className="profile-summary-column">
        {hasCompleteDraft ? (
          <>
            <section className="panel summary-panel">
              <div className="panel-heading">
                <p className="section-kicker">画像摘要</p>
                <h2>当前决策基线</h2>
              </div>
              <p className="summary-brief">{summary.decisionBrief}</p>
              <dl className="profile-list compact">
                <div>
                  <dt>预算范围</dt>
                  <dd>{summary.budgetRange}</dd>
                </div>
                <div>
                  <dt>居住方式</dt>
                  <dd>{summary.housingMode}</dd>
                </div>
                <div>
                  <dt>必须满足</dt>
                  <dd>{summary.mustHaveText}</dd>
                </div>
              </dl>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <p className="section-kicker">优先级排序</p>
                <h2>先看什么，后妥协什么</h2>
              </div>
              <div className="priority-groups">
                {groupedPreferences.map((group) => (
                  <div className="priority-group" key={group.level}>
                    <strong>{group.label}</strong>
                    {group.items.length ? (
                      <ul>
                        {group.items.map((item) => (
                          <li key={item.id}>{item.label}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>暂无条件</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <p className="section-kicker">系统建议</p>
                <h2>下一步筛房策略</h2>
              </div>
              <ul className="advice-list">
                {summary.advice.map((advice) => (
                  <li key={advice}>{advice}</li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <section className="panel profile-summary-empty">
            <div className="panel-heading">
              <p className="section-kicker">画像摘要</p>
              <h2>完成必填项后生成</h2>
            </div>
            <p>补齐目标城市、通勤地点和有效预算后，系统才会生成你的决策基线和筛房策略。</p>
            <ul className="advice-list">
              <li>不使用默认城市或虚构预算替你做判断。</li>
              <li>未保存的修改只停留在当前页面。</li>
              <li>你可以主动填入示例，先了解画像如何工作。</li>
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}

function validateProfile(profile: RentingProfile) {
  const errors: string[] = [];
  if (!profile.city.trim()) {
    errors.push("请填写目标城市。");
  }
  if (!profile.commuteTarget.trim()) {
    errors.push("请填写通勤目标。");
  }
  if (profile.monthlyBudgetMin <= 0 || profile.monthlyBudgetMax <= 0) {
    errors.push("请填写大于 0 的预算范围。");
  } else if (profile.monthlyBudgetMin > profile.monthlyBudgetMax) {
    errors.push("最低预算不能高于最高预算。");
  }
  if (profile.maxCommuteMinutes < 10) {
    errors.push("最长通勤时间不能少于 10 分钟。");
  }
  return errors;
}
