"use client";

import {
  Building2,
  ChevronRight,
  Coins,
  Droplets,
  FileText,
  Gauge,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  Mail,
  Megaphone,
  Receipt,
  Scale,
  Settings,
  Shield,
  UserRound,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AdminSidebarBrand } from "@/components/admin-sidebar-brand";
import { AdminSidebarFooter } from "@/components/admin-sidebar-footer";
import { AdminSidebarSearch } from "@/components/admin-sidebar-search";
import { useAdminNav } from "@/components/admin-nav-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useClientSearchParams } from "@/hooks/use-client-search-params";
import type { AdminNavCapabilities, AdminNavProfile, PropertyNavModule } from "@/lib/admin-nav-capabilities-types";
import { isPilotSinglePropertyMode, type AdminPropertyNavItem } from "@/lib/admin-property-nav";
import { resolveDuesTab } from "@/lib/dues-tab";
import { isPropertyStructurePath } from "@/lib/property-nav-paths";
import { resolvePropertyStructureTab, resolveStructureSection } from "@/lib/property-structure-tab";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  adminHomePath: string;
  organizationName: string;
  userName: string;
  logoutAction: () => Promise<void>;
  navProfile: AdminNavProfile;
  canToggleNavProfile: boolean;
  propertiesNav: AdminPropertyNavItem[];
  navCapabilities: AdminNavCapabilities;
};

