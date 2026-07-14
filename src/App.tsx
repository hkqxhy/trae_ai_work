import { useMemo, useState } from "react";
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
  SourceType,
} from "./models/renting";
import { loadRentingProfile, resetRentingProfile, saveRentingProfile } from "./utils/profileStorage";
import { buildProfileSummary } from "./utils/profileSummary";
import {
  loadCandidateListings,
  saveCandidateListings,
} from "./utils/candidateStorage";
import { createCandidateFromScan } from "./utils/candidateFactory";
import { scanListingRisk } from "./utils/listingRiskScanner";

const routeStageMeta: Record<AppRouteId, { kicker: string; status: string }> = {
  candidates: { kicker: "候选房源", status: "已保存房源管理" },
  overview: { kicker: "决策工作台", status: "闭环流程就绪" },
  profile: { kicker: "需求画像", status: "画像可保存" },
  scan: { kicker: "房源扫描", status: "多模态扫描" },
  compare: { kicker: "候选对比", status: "综合推荐可用" },
  checklist: { kicker: "看房清单", status: "现场核验可记录" },
  negotiate: { kicker: "沟通助手", status: "回复建议可用" },
  contract: { kicker: "合同检查", status: "合同风险扫描" },
  demo: { kicker: "使用流程", status: "完整流程就绪" },
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
  const [activeRoute, setActiveRoute] = useState<AppRouteId>("overview");
  const [profile, setProfile] = useState<RentingProfile>(() => loadRentingProfile());
  const [candidates, setCandidates] = useState<CandidateListing[]>(() => loadCandidateListings());

  const activeRouteConfig = useMemo(
    () => routes.find((route) => route.id === activeRoute) ?? routes[0],
    [activeRoute],
  );
  const activeStageMeta = routeStageMeta[activeRoute];

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
    setCandidates((current) => {
      const nextCandidates = current.filter((candidate) => candidate.id !== candidateId);
      saveCandidateListings(nextCandidates);
      return nextCandidates;
    });
  }

  function handleClearCandidates() {
    setCandidates([]);
    saveCandidateListings([]);
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

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <a className="brand" href="/" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark">租</span>
          <span>
            <strong>租房雷达</strong>
            <small>AI 租房决策助手</small>
          </span>
        </a>

        <nav className="nav-list">
          {routes.map((route) => (
            <button
              className={route.id === activeRoute ? "nav-item active" : "nav-item"}
              key={route.id}
              type="button"
              onClick={() => setActiveRoute(route.id)}
            >
              <span>{route.label}</span>
              <small>{route.description}</small>
            </button>
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
          <div className="status-card">
            <span>当前阶段</span>
            <strong>{activeStageMeta.status}</strong>
          </div>
        </header>

        <PageContent
          activeRoute={activeRoute}
          candidates={candidates}
          listings={sampleListings}
          profile={profile}
          onLoadDemoData={handleLoadDemoData}
          onDeleteCandidate={handleDeleteCandidate}
          onClearCandidates={handleClearCandidates}
          onSaveCandidate={handleSaveCandidate}
          onUpdateCandidate={handleUpdateCandidate}
          onResetProfile={handleResetProfile}
          onSaveProfile={handleSaveProfile}
          onNavigate={setActiveRoute}
        />
      </main>
    </div>
  );
}

interface PageContentProps {
  activeRoute: AppRouteId;
  candidates: CandidateListing[];
  listings: RentalListing[];
  profile: RentingProfile;
  onLoadDemoData: () => void;
  onSaveCandidate: (candidate: CandidateListing) => void;
  onDeleteCandidate: (candidateId: string) => void;
  onClearCandidates: () => void;
  onUpdateCandidate: (candidateId: string, comparison: CandidateComparison) => void;
  onSaveProfile: (profile: RentingProfile) => void;
  onResetProfile: () => void;
  onNavigate: (route: AppRouteId) => void;
}

function PageContent({
  activeRoute,
  candidates,
  listings,
  profile,
  onLoadDemoData,
  onSaveCandidate,
  onDeleteCandidate,
  onClearCandidates,
  onUpdateCandidate,
  onSaveProfile,
  onResetProfile,
  onNavigate,
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
      return <ViewingChecklistPage candidates={candidates} />;
    case "negotiate":
      return <NegotiationPage />;
    case "contract":
      return <ContractPage />;
    case "demo":
      return (
        <DemoPage
          candidateCount={candidates.length}
          onNavigate={onNavigate}
          onLoadDemoData={onLoadDemoData}
        />
      );
    case "overview":
    default:
      return <OverviewPage candidates={candidates} listings={listings} profile={profile} />;
  }
}

interface ListingProps {
  listings: RentalListing[];
}

interface OverviewPageProps extends ListingProps {
  candidates: CandidateListing[];
  profile: RentingProfile;
}

function OverviewPage({ candidates, listings, profile }: OverviewPageProps) {
  const summary = buildProfileSummary(profile);
  const highRiskCount = listings.filter((listing) =>
    listing.risks.some((risk) => risk.level === "high"),
  ).length;

  return (
    <div className="content-grid">
      <section className="panel span-2">
        <div className="panel-heading">
          <p className="section-kicker">当前画像</p>
          <h2>先用需求把后续判断串起来</h2>
        </div>
        <p>{summary.decisionBrief}</p>
        <div className="inline-summary">
          <span>{summary.housingMode}</span>
          <span>必须满足：{summary.mustHaveText}</span>
        </div>
      </section>

      <Metric label="候选房源样例" value={String(listings.length)} />
      <Metric label="高风险样例" value={String(highRiskCount)} tone="danger" />
      <Metric label="目标城市" value={profile.city || "未填写"} />
      <Metric label="已保存候选" value={String(candidates.length)} />
      <Metric label="通勤上限" value={`${profile.maxCommuteMinutes} 分钟`} />

      <section className="panel span-2">
        <div className="panel-heading">
          <p className="section-kicker">后续闭环</p>
          <h2>画像会影响每一步判断</h2>
        </div>
        <div className="step-row">
          {["需求画像", "房源扫描", "候选对比", "看房清单"].map((step, index) => (
            <div className="step-card" key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
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
