import * as React from "react";
import {
  ArrowLeft,
  CircleHelp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CloudUpload,
  Download,
  Eye,
  FileText,
  ListChecks,
  MoreVertical,
  Pause,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Progress } from "../components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import type { Country, ModuleContext, StoreFlag } from "../components/layout/AppShell";

const CAMPAIGNS_PAGE_SIZE = 10;

type CampaignStatus = "idle" | "pending" | "success" | "stuck";

type Campaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  submittedBy: string;
  total: number; // total de artículos esperados
  done: number; // artículos completados
  canStuck: boolean;
  hasStuck: boolean;
  /** Porcentaje (1–99) en el que se simula el error; por defecto 80 si no se define. */
  stuckTargetPercent?: number;
  /** Último actor que inició la ejecución de la campaña. */
  startedBy?: string;
  /** Duración (ms) de la última corrida completa (success o error). */
  lastRunMs?: number;
};

const AVAILABLE_FLAGS_BY_COUNTRY: Record<Country, StoreFlag[]> = {
  Chile: ["Jumbo", "Santa Isabel"],
  Argentina: ["Jumbo", "Disco", "Vea"],
};

function getCountryIcon(country: Country) {
  return country === "Chile"
    ? "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1e8-1f1f1.png"
    : "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1e6-1f1f7.png";
}