type NavLinkItem = {
  kind: "link";
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type NavGroupItem = {
  kind: "group";
  id: string;
  label: string;
  icon?: LucideIcon;
  children: NavNode[];
};

type NavNode = NavLinkItem | NavGroupItem;

function parsePropertyId(pathname: string): string | null {
  const match = pathname.match(/\/admin\/properties\/([^/]+)/);
  if (!match || match[1] === "properties") {
    return null;
  }
  return match[1];
}

function paddingForDepth(depth: number) {
  if (depth <= 0) return "pl-2";
  if (depth === 1) return "pl-4";
  return "pl-6";
}

function CollapsedNavTree({
  nodes,
  onNavigate,
  onExpandGroup,
}: {
  nodes: NavNode[];
  onNavigate: () => void;
  onExpandGroup: (id: string) => void;
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <ul className="space-y-1">
        {nodes.map((node) => {
          if (node.kind === "link") {
            return (
              <li key={node.href}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={node.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-accent",
                        node.active && "bg-accent text-accent-foreground",
                      )}
                    >
                      <node.icon className="size-4.5 shrink-0" aria-hidden />
                      <span className="sr-only">{node.label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{node.label}</TooltipContent>
                </Tooltip>
              </li>
            );
          }

          const childActive = hasActiveDescendant(node.children);
          return (
            <li key={node.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onExpandGroup(node.id)}
                    className={cn(
                      "flex size-10 w-full items-center justify-center rounded-lg transition-colors hover:bg-accent",
                      childActive && "text-accent-foreground",
                    )}
                  >
                    {node.icon ? <node.icon className="size-4.5 shrink-0" aria-hidden /> : null}
                    <span className="sr-only">{node.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{node.label}</TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </TooltipProvider>
  );
}

function AdminNavTree({
  nodes,
  depth,
  openGroups,
  toggleGroup,
  onNavigate,
  searchActive = false,
}: {
  nodes: NavNode[];
  depth: number;
  openGroups: Record<string, boolean>;
  toggleGroup: (id: string) => void;
  onNavigate: () => void;
  searchActive?: boolean;
}) {
  return (
    <ul className={cn("space-y-0.5", depth > 0 && "ml-2 border-l border-border/60")}>
      {nodes.map((node) => {
        if (node.kind === "link") {
          return (
            <li key={node.href}>
              <Link
                href={node.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-lg py-2 pr-2 text-sm transition-colors hover:bg-accent",
                  paddingForDepth(depth),
                  node.active && "bg-accent font-medium text-accent-foreground",
                )}
              >
                <node.icon className="size-4 shrink-0 opacity-70" aria-hidden />
                <span className="flex-1 truncate">{node.label}</span>
              </Link>
            </li>
          );
        }

        const open = searchActive || (openGroups[node.id] ?? false);
        const childActive = hasActiveDescendant(node.children);

        return (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => toggleGroup(node.id)}
              aria-expanded={open}
              disabled={searchActive}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg py-2 pr-2 text-left text-sm font-medium transition-colors hover:bg-accent",
                paddingForDepth(depth),
                childActive && "text-accent-foreground",
              )}
            >
              {node.icon ? <node.icon className="size-4 shrink-0 opacity-70" aria-hidden /> : null}
              <span className="flex-1 truncate">{node.label}</span>
              {searchActive ? null : (
                <ChevronRight
                  className={cn("size-4 shrink-0 opacity-70 transition-transform", open && "rotate-90")}
                  aria-hidden
                />
              )}
            </button>
            {open ? (
              <AdminNavTree
                nodes={node.children}
                depth={depth + 1}
                openGroups={openGroups}
                toggleGroup={toggleGroup}
                onNavigate={onNavigate}
                searchActive={searchActive}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function hasActiveDescendant(nodes: NavNode[]): boolean {
  for (const node of nodes) {
    if (node.kind === "link" && node.active) return true;
    if (node.kind === "group" && hasActiveDescendant(node.children)) return true;
  }
  return false;
}

function collectGroupIds(nodes: NavNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.kind === "group") {
      ids.push(node.id, ...collectGroupIds(node.children));
    }
  }
  return ids;
}

function filterNavNodes(nodes: NavNode[], query: string): NavNode[] {
  const result: NavNode[] = [];
  for (const node of nodes) {
    if (node.kind === "link") {
      if (node.label.toLowerCase().includes(query)) {
        result.push(node);
      }
      continue;
    }

    const selfMatches = node.label.toLowerCase().includes(query);
    const filteredChildren = filterNavNodes(node.children, query);
    if (selfMatches || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: selfMatches && filteredChildren.length === 0 ? node.children : filteredChildren,
      });
    }
  }
  return result;
}

function isPropertiesListPath(pathname: string, base: string) {
  return pathname === `${base}/properties` || pathname === `${base}/properties/`;
}

function buildStaffFlatPropertyLinks({
  propertyBase,
  onDuesPage,
  duesTab,
  pathname,
  propertyModules,
  t,
}: {
  propertyBase: string;
  onDuesPage: boolean;
  duesTab: ReturnType<typeof resolveDuesTab>;
  pathname: string;
  propertyModules: ReadonlySet<PropertyNavModule>;
  t: ReturnType<typeof useTranslations<"nav">>;
}): NavNode[] {
  const links: NavNode[] = [];

  if (propertyModules.has("settingsMeters")) {
    links.push({
      kind: "link",
      href: `${propertyBase}/dues?tab=meters`,
      label: t("metersModule"),
      icon: Gauge,
      active: onDuesPage && duesTab === "meters",
    });
  }
  if (propertyModules.has("announcements")) {
    links.push({
      kind: "link",
      href: `${propertyBase}/announcements`,
      label: t("announcementsModule"),
      icon: Megaphone,
      active: pathname.includes("/announcements"),
    });
  }
  if (propertyModules.has("documents")) {
    links.push({
      kind: "link",
      href: `${propertyBase}/documents`,
      label: t("documentsModule"),
      icon: FileText,
      active: pathname.includes("/documents"),
    });
  }
  if (propertyModules.has("incidents")) {
    links.push({
      kind: "link",
      href: `${propertyBase}/incidents`,
      label: t("incidentsModule"),
      icon: Wrench,
      active: pathname.includes("/incidents"),
    });
  }

  return links;
}

function buildPropertyModuleLinks({
  propertyBase,
  propertyId,
  onStructurePage,
  structureSection,
  resolvedTab,
  pathname,
  duesTab,
  propertyModules,
  t,
}: {
  propertyBase: string;
  propertyId: string;
  onStructurePage: boolean;
  structureSection: ReturnType<typeof resolveStructureSection>;
  resolvedTab: ReturnType<typeof resolvePropertyStructureTab>;
  pathname: string;
  duesTab: ReturnType<typeof resolveDuesTab>;
  propertyModules: ReadonlySet<PropertyNavModule>;
  t: ReturnType<typeof useTranslations<"nav">>;
}): NavNode[] {
  const onDuesPage = pathname.includes(`/admin/properties/${propertyId}/dues`);
  const onSetupPage = pathname.includes(`/admin/properties/${propertyId}/setup`);
  const nodes: NavNode[] = [];

  if (propertyModules.has("dashboard")) {
    nodes.push({
      kind: "link",
      href: `${propertyBase}/dashboard`,
      label: t("dashboardModule"),
      icon: LayoutDashboard,
      active: pathname.includes("/dashboard"),
    });
  }

  const financeLinks: NavLinkItem[] = [];
  if (propertyModules.has("financeRegister")) {
    financeLinks.push({
      kind: "link",
      href: `${propertyBase}/dues?tab=register`,
      label: t("registerModule"),
      icon: Building2,
      active: onDuesPage && duesTab === "register",
    });
  }
  if (propertyModules.has("financeAccrual")) {
    financeLinks.push({
      kind: "link",
      href: `${propertyBase}/dues?tab=accrual`,
      label: t("accrualModule"),
      icon: Coins,
      active: onDuesPage && duesTab === "accrual",
    });
  }
  if (propertyModules.has("financeExpenses")) {
    financeLinks.push({
      kind: "link",
      href: `${propertyBase}/dues?tab=expenses`,
      label: t("expensesModule"),
      icon: Receipt,
      active: onDuesPage && duesTab === "expenses",
    });
  }
  if (propertyModules.has("financeLateFee")) {
    financeLinks.push({
      kind: "link",
      href: `${propertyBase}/dues?tab=lateFee`,
      label: t("lateFeeModule"),
      icon: Scale,
      active: onDuesPage && duesTab === "lateFee",
    });
  }

  if (financeLinks.length > 0) {
    nodes.push({
      kind: "group",
      id: "finance",
      label: t("menuFinance"),
      icon: Wallet,
      children: financeLinks,
    });
  }

  if (propertyModules.has("reports")) {
    nodes.push({
      kind: "link",
      href: `${propertyBase}/reports`,
      label: t("reportsModule"),
      icon: LineChart,
      active: pathname.includes("/reports"),
    });
  }

  if (propertyModules.has("governance")) {
    nodes.push({
      kind: "link",
      href: `${propertyBase}/governance`,
      label: t("governanceModule"),
      icon: Landmark,
      active: pathname.includes("/governance"),
    });
  }

  {
    const propertySetupChildren: NavLinkItem[] = [];
    if (propertyModules.has("structureUnits")) {
      propertySetupChildren.push({
        kind: "link",
        href: `${propertyBase}?tab=units`,
        label: t("tabUnits"),
        icon: Building2,
        active: onStructurePage && resolvedTab === "structure" && structureSection === "units",
      });
    }
    if (propertyModules.has("settingsDefinitions")) {
      propertySetupChildren.push({
        kind: "link",
        href: `${propertyBase}/dues?tab=definitions`,
        label: t("duesDefinitionsModule"),
        icon: Scale,
        active: onDuesPage && duesTab === "definitions",
      });
    }
    if (propertyModules.has("settingsCashboxes")) {
      propertySetupChildren.push({
        kind: "link",
        href: `${propertyBase}/dues?tab=cashboxes`,
        label: t("cashboxesModule"),
        icon: Wallet,
        active: onDuesPage && duesTab === "cashboxes",
      });
    }
    if (propertyModules.has("settingsMeters")) {
      propertySetupChildren.push({
        kind: "link",
        href: `${propertyBase}/dues?tab=meters`,
        label: t("metersModule"),
        icon: Gauge,
        active: onDuesPage && duesTab === "meters",
      });
    }
    if (propertyModules.has("structureBlocks")) {
      propertySetupChildren.push({
        kind: "link",
        href: `${propertyBase}?tab=blocks`,
        label: t("tabBlocks"),
        icon: LayoutGrid,
        active: onStructurePage && resolvedTab === "structure" && structureSection === "blocks",
      });
    }
    if (propertyModules.has("structureParties")) {
      propertySetupChildren.push({
        kind: "link",
        href: `${propertyBase}?tab=parties`,
        label: t("tabParties"),
        icon: Coins,
        active: onStructurePage && resolvedTab === "structure" && structureSection === "parties",
      });
    }
    if (propertyModules.has("settingsAccounts")) {
      propertySetupChildren.push({
        kind: "link",
        href: `${propertyBase}/dues?tab=accounts`,
        label: t("accountsModule"),
        icon: Coins,
        active: onDuesPage && duesTab === "accounts",
      });
    }
    if (propertyModules.has("settingsStaffAccounts")) {
      propertySetupChildren.push({
        kind: "link",
        href: `${propertyBase}/dues?tab=staffAccounts`,
        label: t("staffAccountsModule"),
        icon: UserRound,
        active: onDuesPage && duesTab === "staffAccounts",
      });
    }
    if (propertyModules.has("settingsCategories")) {
      propertySetupChildren.push({
        kind: "link",
        href: `${propertyBase}/dues?tab=categories`,
        label: t("categoriesModule"),
        icon: Receipt,
        active: onDuesPage && duesTab === "categories",
      });
    }
    if (propertyModules.has("structureUtility")) {
      propertySetupChildren.push({
        kind: "link",
        href: `${propertyBase}?tab=utility`,
        label: t("tabUtility"),
        icon: Droplets,
        active: onStructurePage && resolvedTab === "utility",
      });
    }
    if (propertyModules.has("dashboard")) {
      propertySetupChildren.push({
        kind: "link",
        href: `${propertyBase}/setup`,
        label: t("propertySettingsModule"),
        icon: Settings,
        active: onSetupPage,
      });
    }
    if (propertySetupChildren.length > 0) {
      nodes.push({
        kind: "group",
        id: "property-setup",
        label: t("settingsModule"),
        icon: Settings,
        children: propertySetupChildren,
      });
    }
  }

  const communicationChildren: NavLinkItem[] = [];
  if (propertyModules.has("announcements")) {
    communicationChildren.push({
      kind: "link",
      href: `${propertyBase}/announcements`,
      label: t("announcementsModule"),
      icon: Megaphone,
      active: pathname.includes("/announcements"),
    });
  }
  if (propertyModules.has("notifications")) {
    communicationChildren.push({
      kind: "link",
      href: `${propertyBase}/notifications`,
      label: t("notificationsModule"),
      icon: Mail,
      active: pathname.includes("/notifications"),
    });
  }
  if (propertyModules.has("documents")) {
    communicationChildren.push({
      kind: "link",
      href: `${propertyBase}/documents`,
      label: t("documentsModule"),
      icon: FileText,
      active: pathname.includes("/documents"),
    });
  }
  if (propertyModules.has("incidents")) {
    communicationChildren.push({
      kind: "link",
      href: `${propertyBase}/incidents`,
      label: t("incidentsModule"),
      icon: Wrench,
      active: pathname.includes("/incidents"),
    });
  }

  if (communicationChildren.length > 0) {
    nodes.push({
      kind: "group",
      id: "communication",
      label: t("menuCommunication"),
      icon: Megaphone,
      children: communicationChildren,
    });
  }

  return nodes;
}

function propertyHomeHref(base: string, propertyId: string, capabilities: AdminNavCapabilities): string {
  if (capabilities.isStaffRestricted) {
    return `${base}/properties/${propertyId}/dues?tab=meters`;
  }
  return `${base}/properties/${propertyId}/dashboard`;
}

function buildPropertyNavLinks(
  params: {
    propertyBase: string;
    propertyId: string;
    onStructurePage: boolean;
    structureSection: ReturnType<typeof resolveStructureSection>;
    resolvedTab: ReturnType<typeof resolvePropertyStructureTab>;
    pathname: string;
    duesTab: ReturnType<typeof resolveDuesTab>;
    capabilities: AdminNavCapabilities;
    propertyModules: ReadonlySet<PropertyNavModule>;
    t: ReturnType<typeof useTranslations<"nav">>;
  },
): NavNode[] {
  if (params.capabilities.isStaffRestricted) {
    return buildStaffFlatPropertyLinks({
      propertyBase: params.propertyBase,
      onDuesPage: params.pathname.includes(`/admin/properties/${params.propertyId}/dues`),
      duesTab: params.duesTab,
      pathname: params.pathname,
      propertyModules: params.propertyModules,
      t: params.t,
    });
  }

  return buildPropertyModuleLinks({
    propertyBase: params.propertyBase,
    propertyId: params.propertyId,
    onStructurePage: params.onStructurePage,
    structureSection: params.structureSection,
    resolvedTab: params.resolvedTab,
    pathname: params.pathname,
    duesTab: params.duesTab,
    propertyModules: params.propertyModules,
    t: params.t,
  });
}

function AdminNavPanel({
  locale,
  propertiesNav,
  navCapabilities,
  onNavigate,
  forceExpanded = false,
  searchQuery = "",
}: {
  locale: string;
  propertiesNav: AdminPropertyNavItem[];
  navCapabilities: AdminNavCapabilities;
  onNavigate: () => void;
  forceExpanded?: boolean;
  searchQuery?: string;
}) {
  const { collapsed, setCollapsed } = useAdminNav();
  const effectiveCollapsed = !forceExpanded && collapsed;
  const pathname = usePathname();
  const searchParams = useClientSearchParams();
  const t = useTranslations("nav");
  const propertyModules = navCapabilities.propertyModules;

  const propertyId = useMemo(() => parsePropertyId(pathname), [pathname]);
  const queryString = searchParams.toString();
  const duesTab = resolveDuesTab(searchParams.get("tab"));
  const onStructurePage = propertyId ? isPropertyStructurePath(pathname, propertyId) : false;
  const resolvedTab = onStructurePage ? resolvePropertyStructureTab(searchParams.get("tab")) : "structure";
  const structureSection = onStructurePage ? resolveStructureSection(searchParams.get("tab")) : "units";

  const base = `/${locale}/admin`;
  const pilotSingleProperty = isPilotSinglePropertyMode(propertiesNav);
  const effectivePropertyId = propertyId ?? (pilotSingleProperty ? propertiesNav[0]?.id : null);
  const propertyBase = effectivePropertyId ? `${base}/properties/${effectivePropertyId}` : null;
  const onPropertiesRoute = pathname.startsWith(`${base}/properties`);
  const currentProperty = effectivePropertyId ? propertiesNav.find((p) => p.id === effectivePropertyId) : null;
  const onEffectiveStructurePage = effectivePropertyId
    ? isPropertyStructurePath(pathname, effectivePropertyId)
    : false;
  const effectiveResolvedTab = onEffectiveStructurePage
    ? resolvePropertyStructureTab(searchParams.get("tab"))
    : "structure";
  const effectiveStructureSection = onEffectiveStructurePage
    ? resolveStructureSection(searchParams.get("tab"))
    : "units";

  const tree = useMemo((): NavNode[] => {
    const orgModuleLinks: NavLinkItem[] = [];
    if (navCapabilities.showOrgSecurity) {
      orgModuleLinks.push({
        kind: "link",
        href: `${base}/security`,
        label: t("securityModule"),
        icon: Shield,
        active: pathname.includes("/security"),
      });
    }
    if (navCapabilities.showOrgLegalInterest) {
      orgModuleLinks.push({
        kind: "link",
        href: `${base}/legal-interest`,
        label: t("legalInterestModule"),
        icon: Scale,
        active: pathname.includes("/legal-interest"),
      });
    }
    if (navCapabilities.showOrgUsers) {
      orgModuleLinks.push({
        kind: "link",
        href: `${base}/users`,
        label: t("usersModule"),
        icon: Users,
        active: pathname.includes("/users"),
      });
    }
    if (navCapabilities.isStaffRestricted) {
      const staffApartmentsGroup: NavGroupItem = {
        kind: "group",
        id: "apartments",
        label: t("properties"),
        icon: Building2,
        children: propertiesNav.map((p) => ({
          kind: "link" as const,
          href: propertyHomeHref(base, p.id, navCapabilities),
          label: p.name,
          icon: Gauge,
          active:
            propertyId === p.id &&
            (pathname.includes("/dues") ||
              pathname.includes("/announcements") ||
              pathname.includes("/documents") ||
              pathname.includes("/incidents")),
        })),
      };

      if (pilotSingleProperty && propertyBase && effectivePropertyId) {
        return buildPropertyNavLinks({
          propertyBase,
          propertyId: effectivePropertyId,
          onStructurePage: onEffectiveStructurePage,
          structureSection: effectiveStructureSection,
          resolvedTab: effectiveResolvedTab,
          pathname,
          duesTab,
          capabilities: navCapabilities,
          propertyModules,
          t,
        });
      }

      if (propertyId && propertyBase) {
        return [
          staffApartmentsGroup,
          ...buildPropertyNavLinks({
            propertyBase,
            propertyId,
            onStructurePage,
            structureSection,
            resolvedTab,
            pathname,
            duesTab,
            capabilities: navCapabilities,
            propertyModules,
            t,
          }),
        ];
      }

      return [staffApartmentsGroup];
    }

    if (pilotSingleProperty && propertyBase && effectivePropertyId) {
      return [
        ...buildPropertyNavLinks({
          propertyBase,
          propertyId: effectivePropertyId,
          onStructurePage: onEffectiveStructurePage,
          structureSection: effectiveStructureSection,
          resolvedTab: effectiveResolvedTab,
          pathname,
          duesTab,
          capabilities: navCapabilities,
          propertyModules,
          t,
        }),
        ...orgModuleLinks,
      ];
    }

    const apartmentsChildren: NavNode[] = [];
    if (navCapabilities.showPropertiesList) {
      apartmentsChildren.push({
        kind: "link",
        href: `${base}/properties`,
        label: t("propertiesAll"),
        icon: Building2,
        active: isPropertiesListPath(pathname, base),
      });
    }
    apartmentsChildren.push(
      ...propertiesNav.map((p) => ({
        kind: "link" as const,
        href: propertyHomeHref(base, p.id, navCapabilities),
        label: p.name,
        icon: Building2,
        active: propertyId === p.id,
      })),
    );

    const apartmentsGroup: NavGroupItem = {
      kind: "group",
      id: "apartments",
      label: t("properties"),
      icon: Building2,
      children: apartmentsChildren,
    };

    const organizationGroup: NavGroupItem = {
      kind: "group",
      id: "organization",
      label: t("menuModules"),
      icon: Building2,
      children: [apartmentsGroup, ...orgModuleLinks],
    };

    if (!propertyId || !propertyBase) {
      return orgModuleLinks.length > 0 || apartmentsChildren.length > 0 ? [organizationGroup] : [];
    }

    const propertyGroup: NavGroupItem = {
      kind: "group",
      id: "property",
      label: currentProperty?.name ?? t("menuProperty"),
      icon: Building2,
      children: buildPropertyNavLinks({
        propertyBase,
        propertyId,
        onStructurePage,
        structureSection,
        resolvedTab,
        pathname,
        duesTab,
        capabilities: navCapabilities,
        propertyModules,
        t,
      }),
    };

    return [organizationGroup, propertyGroup];
  }, [
    base,
    currentProperty?.name,
    duesTab,
    queryString,
    effectiveStructureSection,
    effectiveResolvedTab,
    onEffectiveStructurePage,
    onStructurePage,
    pathname,
    pilotSingleProperty,
    propertiesNav,
    propertyBase,
    propertyId,
    resolvedTab,
    structureSection,
    navCapabilities,
    propertyModules,
    t,
  ]);

  const allGroupIds = useMemo(() => collectGroupIds(tree), [tree]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const id of allGroupIds) {
        if (next[id] === undefined) {
          next[id] = id === "organization" || id === "apartments";
        }
      }
      next.organization = true;
      if (onPropertiesRoute) {
        next.apartments = true;
      }
      if (propertyId) {
        next.property = true;
      }
      for (const node of tree) {
        if (node.kind === "group" && hasActiveDescendant(node.children)) {
          next[node.id] = true;
        }
      }
      return next;
    });
  }, [allGroupIds, onPropertiesRoute, onStructurePage, propertyId, tree]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandGroup = (id: string) => {
    setCollapsed(false);
    setOpenGroups((prev) => ({ ...prev, [id]: true }));
  };

  if (effectiveCollapsed) {
    return <CollapsedNavTree nodes={tree} onNavigate={onNavigate} onExpandGroup={expandGroup} />;
  }

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchActive = trimmedQuery.length > 0;
  const visibleTree = searchActive ? filterNavNodes(tree, trimmedQuery) : tree;

  if (searchActive && visibleTree.length === 0) {
    return <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("searchNoResults")}</p>;
  }

  return (
    <AdminNavTree
      nodes={visibleTree}
      depth={0}
      openGroups={openGroups}
      toggleGroup={toggleGroup}
      onNavigate={onNavigate}
      searchActive={searchActive}
    />
  );
}

function NavScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollArea className="h-full min-h-0 flex-1">
      <div className="p-3 pb-6">{children}</div>
    </ScrollArea>
  );
}

