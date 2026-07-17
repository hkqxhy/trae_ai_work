import { useEffect, useMemo, useState } from "react";
import { getRouteHash, useHashRoute } from "./app/useHashRoute";
import { ComparisonPage } from "./components/ComparisonPage";
import { CandidatesPage } from "./components/CandidatesPage";
import { ContractPage } from "./components/ContractPage";
import { DemoPage } from "./components/DemoPage";
import { NegotiationPage } from "./components/NegotiationPage";
import { ProfilePage } from "./components/ProfilePage";
import { ScanPage } from "./components/ScanPage";
import { ViewingChecklistPage } from "./components/ViewingChecklistPage";
import { routes } from "./data/routes";
import { sampleListings } from "./data/mockData";
import type {
  AppRouteId,
  CandidateComparison,
  CandidateListing,
  ListingScanInput,
  RentalListing,
  RentingProfile,
  RiskVerificationStatus,
  SourceType,
} from "./models/renting";
import {
  emptyRentingProfile,
  loadRentingProfile,
  resetRentingProfile,
  saveRentingProfile,
} from "./utils/profileStorage";
import { buildProfileSummary } from "./utils/profileSummary";
import {
  clearCandidateListings,
  loadCandidateListings,
  saveCandidateListings,
} from "./utils/candidateStorage";
import { createCandidateFromScan } from "./utils/candidateFactory";
import { buildDecisionProgress, isProfileComplete } from "./utils/decisionProgress";
import { scanListingRisk } from "./utils/listingRiskScanner";
import {
  consumeStorageIssue,
  STORAGE_ISSUE_EVENT,
  type StorageIssue,
} from "./utils/browserStorage";
import {
  clearViewingChecklistProgress,
  saveViewingChecklistProgress,
} from "./utils/viewingChecklistProgressStorage";
import { clearViewingNotes, loadViewingNotes, saveViewingNotes } from "./utils/viewingNotesStorage";
import {
  clearContractReviews,
  loadContractReviews,
  replaceContractReviews,
} from "./utils/contractReviewStorage";
import {
  buildDataBundle,
  parseDataBundle,
  serializeDataBundle,
} from "./utils/dataPortability";

const routeStageMeta: Record<AppRouteId, { kicker: string; principle: string }> = {
  candidates: { kicker: "候选房源", principle: "材料只保存在此设备" },
  overview: { kicker: "决策工作台", principle: "每次只推进最重要的一步" },
  profile: { kicker: "需求画像", principle: "画像数据不会上传" },
  scan: { kicker: "房源扫描", principle: "规则先行，AI 只做补充" },
  compare: { kicker: "候选对比", principle: "信息完整后才参与排名" },
  checklist: { kicker: "看房清单", principle: "线上风险带到现场核验" },
  negotiate: { kicker: "沟通助手", principle: "发送前始终由你确认" },
  contract: { kicker: "合同检查", principle: "风险提示不构成法律意见" },
  demo: { kicker: "使用流程", principle: "示例数据会明确标注" },
};

const listingSourceLabels: Record<SourceType, string> = {
  landlord: "房东直租",
  agent: "中介",
  sublessor: "转租",
  apartment: "公寓",
  unknown: "",
};

function buildListingDescription(listing: RentalListing): string {
  const parts: string[] = [listing.title, listing.district];
  const sourceLabel = listingSourceLabels[listing.sourceType];
  if (sourceLabel) {
    parts.push(sourceLabel);
  }
  parts.push(`月租 ${listing.cost.rent} 元`);
  parts.push(`押金 ${listing.cost.deposit}`);
  if (listing.cost.agencyFee) {
    parts.push(`中介费 ${listing.cost.agencyFee}`);
  }
  if (listing.cost.extraFees?.length) {
    parts.push(listing.cost.extraFees.join("、"));
  }
  if (listing.commuteMinutes) {
    parts.push(`通勤 ${listing.commuteMinutes} 分钟`);
  }
  if (listing.metroDistanceMeters) {
    parts.push(`地铁 ${listing.metroDistanceMeters} 米`);
  }
  return parts.join("，") + "。";
}

function buildDemoCandidateFromListing(
  listing: RentalListing,
  profile: RentingProfile,
  candidateId: string,
): CandidateListing {
  const scanInput: ListingScanInput = {
    mode: "text",
    text: buildListingDescription(listing),
    url: "",
    imageNotes: "",
    images: [],
  };
  const scanResult = scanListingRisk(scanInput, profile);
  const candidate = createCandidateFromScan(scanInput, scanResult, "一键加载的示例房源");
  return {
    ...candidate,
    id: candidateId,
    title: `${listing.title} · ${listing.district}`,
  };
}

