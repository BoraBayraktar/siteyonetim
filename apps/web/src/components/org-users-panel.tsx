"use client";

import { OrganizationRole } from "@siteyonetim/db";
import type { OrgPropertyOptionDto, OrgUserDto } from "@siteyonetim/platform-rbac";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useRef, useState } from "react";

import {
  createOrgUserAction,
  removeOrgUserAction,
  updateOrgUserAction,
  type OrgUserActionState,
} from "@/app/actions/org-users";
import { FormDrawer } from "@/components/form-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  locale: string;
  users: OrgUserDto[];
  properties: OrgPropertyOptionDto[];
  currentUserId: string;
};

const initial: OrgUserActionState = {};

const assignableRoles: OrganizationRole[] = [
  OrganizationRole.ORG_ADMIN,
  OrganizationRole.PROPERTY_MANAGER,
  OrganizationRole.ACCOUNTANT,
  OrganizationRole.AUDITOR,
  OrganizationRole.BOARD_MEMBER,
  OrganizationRole.STAFF,
];

function ErrorText({ code, t }: { code?: string; t: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{t(`errors.${code}`, { defaultMessage: code })}</p>;
}

function OrgUserFormFields({
  locale,
  properties,
  defaultRole,
  selectedPropertyIds,
  onRoleChange,
  onPropertyToggle,
  showPassword,
  passwordRequired,
  passwordOptionalHint = false,
  defaultName,
  defaultEmail,
  userId,
}: {
  locale: string;
  properties: OrgPropertyOptionDto[];
  defaultRole: OrganizationRole;
  selectedPropertyIds: string[];
  onRoleChange: (role: OrganizationRole) => void;
  onPropertyToggle: (propertyId: string, checked: boolean) => void;
  showPassword: boolean;
  passwordRequired: boolean;
  passwordOptionalHint?: boolean;
  defaultName?: string;
  defaultEmail?: string;
  userId?: string;
}) {
  const t = useTranslations("orgUsers");
  const needsPropertyScope = defaultRole !== OrganizationRole.ORG_ADMIN;

  return (
    <div className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}

      <div className="grid gap-2">
        <Label htmlFor={userId ? "edit-name" : "create-name"}>{t("name")}</Label>
        <Input id={userId ? "edit-name" : "create-name"} name="name" defaultValue={defaultName} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={userId ? "edit-email" : "create-email"}>{t("email")}</Label>
        <Input
          id={userId ? "edit-email" : "create-email"}
          name="email"
          type="email"
          defaultValue={defaultEmail}
          required
          readOnly={Boolean(userId)}
          disabled={Boolean(userId)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="organizationRole">{t("role")}</Label>
        <Select
          value={defaultRole}
          onValueChange={(value) => onRoleChange(value as OrganizationRole)}
        >
          <SelectTrigger id="organizationRole">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assignableRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {t(`roles.${role}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="organizationRole" value={defaultRole} />
        <p className="text-xs text-muted-foreground">{t(`portalHint.${defaultRole === OrganizationRole.AUDITOR ? "AUDITOR" : "ADMIN"}`)}</p>
      </div>

      {needsPropertyScope ? (
        <div className="grid gap-2">
          <Label>{t("propertyScope")}</Label>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
            {properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noProperties")}</p>
            ) : (
              properties.map((property) => (
                <label key={property.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedPropertyIds.includes(property.id)}
                    onCheckedChange={(checked) => onPropertyToggle(property.id, checked === true)}
                  />
                  {property.name}
                  {selectedPropertyIds.includes(property.id) ? (
                    <input type="hidden" name="propertyIds" value={property.id} />
                  ) : null}
                </label>
              ))
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("allPropertiesAccess")}</p>
      )}

      {showPassword ? (
        <div className="grid gap-2">
          <Label htmlFor={userId ? "edit-password" : "create-password"}>
            {userId ? t("newPasswordOptional") : t("password")}
          </Label>
          <Input
            id={userId ? "edit-password" : "create-password"}
            name="password"
            type="password"
            autoComplete="new-password"
            required={passwordRequired}
            minLength={passwordRequired ? 8 : undefined}
          />
          {passwordOptionalHint ? (
            <p className="text-xs text-muted-foreground">{t("passwordOptionalHint")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CreateOrgUserDrawer({ locale, properties }: { locale: string; properties: OrgPropertyOptionDto[] }) {
  const t = useTranslations("orgUsers");
  const [state, action, pending] = useActionState(createOrgUserAction, initial);
  const [role, setRole] = useState<OrganizationRole>(OrganizationRole.PROPERTY_MANAGER);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);

  return (
    <FormDrawer triggerLabel={t("addUser")} title={t("addUser")} description={t("addUserSubtitle")} success={state.success}>
      <form action={action} className="grid gap-4">
        <OrgUserFormFields
          locale={locale}
          properties={properties}
          defaultRole={role}
          selectedPropertyIds={propertyIds}
          onRoleChange={(nextRole) => {
            setRole(nextRole);
            if (nextRole === OrganizationRole.ORG_ADMIN) {
              setPropertyIds([]);
            }
          }}
          onPropertyToggle={(propertyId, checked) => {
            setPropertyIds((current) =>
              checked ? [...current, propertyId] : current.filter((id) => id !== propertyId),
            );
          }}
          showPassword
          passwordRequired={false}
          passwordOptionalHint
        />
        <ErrorText code={state.error} t={t} />
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
      </form>
    </FormDrawer>
  );
}

function EditOrgUserDrawer({
  locale,
  properties,
  user,
  open,
  onOpenChange,
  hideTrigger = false,
}: {
  locale: string;
  properties: OrgPropertyOptionDto[];
  user: OrgUserDto;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("orgUsers");
  const [state, action, pending] = useActionState(updateOrgUserAction, initial);
  const [role, setRole] = useState(user.organizationRole);
  const [propertyIds, setPropertyIds] = useState(user.propertyAccess.map((entry) => entry.propertyId));

  return (
    <FormDrawer
      mode="edit"
      title={t("editUser")}
      description={user.email}
      success={state.success}
      open={open}
      onOpenChange={onOpenChange}
      hideTrigger={hideTrigger}
    >
      <form action={action} className="grid gap-4">
        <OrgUserFormFields
          locale={locale}
          properties={properties}
          defaultRole={role}
          selectedPropertyIds={propertyIds}
          onRoleChange={(nextRole) => {
            setRole(nextRole);
            if (nextRole === OrganizationRole.ORG_ADMIN) {
              setPropertyIds([]);
            }
          }}
          onPropertyToggle={(propertyId, checked) => {
            setPropertyIds((current) =>
              checked ? [...current, propertyId] : current.filter((id) => id !== propertyId),
            );
          }}
          showPassword
          passwordRequired={false}
          defaultName={user.name}
          defaultEmail={user.email}
          userId={user.userId}
        />
        <ErrorText code={state.error} t={t} />
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
      </form>
    </FormDrawer>
  );
}

function OrgUserRowActions({
  locale,
  properties,
  user,
  currentUserId,
}: {
  locale: string;
  properties: OrgPropertyOptionDto[];
  user: OrgUserDto;
  currentUserId: string;
}) {
  const t = useTranslations("orgUsers");
  const tCommon = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);
  const [removeState, removeAction, removePending] = useActionState(removeOrgUserAction, initial);
  const removeFormRef = useRef<HTMLFormElement>(null);
  const removeDisabled = user.userId === currentUserId;

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" aria-hidden />
            <span className="sr-only">{t("actions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" aria-hidden />
            {tCommon("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={removeDisabled || removePending}
            onSelect={(event) => {
              event.preventDefault();
              removeFormRef.current?.requestSubmit();
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            {t("remove")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditOrgUserDrawer
        locale={locale}
        properties={properties}
        user={user}
        open={editOpen}
        onOpenChange={setEditOpen}
        hideTrigger
      />

      <form ref={removeFormRef} action={removeAction} className="hidden">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="userId" value={user.userId} />
      </form>

      <ErrorText code={removeState.error} t={t} />
    </div>
  );
}

export function OrgUsersPanel({ locale, users, properties, currentUserId }: Props) {
  const t = useTranslations("orgUsers");

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en")),
    [locale, users],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </div>
        <CreateOrgUserDrawer locale={locale} properties={properties} />
      </CardHeader>
      <CardContent>
        {sortedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead>{t("portal")}</TableHead>
                <TableHead>{t("propertyScope")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{t(`roles.${user.organizationRole}`)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`portals.${user.portalKind}`)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
                    {user.organizationRole === OrganizationRole.ORG_ADMIN
                      ? t("allPropertiesAccess")
                      : user.propertyAccess.length > 0
                        ? user.propertyAccess.map((entry) => entry.propertyName).join(", ")
                        : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <OrgUserRowActions
                      locale={locale}
                      properties={properties}
                      user={user}
                      currentUserId={currentUserId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