export function AdminSidebar({
  locale,
  adminHomePath,
  organizationName,
  userName,
  logoutAction,
  navProfile,
  canToggleNavProfile,
  propertiesNav,
  navCapabilities,
}: Props) {
  const { mobileOpen, setMobileOpen, collapsed } = useAdminNav();
  const [desktopSearch, setDesktopSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <aside
        className={cn(
          "sticky top-2 hidden h-[calc(100dvh-1rem)] shrink-0 flex-col rounded-2xl border bg-card shadow-sm transition-[width] duration-200 md:ml-2 md:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <AdminSidebarBrand adminHomePath={adminHomePath} organizationName={organizationName} />
        {collapsed ? null : <AdminSidebarSearch value={desktopSearch} onChange={setDesktopSearch} />}
        <NavScroll>
          <AdminNavPanel
            locale={locale}
            propertiesNav={propertiesNav}
            navCapabilities={navCapabilities}
            onNavigate={() => undefined}
            searchQuery={desktopSearch}
          />
        </NavScroll>
        <AdminSidebarFooter
          locale={locale}
          organizationName={organizationName}
          userName={userName}
          logoutAction={logoutAction}
          navProfile={navProfile}
          canToggleNavProfile={canToggleNavProfile}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-[min(100vw,20rem)] flex-col gap-0 p-0 sm:max-w-xs">
          <AdminSidebarBrand adminHomePath={adminHomePath} organizationName={organizationName} />
          <AdminSidebarSearch value={mobileSearch} onChange={setMobileSearch} />
          <NavScroll>
            <AdminNavPanel
              locale={locale}
              propertiesNav={propertiesNav}
              navCapabilities={navCapabilities}
              onNavigate={closeMobile}
              forceExpanded
              searchQuery={mobileSearch}
            />
          </NavScroll>
          <AdminSidebarFooter
            locale={locale}
            organizationName={organizationName}
            userName={userName}
            logoutAction={logoutAction}
            navProfile={navProfile}
            canToggleNavProfile={canToggleNavProfile}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
