import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
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
  Trash2,
} from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
};

type Country = "Chile" | "Argentina";
type StoreFlag = "Jumbo" | "Santa Isabel" | "Disco" | "Vea";

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

function makeCampaigns(country: Country, flag: StoreFlag): Campaign[] {
  const seed = hashString(`${country}|${flag}`);
  const rand = mulberry32(seed);

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

  const totalsPool = [
    3,
    25,
    50,
    100,
    180,
    250,
    300,
    400,
    600,
    750,
    1000,
    1500,
    2000,
    2500,
    3000,
    4000,
    4500,
  ];

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
    let total = totalsPool[Math.floor(rand() * totalsPool.length)];
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
}: {
  country?: Country;
  flag?: StoreFlag;
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
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [restartDialogOpen, setRestartDialogOpen] = React.useState(false);
  const [restartTargetId, setRestartTargetId] = React.useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newCampaignName, setNewCampaignName] = React.useState("");
  const [newCampaignFile, setNewCampaignFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [simCollapseOpen, setSimCollapseOpen] = React.useState(false);
  const [simArticles, setSimArticles] = React.useState("");
  const [simError, setSimError] = React.useState(false);
  const [simErrorPercent, setSimErrorPercent] = React.useState("80");

  const selectedCampaign = React.useMemo(
    () => campaigns.find((c) => c.id === selectedId) ?? null,
    [campaigns, selectedId],
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
    (id: string) => {
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
          c.id === id ? { ...c, status: "idle", done: 0, hasStuck: false } : c,
        ),
      );
    },
    [stopSimulation],
  );

  React.useEffect(() => {
    // Al cambiar pais/bandera, limpiamos timers activos y regeneramos campañas.
    Object.keys(intervalsRef.current).forEach((id) => stopSimulation(id));
    setRunningById({});
    setDetailsOpen(false);
    setSelectedId(null);
    pendingAutostartCycleRef.current += 1;
    setCampaigns(makeCampaigns(country, flag));
  }, [country, flag, stopSimulation]);

  // Arrancamos automáticamente `pending` solo una vez por ciclo de carga.
  React.useEffect(() => {
    const cycle = pendingAutostartCycleRef.current;
    if (lastProcessedAutostartCycleRef.current === cycle) return;

    campaigns
      .filter((c) => c.status === "pending" && c.done < c.total)
      .forEach((c) => {
        if (!intervalsRef.current[c.id]) startSimulation(c.id);
      });

    lastProcessedAutostartCycleRef.current = cycle;
  }, [campaigns, startSimulation]);

  React.useEffect(() => {
    return () => {
      Object.keys(intervalsRef.current).forEach((id) => stopSimulation(id));
    };
  }, [stopSimulation]);

  function openDetails(id: string) {
    setSelectedId(id);
    setDetailsOpen(true);
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
    setSimCollapseOpen(false);
    setSimArticles("");
    setSimError(false);
    setSimErrorPercent("80");
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

    setCampaigns((prev) => [created, ...prev]);
    setCreateDialogOpen(false);
    resetCreateCampaignForm();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Monitor de precios</h1>
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre de campaña</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Subido por</TableHead>
            <TableHead>Artículos</TableHead>
            <TableHead>Progreso</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {campaigns.map((c) => {
            const percent = getProgressPercent(c);
            const progressText = `${formatIntEs(c.done)} de ${formatIntEs(c.total)}`;
            const isStuck = c.status === "stuck";
            const isRunning = Boolean(runningById[c.id]) && c.status !== "success";
            const restartDisabled = c.done === 0 || c.status === "success";
            const downloadDisabled = c.status === "idle" && c.done === 0;

            return (
              <TableRow key={c.id}>
                <TableCell className="min-w-[240px]">
                  <div className="font-medium">{c.name}</div>
                </TableCell>

                <TableCell>
                  {c.status === "idle" && <Badge variant="outline">Inactivo</Badge>}
                  {c.status === "pending" && <Badge variant="secondary">En progreso</Badge>}
                  {c.status === "success" && <Badge variant="success">Completado</Badge>}
                  {c.status === "stuck" && (
                    <Badge className="border-transparent bg-[#DC2626] text-white">
                      Error
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="text-muted-foreground">{c.submittedBy}</TableCell>

                <TableCell>{formatIntEs(c.total)}</TableCell>

                <TableCell className="min-w-[200px]">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="whitespace-nowrap text-xs text-muted-foreground">
                        {percent}% completado
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
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Ver detalle"
                      onClick={() => openDetails(c.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

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
                      disabled={downloadDisabled}
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

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del scraping</DialogTitle>
            <DialogDescription>
              {selectedCampaign
                ? selectedCampaign.name
                : "Seleccioná un registro desde la tabla"}
            </DialogDescription>
          </DialogHeader>

          {selectedCampaign ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">Estado</div>
                  <div className="mt-1">
                    {selectedCampaign.status === "idle" && (
                      <Badge variant="outline">Inactivo</Badge>
                    )}
                    {selectedCampaign.status === "pending" && (
                      <Badge variant="secondary">En progreso</Badge>
                    )}
                    {selectedCampaign.status === "success" && (
                      <Badge variant="success">Completado</Badge>
                    )}
                    {selectedCampaign.status === "stuck" && (
                      <Badge className="border-transparent bg-[#DC2626] text-white">
                        Error
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Subido por</div>
                  <div className="mt-1 font-medium">{selectedCampaign.submittedBy}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Artículos</div>
                  <div className="mt-1 font-medium">
                    {formatIntEs(selectedCampaign.total)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Progreso</div>
                  <div className="mt-1 font-medium">
                    {formatIntEs(selectedCampaign.done)} de {formatIntEs(selectedCampaign.total)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Barra de progreso</div>
                <div className="mt-2">
                  <Progress
                    value={getProgressPercent(selectedCampaign)}
                    tone={
                      selectedCampaign.status === "stuck"
                        ? "stuck"
                        : getProgressPercent(selectedCampaign) >= 100
                          ? "complete"
                          : "progress"
                    }
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {getProgressPercent(selectedCampaign)}% completado
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="secondary"
                  disabled={selectedCampaign.status === "idle" && selectedCampaign.done === 0}
                  onClick={() => downloadExcelSimulated(selectedCampaign)}
                >
                  Descargar Excel
                </Button>

                <Button
                  variant="outline"
                  disabled={selectedCampaign.done === 0 || selectedCampaign.status === "success"}
                  onClick={() => openRestartDialog(selectedCampaign.id)}
                >
                  Reiniciar
                </Button>

                <Button
                  variant="default"
                  disabled={selectedCampaign.status === "stuck"}
                  onClick={() =>
                    runningById[selectedCampaign.id]
                      ? stopSimulation(selectedCampaign.id)
                      : startSimulation(selectedCampaign.id)
                  }
                >
                  {runningById[selectedCampaign.id] ? "Pausar" : "Iniciar / reintentar"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">
              No hay campaña seleccionada.
            </div>
          )}
        </DialogContent>
      </Dialog>

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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crear campaña</DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-5">
            <div className="space-y-2">
              <label htmlFor="campaign-name" className="text-sm font-semibold">
                Nombre de campaña
              </label>
              <input
                id="campaign-name"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="Navidad 2025"
                className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
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
                onChange={(e) => setNewCampaignFile(e.target.files?.[0] ?? null)}
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
                    onClick={() => setNewCampaignFile(null)}
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
    </div>
  );
}