function App() {
  const [activeRoute, navigate] = useHashRoute();
  const [profile, setProfile] = useState<RentingProfile>(() => loadRentingProfile());
  const [candidates, setCandidates] = useState<CandidateListing[]>(() => loadCandidateListings());
  const [storageNotice, setStorageNotice] = useState(() => consumeStorageIssue()?.message ?? "");
  const [focusedCandidateId, setFocusedCandidateId] = useState("");

  const activeRouteConfig = useMemo(
    () => routes.find((route) => route.id === activeRoute) ?? routes[0],
    [activeRoute],
  );
  const activeStageMeta = routeStageMeta[activeRoute];

  useEffect(() => {
    function handleStorageIssue(event: Event) {
      setStorageNotice((event as CustomEvent<StorageIssue>).detail.message);
    }
    window.addEventListener(STORAGE_ISSUE_EVENT, handleStorageIssue);
    return () => window.removeEventListener(STORAGE_ISSUE_EVENT, handleStorageIssue);
  }, []);

  function handleSaveProfile(nextProfile: RentingProfile) {
    setProfile(nextProfile);
    saveRentingProfile(nextProfile);
  }

  function handleResetProfile() {
    resetRentingProfile();
    const restoredProfile = loadRentingProfile();
    setProfile(restoredProfile);
  }

  function handleSaveCandidate(candidate: CandidateListing) {
    setCandidates((current) => {
      const nextCandidates = [candidate, ...current];
      saveCandidateListings(nextCandidates);
      return nextCandidates;
    });
  }

  function handleDeleteCandidate(candidateId: string) {
    clearViewingChecklistProgress(candidateId);
    clearViewingNotes(candidateId);
    clearContractReviews(candidateId);
    setCandidates((current) => {
      const nextCandidates = current.filter((candidate) => candidate.id !== candidateId);
      saveCandidateListings(nextCandidates);
      return nextCandidates;
    });
  }

  function handleClearCandidates() {
    candidates.forEach((candidate) => {
      clearViewingChecklistProgress(candidate.id);
      clearViewingNotes(candidate.id);
      clearContractReviews(candidate.id);
    });
    setCandidates([]);
    saveCandidateListings([]);
  }

  function clearViewingData(candidateIds: string[]) {
    ["general", ...candidateIds].forEach((contextId) => {
      clearViewingChecklistProgress(contextId);
      clearViewingNotes(contextId);
      if (contextId !== "general") clearContractReviews(contextId);
    });
  }

  function handleClearLocalData() {
    clearViewingData(candidates.map((candidate) => candidate.id));
    resetRentingProfile();
    clearCandidateListings();
    setProfile(emptyRentingProfile);
    setCandidates([]);
  }

  function handleExportData() {
    return serializeDataBundle(buildDataBundle(profile, candidates));
  }

  function handleImportData(rawText: string) {
    const bundle = parseDataBundle(rawText);
    clearViewingData(candidates.map((candidate) => candidate.id));
    saveRentingProfile(bundle.profile);
    saveCandidateListings(bundle.candidates);
    bundle.viewingRecords.forEach((record) => {
      saveViewingChecklistProgress(record.contextId, record.progress);
      saveViewingNotes(record.contextId, record.notes);
    });
    bundle.candidates.forEach((candidate) => {
      replaceContractReviews(
        candidate.id,
        bundle.contractRecords.filter((record) => record.candidateId === candidate.id),
      );
    });
    setProfile(bundle.profile);
    setCandidates(bundle.candidates);
    return { candidateCount: bundle.candidates.length };
  }

  function handleUpdateCandidate(candidateId: string, comparison: CandidateComparison) {
    setCandidates((current) => {
      const nextCandidates = current.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              comparison: {
                ...candidate.comparison,
                ...comparison,
              },
            }
          : candidate,
      );
      saveCandidateListings(nextCandidates);
      return nextCandidates;
    });
  }

  function handleUpdateRiskStatus(
    candidateId: string,
    riskId: string,
    verificationStatus: RiskVerificationStatus,
  ) {
    setCandidates((current) => {
      const nextCandidates = current.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              scanResult: {
                ...candidate.scanResult,
                risks: candidate.scanResult.risks.map((risk) =>
                  risk.id === riskId ? { ...risk, verificationStatus } : risk,
                ),
              },
            }
          : candidate,
      );
      saveCandidateListings(nextCandidates);
      return nextCandidates;
    });
  }

  function handleLoadDemoData() {
    const demoProfile: RentingProfile = {
      city: "杭州",
      commuteTarget: "未来科技城",
      monthlyBudgetMin: 3000,
      monthlyBudgetMax: 4500,
      maxCommuteMinutes: 45,
      acceptsSharedHousing: false,
      preferences: [
        { id: "metro", label: "靠近地铁", level: "must" },
        { id: "sunlight", label: "采光稳定", level: "preferred" },
        { id: "kitchen", label: "可以做饭", level: "preferred" },
        { id: "noise", label: "夜间安静", level: "must" },
      ],
    };
    handleSaveProfile(demoProfile);

    const existingIds = new Set(candidates.map((candidate) => candidate.id));
    sampleListings.slice(0, 2).forEach((listing) => {
      const demoId = `demo-${listing.id}`;
      if (existingIds.has(demoId)) {
        return;
      }
      handleSaveCandidate(buildDemoCandidateFromListing(listing, demoProfile, demoId));
    });
  }

  function handleNavigate(route: AppRouteId, candidateId?: string) {
    if (candidateId) setFocusedCandidateId(candidateId);
    navigate(route);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <a className="brand" href={getRouteHash("overview")}>
          <span className="brand-mark">租</span>
          <span>
            <strong>租房雷达</strong>
            <small>AI 租房决策助手</small>
          </span>
        </a>

        <nav className="nav-list">
          {routes.map((route) => (
            <a
              aria-current={route.id === activeRoute ? "page" : undefined}
              className={route.id === activeRoute ? "nav-item active" : "nav-item"}
              href={getRouteHash(route.id)}
              key={route.id}
            >
              <span>{route.label}</span>
              <small>{route.description}</small>
            </a>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="page-header">
          <div>
            <p className="section-kicker">{activeStageMeta.kicker}</p>
            <h1>{activeRouteConfig.label}</h1>
            <p>{activeRouteConfig.description}</p>
          </div>
          <div className="status-card trust-card">
            <span>使用原则</span>
            <strong>{activeStageMeta.principle}</strong>
          </div>
        </header>

        {storageNotice ? (
          <div className="global-notice" role="alert">
            <span>{storageNotice}</span>
            <button type="button" onClick={() => setStorageNotice("")} aria-label="关闭存储提示">
              关闭
            </button>
          </div>
        ) : null}

        <PageContent
          activeRoute={activeRoute}
          candidates={candidates}
          profile={profile}
          onClearData={handleClearLocalData}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onLoadDemoData={handleLoadDemoData}
          onDeleteCandidate={handleDeleteCandidate}
          onClearCandidates={handleClearCandidates}
          onSaveCandidate={handleSaveCandidate}
          onUpdateCandidate={handleUpdateCandidate}
          onUpdateRiskStatus={handleUpdateRiskStatus}
          onResetProfile={handleResetProfile}
          onSaveProfile={handleSaveProfile}
          onNavigate={handleNavigate}
          focusedCandidateId={focusedCandidateId}
        />
      </main>
    </div>
  );
}

interface PageContentProps {
  activeRoute: AppRouteId;
  candidates: CandidateListing[];
  profile: RentingProfile;
  onClearData: () => void;
  onExportData: () => string;
  onImportData: (rawText: string) => { candidateCount: number };
  onLoadDemoData: () => void;
  onSaveCandidate: (candidate: CandidateListing) => void;
  onDeleteCandidate: (candidateId: string) => void;
  onClearCandidates: () => void;
  onUpdateCandidate: (candidateId: string, comparison: CandidateComparison) => void;
  onUpdateRiskStatus: (candidateId: string, riskId: string, status: RiskVerificationStatus) => void;
  onSaveProfile: (profile: RentingProfile) => void;
  onResetProfile: () => void;
  onNavigate: (route: AppRouteId, candidateId?: string) => void;
  focusedCandidateId: string;
}

function PageContent({
  activeRoute,
  candidates,
  profile,
  onClearData,
  onExportData,
  onImportData,
  onLoadDemoData,
  onSaveCandidate,
  onDeleteCandidate,
  onClearCandidates,
  onUpdateCandidate,
  onUpdateRiskStatus,
  onSaveProfile,
  onResetProfile,
  onNavigate,
  focusedCandidateId,
}: PageContentProps) {
  switch (activeRoute) {
    case "profile":
      return <ProfilePage profile={profile} onReset={onResetProfile} onSave={onSaveProfile} />;
    case "scan":
      return <ScanPage profile={profile} onSaveCandidate={onSaveCandidate} />;
    case "candidates":
      return (
        <CandidatesPage
          candidates={candidates}
          onDeleteCandidate={onDeleteCandidate}
          onClearCandidates={onClearCandidates}
          onNavigate={onNavigate}
          onUpdateRiskStatus={onUpdateRiskStatus}
        />
      );
    case "compare":
      return (
        <ComparisonPage
          candidates={candidates}
          onDeleteCandidate={onDeleteCandidate}
          onUpdateCandidate={onUpdateCandidate}
          profile={profile}
        />
      );
    case "checklist":
      return <ViewingChecklistPage candidates={candidates} initialCandidateId={focusedCandidateId} />;
    case "negotiate":
      return <NegotiationPage />;
    case "contract":
      return <ContractPage candidates={candidates} initialCandidateId={focusedCandidateId} />;
    case "demo":
      return (
        <DemoPage
          candidateCount={candidates.length}
          onClearData={onClearData}
          onExportData={onExportData}
          onImportData={onImportData}
          onNavigate={onNavigate}
          onLoadDemoData={onLoadDemoData}
        />
      );
    case "overview":
    default:
      return <OverviewPage candidates={candidates} profile={profile} onNavigate={onNavigate} />;
  }
}

interface OverviewPageProps {
  candidates: CandidateListing[];
  profile: RentingProfile;
  onNavigate: (route: AppRouteId, candidateId?: string) => void;
}

function OverviewPage({ candidates, profile, onNavigate }: OverviewPageProps) {
  const summary = buildProfileSummary(profile);
  const progress = buildDecisionProgress(
    profile,
    candidates,
    candidates.map((candidate) => ({
      candidateId: candidate.id,
      viewingDecision: loadViewingNotes(candidate.id).decision,
      contractLevel: loadContractReviews(candidate.id)[0]?.result.level,
    })),
  );
  const hasProfile = isProfileComplete(profile);

  return (
    <div className="overview-workspace">
      <section className="panel next-action-panel">
        <div className="next-action-copy">
          <p className="section-kicker">现在最重要</p>
          <h2>{progress.primaryAction.label}</h2>
          <p>{progress.primaryAction.description}</p>
          <button
            className="button primary"
            type="button"
            onClick={() => onNavigate(progress.primaryAction.route, progress.primaryAction.candidateId)}
          >
            {progress.primaryAction.label}
          </button>
        </div>
        <div className="decision-progress" aria-label={`决策准备进度 ${progress.progressPercent}%`}>
          <div className="decision-progress-value">
            <strong>{progress.progressPercent}%</strong>
            <span>决策准备度</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${progress.progressPercent}%` }} />
          </div>
          <p>{progress.completedMilestones} / {progress.totalMilestones} 项基础准备已完成</p>
        </div>
      </section>

      <section className="overview-metrics" aria-label="当前决策概况">
        <Metric label="已保存候选" value={String(progress.candidateCount)} />
        <Metric label="可可靠比较" value={String(progress.comparableCount)} />
        <Metric label="待补充信息" value={String(progress.incompleteCandidateCount)} />
        <Metric label="高风险候选" value={String(progress.highRiskCount)} tone={progress.highRiskCount ? "danger" : "default"} />
      </section>

      <section className="panel profile-overview-panel">
        <div className="panel-heading">
          <p className="section-kicker">你的判断基线</p>
          <h2>{hasProfile ? `${profile.city}租房计划` : "先定义什么适合你"}</h2>
        </div>
        {hasProfile ? (
          <>
            <p>{summary.decisionBrief}</p>
            <div className="inline-summary">
              <span>{summary.housingMode}</span>
              <span>必须满足：{summary.mustHaveText}</span>
            </div>
          </>
        ) : (
          <p>城市、预算和通勤目标尚未补齐。系统现在不会假装了解你的需求，也不会生成个性化排序。</p>
        )}
        <button className="text-button" type="button" onClick={() => onNavigate("profile")}>
          {hasProfile ? "查看或修改画像" : "开始填写画像"}
        </button>
      </section>

      <section className="panel recent-candidates-panel">
        <div className="panel-heading">
          <p className="section-kicker">最近候选</p>
          <h2>{candidates.length ? "继续处理这些房源" : "还没有候选房源"}</h2>
        </div>
        {candidates.length ? (
          <div className="overview-candidate-list">
            {candidates.slice(0, 3).map((candidate) => (
              <article key={candidate.id}>
                <div>
                  <strong>{candidate.title}</strong>
                  <span>{candidate.sourceLabel || "来源待确认"}</span>
                </div>
                <span className={`risk-text ${candidate.scanResult.level}`}>
                  {candidate.scanResult.level === "high" ? "高风险" : candidate.scanResult.level === "medium" ? "需核验" : "低风险"}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p>扫描房源材料并保存后，它会出现在这里。示例数据只在“使用流程”中由你主动载入。</p>
        )}
        <button className="text-button" type="button" onClick={() => onNavigate(candidates.length ? "candidates" : "scan")}>
          {candidates.length ? "查看全部候选" : "添加房源"}
        </button>
      </section>
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  tone?: "default" | "danger";
}

function Metric({ label, value, tone = "default" }: MetricProps) {
  return (
    <section className={tone === "danger" ? "metric danger" : "metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

export default App;
