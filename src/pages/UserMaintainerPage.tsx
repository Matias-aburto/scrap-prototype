import * as React from "react";
import { Download, Pencil, Plus } from "lucide-react";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { cn } from "../lib/utils";

type UserRole = "Operativo" | "Seguridad Informática" | "Supervisor";
type UserCountry = "Chile" | "Argentina" | "Perú" | "Colombia" | "Regional";
type BusinessUnit = "Supermercados" | "Mejoramiento del Hogar" | "Todas";

type UserRecord = {
  id: string;
  email: string;
  adUser: string;
  name: string;
  role: UserRole;
  country: UserCountry;
  businessUnit: BusinessUnit;
  active: boolean;
  createdAt: string;
  lastAccessAt: string | null;
};

type UserForm = Omit<UserRecord, "id" | "createdAt" | "lastAccessAt">;

const ROLE_OPTIONS: UserRole[] = ["Operativo", "Seguridad Informática", "Supervisor"];
const COUNTRY_OPTIONS: UserCountry[] = [
  "Chile",
  "Argentina",
  "Perú",
  "Colombia",
  "Regional",
];

const BUSINESS_UNITS_BY_COUNTRY: Record<UserCountry, BusinessUnit[]> = {
  Chile: ["Supermercados", "Mejoramiento del Hogar"],
  Argentina: ["Supermercados", "Mejoramiento del Hogar"],
  Perú: ["Supermercados"],
  Colombia: ["Supermercados"],
  Regional: ["Todas"],
};

const DEFAULT_FORM: UserForm = {
  email: "",
  adUser: "",
  name: "",
  role: "Operativo",
  country: "Chile",
  businessUnit: "Supermercados",
  active: true,
};

const INITIAL_USERS: UserRecord[] = [
  {
    id: "u-1",
    email: "maria.lopez@empresa.com",
    adUser: "mlopez",
    name: "María López",
    role: "Operativo",
    country: "Chile",
    businessUnit: "Supermercados",
    active: true,
    createdAt: "2025-11-12T10:30:00.000Z",
    lastAccessAt: "2026-06-20T14:22:00.000Z",
  },
  {
    id: "u-2",
    email: "juan.perez@empresa.com",
    adUser: "jperez",
    name: "Juan Pérez",
    role: "Supervisor",
    country: "Argentina",
    businessUnit: "Mejoramiento del Hogar",
    active: false,
    createdAt: "2024-08-03T09:15:00.000Z",
    lastAccessAt: "2025-09-18T16:40:00.000Z",
  },
  {
    id: "u-3",
    email: "ana.ramirez@empresa.com",
    adUser: "aramirez",
    name: "Ana Ramírez",
    role: "Seguridad Informática",
    country: "Regional",
    businessUnit: "Todas",
    active: true,
    createdAt: "2026-01-20T11:00:00.000Z",
    lastAccessAt: "2026-06-23T08:05:00.000Z",
  },
];

function getAllowedUnits(country: UserCountry) {
  return BUSINESS_UNITS_BY_COUNTRY[country];
}

function isRegionalCountry(country: UserCountry) {
  return country === "Regional";
}

function isSecurityRole(role: UserRole) {
  return role === "Seguridad Informática";
}

const SECURITY_SEGMENTATION = {
  country: "Regional",
  businessUnit: "Todas",
} as const satisfies Pick<UserForm, "country" | "businessUnit">;