function formatIntEs(value: number) {
  return new Intl.NumberFormat("es-AR").format(value);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getProgressPercent(c: Campaign) {
  if (c.total <= 0) return 0;
  const percent = Math.round((c.done / c.total) * 100);
  return clampPercent(percent);
}

function getCampaignNameFromFile(fileName: string) {
  const withoutExt = fileName.replace(/\.[^/.]+$/, "").trim();
  if (!withoutExt) return "";
  return withoutExt
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDurationMs(valueMs?: number) {
  if (!valueMs || valueMs <= 0) return "Sin tiempo registrado";
  const sec = Math.round(valueMs / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function getSimulatedProcessingMs(campaign: Campaign) {
  // Base determinística por campaña para que no "salte" entre renders.
  const seed = hashString(`proc-time|${campaign.id}|${campaign.total}|${campaign.name}`);
  const rand = mulberry32(seed);

  // Duración total estimada (ms) para una corrida completa.
  const estimatedTotalMs = Math.max(
    18_000,
    Math.round(campaign.total * (35 + rand() * 45)),
  );

  if (campaign.status === "success") return estimatedTotalMs;
  if (campaign.status === "stuck") {
    const stuckPct = Math.min(99, Math.max(1, campaign.stuckTargetPercent ?? 80));
    return Math.round(estimatedTotalMs * (stuckPct / 100));
  }
  if (campaign.status === "pending") {
    const progressRatio =
      campaign.total > 0 ? Math.min(0.95, Math.max(0.05, campaign.done / campaign.total)) : 0.15;
    return Math.round(estimatedTotalMs * progressRatio);
  }
  return 0;
}

type ResultKind =
  | "Correcto"
  | "Incorrecto"
  | "No visible"
  | "No encontrado"
  | "Error al procesar";

type ResultSummary = {
  promotions: number;
  sku: number;
  rows: Array<{ kind: ResultKind; count: number; tone: string }>;
};

function downloadSelectedResultSubsetsSimulated(
  campaign: Campaign,
  selectedRows: Array<{ kind: ResultKind; count: number }>,
  currency: string,
) {
  const safeName = campaign.name.replace(/[^\w\s-]/g, "").slice(0, 60) || "campana";
  const suffix =
    selectedRows.length === 1
      ? selectedRows[0]!.kind.toLowerCase().replace(/\s+/g, "-")
      : "seleccionados";
  const fileName = `${safeName}-${campaign.id}-${suffix}.xls`;

  const bodyRows = selectedRows
    .flatMap((group, groupIdx) =>
      Array.from({ length: Math.max(1, Math.min(group.count, 180)) }).map((_, idx) => {
        const n = idx + 1 + groupIdx * 1000;
        const sku = `SKU-${String(n).padStart(4, "0")}`;
        const basePrice = 900 + ((n * 137) % 1700);
        const foundPrice = group.kind === "Incorrecto" ? basePrice + 120 : basePrice;
        const note =
          group.kind === "Correcto"
            ? "Monto coincide con archivo promocional"
            : group.kind === "Incorrecto"
              ? "Monto promocional no coincide con archivo"
              : group.kind === "No visible"
                ? "Artículo no visible (404)"
                : group.kind === "No encontrado"
                  ? "Promoción no encontrada; artículo visible"
                  : "Error al procesar promoción";
        return `<tr>
  <td>${sku}</td>
  <td>${basePrice}</td>
  <td>${foundPrice}</td>
  <td>${currency}</td>
  <td>${group.kind}</td>
  <td>${note}</td>
</tr>`;
      }),
    )
    .join("");

  const totalSelected = selectedRows.reduce((acc, row) => acc + row.count, 0);
  const selectedLabels = selectedRows.map((row) => row.kind).join(", ");

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
  th { background: #f3f4f6; }
</style>
</head>
<body>
<h2>Resultados filtrados</h2>
<p><b>Campaña:</b> ${campaign.name}</p>
<p><b>Tipos seleccionados:</b> ${selectedLabels}</p>
<p><b>Registros:</b> ${totalSelected}</p>
<table>
  <thead>
    <tr>
      <th>SKU</th>
      <th>Monto esperado</th>
      <th>Monto encontrado</th>
      <th>Moneda</th>
      <th>Resultado</th>
      <th>Detalle</th>
    </tr>
  </thead>
  <tbody>
    ${bodyRows}
  </tbody>
</table>
</body></html>`;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ALL_RESULT_KINDS: ResultKind[] = [
  "Correcto",
  "Incorrecto",
  "No visible",
  "No encontrado",
  "Error al procesar",
];

function toggleResultKind(list: ResultKind[], kind: ResultKind) {
  return list.includes(kind) ? list.filter((k) => k !== kind) : [...list, kind];
}

function getSelectedChipAccent(kind: ResultKind) {
  if (kind === "Correcto") return "border-emerald-300 ring-emerald-200";
  if (kind === "Incorrecto") return "border-amber-300 ring-amber-200";
  if (kind === "No visible") return "border-slate-300 ring-slate-200";
  if (kind === "No encontrado") return "border-blue-300 ring-blue-200";
  return "border-rose-300 ring-rose-200";
}

function buildResultSummary(campaign: Campaign): ResultSummary {
  const sku = Math.max(1, campaign.total);
  const seed = hashString(`results|${campaign.id}|${campaign.name}|${campaign.total}`);
  const rand = mulberry32(seed);
  const promotions = Math.max(1, Math.round(sku / (5 + rand() * 10)));

  const status = campaign.status;
  const baseWeights =
    status === "success"
      ? [0.78, 0.12, 0.04, 0.04, 0.02]
      : status === "stuck"
        ? [0.42, 0.17, 0.13, 0.1, 0.18]
        : status === "pending"
          ? [0.55, 0.18, 0.09, 0.1, 0.08]
          : [0.62, 0.16, 0.08, 0.08, 0.06];

  const jittered = baseWeights.map((w) => Math.max(0.01, w + (rand() - 0.5) * 0.05));
  const totalWeight = jittered.reduce((acc, n) => acc + n, 0);
  const normalized = jittered.map((n) => n / totalWeight);
  const counts = normalized.map((n) => Math.floor(n * sku));

  let diff = sku - counts.reduce((acc, n) => acc + n, 0);
  let idx = 0;
  while (diff > 0) {
    counts[idx % counts.length] += 1;
    idx += 1;
    diff -= 1;
  }

  return {
    promotions,
    sku,
    rows: [
      { kind: "Correcto", count: counts[0] ?? 0, tone: "bg-emerald-100 text-emerald-800" },
      { kind: "Incorrecto", count: counts[1] ?? 0, tone: "bg-amber-100 text-amber-800" },
      { kind: "No visible", count: counts[2] ?? 0, tone: "bg-slate-100 text-slate-700" },
      { kind: "No encontrado", count: counts[3] ?? 0, tone: "bg-blue-100 text-blue-800" },
      { kind: "Error al procesar", count: counts[4] ?? 0, tone: "bg-rose-100 text-rose-800" },
    ],
  };
}

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// RNG deterministic por combinación (pais/bandera) para que la simulación sea estable.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CAMPAIGN_TOTALS_POOL = [
  3, 25, 50, 100, 180, 250, 300, 400, 600, 750, 1000, 1500, 2000, 2500, 3000, 4000,
  4500,
] as const;

function getCampaignNamingPools(country: Country, flag: StoreFlag) {
  const storeLabel = flag;
  const submittedPool =
    country === "Chile"
      ? ["Admin", "M. López", "S. García", "R. Silva", "L. Fernández"]
      : ["Admin", "P. Gómez", "C. Pérez", "D. Martínez", "B. Rodríguez"];

  const descriptors =
    storeLabel === "Jumbo"
      ? [
          "Precios Tienda",
          "Retail Nuevas Ofertas",
          "Lista Blanca",
          "Ofertas Flash",
          "Premium Catálogo",
          "Weekend Descuentos",
        ]
      : storeLabel === "Santa Isabel"
        ? [
            "Precios Super",
            "Promos de Temporada",
            "Lista Blanca Express",
            "Ofertas Flash 24h",
            "Catálogo Especial",
            "Weekend Promocional",
          ]
        : storeLabel === "Disco"
          ? [
              "Ofertas Disco",
              "Retail Nuevos Precios",
              "Campaña Blanco",
              "Flash Hogar",
              "Catálogo Premium",
              "Weekend Ahorro",
            ]
          : [
              "Promos Vea",
              "Precios Especiales",
              "Lista Blanca Vea",
              "Ofertas Flash",
              "Catálogo Vea",
              "Weekend Descuentos",
            ];

  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
  ];

  return { storeLabel, submittedPool, descriptors, months };
}

function pickRandom<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

/** Una campaña nueva totalmente aleatoria (modo simulación / carga masiva). */
function createRandomSimulatedCampaign(
  country: Country,
  flag: StoreFlag,
  options: {
    fixedTotal?: number;
    simError: boolean;
    errorPercent: number;
    uniqueId: string;
  },
): Campaign {
  const r = Math.random;
  const { storeLabel, submittedPool, descriptors, months } =
    getCampaignNamingPools(country, flag);

  const month = pickRandom(months, r);
  const descriptor = pickRandom(descriptors, r);
  const name = `Campaña ${month} - ${descriptor} - ${storeLabel} (${country})`;
  const submittedBy = pickRandom(submittedPool, r);

  let total: number;
  if (options.fixedTotal != null && Number.isFinite(options.fixedTotal)) {
    total = options.fixedTotal;
  } else {
    total = pickRandom(CAMPAIGN_TOTALS_POOL, r);
  }
  total = Math.min(999_999, Math.max(1, total));

  let canStuck = false;
  let stuckTargetPercent: number | undefined;
  if (options.simError && r() < 0.4) {
    canStuck = true;
    const base = Math.min(99, Math.max(1, options.errorPercent));
    stuckTargetPercent = Math.min(
      99,
      Math.max(1, Math.round(base + (r() - 0.5) * 18)),
    );
  }

  return {
    id: options.uniqueId,
    name,
    status: "idle",
    submittedBy,
    total,
    done: 0,
    canStuck,
    hasStuck: false,
    stuckTargetPercent,
  };
}

function makeCampaigns(country: Country, flag: StoreFlag): Campaign[] {
  const seed = hashString(`${country}|${flag}`);
  const rand = mulberry32(seed);

  const { storeLabel, submittedPool, descriptors, months } =
    getCampaignNamingPools(country, flag);

  const patterns: CampaignStatus[][] = [
    ["idle", "pending", "success", "idle", "pending", "success"],
    ["pending", "idle", "success", "pending", "idle", "success"],
    ["success", "idle", "pending", "success", "idle", "pending"],
    ["idle", "pending", "pending", "success", "idle", "success"],
    ["pending", "success", "idle", "pending", "success", "idle"],
  ];

  const pattern = patterns[Math.floor(rand() * patterns.length)];
  const ids = ["c1", "c2", "c3", "c4", "c5", "c6"];

  const base: Campaign[] = ids.map((id, idx): Campaign => {
    const status = pattern[idx] ?? "idle";
    let total: number =
      CAMPAIGN_TOTALS_POOL[Math.floor(rand() * CAMPAIGN_TOTALS_POOL.length)];
    if (country === "Chile" && flag === "Jumbo" && id === "c2") {
      total = Math.max(total, 500);
    }

    const submittedBy =
      submittedPool[Math.floor(rand() * submittedPool.length)];
    const descriptor = descriptors[Math.floor(rand() * descriptors.length)];
    const month = months[Math.floor(rand() * months.length)];

    let done = 0;
    if (status === "success") done = total;
    if (status === "pending") {
      const progress = 0.15 + rand() * 0.65; // 15%..80%
      done = Math.max(1, Math.min(total - 1, Math.round(total * progress)));
    }

    return {
      id,
      name: `Campaña ${month} - ${descriptor} - ${storeLabel} (${country})`,
      status,
      submittedBy,
      total,
      done,
      canStuck: false,
      hasStuck: false,
    };
  });

  // Dejamos un único caso de error para QA:
  // solo la campaña c2 cuando la combinación es Chile + Jumbo.
  const stuckIdx = base.findIndex((c) => c.id === "c2");
  if (country === "Chile" && flag === "Jumbo" && stuckIdx >= 0) {
    base[stuckIdx] = { ...base[stuckIdx], canStuck: true, stuckTargetPercent: 80 };
  }

  return base;
}

function downloadExcelSimulated(campaign: Campaign) {
  // Simulación: generamos un HTML table con mime de Excel.
  // Excel abre estos formatos con facilidad para pruebas de UX/flujo.
  const safeName = campaign.name.replace(/[^\w\s-]/g, "").slice(0, 60) || "campana";
  const fileName = `${safeName}-${campaign.id}.xls`;

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
  th { background: #f3f4f6; }
</style>
</head>
<body>
<h2>${campaign.name}</h2>
<p><b>Estado:</b> ${campaign.status}</p>
<p><b>Subido por:</b> ${campaign.submittedBy}</p>
<p><b>Progreso:</b> ${campaign.done} de ${campaign.total} (${getProgressPercent(
    campaign,
  )}% completado)</p>
<table>
  <thead>
    <tr>
      <th>Campo</th>
      <th>Valor</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Nombre</td><td>${campaign.name}</td></tr>
    <tr><td>Estado</td><td>${campaign.status}</td></tr>
    <tr><td>Subido por</td><td>${campaign.submittedBy}</td></tr>
    <tr><td>Artículos</td><td>${campaign.total}</td></tr>
    <tr><td>Completados</td><td>${campaign.done}</td></tr>
    <tr><td>% completado</td><td>${getProgressPercent(campaign)}%</td></tr>
  </tbody>
</table>
</body></html>`;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadOriginalCampaignSimulated(campaign: Campaign, currency: string) {
  const safeName = campaign.name.replace(/[^\w\s-]/g, "").slice(0, 60) || "campana";
  const fileName = `${safeName}-${campaign.id}-original.xls`;

  const percent = getProgressPercent(campaign);
  // Simulamos el "resultado original" con una tabla más completa.
  const html = `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
  th { background: #f3f4f6; }
</style>
</head>
<body>
<h2>Campaña original: ${campaign.name}</h2>
<p><b>Subido por:</b> ${campaign.submittedBy}</p>
<p><b>Estado:</b> ${campaign.status}</p>
<p><b>Progreso:</b> ${campaign.done} de ${campaign.total} (${percent}% completado)</p>
<table>
  <thead>
    <tr>
      <th>Producto</th>
      <th>Precio</th>
      <th>Moneda</th>
      <th>Actualizado</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>SKU-001</td><td>999</td><td>${currency}</td><td>${new Date().toLocaleDateString("es-AR")}</td></tr>
    <tr><td>SKU-002</td><td>1234</td><td>${currency}</td><td>${new Date().toLocaleDateString("es-AR")}</td></tr>
    <tr><td>SKU-003</td><td>1500</td><td>${currency}</td><td>${new Date().toLocaleDateString("es-AR")}</td></tr>
  </tbody>
</table>
</body></html>`;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PriceMonitorPage({
  country = "Chile",
  flag = "Jumbo",
  onContextChange,
  pageTitle = "Monitor de precios",
  detailBackLabel = "monitor",
  enableDetailView = true,
}: {
  country?: Country;
  flag?: StoreFlag;
  onContextChange?: (next: ModuleContext) => void;
  pageTitle?: string;
  detailBackLabel?: string;
  enableDetailView?: boolean;
}) {
  const currency = country === "Chile" ? "CLP" : "ARS";

  const [campaigns, setCampaigns] = React.useState<Campaign[]>(() =>
    makeCampaigns(country, flag),
  );

  const intervalsRef = React.useRef<Record<string, number>>({});
  const runStartedAtRef = React.useRef<Record<string, number>>({});
  const pendingAutostartCycleRef = React.useRef(1);
  const lastProcessedAutostartCycleRef = React.useRef(0);
  const [runningById, setRunningById] = React.useState<Record<string, boolean>>({});
  const [detailCampaignId, setDetailCampaignId] = React.useState<string | null>(null);
  const [restartDialogOpen, setRestartDialogOpen] = React.useState(false);
  const [restartTargetId, setRestartTargetId] = React.useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newCampaignName, setNewCampaignName] = React.useState("");
  const [newCampaignFile, setNewCampaignFile] = React.useState<File | null>(null);
  const lastAutoFilledNameRef = React.useRef<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [draftCountry, setDraftCountry] = React.useState<Country>(country);
  const [draftFlag, setDraftFlag] = React.useState<StoreFlag>(flag);
  const nextCampaignsOverrideRef = React.useRef<Campaign[] | null>(null);
  const [simCollapseOpen, setSimCollapseOpen] = React.useState(false);
  const [simArticles, setSimArticles] = React.useState("");
  const [simError, setSimError] = React.useState(false);
  const [simErrorPercent, setSimErrorPercent] = React.useState("80");
  const [simBulkCount, setSimBulkCount] = React.useState("");
  const [campaignsPage, setCampaignsPage] = React.useState(1);
  const [selectedResultKinds, setSelectedResultKinds] = React.useState<ResultKind[]>([]);

  const changeModuleContext = React.useCallback(
    (nextCountry: Country, preferredFlag?: StoreFlag) => {
      const allowedFlags = AVAILABLE_FLAGS_BY_COUNTRY[nextCountry];
      const nextFlag =
        preferredFlag && allowedFlags.includes(preferredFlag) ? preferredFlag : allowedFlags[0];
      onContextChange?.({ country: nextCountry, flag: nextFlag });
    },
    [onContextChange],
  );

  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState("");
  const snackbarTimeoutRef = React.useRef<
    ReturnType<typeof window.setTimeout> | null
  >(null);

  const triggerSnackbar = React.useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);

    if (snackbarTimeoutRef.current) {
      window.clearTimeout(snackbarTimeoutRef.current);
    }

    snackbarTimeoutRef.current = window.setTimeout(() => {
      setSnackbarOpen(false);
    }, 5000);
  }, []);

  const totalCampaignPages = Math.max(
    1,
    Math.ceil(campaigns.length / CAMPAIGNS_PAGE_SIZE),
  );

  const paginatedCampaigns = React.useMemo(() => {
    const start = (campaignsPage - 1) * CAMPAIGNS_PAGE_SIZE;
    return campaigns.slice(start, start + CAMPAIGNS_PAGE_SIZE);
  }, [campaigns, campaignsPage]);

  React.useEffect(() => {
    setCampaignsPage((p) => Math.min(Math.max(1, p), totalCampaignPages));
  }, [totalCampaignPages]);

  const detailCampaign = React.useMemo(
    () => campaigns.find((c) => c.id === detailCampaignId) ?? null,
    [campaigns, detailCampaignId],
  );
  const restartTargetCampaign = React.useMemo(
    () => campaigns.find((c) => c.id === restartTargetId) ?? null,
    [campaigns, restartTargetId],
  );

  const stopSimulation = React.useCallback((id: string) => {
    const handle = intervalsRef.current[id];
    if (handle) {
      window.clearInterval(handle);
      delete intervalsRef.current[id];
    }
    delete runStartedAtRef.current[id];
    setRunningById((prev) => ({ ...prev, [id]: false }));
  }, []);

  const startSimulation = React.useCallback(
    (id: string, startedBy = "Operador") => {
      const current = campaigns.find((c) => c.id === id);
      if (!current) return;

      // Si está corriendo, no re-duplicamos.
      if (intervalsRef.current[id]) return;

      stopSimulation(id);
      runStartedAtRef.current[id] = Date.now();

      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const resetDone = c.status === "idle" ? 0 : c.status === "success" ? 0 : c.done;
          return {
            ...c,
            status: "pending",
            done: resetDone,
            startedBy,
          };
        }),
      );

      const intervalHandle = window.setInterval(() => {
        let shouldStop = false;
        setCampaigns((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            if (c.status === "stuck") {
              shouldStop = true;
              return c;
            }
            if (c.total <= c.done) return c;

            // Escalamos el progreso para que tarde "razonable" incluso con totals grandes.
            const baseStep = Math.max(1, Math.round(c.total / 22));
            const jitter = 0.6 + Math.random() * 0.8; // 0.6..1.4
            const increment = Math.max(1, Math.round(baseStep * jitter));
            const nextDone = Math.min(c.total, c.done + increment);
            let nextStatus: CampaignStatus = nextDone >= c.total ? "success" : "pending";
            let adjustedDone = nextDone;

            const runForMs = Date.now() - (runStartedAtRef.current[id] ?? Date.now());
            const stuckPct = c.stuckTargetPercent ?? 80;
            const shouldStuckAtPct =
              c.canStuck &&
              !c.hasStuck &&
              runForMs >= 3000 &&
              Math.round((nextDone / c.total) * 100) >= stuckPct;

            if (shouldStuckAtPct) {
              adjustedDone = Math.max(
                1,
                Math.min(c.total - 1, Math.round((c.total * stuckPct) / 100)),
              );
              nextStatus = "stuck";
              shouldStop = true;
            }

            if (nextStatus === "success") shouldStop = true;

            return {
              ...c,
              done: adjustedDone,
              status: nextStatus,
              hasStuck: c.hasStuck || nextStatus === "stuck",
              lastRunMs:
                nextStatus === "success" || nextStatus === "stuck"
                  ? runForMs
                  : c.lastRunMs,
            };
          }),
        );

        if (shouldStop) {
          stopSimulation(id);
        }
      }, 520);

      intervalsRef.current[id] = intervalHandle;
      setRunningById((prev) => ({ ...prev, [id]: true }));
    },
    [campaigns, stopSimulation],
  );

  const restartSimulation = React.useCallback(
    (id: string) => {
      stopSimulation(id);
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: "idle", done: 0, hasStuck: false, lastRunMs: undefined }
            : c,
        ),
      );
    },
    [stopSimulation],
  );

  React.useEffect(() => {
    // Al cambiar pais/bandera, limpiamos timers activos y regeneramos campañas.
    Object.keys(intervalsRef.current).forEach((id) => stopSimulation(id));
    setRunningById({});
    setDetailCampaignId(null);
    pendingAutostartCycleRef.current += 1;
    if (nextCampaignsOverrideRef.current) {
      setCampaigns(nextCampaignsOverrideRef.current);
      nextCampaignsOverrideRef.current = null;
    } else {
      setCampaigns(makeCampaigns(country, flag));
    }
  }, [country, flag, stopSimulation]);

  // Arrancamos automáticamente `pending` solo una vez por ciclo de carga.
  React.useEffect(() => {
    const cycle = pendingAutostartCycleRef.current;
    if (lastProcessedAutostartCycleRef.current === cycle) return;

    campaigns
      .filter((c) => c.status === "pending" && c.done < c.total)
      .forEach((c) => {
        if (!intervalsRef.current[c.id]) startSimulation(c.id, "Sistema");
      });

    lastProcessedAutostartCycleRef.current = cycle;
  }, [campaigns, startSimulation]);

  React.useEffect(() => {
    return () => {
      Object.keys(intervalsRef.current).forEach((id) => stopSimulation(id));
    };
  }, [stopSimulation]);

  React.useEffect(() => {
    return () => {
      if (snackbarTimeoutRef.current) {
        window.clearTimeout(snackbarTimeoutRef.current);
      }
    };
  }, []);

  function openDetails(id: string) {
    setDetailCampaignId(id);
  }

  function openRestartDialog(id: string) {
    setRestartTargetId(id);
    setRestartDialogOpen(true);
  }

  function handleRetryPending() {
    if (!restartTargetCampaign) return;
    startSimulation(restartTargetCampaign.id);
    setRestartDialogOpen(false);
  }

  function handleRestartFromZero() {
    if (!restartTargetCampaign) return;
    restartSimulation(restartTargetCampaign.id);
    startSimulation(restartTargetCampaign.id);
    setRestartDialogOpen(false);
  }

  function downloadTemplate() {
    const csv = "sku,precio,moneda\nSKU-001,999,CLP\nSKU-002,1234,CLP\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-campana.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function resetCreateCampaignForm() {
    setNewCampaignName("");
    setNewCampaignFile(null);
    lastAutoFilledNameRef.current = null;
    setDraftCountry(country);
    setDraftFlag(flag);
    setSimCollapseOpen(false);
    setSimArticles("");
    setSimError(false);
    setSimErrorPercent("80");
    setSimBulkCount("");
  }

  function handleFileSelected(file: File | null) {
    setNewCampaignFile(file);
    if (!file) return;

    const autoName = getCampaignNameFromFile(file.name);
    if (!autoName) return;

    setNewCampaignName((prev) => {
      const trimmedPrev = prev.trim();
      const canAutofill =
        trimmedPrev.length === 0 || trimmedPrev === lastAutoFilledNameRef.current;
      if (!canAutofill) return prev;
      lastAutoFilledNameRef.current = autoName;
      return autoName;
    });
  }

  const bulkSimCountParsed = Number.parseInt(
    simBulkCount.replace(/\D/g, "") || "0",
    10,
  );
  const bulkSimCountValid =
    Number.isFinite(bulkSimCountParsed) &&
    bulkSimCountParsed >= 1 &&
    bulkSimCountParsed <= 100;

  function setDraftCountryWithCompatibleFlag(nextCountry: Country) {
    setDraftCountry(nextCountry);
    setDraftFlag((prev) => {
      const allowed = AVAILABLE_FLAGS_BY_COUNTRY[nextCountry];
      return allowed.includes(prev) ? prev : allowed[0];
    });
  }

  function handleBulkRandomCampaigns() {
    if (!bulkSimCountValid) return;
    const count = bulkSimCountParsed;

    const rawArticles = simArticles.replace(/\./g, "").trim();
    const parsedArticles = rawArticles === "" ? NaN : Number.parseInt(rawArticles, 10);
    const fixedTotal =
      Number.isFinite(parsedArticles) && parsedArticles > 0
        ? Math.min(999_999, Math.max(1, parsedArticles))
        : undefined;

    const p = Number.parseInt(simErrorPercent, 10);
    const errorPercent = Number.isFinite(p) ? Math.min(99, Math.max(1, p)) : 80;

    const baseTime = Date.now();
    const created: Campaign[] = [];
    for (let i = 0; i < count; i++) {
      created.push(
        createRandomSimulatedCampaign(draftCountry, draftFlag, {
          fixedTotal,
          simError,
          errorPercent,
          uniqueId: `c-${baseTime}-${i}-${Math.random().toString(36).slice(2, 10)}`,
        }),
      );
    }

    const shouldChangeContext = draftCountry !== country || draftFlag !== flag;
    if (shouldChangeContext) {
      nextCampaignsOverrideRef.current = [...created, ...makeCampaigns(draftCountry, draftFlag)];
      onContextChange?.({ country: draftCountry, flag: draftFlag });
    } else {
      setCampaigns((prev) => [...created, ...prev]);
    }
    setCampaignsPage(1);
    setCreateDialogOpen(false);
    resetCreateCampaignForm();
    triggerSnackbar("La campaña se cargó correctamente.");
  }

  function handleCreateCampaign() {
    const trimmed = newCampaignName.trim();
    if (!trimmed) return;

    const rawArticles = simArticles.replace(/\./g, "").trim();
    const parsedArticles = rawArticles === "" ? NaN : Number.parseInt(rawArticles, 10);
    const randomTotal = 500 + Math.round(Math.random() * 3500);
    const total =
      Number.isFinite(parsedArticles) && parsedArticles > 0
        ? Math.min(999_999, Math.max(1, parsedArticles))
        : randomTotal;

    let stuckPct: number | undefined;
    if (simError) {
      const p = Number.parseInt(simErrorPercent, 10);
      stuckPct = Number.isFinite(p) ? Math.min(99, Math.max(1, p)) : 80;
    }

    const created: Campaign = {
      id: `c-${Date.now()}`,
      name: trimmed,
      status: "idle",
      submittedBy: "Usuario",
      total,
      done: 0,
      canStuck: simError,
      hasStuck: false,
      stuckTargetPercent: stuckPct,
    };

    const shouldChangeContext = draftCountry !== country || draftFlag !== flag;
    if (shouldChangeContext) {
      nextCampaignsOverrideRef.current = [created, ...makeCampaigns(draftCountry, draftFlag)];
      onContextChange?.({ country: draftCountry, flag: draftFlag });
    } else {
      setCampaigns((prev) => [created, ...prev]);
    }
    setCreateDialogOpen(false);
    resetCreateCampaignForm();
    triggerSnackbar("La campaña se cargó correctamente.");
  }

  const detailSummary = detailCampaign ? buildResultSummary(detailCampaign) : null;
  const selectedResultRows =
    detailSummary == null
      ? []
      : selectedResultKinds
          .map((kind) => detailSummary.rows.find((row) => row.kind === kind))
          .filter((row): row is { kind: ResultKind; count: number; tone: string } => Boolean(row));

  React.useEffect(() => {
    setSelectedResultKinds([]);
  }, [detailCampaignId]);

  if (detailCampaign && detailSummary) {
    const runtimeFromActiveRun =
      detailCampaign.status === "pending" && runStartedAtRef.current[detailCampaign.id]
        ? Date.now() - runStartedAtRef.current[detailCampaign.id]
        : undefined;
    const processingMs =
      runtimeFromActiveRun ??
      detailCampaign.lastRunMs ??
      getSimulatedProcessingMs(detailCampaign);

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setDetailCampaignId(null)}>
            <ArrowLeft className="h-4 w-4" />
            Volver a {detailBackLabel}
          </Button>
          <Button variant="secondary" onClick={() => downloadExcelSimulated(detailCampaign)}>
            Descargar Excel
          </Button>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <h2 className="text-xl font-semibold">{detailCampaign.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            País: {country} · Bandera: {flag}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">N° promociones</div>
              <div className="mt-1 text-lg font-semibold">{formatIntEs(detailSummary.promotions)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">N° SKU</div>
              <div className="mt-1 text-lg font-semibold">{formatIntEs(detailSummary.sku)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Subido por</div>
              <div className="mt-1 font-semibold">{detailCampaign.submittedBy}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Iniciado por</div>
              <div className="mt-1 font-semibold">{detailCampaign.startedBy ?? "Sin iniciar"}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Tiempo de procesamiento</div>
              <div className="mt-1 font-semibold">{formatDurationMs(processingMs)}</div>
            </div>
          </div>

        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Resultados</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {detailSummary.rows.map((row) => {
              const isSelected = selectedResultKinds.includes(row.kind);
              const selectedAccent = getSelectedChipAccent(row.kind);
              return (
              <button
                key={row.kind}
                type="button"
                onClick={() =>
                  setSelectedResultKinds((prev) => toggleResultKind(prev, row.kind))
                }
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium leading-none transition-colors ${
                  isSelected
                    ? `ring-2 ${selectedAccent} ${row.tone}`
                    : `border-transparent opacity-80 hover:opacity-100 ${row.tone}`
                }`}
                title={`Seleccionar resultados "${row.kind}"`}
              >
                {formatIntEs(row.count)} - {row.kind}
              </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedResultKinds(ALL_RESULT_KINDS)}
            >
              Seleccionar todos
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedResultKinds([])}
            >
              Limpiar
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={selectedResultRows.length === 0}
              onClick={() =>
                downloadSelectedResultSubsetsSimulated(
                  detailCampaign,
                  selectedResultRows.map((row) => ({ kind: row.kind, count: row.count })),
                  currency,
                )
              }
            >
              <Download className="h-3.5 w-3.5" />
              Descargar seleccionados
            </Button>
          </div>
        </div>

        <Dialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reiniciar campaña</DialogTitle>
              <DialogDescription>Elige cómo quieres continuar con esta campaña.</DialogDescription>
            </DialogHeader>
            {restartTargetCampaign ? (
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleRetryPending}
                  className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/60"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    Reintentar pendientes
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleRestartFromZero}
                  className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/60"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    Iniciar nuevamente desde cero
                  </div>
                </button>
              </div>
            ) : (
              <div className="mt-4 text-sm text-muted-foreground">
                No hay campaña seleccionada para reiniciar.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{pageTitle}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 px-3" aria-label="Seleccionar país del módulo">
                  <span className="mr-1 text-xs text-muted-foreground">País</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <img
                      src={getCountryIcon(country)}
                      alt={`Bandera de ${country}`}
                      className="h-3.5 w-5 rounded-none object-cover"
                    />
                    {country}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(["Chile", "Argentina"] as const).map((value) => (
                  <DropdownMenuItem
                    key={value}
                    onSelect={(e) => {
                      e.preventDefault();
                      changeModuleContext(value, flag);
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <img
                        src={getCountryIcon(value)}
                        alt={`Bandera de ${value}`}
                        className="h-3.5 w-5 rounded-none object-cover"
                      />
                      {value}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-3"
                  aria-label="Seleccionar bandera del módulo"
                >
                  <span className="mr-1 text-xs text-muted-foreground">Bandera</span>
                  <span className="text-sm font-medium">{flag}</span>
                  <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {AVAILABLE_FLAGS_BY_COUNTRY[country].map((value) => (
                  <DropdownMenuItem
                    key={value}
                    onSelect={(e) => {
                      e.preventDefault();
                      changeModuleContext(country, value);
                    }}
                  >
                    {value}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Button
          onClick={() => {
            resetCreateCampaignForm();
            setCreateDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Cargar campaña
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-[#F1F5F9]">
              <TableHead>Nombre de campaña</TableHead>
              <TableHead>Subido por</TableHead>
              <TableHead>Artículos</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedCampaigns.map((c) => {
              const percent = getProgressPercent(c);
              const progressText = `${formatIntEs(c.done)} de ${formatIntEs(c.total)}`;
              const isStuck = c.status === "stuck";
              // Solo "en marcha" si sigue pending: al pasar a success/stuck el intervalo se corta
              // pero runningById puede actualizarse un tick después → evita quedar en Pause pegado.
              const isRunning = Boolean(runningById[c.id]) && c.status === "pending";
              const isPaused = c.status === "pending" && !isRunning;
              const restartDisabled = !(isStuck || isPaused);

              return (
                <TableRow key={c.id}>
                  <TableCell className="min-w-[240px]">
                    <div className="font-medium">{c.name}</div>
                  </TableCell>

                  <TableCell className="text-muted-foreground">{c.submittedBy}</TableCell>

                  <TableCell>{formatIntEs(c.total)}</TableCell>

                  <TableCell className="min-w-[200px]">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                          <span>{percent}% completado</span>
                          {isStuck && (
                            <span className="group relative inline-flex">
                              <span
                                className="inline-flex cursor-help text-[#DC2626]"
                                aria-label="Información de error de campaña"
                              >
                                <CircleHelp className="h-3.5 w-3.5" />
                              </span>
                              <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 whitespace-normal break-words rounded-lg border border-border/60 bg-popover px-3 py-2 text-[11px] leading-snug text-foreground shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                                Ocurrió un error inesperado, por favor reinicia la campaña.
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium">{progressText}</div>
                      </div>
                      <Progress
                        value={percent}
                        tone={isStuck ? "stuck" : percent >= 100 ? "complete" : "progress"}
                      />
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {enableDetailView && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Ver detalle"
                          onClick={() => openDetails(c.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={isRunning ? "Pausar scraping" : "Iniciar scraping"}
                        disabled={isStuck}
                        onClick={() =>
                          isRunning ? stopSimulation(c.id) : startSimulation(c.id)
                        }
                      >
                        {isRunning ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Descargar Excel simulado"
                        onClick={() => downloadExcelSimulated(c)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Más acciones"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              downloadOriginalCampaignSimulated(c, currency);
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Descargar campaña original
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            disabled={restartDisabled}
                            onSelect={(e) => {
                              e.preventDefault();
                              openRestartDialog(c.id);
                            }}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reiniciar
                          </DropdownMenuItem>

                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t border-border/60 bg-slate-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {campaigns.length === 0 ? (
              "Sin campañas"
            ) : (
              <>
                Mostrando{" "}
                <span className="font-medium text-foreground">
                  {(campaignsPage - 1) * CAMPAIGNS_PAGE_SIZE + 1}–
                  {Math.min(
                    campaignsPage * CAMPAIGNS_PAGE_SIZE,
                    campaigns.length,
                  )}
                </span>{" "}
                de{" "}
                <span className="font-medium text-foreground">
                  {formatIntEs(campaigns.length)}
                </span>{" "}
                campañas
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={campaignsPage <= 1 || campaigns.length === 0}
              onClick={() => setCampaignsPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="min-w-[6.5rem] text-center text-sm tabular-nums text-muted-foreground">
              Página {campaignsPage} / {totalCampaignPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={campaignsPage >= totalCampaignPages || campaigns.length === 0}
              onClick={() =>
                setCampaignsPage((p) => Math.min(totalCampaignPages, p + 1))
              }
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reiniciar campaña</DialogTitle>
            <DialogDescription>
              Elige cómo quieres continuar con esta campaña.
            </DialogDescription>
          </DialogHeader>

          {restartTargetCampaign ? (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handleRetryPending}
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/60"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  Reintentar pendientes
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatIntEs(Math.max(0, restartTargetCampaign.total - restartTargetCampaign.done))}{" "}
                  pendientes por procesar. Continúa desde el progreso actual.
                </div>
              </button>

              <button
                type="button"
                onClick={handleRestartFromZero}
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/60"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  Iniciar nuevamente desde cero
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Reinicia todo el proceso y vuelve a 0% de progreso.
                </div>
              </button>
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">
              No hay campaña seleccionada para reiniciar.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetCreateCampaignForm();
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto pr-8">
          <DialogHeader>
            <DialogTitle>Crear campaña</DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-5 pb-1">
            <div className="space-y-2">
              <label htmlFor="campaign-name" className="text-sm font-semibold">
                Nombre de campaña
              </label>
              <input
                id="campaign-name"
                value={newCampaignName}
                onChange={(e) => {
                  setNewCampaignName(e.target.value);
                  // Si el usuario escribe manualmente, dejamos de "pisar" el nombre.
                  lastAutoFilledNameRef.current = null;
                }}
                placeholder="Navidad 2025"
                className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Seleccione país y bandera a cargar</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 justify-between px-3"
                      aria-label="Cambiar país para esta carga"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        País:
                        <img
                          src={getCountryIcon(draftCountry)}
                          alt={`Bandera de ${draftCountry}`}
                          className="h-3.5 w-5 rounded-none object-cover"
                        />
                        {draftCountry}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {(["Chile", "Argentina"] as const).map((value) => (
                      <DropdownMenuItem
                        key={value}
                        onSelect={(e) => {
                          e.preventDefault();
                          setDraftCountryWithCompatibleFlag(value);
                        }}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <img
                            src={getCountryIcon(value)}
                            alt={`Bandera de ${value}`}
                            className="h-3.5 w-5 rounded-none object-cover"
                          />
                          {value}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 justify-between px-3"
                      aria-label="Cambiar bandera para esta carga"
                    >
                      <span>Bandera: {draftFlag}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {AVAILABLE_FLAGS_BY_COUNTRY[draftCountry].map((value) => (
                      <DropdownMenuItem
                        key={value}
                        onSelect={(e) => {
                          e.preventDefault();
                          setDraftFlag(value);
                        }}
                      >
                        {value}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Carga de archivo</div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border border-input bg-background px-4 py-8 text-center transition-colors hover:bg-accent/40"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <CloudUpload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-sm">
                  <span className="font-medium text-[#2563EB]">Haz click para cargar</span>{" "}
                  o arrastre y suelte
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  XLSX o XLSM (máx. 15mb)
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xlsm"
                className="hidden"
                onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              />

              {newCampaignFile && (
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-input bg-background px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{newCampaignFile.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.max(1, Math.round(newCampaignFile.size / 1024))} KB
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar archivo"
                    onClick={() => handleFileSelected(null)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-dashed border-input">
              <button
                type="button"
                onClick={() => setSimCollapseOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted/50"
              >
                <span>Modo simulación</span>
                {simCollapseOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
              {simCollapseOpen && (
                <div className="space-y-4 border-t border-input px-4 pb-4 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Solo para pruebas de interfaz en este prototipo; no aplica al producto en
                    desarrollo.
                  </p>
                  <div className="space-y-3 rounded-lg border border-dashed border-input/80 bg-muted/30 p-3">
                    <div className="text-sm font-medium">Carga individual</div>
                    <div className="space-y-2">
                      <label htmlFor="sim-articles" className="text-sm font-medium">
                        Cantidad de artículos
                      </label>
                      <input
                        id="sim-articles"
                        type="text"
                        inputMode="numeric"
                        value={simArticles}
                        onChange={(e) => setSimArticles(e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="Vacío = aleatorio"
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <p className="text-xs text-muted-foreground">
                        Si lo dejas vacío, se asigna un total aleatorio como en las demás campañas.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        id="sim-error"
                        type="checkbox"
                        checked={simError}
                        onChange={(e) => setSimError(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-input"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <label htmlFor="sim-error" className="text-sm font-medium leading-tight">
                          Simular error al ejecutar
                        </label>
                        <p className="text-xs text-muted-foreground">
                          La campaña se detendrá en el porcentaje indicado y mostrará estado Error.
                        </p>
                        <div className="space-y-1">
                          <label htmlFor="sim-error-pct" className="text-xs text-muted-foreground">
                            Porcentaje en que ocurre el error
                          </label>
                          <input
                            id="sim-error-pct"
                            type="number"
                            min={1}
                            max={99}
                            disabled={!simError}
                            value={simErrorPercent}
                            onChange={(e) => setSimErrorPercent(e.target.value)}
                            className="h-9 w-24 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          />
                          <span className="ml-2 text-xs text-muted-foreground">% (1–99)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-dashed border-input/80 bg-muted/30 p-3">
                    <div className="text-sm font-medium">Carga masiva aleatoria</div>
                    <p className="text-xs text-muted-foreground">
                      Genera varias campañas de una vez: nombres, artículos, subido por y (si
                      activaste error simulado) qué campañas fallan son al azar. Si indicás
                      cantidad de artículos arriba, todas usarán ese total; si no, cada una
                      tendrá un total aleatorio.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1 space-y-1">
                        <label htmlFor="sim-bulk-count" className="text-xs font-medium">
                          Cantidad de campañas (máx. 100)
                        </label>
                        <input
                          id="sim-bulk-count"
                          type="text"
                          inputMode="numeric"
                          value={simBulkCount}
                          onChange={(e) =>
                            setSimBulkCount(e.target.value.replace(/[^\d]/g, ""))
                          }
                          placeholder="Ej. 15"
                          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0 gap-2"
                        disabled={!bulkSimCountValid}
                        onClick={handleBulkRandomCampaigns}
                      >
                        <Sparkles className="h-4 w-4" />
                        Generar aleatorias
                      </Button>
                    </div>
                    {simBulkCount.length > 0 && !bulkSimCountValid && (
                      <p className="text-xs text-amber-700 dark:text-amber-500">
                        Ingresá un número entre 1 y 100.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 text-[#2563EB] hover:underline"
            >
              Descargar plantilla
              <Download className="h-4 w-4" />
            </button>

            <div className="flex justify-end gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetCreateCampaignForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCampaign}
                disabled={newCampaignName.trim().length === 0}
              >
                Crear campaña
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {snackbarOpen && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-5 z-50 w-[min(90vw,520px)]"
        >
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-4 shadow-[0_10px_25px_-10px_rgba(0,0,0,0.35)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16A34A]/15 text-[#16A34A]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground/90">
                {snackbarMessage}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSnackbarOpen(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

