import { Download } from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

type AppRole = "Operativo" | "Seguridad Informática" | "Supervisor";

type RoleRecord = {
  id: string;
  name: AppRole;
  actions: string[];
};

const ROLES: RoleRecord[] = [
  {
    id: "r-operativo",
    name: "Operativo",
    actions: [
      "Cargar campaña",
      "Iniciar monitoreo",
      "Pausar monitoreo",
      "Descargar resultados",
      "Descargar campaña original",
      "Reiniciar campaña",
      "Descargar plantilla",
    ],
  },
  {
    id: "r-supervisor",
    name: "Supervisor",
    actions: [
      "Cargar campaña",
      "Iniciar monitoreo",
      "Pausar monitoreo",
      "Descargar resultados",
      "Descargar campaña original",
      "Reiniciar campaña",
      "Reintentar pendientes",
      "Descargar plantilla",
    ],
  },
  {
    id: "r-seguridad",
    name: "Seguridad Informática",
    actions: [
      "Alta de usuarios",
      "Edición de usuarios",
      "Activación de usuarios",
      "Desactivación de usuarios",
      "Descargar registros de usuarios",
      "Descargar log de eventos",
      "Visualizar roles",
    ],
  },
];

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadAllRoles(roles: RoleRecord[]) {
  const headers = ["Rol", "Acciones"];
  const rows = roles.map((role) => [role.name, role.actions.join("; ")]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, "-");

  anchor.href = url;
  anchor.download = `mantenedor-roles-${stamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function RoleMaintainerPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Mantenedor de roles</h1>
        <Button
          variant="secondary"
          className="shrink-0 gap-2"
          disabled={ROLES.length === 0}
          onClick={() => downloadAllRoles(ROLES)}
        >
          <Download className="h-4 w-4" />
          Descargar registros
        </Button>
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-xl border border-border/70 bg-card shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-[#F1F5F9]">
              <TableHead className="min-w-[180px]">Rol</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLES.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="align-top font-medium">{role.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {role.actions.map((action) => (
                      <Badge key={action} variant="outline">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