function withRoleDefaults(form: UserForm): UserForm {
  if (!isSecurityRole(form.role)) return form;
  return { ...form, ...SECURITY_SEGMENTATION };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "Sin acceso";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadAllUsers(users: UserRecord[]) {
  const headers = [
    "Usuario AD",
    "Nombre",
    "Mail",
    "Estado",
    "País",
    "Unidad de negocio",
    "Rol",
    "Fecha creación",
    "Último acceso",
  ];
  const rows = users.map((user) => [
    user.adUser,
    user.name,
    user.email,
    user.active ? "Activo" : "Inactivo",
    user.country,
    user.businessUnit,
    user.role,
    formatDateTime(user.createdAt),
    formatDateTime(user.lastAccessAt),
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
  anchor.download = `mantenedor-usuarios-${stamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function UserMaintainerPage() {
  const [users, setUsers] = React.useState<UserRecord[]>(INITIAL_USERS);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<UserForm>(DEFAULT_FORM);
  const [errorMessage, setErrorMessage] = React.useState("");

  const isEditing = editingUserId !== null;
  const isSecurity = isSecurityRole(form.role);
  const isRegional = isRegionalCountry(form.country);
  const allowedUnits = React.useMemo(() => getAllowedUnits(form.country), [form.country]);

  React.useEffect(() => {
    if (!isSecurity) return;
    if (form.country !== SECURITY_SEGMENTATION.country || form.businessUnit !== SECURITY_SEGMENTATION.businessUnit) {
      setForm((prev) => withRoleDefaults(prev));
    }
  }, [form.businessUnit, form.country, form.role, isSecurity]);

  React.useEffect(() => {
    if (isSecurity) return;
    if (isRegional) {
      if (form.businessUnit !== "Todas") {
        setForm((prev) => ({ ...prev, businessUnit: "Todas" }));
      }
      return;
    }
    if (!allowedUnits.includes(form.businessUnit)) {
      setForm((prev) => ({ ...prev, businessUnit: allowedUnits[0] }));
    }
  }, [allowedUnits, form.businessUnit, form.country, isRegional, isSecurity]);

  function openCreateDialog() {
    setEditingUserId(null);
    setForm(DEFAULT_FORM);
    setErrorMessage("");
    setDialogOpen(true);
  }

  function openEditDialog(user: UserRecord) {
    setEditingUserId(user.id);
    setForm(
      withRoleDefaults({
        email: user.email,
        adUser: user.adUser,
        name: user.name,
        role: user.role,
        country: user.country,
        businessUnit: user.businessUnit,
        active: user.active,
      }),
    );
    setErrorMessage("");
    setDialogOpen(true);
  }

  function upsertUser() {
    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedAdUser = form.adUser.trim().toLowerCase();
    const normalizedName = form.name.trim();

    if (
      normalizedEmail.length === 0 ||
      normalizedAdUser.length === 0 ||
      normalizedName.length === 0
    ) {
      setErrorMessage("Completa correo, usuario AD y nombre.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Ingresa un correo válido.");
      return;
    }

    const duplicatedEmail = users.some(
      (user) => user.email.toLowerCase() === normalizedEmail && user.id !== editingUserId,
    );
    if (duplicatedEmail) {
      setErrorMessage("El correo ya existe.");
      return;
    }

    const segmentation = isSecurityRole(form.role)
      ? SECURITY_SEGMENTATION
      : { country: form.country, businessUnit: form.businessUnit };

    const payload: UserForm = {
      email: normalizedEmail,
      adUser: normalizedAdUser,
      name: normalizedName,
      role: form.role,
      country: segmentation.country,
      businessUnit: segmentation.businessUnit,
      active: form.active,
    };

    if (editingUserId) {
      setUsers((prev) =>
        prev.map((user) => (user.id === editingUserId ? { ...user, ...payload } : user)),
      );
    } else {
      const now = new Date().toISOString();
      setUsers((prev) => [
        { id: `u-${Date.now()}`, ...payload, createdAt: now, lastAccessAt: null },
        ...prev,
      ]);
    }

    setDialogOpen(false);
    setEditingUserId(null);
    setForm(DEFAULT_FORM);
    setErrorMessage("");
  }

  function updateForm<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCountryChange(country: UserCountry) {
    if (isSecurityRole(form.role)) return;

    if (isRegionalCountry(country)) {
      setForm((prev) => ({ ...prev, country, businessUnit: "Todas" }));
      return;
    }

    const units = getAllowedUnits(country);
    setForm((prev) => ({
      ...prev,
      country,
      businessUnit: units.includes(prev.businessUnit) ? prev.businessUnit : units[0]!,
    }));
  }

  function handleRoleChange(role: UserRole) {
    setForm((prev) => withRoleDefaults({ ...prev, role }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Mantenedor de usuarios</h1>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            className="gap-2"
            disabled={users.length === 0}
            onClick={() => downloadAllUsers(users)}
          >
            <Download className="h-4 w-4" />
            Descargar registros
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-xl border border-border/70 bg-card shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-[#F1F5F9]">
              <TableHead>Usuario AD</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Mail</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>País</TableHead>
              <TableHead>Unidad de negocio</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Fecha creación</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.adUser}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.active ? "success" : "secondary"}>
                    {user.active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>{user.country}</TableCell>
                <TableCell>{user.businessUnit}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(user.createdAt)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(user.lastAccessAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar usuario"
                      onClick={() => openEditDialog(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                  No hay usuarios registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar usuario" : "Crear usuario"}</DialogTitle>
            <DialogDescription>
              Completa los datos de acceso y segmentación del usuario.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="user-email" className="text-sm font-medium">
                Correo
              </label>
              <input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                placeholder="nombre@empresa.com"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="user-ad" className="text-sm font-medium">
                Usuario AD
              </label>
              <input
                id="user-ad"
                value={form.adUser}
                onChange={(e) => updateForm("adUser", e.target.value)}
                placeholder="usuarioad"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="user-name" className="text-sm font-medium">
                Nombre
              </label>
              <input
                id="user-name"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                placeholder="Nombre y apellido"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="user-role" className="text-sm font-medium">
                Rol
              </label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {isSecurity ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-input bg-muted/30 px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">País</div>
                  <div className="mt-0.5 text-sm font-medium">{SECURITY_SEGMENTATION.country}</div>
                </div>
                <div className="rounded-lg border border-input bg-muted/30 px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">Unidad de negocio</div>
                  <div className="mt-0.5 text-sm font-medium">{SECURITY_SEGMENTATION.businessUnit}</div>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Seguridad Informática tiene por defecto acceso regional a todas las unidades de
                  negocio.
                </p>
              </div>
            ) : (
              <>
            <div className="space-y-1.5">
              <label htmlFor="user-country" className="text-sm font-medium">
                País
              </label>
              <select
                id="user-country"
                value={form.country}
                onChange={(e) => handleCountryChange(e.target.value as UserCountry)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="user-business-unit" className="text-sm font-medium">
                Unidad de negocio
              </label>
              <select
                id="user-business-unit"
                value={form.businessUnit}
                disabled={isRegional}
                onChange={(e) => updateForm("businessUnit", e.target.value as BusinessUnit)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {allowedUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {isRegional && (
                <p className="text-xs text-muted-foreground">
                  Los usuarios regionales tienen acceso a todas las unidades de negocio.
                </p>
              )}
            </div>
              </>
            )}

            {isEditing && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-input px-3 py-2.5">
                <div className="space-y-0.5">
                  <label htmlFor="user-active" className="text-sm font-medium">
                    Estado del usuario
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Los usuarios no se eliminan; desactívalos para revocar el acceso.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ActiveSwitch
                    id="user-active"
                    checked={form.active}
                    onCheckedChange={(active) => updateForm("active", active)}
                    aria-label={form.active ? "Usuario activo" : "Usuario inactivo"}
                  />
                  <span className="min-w-[4.5rem] text-sm text-muted-foreground">
                    {form.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={upsertUser}>{isEditing ? "Guardar cambios" : "Crear usuario"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActiveSwitch({
  id,
  checked,
  onCheckedChange,
  "aria-label": ariaLabel,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label"?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-[#2563EB]" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
