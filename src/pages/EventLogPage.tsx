import * as React from "react";
import { Download } from "lucide-react";

import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

type SecurityAction =
  | "Inicio de sesión"
  | "Cierre de sesión"
  | "Alta de usuarios"
  | "Edición de usuarios"
  | "Activación de usuarios"
  | "Desactivación de usuarios"
  | "Cambio de rol de usuarios";

type EventLogEntry = {
  id: string;
  adUser: string;
  userName: string;
  action: SecurityAction;
  occurredAt: string;
  affectedUser: string;
  affectedAdUser: string;
};

const INITIAL_EVENTS: EventLogEntry[] = [
  {
    id: "e-1",
    adUser: "mlopez",
    userName: "María López",
    action: "Inicio de sesión",
    occurredAt: "2026-06-23T08:02:00.000Z",
    affectedUser: "—",
    affectedAdUser: "—",
  },
  {
    id: "e-2",
    adUser: "aramirez",
    userName: "Ana Ramírez",
    action: "Desactivación de usuarios",
    occurredAt: "2026-06-22T16:45:00.000Z",
    affectedUser: "Juan Pérez",
    affectedAdUser: "jperez",
  },
  {
    id: "e-3",
    adUser: "aramirez",
    userName: "Ana Ramírez",
    action: "Cierre de sesión",
    occurredAt: "2026-06-22T16:30:00.000Z",
    affectedUser: "—",
    affectedAdUser: "—",
  },
  {
    id: "e-4",
    adUser: "aramirez",
    userName: "Ana Ramírez",
    action: "Inicio de sesión",
    occurredAt: "2026-06-22T08:15:00.000Z",
    affectedUser: "—",
    affectedAdUser: "—",
  },
  {
    id: "e-5",
    adUser: "aramirez",
    userName: "Ana Ramírez",
    action: "Edición de usuarios",
    occurredAt: "2026-06-20T18:30:00.000Z",
    affectedUser: "María López",
    affectedAdUser: "mlopez",
  },
  {
    id: "e-6",
    adUser: "jperez",
    userName: "Juan Pérez",
    action: "Cierre de sesión",
    occurredAt: "2026-06-19T17:45:00.000Z",
    affectedUser: "—",
    affectedAdUser: "—",
  },
  {
    id: "e-7",
    adUser: "aramirez",
    userName: "Ana Ramírez",
    action: "Alta de usuarios",
    occurredAt: "2026-06-18T10:00:00.000Z",
    affectedUser: "María López",
    affectedAdUser: "mlopez",
  },
  {
    id: "e-8",
    adUser: "mlopez",
    userName: "María López",
    action: "Inicio de sesión",
    occurredAt: "2026-06-18T09:58:00.000Z",
    affectedUser: "—",
    affectedAdUser: "—",
  },
  {
    id: "e-9",
    adUser: "aramirez",
    userName: "Ana Ramírez",
    action: "Cambio de rol de usuarios",
    occurredAt: "2026-06-15T12:40:00.000Z",
    affectedUser: "Juan Pérez",
    affectedAdUser: "jperez",
  },
  {
    id: "e-10",
    adUser: "aramirez",
    userName: "Ana Ramírez",
    action: "Activación de usuarios",
    occurredAt: "2026-06-15T12:35:00.000Z",
    affectedUser: "María López",
    affectedAdUser: "mlopez",
  },
];

function formatEventDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAffectedUser(event: EventLogEntry) {
  if (event.affectedUser === "—") return "—";
  return `${event.affectedUser} (${event.affectedAdUser})`;
}

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadAllEvents(events: EventLogEntry[]) {
  const headers = ["Usuario AD", "Usuario", "Acción", "Fecha y hora", "Usuario afectado"];
  const rows = events.map((event) => [
    event.adUser,
    event.userName,
    event.action,
    formatEventDateTime(event.occurredAt),
    formatAffectedUser(event),
  ]);

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
  anchor.download = `log-de-eventos-${stamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function EventLogPage() {
  const [events] = React.useState<EventLogEntry[]>(INITIAL_EVENTS);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Log de eventos</h1>
        <Button
          variant="secondary"
          className="shrink-0 gap-2"
          disabled={events.length === 0}
          onClick={() => downloadAllEvents(events)}
        >
          <Download className="h-4 w-4" />
          Descargar registros
        </Button>
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-xl border border-border/70 bg-card shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-[#F1F5F9]">
              <TableHead>Usuario AD</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Usuario afectado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.adUser}</TableCell>
                <TableCell>{event.userName}</TableCell>
                <TableCell>{event.action}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatEventDateTime(event.occurredAt)}
                </TableCell>
                <TableCell>
                  {event.affectedUser === "—" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div>
                      <div className="font-medium">{event.affectedUser}</div>
                      <div className="text-xs text-muted-foreground">{event.affectedAdUser}</div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No hay eventos registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
