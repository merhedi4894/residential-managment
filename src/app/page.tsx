"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  Search,
  AlertTriangle,
  Package,
  BedDouble,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  Wrench,
  RefreshCw,
  X,
  Edit3,
  ClipboardList,
  Eye,
  LogOut,
  KeyRound,
  Lock,
  UserCheck,
  UserPlus,
  Download,
  Shield,
  Layers,
  Archive,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ── Types ────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: string;
  itemName: string;
  quantity: number;
  condition: string;
  roomNumber: string;
  tenantId?: string;
  roomId: string;
  addedDate: string;
  note?: string;
  tenant?: { id: string; name: string };
  room?: { id: string; roomNumber: string };
}

interface Tenant {
  id: string;
  name: string;
  designation?: string;
  phone?: string;
  roomId: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  room: { id: string; roomNumber: string; floorId: string };
  buildingName?: string;
  inventories?: InventoryItem[];
}

interface TroubleReport {
  id: string;
  roomNumber: string;
  roomId: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: string;
  resolvedAt?: string;
  resolutionNote?: string;
  resolvedBy?: string;
  room?: { id: string; roomNumber: string };
}

interface Floor {
  id: string;
  floorNumber: number;
  buildingId: string;
  rooms: Room[];
}

interface Room {
  id: string;
  roomNumber: string;
  floorId: string;
  tenants: { id: string; name: string; isActive: boolean }[];
  inventories: InventoryItem[];
  troubleReports: TroubleReport[];
}

interface Building {
  id: string;
  name: string;
  totalFloors: number;
  capacityPerRoom: number;
  createdAt: string;
  floors: Floor[];
}

interface Guest {
  id: string;
  name: string;
  address?: string;
  mobile?: string;
  referredBy?: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  totalBill?: string;
  note?: string;
  isPaid: boolean;
  isBooked?: boolean;
  roomId?: string;
  roomNumber?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Error Boundary ──────────────────────────────────────────────────────────

class TabErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-200 bg-red-50"><CardContent className="p-6 text-center">
          <p className="text-red-600 font-medium mb-2">একটি ত্রুটি ঘটেছে</p>
          <p className="text-red-400 text-xs mb-3">{this.state.error?.message}</p>
          <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, error: null })}>আবার চেষ্টা করুন</Button>
        </CardContent></Card>
      );
    }
    return this.props.children;
  }
}

// ── Helper ───────────────────────────────────────────────────────────────

function toBanglaNumber(num: number | string): string {
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/\d/g, (d) => bengaliDigits[parseInt(d)]);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "পেন্ডিং":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-300">
          <Clock className="size-3 mr-1" />
          পেন্ডিং
        </Badge>
      );
    case "চলমান":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300">
          <Wrench className="size-3 mr-1" />
          চলমান
        </Badge>
      );
    case "সমাধান হয়েছে":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300">
          <CheckCircle2 className="size-3 mr-1" />
          সমাধান হয়েছে
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

const uid = () => Math.random().toString(36).substring(2, 9);


// Bengali months for search filters (shared between TenantsTab and TroublesTab)
const BENGALI_MONTHS = [
  { value: "1", label: "জানুয়ারি" }, { value: "2", label: "ফেব্রুয়ারি" }, { value: "3", label: "মার্চ" },
  { value: "4", label: "এপ্রিল" }, { value: "5", label: "মে" }, { value: "6", label: "জুন" },
  { value: "7", label: "জুলাই" }, { value: "8", label: "আগস্ট" }, { value: "9", label: "সেপ্টেম্বর" },
  { value: "10", label: "অক্টোবর" }, { value: "11", label: "নভেম্বর" }, { value: "12", label: "ডিসেম্বর" },
];

// ── Buildings Context (shared data for performance) ─────────────────────

const BuildingsContext = React.createContext<{
  buildings: Building[];
  reloadBuildings: () => void;
  counts: { buildingCount: number; roomCount: number; tenantCount: number };
  bookedRoomIds: Set<string>;
  reloadBookedRooms: () => void;
}>({ buildings: [], reloadBuildings: () => {}, counts: { buildingCount: 0, roomCount: 0, tenantCount: 0 }, bookedRoomIds: new Set(), reloadBookedRooms: () => {} });

function useBuildingsContext() {
  return React.useContext(BuildingsContext);
}

function BuildingsContextWrapper({ children }: { children: React.ReactNode }) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [bookedRoomIds, setBookedRoomIds] = useState<Set<string>>(new Set());

  const loadBuildings = useCallback(async () => {
    try {
      const res = await fetch("/api/buildings");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBuildings(data);
    } catch { /* silent */ }
  }, []);

  // Load rooms that have active guest bookings (isBooked=true)
  const loadBookedRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/guests?active=true");
      if (res.ok) {
        const activeGuests = await res.json();
        const ids = new Set<string>();
        for (const g of activeGuests) {
          if (g.roomId && g.isBooked) ids.add(g.roomId);
        }
        setBookedRoomIds(ids);
      }
    } catch { /* silent */ }
  }, []);

  // Compute counts directly from buildings data (no separate API call needed)
  const counts = React.useMemo(() => {
    let roomCount = 0;
    let tenantCount = 0;
    for (const b of buildings) {
      for (const f of b.floors || []) {
        roomCount += (f.rooms || []).length;
        for (const r of f.rooms || []) {
          tenantCount += (r.tenants || []).length;
        }
      }
    }
    return { buildingCount: buildings.length, roomCount, tenantCount };
  }, [buildings]);

  useEffect(() => {
    // Load buildings and booked rooms in parallel on mount
    loadBuildings();
    loadBookedRooms();
    const handler = () => { loadBuildings(); loadBookedRooms(); };
    window.addEventListener("dashboard-data-changed", handler);
    return () => window.removeEventListener("dashboard-data-changed", handler);
  }, [loadBuildings, loadBookedRooms]);

  return (
    <BuildingsContext.Provider value={React.useMemo(() => ({ buildings, reloadBuildings: loadBuildings, counts, bookedRoomIds, reloadBookedRooms: loadBookedRooms }), [buildings, loadBuildings, counts, bookedRoomIds, loadBookedRooms])}>
      {children}
    </BuildingsContext.Provider>
  );
}

// ── Scroll to Top Button ──────────────────────────────────────────────────

function ScrollToTopBtn() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-4 z-[9999] size-11 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center hover:bg-emerald-700 active:scale-95 transition-all"
      aria-label="উপরে যান"
    >
      <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export default function HomePage() {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [checking, setChecking] = useState(true);
  // Change password dialog
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [changePassLoading, setChangePassLoading] = useState(false);
  // Auto-logout timer ref
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retryCount = 0;
    const MAX_RETRIES = 4; // More retries for cold start recovery

    const checkAuth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const res = await fetch("/api/auth/me", { signal: controller.signal });
        clearTimeout(timeout);

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setChecking(false);
          fetch("/api/warm").catch(() => {});
          return;
        }

        // 503 = server unavailable (cold start/DB timeout) — retry instead of redirect
        if (res.status === 503) {
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            // Exponential backoff: 2s, 3s, 4s, 5s
            setTimeout(checkAuth, 1500 + retryCount * 1000);
          } else {
            setChecking(false);
            setAuthError(true);
          }
          return;
        }

        // Not authenticated (401/403) — redirect to login
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/login";
          return;
        }

        // Other server error — show error UI with retry
        setChecking(false);
        setAuthError(true);
        return;
      } catch (err: any) {
        if (cancelled) return;

        retryCount++;
        if (retryCount < MAX_RETRIES) {
          // Network/timeout error — retry with exponential backoff
          setTimeout(checkAuth, 1500 + retryCount * 1000);
        } else {
          // Show error UI with retry button instead of redirecting to login
          setChecking(false);
          setAuthError(true);
        }
      }
    };

    checkAuth();
    return () => { cancelled = true; };
  }, []);

  // Auto-logout after 10 minutes of inactivity
  useEffect(() => {
    if (checking) return; // Don't start timer while checking auth

    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        toast.info("নিরাপত্তার জন্য অটো লগআউট হয়েছে");
        fetch("/api/auth/logout", { method: "POST" }).then(() => {
          window.location.href = "/login";
        });
      }, INACTIVITY_TIMEOUT);
    };

    // Throttled mousemove - cursor movement resets timer (max once per 2s to save CPU)
    let lastMoveTime = 0;
    const handleMouseMove = () => {
      const now = Date.now();
      if (now - lastMoveTime > 2000) { lastMoveTime = now; resetTimer(); }
    };

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((evt) => {
      document.addEventListener(evt, resetTimer, { passive: true });
    });
    document.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Start initial timer
    resetTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      activityEvents.forEach((evt) => {
        document.removeEventListener(evt, resetTimer);
      });
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [checking]);

  const handleLogout = () => {
    // Clear cookie client-side immediately for instant redirect
    document.cookie = 'session_token=; path=/; max-age=0' + (location.protocol === 'https:' ? '; secure' : '');
    window.location.href = "/login";
    // Clear session in background (non-blocking)
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  };

  const handleChangePassword = async () => {
    if (!currentPass.trim() || !newPass.trim()) {
      toast.error("বর্তমান ও নতুন পাসওয়ার্ড দিন");
      return;
    }
    try {
      setChangePassLoading(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPass.trim(), newPassword: newPass.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "পাসওয়ার্ড পরিবর্তন ব্যর্থ");
        return;
      }
      toast.success("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে");
      setChangePassOpen(false);
      setCurrentPass("");
      setNewPass("");
    } catch {
      toast.error("পাসওয়ার্ড পরিবর্তন করতে সমস্যা");
    } finally {
      setChangePassLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.jpg" alt="লোগো" className="size-16 rounded-2xl shadow-lg shadow-emerald-200 mx-auto animate-pulse" />
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="size-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="size-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="size-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-muted-foreground mt-3">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 flex items-center justify-center">
        <div className="text-center space-y-4">
          <img src="/logo.jpg" alt="লোগো" className="size-16 rounded-2xl shadow-lg shadow-emerald-200 mx-auto" />
          <div>
            <p className="text-sm font-medium text-red-600">সার্ভারে সংযোগ করতে সমস্যা হচ্ছে</p>
            <p className="text-xs text-muted-foreground mt-1">ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন</p>
          </div>
          <Button onClick={() => { setAuthError(false); setChecking(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            আবার চেষ্টা করুন
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 flex flex-col">
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex-1">
        <BuildingsContextWrapper>
          <DashboardHeader user={user} onLogout={handleLogout} onChangePassword={() => { setCurrentPass(""); setNewPass(""); setChangePassOpen(true); }} />
          <MainTabs />
        </BuildingsContextWrapper>
      </div>

      {/* Scroll to top button — mobile friendly */}
      <ScrollToTopBtn />

      {/* Change Password Dialog */}
      <Dialog open={changePassOpen} onOpenChange={setChangePassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>পাসওয়ার্ড পরিবর্তন</DialogTitle>
            <DialogDescription>আপনার বর্তমান পাসওয়ার্ড দিয়ে নতুন পাসওয়ার্ড সেট করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>বর্তমান পাসওয়ার্ড</Label>
              <Input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} placeholder="বর্তমান পাসওয়ার্ড" />
            </div>
            <div className="space-y-1.5">
              <Label>নতুন পাসওয়ার্ড</Label>
              <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePassOpen(false)}>বাতিল</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleChangePassword} disabled={changePassLoading}>
              {changePassLoading ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              পরিবর্তন করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Global Tenant Search & Room Detail Panel ───────────────────────────────

interface SearchResultTenant {
  id: string; name: string; designation: string | null; phone: string | null;
  startDate: string; roomId: string; isActive: number;
  roomNumber: string; floorNumber: number; buildingName: string; buildingId: string;
  searchType?: string;
  tenantCount?: number;
  roomUsers?: { id: string; name: string; designation: string | null; department: string | null }[];
}

interface RoomDetailData {
  roomNumber: string; buildingName: string; floorNumber: number;
  roomId?: string;
  currentTenants: { id: string; name: string; designation: string | null; phone: string | null; startDate: string }[];
  currentRoomUsers: { id: string; name: string; designation: string | null; phone: string | null; department: string | null; startDate: string }[];
  previousRoomUsers: { id: string; name: string; designation: string | null; phone: string | null; department: string | null; startDate: string; endDate: string | null }[];
  currentInventory: { id: string; itemName: string; quantity: number; condition: string; note: string | null; tenantId: string | null; tenantName: string | null }[];
  previousInventory: { id: string; itemName: string; quantity: number; condition: string; note: string | null; tenantId: string | null; tenantName: string | null }[];
  previousTenants: { id: string; name: string; designation: string | null; phone: string | null; startDate: string; endDate: string | null }[];
  vacateRecords: { id: string; tenantId: string; tenantName: string; vacatedAt: string; inventorySnapshot: string }[];
  inventorySnapshots: { id: string; tenantId: string; tenantName: string; snapshotType: string; inventorySnapshot: string; createdAt: string }[];
}

function GlobalSearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultTenant[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<SearchResultTenant | null>(null);
  const [roomDetail, setRoomDetail] = useState<RoomDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Inventory edit states
  const [editInvOpen, setEditInvOpen] = useState(false);
  const [editInvItem, setEditInvItem] = useState<{ id: string; itemName: string; quantity: number; condition: string; note: string | null } | null>(null);
  const [editInvRepairDate, setEditInvRepairDate] = useState("");
  const [editInvReplaceDate, setEditInvReplaceDate] = useState("");
  const [editInvRepairNote, setEditInvRepairNote] = useState("");
  const [editInvReplaceNote, setEditInvReplaceNote] = useState("");
  const [editingInv, setEditingInv] = useState(false);
  const [deletingInv, setDeletingInv] = useState(false);

  // Repair dates state
  const [repairDates, setRepairDates] = useState<Record<string, { latestRepair: string; latestReplace: string; repairNote: string | null; replaceNote: string | null }>>({});

  // Full repair/replace history for edit dialog
  const [invRepairHistory, setInvRepairHistory] = useState<{ id: string; type: string; actionDate: string; note: string | null }[]>([]);
  const [invLatestRepairDate, setInvLatestRepairDate] = useState("");
  const [invLatestReplaceDate, setInvLatestReplaceDate] = useState("");
  const [showInvHistory, setShowInvHistory] = useState(false);
  const [newRepairDate, setNewRepairDate] = useState("");
  const [newRepairNote, setNewRepairNote] = useState("");
  const [newReplaceDate, setNewReplaceDate] = useState("");
  const [newReplaceNote, setNewReplaceNote] = useState("");
  const [savingRepairRecord, setSavingRepairRecord] = useState(false);
  const [invHistoryPage, setInvHistoryPage] = useState(1);
  const INV_HISTORY_PER_PAGE = 10;

  // Common belongings loading
  const [commonItems, setCommonItems] = useState<{ itemName: string; quantity: string; condition: string }[]>([]);
  const [loadingCommon, setLoadingCommon] = useState(false);
  const [addingCommonToTenant, setAddingCommonToTenant] = useState(false);
  const [editCommonIdx, setEditCommonIdx] = useState<number | null>(null);
  const [editCommonName, setEditCommonName] = useState("");
  const [editCommonQty, setEditCommonQty] = useState("");
  const [editCommonCond, setEditCommonCond] = useState("ভালো");
  const [commonTenantSelectId, setCommonTenantSelectId] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 1) { setResults([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/tenant-search?q=${encodeURIComponent(value.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
          setShowDropdown(true);
        }
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 300);
  };

  // Load room detail when selected
  const handleSelectTenant = async (tenant: SearchResultTenant) => {
    setSelectedTenant(tenant);
    setShowDropdown(false);
    setQuery(tenant.searchType === 'room' ? `রুম ${tenant.roomNumber}` : tenant.name);
    setLoadingDetail(true);
    setRoomDetail(null);
    setRepairDates({});
    setCommonItems([]);
    setCommonTenantSelectId("");
    try {
      const res = await fetch(`/api/room-wise-data?roomId=${tenant.roomId}`);
      if (res.ok) {
        const data = await res.json();
        const detail: RoomDetailData = {
          roomId: data.roomId || tenant.roomId,
          roomNumber: data.roomNumber || tenant.roomNumber,
          buildingName: tenant.buildingName,
          floorNumber: data.floorNumber || tenant.floorNumber,
          currentTenants: (data.currentTenants || []).map((t: any) => ({ id: t.id, name: t.name, designation: t.designation, phone: t.phone, startDate: t.startDate })),
          currentRoomUsers: (data.currentRoomUsers || []).map((u: any) => ({ id: u.id, name: u.name, designation: u.designation, phone: u.phone, department: u.department, startDate: u.startDate })),
          previousRoomUsers: (data.previousRoomUsers || []).map((u: any) => ({ id: u.id, name: u.name, designation: u.designation, phone: u.phone, department: u.department, startDate: u.startDate, endDate: u.endDate })),
          currentInventory: (data.currentInventory || []).map((i: any) => ({ id: i.id, itemName: i.itemName, quantity: i.quantity, condition: i.condition, note: i.note, tenantId: i.tenantId, tenantName: i.tenantName })),
          previousInventory: (data.previousInventory || []).map((i: any) => ({ id: i.id, itemName: i.itemName, quantity: i.quantity, condition: i.condition, note: i.note, tenantId: i.tenantId, tenantName: i.tenantName })),
          previousTenants: (data.previousTenants || []).map((t: any) => ({ id: t.id, name: t.name, designation: t.designation, phone: t.phone, startDate: t.startDate, endDate: t.endDate })),
          vacateRecords: (data.vacateRecords || []).map((vr: any) => ({ id: vr.id, tenantId: vr.tenantId, tenantName: vr.tenantName, vacatedAt: vr.vacatedAt, inventorySnapshot: vr.inventorySnapshot })),
          inventorySnapshots: (data.inventorySnapshots || []).map((s: any) => ({ id: s.id, tenantId: s.tenantId, tenantName: s.tenantName, snapshotType: s.snapshotType, inventorySnapshot: s.inventorySnapshot, createdAt: s.createdAt })),
        };
        setRoomDetail(detail);
        if (detail.currentTenants.length > 0) setCommonTenantSelectId(detail.currentTenants[0].id);

        // Fetch repair/replace dates for both current and previous inventory
        const invIds = [
          ...detail.currentInventory.map((i) => i.id).filter(Boolean),
          ...detail.previousInventory.map((i) => i.id).filter(Boolean),
        ];
        if (invIds.length > 0) {
          try {
            const rrRes = await fetch(`/api/inventory/repair-replace?inventoryIds=${invIds.join(',')}`);
            if (rrRes.ok) setRepairDates(await rrRes.json());
          } catch { /* silent */ }
        }
      }
    } catch { toast.error("রুমের তথ্য লোড করতে সমস্যা"); }
    finally { setLoadingDetail(false); }
  };

  // Silent refresh for search panel — updates data in-place without showing loading
  const silentRefreshSearchDetail = async () => {
    if (!selectedTenant) return;
    try {
      const res = await fetch(`/api/room-wise-data?roomId=${selectedTenant.roomId}`);
      if (!res.ok) return;
      const data = await res.json();
      const detail: RoomDetailData = {
        roomId: data.roomId || selectedTenant.roomId,
        roomNumber: data.roomNumber || selectedTenant.roomNumber,
        buildingName: selectedTenant.buildingName,
        floorNumber: data.floorNumber || selectedTenant.floorNumber,
        currentTenants: (data.currentTenants || []).map((t: any) => ({ id: t.id, name: t.name, designation: t.designation, phone: t.phone, startDate: t.startDate })),
        currentRoomUsers: (data.currentRoomUsers || []).map((u: any) => ({ id: u.id, name: u.name, designation: u.designation, phone: u.phone, department: u.department, startDate: u.startDate })),
        previousRoomUsers: (data.previousRoomUsers || []).map((u: any) => ({ id: u.id, name: u.name, designation: u.designation, phone: u.phone, department: u.department, startDate: u.startDate, endDate: u.endDate })),
        currentInventory: (data.currentInventory || []).map((i: any) => ({ id: i.id, itemName: i.itemName, quantity: i.quantity, condition: i.condition, note: i.note, tenantId: i.tenantId, tenantName: i.tenantName })),
        previousInventory: (data.previousInventory || []).map((i: any) => ({ id: i.id, itemName: i.itemName, quantity: i.quantity, condition: i.condition, note: i.note, tenantId: i.tenantId, tenantName: i.tenantName })),
        previousTenants: (data.previousTenants || []).map((t: any) => ({ id: t.id, name: t.name, designation: t.designation, phone: t.phone, startDate: t.startDate, endDate: t.endDate })),
        vacateRecords: (data.vacateRecords || []).map((vr: any) => ({ id: vr.id, tenantId: vr.tenantId, tenantName: vr.tenantName, vacatedAt: vr.vacatedAt, inventorySnapshot: vr.inventorySnapshot })),
        inventorySnapshots: (data.inventorySnapshots || []).map((s: any) => ({ id: s.id, tenantId: s.tenantId, tenantName: s.tenantName, snapshotType: s.snapshotType, inventorySnapshot: s.inventorySnapshot, createdAt: s.createdAt })),
      };
      setRoomDetail(detail);
      // Re-fetch repair/replace dates
      const invIds = [
        ...detail.currentInventory.map((i) => i.id).filter(Boolean),
        ...detail.previousInventory.map((i) => i.id).filter(Boolean),
      ];
      if (invIds.length > 0) {
        try {
          const rrRes = await fetch(`/api/inventory/repair-replace?inventoryIds=${invIds.join(',')}`);
          if (rrRes.ok) setRepairDates(await rrRes.json());
        } catch { /* silent */ }
      }
    } catch { /* silent */ }
  };

  // Room allocation from search panel
  const [spAllocOpen, setSpAllocOpen] = useState(false);
  const [spAllocName, setSpAllocName] = useState("");
  const [spAllocDesig, setSpAllocDesig] = useState("");
  const [spAllocPhone, setSpAllocPhone] = useState("");
  const [spAllocDept, setSpAllocDept] = useState("");
  const [spAllocDate, setSpAllocDate] = useState("");
  const [spAllocating, setSpAllocating] = useState(false);

  // Add new item from search panel
  const [spAddInvOpen, setSpAddInvOpen] = useState(false);
  const [spAddInvName, setSpAddInvName] = useState("");
  const [spAddInvQty, setSpAddInvQty] = useState("1");
  const [spAddInvCond, setSpAddInvCond] = useState("আছে");
  const [spAddInvNote, setSpAddInvNote] = useState("");
  const [spAddingInv, setSpAddingInv] = useState(false);
  const [spBulkEditMode, setSpBulkEditMode] = useState(false);
  const [spBulkEditData, setSpBulkEditData] = useState<Record<string, { quantity: string; condition: string }>>({});
  const [spSavingBulk, setSpSavingBulk] = useState(false);

  const handleSpAlloc = async () => {
    const targetRoomId = roomDetail?.roomId || selectedTenant?.roomId;
    if (!spAllocName.trim() || !spAllocDate || !targetRoomId) {
      toast.error("নাম ও যোগদানের তারিখ দিন");
      return;
    }
    setSpAllocating(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: spAllocName.trim(),
          designation: spAllocDesig.trim() || null,
          phone: spAllocPhone.trim() || null,
          department: spAllocDept.trim() || null,
          roomId: targetRoomId,
          roomNumber: roomDetail?.roomNumber || selectedTenant?.roomNumber,
          startDate: spAllocDate,
          inventoryItems: [],
          skipDeactivate: true,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("রুম বরাদ্দ হয়েছে");
      setSpAllocName(""); setSpAllocDesig(""); setSpAllocPhone(""); setSpAllocDept(""); setSpAllocDate("");
      setGpActiveForm(null);
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("রুম বরাদ্দ করতে সমস্যা"); }
    finally { setSpAllocating(false); }
  };

  const handleSpAddRoomUser = async () => {
    const targetRoomId = roomDetail?.roomId || selectedTenant?.roomId;
    if (!spAddRoomUserName.trim() || !spAddRoomUserDate || !targetRoomId) {
      toast.error("নাম ও শুরুর তারিখ দিন");
      return;
    }
    setSpAddingRoomUser(true);
    try {
      const res = await fetch("/api/room-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: spAddRoomUserName.trim(),
          designation: spAddRoomUserDesig.trim() || null,
          phone: spAddRoomUserPhone.trim() || null,
          department: spAddRoomUserDept.trim() || null,
          roomId: targetRoomId,
          startDate: spAddRoomUserDate,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("ব্যবহারকারী যোগ হয়েছে");
      setSpAddRoomUserName(""); setSpAddRoomUserDesig(""); setSpAddRoomUserPhone(""); setSpAddRoomUserDept(""); setSpAddRoomUserDate("");
      setGpActiveForm(null);
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("ব্যবহারকারী যোগ করতে সমস্যা"); }
    finally { setSpAddingRoomUser(false); }
  };

  const handleSpAddInv = async () => {
    const targetRoomId = roomDetail?.roomId || selectedTenant?.roomId;
    if (!spAddInvName.trim() || !targetRoomId) {
      toast.error("মালামালের নাম দিন");
      return;
    }
    setSpAddingInv(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: spAddInvName.trim(),
          quantity: parseInt(spAddInvQty) || 0,
          condition: spAddInvCond,
          roomId: targetRoomId,
          roomNumber: roomDetail?.roomNumber || selectedTenant?.roomNumber,
          tenantId: null,
          note: spAddInvNote.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("নতুন মালামাল যোগ হয়েছে");
      setSpAddInvName(""); setSpAddInvQty("1"); setSpAddInvCond("আছে"); setSpAddInvNote("");
      setSpAddInvOpen(false);
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("মালামাল যোগ করতে সমস্যা"); }
    finally { setSpAddingInv(false); }
  };

  // Load common belongings (filter duplicates)
  const handleLoadCommon = async () => {
    if (!selectedTenant?.buildingId) { toast.error("বিল্ডিং আইডি পাওয়া যায়নি"); return; }
    try {
      setLoadingCommon(true);
      const r = await fetch(`/api/belongings?buildingId=${selectedTenant.buildingId}`);
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          // Filter out items already in room
          const existingNames = new Set(
            (roomDetail?.currentInventory || []).map((inv) => inv.itemName.trim().toLowerCase())
          );
          const filtered = data.filter((item: any) => !existingNames.has(item.itemName.trim().toLowerCase()));
          if (filtered.length === 0) {
            toast.info("সব মালামাল ইতিমধ্যে এই রুমে আছে");
          } else {
            setCommonItems(filtered.map((item: any) => ({ itemName: item.itemName, quantity: String(item.quantity), condition: "আছে" })));
            const skipped = data.length - filtered.length;
            toast.success(`${toBanglaNumber(filtered.length)} টি কমন মালামাল লোড হয়েছে${skipped > 0 ? ` (${toBanglaNumber(skipped)} টি ডুপ্লিকেট বাদ)` : ''}`);
          }
        } else { toast.error("এই বিল্ডিংয়ে কোনো কমন মালামাল নেই"); }
      }
    } catch { toast.error("কমন মালামাল লোড করতে সমস্যা"); }
    finally { setLoadingCommon(false); }
  };

  // Add common items to room (inventory belongs to the room, always saved with tenantId=null)
  const handleAddCommonToTenant = async () => {
    const targetRoomId = roomDetail?.roomId || selectedTenant?.roomId;
    if (!targetRoomId) {
      toast.error("রুম পাওয়া যায়নি");
      return;
    }
    if (commonItems.length === 0) { toast.error("কোনো মালামাল লোড করা হয়নি"); return; }

    try {
      setAddingCommonToTenant(true);
      const res = await fetch("/api/inventory/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: commonItems.filter(i => i.itemName.trim()),
          roomId: targetRoomId,
          roomNumber: roomDetail?.roomNumber || selectedTenant?.roomNumber,
        }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error || "মালামাল যোগ করতে সমস্যা"); return; }

      toast.success(`${toBanglaNumber(result.added || 0)} টি মালামাল যোগ হয়েছে${result.skipped > 0 ? `, ${toBanglaNumber(result.skipped)} টি ডুপ্লিকেট বাদ` : ''}`);
      setCommonItems([]);
      setCommonTenantSelectId(roomDetail?.currentTenants?.[0]?.id || "");
      // Refresh from server
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("মালামাল যোগ করতে সমস্যা"); }
    finally { setAddingCommonToTenant(false); }
  };

  // Quick save repair/replace record
  const handleSaveQuickRepair = async (type: "repair" | "replace") => {
    if (!editInvItem) return;
    const date = type === "repair" ? newRepairDate : newReplaceDate;
    const note = type === "repair" ? newRepairNote : newReplaceNote;
    if (!date.trim()) { toast.error(type === "repair" ? "Repair তারিখ দিন" : "Replace তারিখ দিন"); return; }
    setSavingRepairRecord(true);
    try {
      const res = await fetch("/api/inventory/repair-replace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventoryId: editInvItem.id, type, actionDate: date, note: note.trim() || null }) });
      if (!res.ok) throw new Error();
      const histRes = await fetch(`/api/inventory/repair-replace?inventoryId=${editInvItem.id}`);
      if (histRes.ok) {
        const records = await histRes.json();
        setInvRepairHistory(records);
        const repairRecord = records.find((r: any) => r.type === "repair");
        const replaceRecord = records.find((r: any) => r.type === "replace");
        setInvLatestRepairDate(repairRecord ? (repairRecord.actionDate ? repairRecord.actionDate.split("T")[0] : "") : "");
        setInvLatestReplaceDate(replaceRecord ? (replaceRecord.actionDate ? replaceRecord.actionDate.split("T")[0] : "") : "");
      }
      if (type === "repair") { setNewRepairDate(""); setNewRepairNote(""); } else { setNewReplaceDate(""); setNewReplaceNote(""); }
      toast.success(type === "repair" ? "Repair রেকর্ড সেভ হয়েছে" : "Replace রেকর্ড সেভ হয়েছে");
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("রেকর্ড সেভ করতে সমস্যা"); }
    finally { setSavingRepairRecord(false); }
  };

  // Delete repair/replace record
  const handleDeleteRepairRecord = async (recordId: string) => {
    try {
      await fetch("/api/inventory/repair-replace", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: recordId }) });
      setInvRepairHistory(prev => prev.filter(r => r.id !== recordId));
      toast.success("রেকর্ড মুছে ফেলা হয়েছে");
      if (editInvItem) {
        const histRes = await fetch(`/api/inventory/repair-replace?inventoryId=${editInvItem.id}`);
        if (histRes.ok) {
          const records = await histRes.json();
          const repairRecord = records.find((r: any) => r.type === "repair");
          const replaceRecord = records.find((r: any) => r.type === "replace");
          setInvLatestRepairDate(repairRecord ? (repairRecord.actionDate ? repairRecord.actionDate.split("T")[0] : "") : "");
          setInvLatestReplaceDate(replaceRecord ? (replaceRecord.actionDate ? replaceRecord.actionDate.split("T")[0] : "") : "");
        }
      }
    } catch { toast.error("মুছে ফেলতে সমস্যা"); }
  };

  // Edit inventory
  const handleEditInventory = async () => {
    if (!editInvItem) return;
    setEditingInv(true);
    try {
      const res = await fetch("/api/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editInvItem.id, itemName: editInvItem.itemName, quantity: editInvItem.quantity, condition: editInvItem.condition, note: editInvItem.note }) });
      if (!res.ok) throw new Error();
      if (newRepairDate.trim()) {
        await fetch("/api/inventory/repair-replace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventoryId: editInvItem.id, type: "repair", actionDate: newRepairDate, note: newRepairNote.trim() || null }) }).catch(() => {});
      }
      if (newReplaceDate.trim()) {
        await fetch("/api/inventory/repair-replace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventoryId: editInvItem.id, type: "replace", actionDate: newReplaceDate, note: newReplaceNote.trim() || null }) }).catch(() => {});
      }
      toast.success("মালামাল আপডেট হয়েছে");
      setEditInvOpen(false); setEditInvItem(null);
      setNewRepairDate(""); setNewReplaceDate(""); setNewRepairNote(""); setNewReplaceNote("");
      setInvRepairHistory([]); setInvLatestRepairDate(""); setInvLatestReplaceDate("");
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("মালামাল আপডেট করতে সমস্যা"); }
    finally { setEditingInv(false); }
  };

  const handleDeleteInventory = async (id: string) => {
    setDeletingInv(true);
    try { const res = await fetch("/api/inventory", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (!res.ok) throw new Error(); toast.success("মালামাল মুছে ফেলা হয়েছে"); if (selectedTenant) silentRefreshSearchDetail(); } catch { toast.error("মুছে ফেলতে সমস্যা"); } finally { setDeletingInv(false); }
  };

  // Download inventory XLSX for GlobalSearchPanel
  const [spDownloadingInv, setSpDownloadingInv] = useState(false);
  const handleSpDownloadInventory = async () => {
    if (!roomDetail) return;
    const items = roomDetail.currentInventory.length > 0 ? roomDetail.currentInventory : roomDetail.previousInventory;
    if (items.length === 0) { toast.error("কোনো মালামাল নেই"); return; }
    setSpDownloadingInv(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("মালামাল তালিকা");

      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
      const thinBorder = { top: { style: "thin", color: { argb: "FFCCCCCC" } }, bottom: { style: "thin", color: { argb: "FFCCCCCC" } }, left: { style: "thin", color: { argb: "FFCCCCCC" } }, right: { style: "thin", color: { argb: "FFCCCCCC" } } };
      const centerAlign = { horizontal: "center", vertical: "middle", wrapText: false };

      const titleRow = sheet.addRow([`মালামাল তালিকা — ${roomDetail.buildingName || ""}, রুম ${roomDetail.roomNumber}`]);
      sheet.mergeCells(1, 1, 1, 9);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 13, color: { argb: "FF2563EB" } };
      titleCell.alignment = centerAlign;
      titleRow.height = 32;

      const headers = ["ক্রম", "মালামাল", "পরিমাণ", "অবস্থা", "নোট", "সর্বশেষ রিপেয়ার", "সর্বশেষ রিপ্লেস", "সকল রিপেয়ার তারিখ", "সকল রিপ্লেস তারিখ"];
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; cell.border = border; cell.alignment = centerAlign; });
      headerRow.height = 28;

      // Fetch ALL repair/replace records for each item individually
      const allRepairDatesMap: Record<string, string[]> = {};
      const allReplaceDatesMap: Record<string, string[]> = {};
      const latestRepairMap: Record<string, string> = {};
      const latestReplaceMap: Record<string, string> = {};
      await Promise.all(items.map(async (item) => {
        try {
          const res = await fetch(`/api/inventory/repair-replace?inventoryId=${item.id}`);
          if (res.ok) {
            const records = await res.json();
            const repairDates = records.filter((r: any) => r.type === "repair").map((r: any) => r.actionDate).filter(Boolean).sort().reverse();
            const replaceDates = records.filter((r: any) => r.type === "replace").map((r: any) => r.actionDate).filter(Boolean).sort().reverse();
            allRepairDatesMap[item.id] = repairDates;
            allReplaceDatesMap[item.id] = replaceDates;
            if (repairDates.length > 0) latestRepairMap[item.id] = repairDates[0];
            if (replaceDates.length > 0) latestReplaceMap[item.id] = replaceDates[0];
          }
        } catch { /* silent */ }
      }));

      items.forEach((item, idx) => {
        const repairDates = allRepairDatesMap[item.id] || [];
        const replaceDates = allReplaceDatesMap[item.id] || [];
        const r = sheet.addRow([
          idx + 1,
          item.itemName,
          toBanglaNumber(item.quantity),
          item.condition,
          item.note || "—",
          latestRepairMap[item.id] ? new Date(latestRepairMap[item.id]).toLocaleDateString("bn-BD") : "—",
          latestReplaceMap[item.id] ? new Date(latestReplaceMap[item.id]).toLocaleDateString("bn-BD") : "—",
          repairDates.length > 0 ? repairDates.map((d) => new Date(d).toLocaleDateString("bn-BD")).join(", ") : "—",
          replaceDates.length > 0 ? replaceDates.map((d) => new Date(d).toLocaleDateString("bn-BD")).join(", ") : "—",
        ]);
        r.eachCell((cell) => { cell.border = thinBorder; cell.alignment = centerAlign; });
      });

      // Auto-fit column widths
      sheet.columns.forEach((col, i) => {
        if (i === 0) { col.width = 5; return; }
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (cell) => {
          const val = String(cell.value || "");
          if (val.length > maxLen) maxLen = val.length;
        });
        const headerVal = headers[i] || "";
        col.width = Math.ceil(Math.max(headerVal.length, maxLen) * 1.3) + 1;
      });

      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 2, topLeftCell: "A3", activeCell: "A3" }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `মালামাল_তালিকা_${roomDetail.buildingName || ""}_রুম_${roomDetail.roomNumber}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("XLSX ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); } finally { setSpDownloadingInv(false); }
  };

  const clearSelection = () => {
    setSelectedTenant(null);
    setRoomDetail(null);
    setQuery("");
    setRepairDates({});
    setCommonItems([]);
    setCommonTenantSelectId("");
    setGpVacateOpen(false);
    setGpVacateTenantId("");
  };

  // Guest booking form (inline in room detail panel)
  const [gpGbOpen, setGpGbOpen] = useState(false);
  const [gpGbName, setGpGbName] = useState("");
  const [gpGbMobile, setGpGbMobile] = useState("");
  const [gpGbCheckIn, setGpGbCheckIn] = useState("");
  const [gpGbCheckInTime, setGpGbCheckInTime] = useState("");
  const [gpGbCheckOut, setGpGbCheckOut] = useState("");
  const [gpGbCheckOutTime, setGpGbCheckOutTime] = useState("");
  const [gpGbBill, setGpGbBill] = useState("");
  const [gpGbNote, setGpGbNote] = useState("");
  const [gpGbIsPaid, setGpGbIsPaid] = useState(true);
  const [gpGbBooking, setGpGbBooking] = useState(false);

  // Room user CRUD states (GlobalSearchPanel)
  const [spEditRoomUserOpen, setSpEditRoomUserOpen] = useState(false);
  const [spEditRoomUserData, setSpEditRoomUserData] = useState<{ id: string; name: string; designation: string; phone: string; department: string; startDate: string } | null>(null);
  const [spEditingRoomUser, setSpEditingRoomUser] = useState(false);
  const [spDeleteRoomUserOpen, setSpDeleteRoomUserOpen] = useState(false);
  const [spDeleteRoomUserId, setSpDeleteRoomUserId] = useState("");
  const [spDeleteRoomUserName, setSpDeleteRoomUserName] = useState("");
  const [spDeletingRoomUser, setSpDeletingRoomUser] = useState(false);
  const [spLeavingRoomUser, setSpLeavingRoomUser] = useState<string | null>(null);
  const [spRoomUserExpanded, setSpRoomUserExpanded] = useState<string | null>(null);
  const [spPrevRoomUserExpanded, setSpPrevRoomUserExpanded] = useState<string | null>(null);
  const [spPrevRoomUserPage, setSpPrevRoomUserPage] = useState(1);
  const SP_PREV_ROOM_USER_PER_PAGE = 7;
  const [spDeletePrevRoomUserOpen, setSpDeletePrevRoomUserOpen] = useState(false);
  const [spDeletePrevRoomUserId, setSpDeletePrevRoomUserId] = useState("");
  const [spDeletePrevRoomUserName, setSpDeletePrevRoomUserName] = useState("");
  const [spDeletingPrevRoomUser, setSpDeletingPrevRoomUser] = useState(false);
  const [gpActiveForm, setGpActiveForm] = useState<"alloc" | "guest" | "roomUser" | "vacate" | null>(null);

  // Add room user form states
  const [spAddRoomUserOpen, setSpAddRoomUserOpen] = useState(false);
  const [spAddRoomUserName, setSpAddRoomUserName] = useState("");
  const [spAddRoomUserDesig, setSpAddRoomUserDesig] = useState("");
  const [spAddRoomUserPhone, setSpAddRoomUserPhone] = useState("");
  const [spAddRoomUserDept, setSpAddRoomUserDept] = useState("");
  const [spAddRoomUserDate, setSpAddRoomUserDate] = useState("");
  const [spAddingRoomUser, setSpAddingRoomUser] = useState(false);

  const handleSpEditRoomUser = async () => {
    if (!spEditRoomUserData) return;
    setSpEditingRoomUser(true);
    try {
      const res = await fetch("/api/room-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: spEditRoomUserData.id,
          action: "update",
          name: spEditRoomUserData.name,
          designation: spEditRoomUserData.designation,
          phone: spEditRoomUserData.phone || null,
          department: spEditRoomUserData.department || null,
          startDate: spEditRoomUserData.startDate || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("তথ্য আপডেট হয়েছে");
      setSpEditRoomUserOpen(false);
      setSpEditRoomUserData(null);
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("আপডেট করতে সমস্যা"); }
    finally { setSpEditingRoomUser(false); }
  };

  const handleSpDeleteRoomUser = async () => {
    if (!spDeleteRoomUserId) return;
    setSpDeletingRoomUser(true);
    try {
      const res = await fetch("/api/room-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: spDeleteRoomUserId }),
      });
      if (!res.ok) throw new Error();
      toast.success("ব্যবহারকারী মুছে ফেলা হয়েছে");
      setSpDeleteRoomUserOpen(false);
      setSpDeleteRoomUserId("");
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("মুছে ফেলতে সমস্যা"); }
    finally { setSpDeletingRoomUser(false); }
  };

  const handleSpLeaveRoomUser = async (id: string) => {
    setSpLeavingRoomUser(id);
    try {
      const res = await fetch("/api/room-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "leave" }),
      });
      if (!res.ok) throw new Error();
      toast.success("রুম ছাড়া হয়েছে");
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("রুম ছাড়াতে সমস্যা"); }
    finally { setSpLeavingRoomUser(null); }
  };

  const handleSpDeletePrevRoomUser = async () => {
    if (!spDeletePrevRoomUserId) return;
    setSpDeletingPrevRoomUser(true);
    try {
      const res = await fetch("/api/room-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: spDeletePrevRoomUserId }),
      });
      if (!res.ok) throw new Error();
      toast.success("পূর্বের ব্যবহারকারী মুছে ফেলা হয়েছে");
      setSpDeletePrevRoomUserOpen(false);
      setSpDeletePrevRoomUserId("");
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("মুছে ফেলতে সমস্যা"); }
    finally { setSpDeletingPrevRoomUser(false); }
  };

  // Room detail tabs
  const [gpDetailTab, setGpDetailTab] = useState<"inventory" | "prevTenants" | "prevUsers" | "users">("inventory");
  const [gpPrevTenantPage, setGpPrevTenantPage] = useState(1);
  const GP_PREV_TENANT_PER_PAGE = 7;
  const [gpSelectedVacateRecord, setGpSelectedVacateRecord] = useState<any>(null);

  // Previous tenant edit/delete states
  const [editPrevTenantOpen, setEditPrevTenantOpen] = useState(false);
  const [editPrevTenantData, setEditPrevTenantData] = useState<{ id: string; tenantId: string; tenantName: string; designation: string; phone: string; startDate: string; endDate: string } | null>(null);
  const [editingPrevTenant, setEditingPrevTenant] = useState(false);
  const [deletingPrevTenant, setDeletingPrevTenant] = useState(false);
  const [deletingSnapshot, setDeletingSnapshot] = useState(false);

  // Inventory snapshot edit/delete states
  const [editSnapshotOpen, setEditSnapshotOpen] = useState(false);
  const [editSnapshotData, setEditSnapshotData] = useState<any[]>([]);
  const [editSnapshotId, setEditSnapshotId] = useState("");
  const [editSnapshotSaving, setEditSnapshotSaving] = useState(false);
  const [editSnapshotName, setEditSnapshotName] = useState("");
  const [editSnapshotType, setEditSnapshotType] = useState("");
  const [editSnapshotDate, setEditSnapshotDate] = useState("");
  const [deletingSnapshotRec, setDeletingSnapshotRec] = useState(false);

  const handleDownloadSnapshotXlsx = async (snapshot: any, tenantName: string, snapshotType: string, roomNumber?: string) => {
    try {
      let snapshotItems: any[] = [];
      try { snapshotItems = snapshot.inventorySnapshot ? JSON.parse(snapshot.inventorySnapshot) : []; } catch { snapshotItems = []; }
      if (snapshotItems.length === 0) { toast.error("কোনো মালামাল স্ন্যাপশট নেই"); return; }

      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("মালামাল স্ন্যাপশট");

      const typeLabel = snapshotType === 'assign' ? 'বরাদ্দ' : 'বাতিল';
      const snapDate = snapshot?.createdAt ? formatDate(snapshot.createdAt) : '';
      const buildingLabel = roomDetail?.buildingName ? ` — ${roomDetail.buildingName}` : '';

      const titleRow = sheet.addRow([`মালামাল স্ন্যাপশট — ${tenantName} — ${typeLabel} — রুম: ${roomNumber || ''}${buildingLabel}`]);
      sheet.mergeCells(1, 1, 1, 7);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 13 };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleRow.height = 28;

      const dateRow = sheet.addRow([snapDate ? `তারিখ: ${snapDate}` : '']);
      sheet.mergeCells(2, 1, 2, 7);
      const dateCell = dateRow.getCell(1);
      dateCell.font = { bold: true, size: 12, color: { argb: "FF333333" } };
      dateCell.alignment = { horizontal: "center", vertical: "middle" };
      dateRow.height = 24;

      const headers = ["ক্রমিক", "মালামালের নাম", "পরিমাণ", "অবস্থা", "নোট", "সর্বশেষ রিপেয়ার", "সর্বশেষ রিপ্লেস"];
      const headerRow = sheet.addRow(headers);
      headerRow.height = 22;
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } } as any;
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const thinBorder = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      headerRow.eachCell((cell) => { (cell as any).fill = headerFill; (cell as any).font = headerFont; (cell as any).border = thinBorder; (cell as any).alignment = { horizontal: "center", vertical: "middle" }; });

      snapshotItems.forEach((item: any, idx: number) => {
        const repairDate = item.latestRepair ? (item.latestRepair.split('T')[0] || item.latestRepair) : '';
        const replaceDate = item.latestReplace ? (item.latestReplace.split('T')[0] || item.latestReplace) : '';
        const row = sheet.addRow([idx + 1, item.itemName || item.name || "-", item.quantity || 0, item.condition || "-", item.note || "-", repairDate || "-", replaceDate || "-"]);
        row.eachCell((cell) => { (cell as any).border = thinBorder; (cell as any).alignment = { horizontal: "center", vertical: "middle" }; });
      });

      const colWidths = [6, 25, 8, 12, 20, 15, 15];
      sheet.columns.forEach((col, i) => { col.width = colWidths[i] || 15; });

      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 3, topLeftCell: "A4", activeCell: "A4" }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `স্ন্যাপশট_${tenantName}_${typeLabel}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); }
  };

  const handleEditSnapshot = (snapshot: any) => {
    let items: any[] = [];
    try { items = snapshot.inventorySnapshot ? JSON.parse(snapshot.inventorySnapshot) : []; } catch { items = []; }
    setEditSnapshotData(items.map((item: any) => ({ itemName: item.itemName || '', quantity: item.quantity || 0, condition: item.condition || '', note: item.note || '', latestRepair: item.latestRepair || '', latestReplace: item.latestReplace || '' })));
    setEditSnapshotId(snapshot.id);
    setEditSnapshotName(snapshot.tenantName || '');
    setEditSnapshotType(snapshot.snapshotType || 'assign');
    setEditSnapshotDate(snapshot.createdAt ? snapshot.createdAt.split('T')[0] : '');
    setEditSnapshotOpen(true);
  };

  const handleSaveEditSnapshot = async () => {
    setEditSnapshotSaving(true);
    try {
      const res = await fetch("/api/inventory-snapshots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editSnapshotId, inventorySnapshot: JSON.stringify(editSnapshotData), tenantName: editSnapshotName, snapshotType: editSnapshotType, createdAt: editSnapshotDate }),
      });
      if (!res.ok) throw new Error();
      toast.success("স্ন্যাপশট আপডেট হয়েছে");
      setEditSnapshotOpen(false);
      setEditSnapshotData([]);
      setEditSnapshotId("");
      setEditSnapshotName("");
      setEditSnapshotType("");
      setEditSnapshotDate("");
      if (refreshRoomDetail) await refreshRoomDetail();
      else if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("স্ন্যাপশট আপডেট করতে সমস্যা"); }
    finally { setEditSnapshotSaving(false); }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    setDeletingSnapshotRec(true);
    try {
      const res = await fetch("/api/inventory-snapshots", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: snapshotId }),
      });
      if (!res.ok) throw new Error();
      toast.success("স্ন্যাপশট মুছে ফেলা হয়েছে");
      if (refreshRoomDetail) await refreshRoomDetail();
      else if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("স্ন্যাপশট মুছে ফেলতে সমস্যা"); }
    finally { setDeletingSnapshotRec(false); }
  };

  const handleGpGbBook = async () => {
    const targetRoomId = roomDetail?.roomId || selectedTenant?.roomId;
    const targetRoomNumber = roomDetail?.roomNumber || selectedTenant?.roomNumber;
    if (!gpGbName.trim() || !gpGbCheckIn || !targetRoomId) {
      toast.error("নাম ও চেক-ইন তারিখ দিন");
      return;
    }
    setGpGbBooking(true);
    try {
      const payload: Record<string, unknown> = {
        name: gpGbName.trim(),
        mobile: gpGbMobile.trim() || null,
        checkInDate: gpGbCheckIn,
        checkInTime: gpGbCheckInTime.trim() || null,
        checkOutDate: gpGbCheckOut || null,
        checkOutTime: gpGbCheckOutTime.trim() || null,
        totalBill: gpGbIsPaid ? (gpGbBill.trim() || null) : "Non Paid",
        note: gpGbNote.trim() || null,
        isPaid: gpGbIsPaid,
        isBooked: true,
        roomId: targetRoomId,
        roomNumber: targetRoomNumber,
      };
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || "গেস্ট বুক করতে সমস্যা"); return; }
      toast.success(gpGbIsPaid ? "Paid গেস্ট বুক হয়েছে" : "Non Paid গেস্ট বুক হয়েছে");
      setGpGbName(""); setGpGbMobile(""); setGpGbCheckIn(""); setGpGbCheckInTime("");
      setGpGbCheckOut(""); setGpGbCheckOutTime(""); setGpGbBill(""); setGpGbNote("");
      setGpGbIsPaid(true); setGpActiveForm(null);
      window.dispatchEvent(new Event("dashboard-data-changed"));
    } catch { toast.error("নেটওয়ার্ক সমস্যা"); }
    finally { setGpGbBooking(false); }
  };

  // Vacate tenant from global search panel
  const [gpVacateOpen, setGpVacateOpen] = useState(false);
  const [gpVacateTenantId, setGpVacateTenantId] = useState("");
  const [gpVacating, setGpVacating] = useState(false);

  // Edit tenant from global search panel
  const [gpEditTenantOpen, setGpEditTenantOpen] = useState(false);
  const [gpEditTenantData, setGpEditTenantData] = useState<{ id: string; name: string; designation: string; phone: string; department: string; startDate: string } | null>(null);
  const [gpSavingTenantEdit, setGpSavingTenantEdit] = useState(false);

  // Delete tenant from global search panel
  const [gpDeleteTenantOpen, setGpDeleteTenantOpen] = useState(false);
  const [gpDeleteTenantId, setGpDeleteTenantId] = useState("");
  const [gpDeleteTenantName, setGpDeleteTenantName] = useState("");
  const [gpDeletingTenant, setGpDeletingTenant] = useState(false);

  const handleGpEditTenant = (t: { id: string; name: string; designation: string | null; phone: string | null; startDate: string }) => {
    setGpEditTenantData({
      id: t.id,
      name: t.name,
      designation: t.designation || '',
      phone: t.phone || '',
      department: (t as any).department || '',
      startDate: t.startDate ? t.startDate.split('T')[0] : '',
    });
    setGpEditTenantOpen(true);
  };

  const handleGpSaveTenantEdit = async () => {
    if (!gpEditTenantData) return;
    setGpSavingTenantEdit(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: gpEditTenantData.id,
          action: "updateInfo",
          name: gpEditTenantData.name,
          designation: gpEditTenantData.designation,
          phone: gpEditTenantData.phone || null,
          department: gpEditTenantData.department || null,
          startDate: gpEditTenantData.startDate || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("তথ্য আপডেট হয়েছে");
      setGpEditTenantOpen(false);
      setGpEditTenantData(null);
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("আপডেট করতে সমস্যা হয়েছে"); }
    finally { setGpSavingTenantEdit(false); }
  };

  const handleGpDeleteTenant = async () => {
    if (!gpDeleteTenantId) return;
    setGpDeletingTenant(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: gpDeleteTenantId }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${gpDeleteTenantName} মুছে ফেলা হয়েছে`);
      setGpDeleteTenantOpen(false);
      setGpDeleteTenantId("");
      setGpDeleteTenantName("");
      if (selectedTenant) silentRefreshSearchDetail();
    } catch { toast.error("মুছে ফেলতে সমস্যা হয়েছে"); }
    finally { setGpDeletingTenant(false); }
  };

  const handleGpVacate = async () => {
    if (!gpVacateTenantId) return;
    setGpVacating(true);
    try {
      const res = await fetch("/api/vacate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: gpVacateTenantId }),
      });
      if (!res.ok) throw new Error();
      const vacatedName = roomDetail?.currentTenants?.find((t) => t.id === gpVacateTenantId)?.name;
      toast.success(`${vacatedName || 'ভাড়াটে'} রুম ছেড়েছেন`);
      setGpActiveForm(null);
      setGpVacateTenantId("");
      if (selectedTenant) silentRefreshSearchDetail();
    } catch {
      toast.error("রুম ছাড়াতে সমস্যা হয়েছে");
    } finally {
      setGpVacating(false);
    }
  };

  // Helper to refresh room detail
  const refreshRoomDetail = async () => {
    if (!selectedTenant) return null;
    try {
      const res = await fetch(`/api/room-wise-data?roomId=${roomDetail?.roomId || selectedTenant.roomId}`);
      if (res.ok) {
        const data = await res.json();
        const detail: RoomDetailData = {
          roomId: data.roomId || selectedTenant.roomId,
          roomNumber: data.roomNumber || selectedTenant.roomNumber,
          buildingName: selectedTenant.buildingName,
          floorNumber: data.floorNumber || selectedTenant.floorNumber,
          currentTenants: (data.currentTenants || []).map((t: any) => ({ id: t.id, name: t.name, designation: t.designation, phone: t.phone, startDate: t.startDate })),
          currentRoomUsers: (data.currentRoomUsers || []).map((u: any) => ({ id: u.id, name: u.name, designation: u.designation, phone: u.phone, department: u.department, startDate: u.startDate })),
          previousRoomUsers: (data.previousRoomUsers || []).map((u: any) => ({ id: u.id, name: u.name, designation: u.designation, phone: u.phone, department: u.department, startDate: u.startDate, endDate: u.endDate })),
          currentInventory: (data.currentInventory || []).map((i: any) => ({ id: i.id, itemName: i.itemName, quantity: i.quantity, condition: i.condition, note: i.note, tenantId: i.tenantId, tenantName: i.tenantName })),
          previousInventory: (data.previousInventory || []).map((i: any) => ({ id: i.id, itemName: i.itemName, quantity: i.quantity, condition: i.condition, note: i.note, tenantId: i.tenantId, tenantName: i.tenantName })),
          previousTenants: (data.previousTenants || []).map((t: any) => ({ id: t.id, name: t.name, designation: t.designation, phone: t.phone, startDate: t.startDate, endDate: t.endDate })),
          vacateRecords: (data.vacateRecords || []).map((vr2: any) => ({ id: vr2.id, tenantId: vr2.tenantId, tenantName: vr2.tenantName, vacatedAt: vr2.vacatedAt, inventorySnapshot: vr2.inventorySnapshot })),
          inventorySnapshots: (data.inventorySnapshots || []).map((s: any) => ({ id: s.id, tenantId: s.tenantId, tenantName: s.tenantName, snapshotType: s.snapshotType, inventorySnapshot: s.inventorySnapshot, createdAt: s.createdAt })),
        };
        setRoomDetail(detail);
        return detail;
      }
    } catch { /* silent */ }
    return null;
  };

  const handleEditPrevTenant = (vr: any, pt: any) => {
    setEditPrevTenantData({
      id: vr.id,
      tenantId: vr.tenantId,
      tenantName: vr.tenantName,
      designation: pt?.designation || "",
      phone: pt?.phone || "",
      startDate: pt?.startDate ? pt.startDate.split("T")[0] : "",
      endDate: pt?.endDate ? pt.endDate.split("T")[0] : "",
    });
    setEditPrevTenantOpen(true);
  };

  const handleSaveEditPrevTenant = async () => {
    if (!editPrevTenantData) return;
    setEditingPrevTenant(true);
    try {
      // Update tenant info in Tenant table
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editPrevTenantData.tenantId,
          action: "updateInfo",
          name: editPrevTenantData.tenantName,
          designation: editPrevTenantData.designation,
          phone: editPrevTenantData.phone || null,
          startDate: editPrevTenantData.startDate || undefined,
          endDate: editPrevTenantData.endDate || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      // Also update tenantName in VacateRecord table (displayed on cards)
      await fetch("/api/vacate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editPrevTenantData.id, tenantName: editPrevTenantData.tenantName }),
      });
      await refreshRoomDetail();
      setEditPrevTenantOpen(false);
      setEditPrevTenantData(null);
      toast.success("তথ্য আপডেট হয়েছে");
    } catch { toast.error("আপডেট করতে সমস্যা হয়েছে"); }
    finally { setEditingPrevTenant(false); }
  };

  const handleDeletePrevTenant = async (vacateId: string) => {
    setDeletingPrevTenant(true);
    try {
      const res = await fetch("/api/vacate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vacateId }),
      });
      if (!res.ok) throw new Error();
      await refreshRoomDetail();
      setGpSelectedVacateRecord(null);
      toast.success("ভাড়াটে রেকর্ড মুছে ফেলা হয়েছে");
    } catch { toast.error("মুছে ফেলতে সমস্যা হয়েছে"); }
    finally { setDeletingPrevTenant(false); }
  };

  const handleDeleteVacateSnapshot = async (vacateId: string) => {
    setDeletingSnapshot(true);
    try {
      await fetch("/api/vacate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vacateId, inventorySnapshot: "[]" }),
      });
      await refreshRoomDetail();
      toast.success("মালামাল স্ন্যাপশট মুছে ফেলা হয়েছে");
    } catch { toast.error("মুছে ফেলতে সমস্যা"); }
    finally { setDeletingSnapshot(false); }
  };

  const handleDownloadVacateSnapshot = async (vr: any, pt: any) => {
    try {
      let snapshotItems: any[] = [];
      try { snapshotItems = vr.inventorySnapshot ? JSON.parse(vr.inventorySnapshot) : []; } catch { snapshotItems = []; }
      if (snapshotItems.length === 0) { toast.error("কোনো মালামাল স্ন্যাপশট নেই"); return; }

      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("মালামাল তালিকা");

      const parts1: string[] = [];
      if (pt?.name) parts1.push(`নাম-${pt.name}`);
      if (pt?.designation) parts1.push(`পদবী-${pt.designation}`);
      if (pt?.phone) parts1.push(`মোবাইল-${pt.phone}`);
      const line1 = parts1.length > 0 ? parts1.join(",") : vr.tenantName;

      const vacateDateStr = vr.vacatedAt ? formatDate(vr.vacatedAt) : "";
      const line2 = `${vacateDateStr} তারিখে রেখে যাওয়া মালামাল তালিকা`;

      sheet.mergeCells("A1:G1");
      sheet.mergeCells("A2:G2");

      const titleCell1 = sheet.getCell("A1");
      titleCell1.value = line1;
      titleCell1.font = { bold: true, size: 12 };
      titleCell1.alignment = { horizontal: "center", vertical: "middle" };

      const titleCell2 = sheet.getCell("A2");
      titleCell2.value = line2;
      titleCell2.font = { bold: true, size: 12 };
      titleCell2.alignment = { horizontal: "center", vertical: "middle" };

      sheet.getRow(1).height = 25;
      sheet.getRow(2).height = 25;

      const headers = ["ক্রম", "মালামালের নাম", "পরিমাণ", "অবস্থা", "নোট", "সর্বশেষ রিপেয়ার", "সর্বশেষ রিপ্লেস"];
      const headerRow = sheet.addRow(headers);
      headerRow.height = 22;
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } } as any;
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const thinBorder = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      headerRow.eachCell((cell) => {
        (cell as any).fill = headerFill;
        (cell as any).font = headerFont;
        (cell as any).border = thinBorder;
        (cell as any).alignment = { horizontal: "center", vertical: "middle" };
      });

      snapshotItems.forEach((item: any, idx: number) => {
        const repairDate = item.latestRepair ? (item.latestRepair.split('T')[0] || item.latestRepair) : '';
        const replaceDate = item.latestReplace ? (item.latestReplace.split('T')[0] || item.latestReplace) : '';
        const row = sheet.addRow([idx + 1, item.itemName || item.name || "-", item.quantity || 0, item.condition || "-", item.note || "-", repairDate || "-", replaceDate || "-"]);
        row.eachCell((cell) => {
          (cell as any).border = thinBorder;
          (cell as any).alignment = { horizontal: "center", vertical: "middle" };
        });
      });

      sheet.columns.forEach((col, i) => {
        if (i === 0) { col.width = 5; return; }
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (cell) => {
          const val = String(cell.value || "");
          if (val.length > maxLen) maxLen = val.length;
        });
        const headerVal = headers[i] || "";
        col.width = Math.ceil(Math.max(headerVal.length, maxLen) * 1.3) + 1;
      });

      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 3, topLeftCell: "A4", activeCell: "A4" }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `মালামাল_তালিকা_${vr.tenantName}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); }
  };

  return (
    <div className="relative" ref={searchRef}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="রুম নাম্বার বা নাম লিখে খুজুন"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          className="h-9 pl-9 pr-8 text-sm bg-white/80 border-emerald-200 focus:border-emerald-400 w-full"
        />
        {query.length > 0 && (
          <button className="absolute right-2 top-1/2 -translate-y-1/2 size-5 text-muted-foreground hover:text-foreground rounded-full hover:bg-gray-100 flex items-center justify-center" onClick={() => { setQuery(""); setResults([]); setShowDropdown(false); clearSelection(); }}>
            <X className="size-3" />
          </button>
        )}
        {searching && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2"><div className="size-3.5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /></div>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 w-screen sm:w-96 bg-white rounded-none sm:rounded-xl border border-gray-200 shadow-lg max-h-72 overflow-y-auto">
          {results.map((tenant) => (
            <button
              key={`${tenant.searchType}-${tenant.id}-${tenant.roomNumber}`}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-emerald-50/70 border-b border-gray-50 last:border-0 transition-colors"
              onClick={() => handleSelectTenant(tenant)}
            >
              <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${tenant.searchType === 'room' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {tenant.searchType === 'room' ? <BedDouble className="size-4" /> : tenant.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                {tenant.searchType === 'room' ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900">
                      <BedDouble className="size-3.5 inline mr-1 text-blue-600" />
                      রুম {tenant.roomNumber} — {tenant.buildingName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {toBanglaNumber(tenant.floorNumber)} তলা
                      {tenant.name && <span className="text-emerald-600"> • বরাদ্দ: {tenant.name} {tenant.designation ? `(${tenant.designation})` : ''}</span>}
                      {tenant.roomUsers?.length > 0 && <span className="text-red-600"> • ব্যবহারকারী: {tenant.roomUsers.map((u: any) => u.name).join(', ')}</span>}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900 truncate">{tenant.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {tenant.designation || "পদবী নেই"} • {tenant.buildingName} • {toBanglaNumber(tenant.floorNumber)} তলা • রুম {tenant.roomNumber}
                    </p>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {showDropdown && query.trim().length >= 1 && !searching && results.length === 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 w-screen sm:w-80 bg-white rounded-none sm:rounded-xl border border-gray-200 shadow-lg p-4 text-center text-sm text-muted-foreground">
          কোনো তথ্য পাওয়া যায়নি
        </div>
      )}

      {/* Room detail panel */}
      {(selectedTenant || loadingDetail) && (
        <div className="absolute z-50 top-full mt-1 left-0 w-screen sm:w-[500px] bg-white rounded-none sm:rounded-xl border border-gray-200 shadow-xl max-h-[80vh] overflow-y-auto">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12"><div className="size-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /><span className="ml-3 text-sm text-muted-foreground">লোড হচ্ছে...</span></div>
          ) : roomDetail && selectedTenant ? (
            <div className="p-4 space-y-3">
              {/* Panel header */}
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 min-w-0">
                  <BedDouble className="size-4 text-emerald-600 shrink-0" />
                  <span className="truncate">রুম {roomDetail.roomNumber} — {roomDetail.buildingName}</span>
                </h3>
                <button className="size-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-muted-foreground hover:text-foreground" onClick={clearSelection}>
                  <X className="size-4" />
                </button>
              </div>

              {/* Room info badges + action buttons */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2 py-px font-medium">
                    {toBanglaNumber(roomDetail.floorNumber)} তলা
                  </span>
                  <button onClick={() => { setGpActiveForm(gpActiveForm === "alloc" ? null : "alloc"); setSpAllocName(""); setSpAllocDesig(""); setSpAllocPhone(""); setSpAllocDept(""); setSpAllocDate(new Date().toISOString().split('T')[0]); }} className={`size-6 rounded-md flex items-center justify-center border transition-colors ${gpActiveForm === "alloc" ? "bg-emerald-700 text-white border-emerald-800 shadow-sm ring-2 ring-emerald-300/50" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"}`} title="বরাদ্দ"><UserPlus className="size-3.5" /></button>
                  <button onClick={() => { setGpActiveForm(gpActiveForm === "guest" ? null : "guest"); setGpGbName(""); setGpGbMobile(""); setGpGbCheckIn(""); setGpGbCheckInTime(""); setGpGbCheckOut(""); setGpGbCheckOutTime(""); setGpGbBill(""); setGpGbNote(""); setGpGbIsPaid(true); }} className={`size-6 rounded-md flex items-center justify-center border transition-colors ${gpActiveForm === "guest" ? "bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-300/50" : "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"}`} title="গেস্ট বুক"><UserCheck className="size-3.5" /></button>
                  <button onClick={() => { setGpActiveForm(gpActiveForm === "roomUser" ? null : "roomUser"); setSpAddRoomUserName(""); setSpAddRoomUserDesig(""); setSpAddRoomUserPhone(""); setSpAddRoomUserDept(""); setSpAddRoomUserDate(""); }} className={`size-6 rounded-md flex items-center justify-center border transition-colors ${gpActiveForm === "roomUser" ? "bg-violet-600 text-white border-violet-700 shadow-sm ring-2 ring-violet-300/50" : "bg-violet-50 text-violet-600 hover:bg-violet-100 border-violet-200"}`} title="ব্যবহারকারী যোগ"><UserPlus className="size-3.5" /></button>
                  {roomDetail.currentTenants.length > 0 && (
                    <button onClick={() => { setGpActiveForm(gpActiveForm === "vacate" ? null : "vacate"); setGpVacateTenantId(""); }} className={`size-6 rounded-md flex items-center justify-center border transition-colors ${gpActiveForm === "vacate" ? "bg-orange-600 text-white border-orange-700 shadow-sm ring-2 ring-orange-300/50" : "bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200"}`} title="বরাদ্দ বাতিল"><LogOut className="size-3.5" /></button>
                  )}
                </div>
                {/* Allocated tenants - shown below */}
                {roomDetail.currentTenants.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground font-medium">বরাদ্দকৃত ব্যক্তি:</p>
                    {roomDetail.currentTenants.map((t) => (
                      <div key={t.id} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                        <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[11px] text-emerald-700 font-medium min-w-0 flex-1 truncate">{t.name}</span>
                        {t.designation && <span className="text-[10px] text-emerald-600 shrink-0 hidden sm:inline">({t.designation})</span>}
                        <div className="flex gap-0.5 shrink-0">
                          <button onClick={() => handleGpEditTenant(t)} className="size-5 rounded-md bg-white/60 hover:bg-white flex items-center justify-center transition-colors text-blue-600" title="সম্পাদনা"><Edit3 className="size-2.5" /></button>
                          <button onClick={() => { setGpDeleteTenantId(t.id); setGpDeleteTenantName(t.name); setGpDeleteTenantOpen(true); }} className="size-5 rounded-md bg-white/60 hover:bg-red-100 flex items-center justify-center transition-colors text-red-500" title="মুছুন"><Trash2 className="size-2.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unified form area - icon button tabs */}
              {gpActiveForm === "alloc" && (
                <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-xl p-3 space-y-2 shadow-lg shadow-emerald-100/50">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1"><UserPlus className="size-3.5" />রুম বরাদ্দ করুন</p>
                    <button onClick={() => setGpActiveForm(null)} className="size-5 rounded-full hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors"><X className="size-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="col-span-2 h-7 text-[11px] border border-emerald-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none transition-all" placeholder="নাম *" value={spAllocName} onChange={(e) => setSpAllocName(e.target.value)} />
                    <input className="h-7 text-[11px] border border-emerald-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none transition-all" placeholder="পদবি" value={spAllocDesig} onChange={(e) => setSpAllocDesig(e.target.value)} />
                    <input className="h-7 text-[11px] border border-emerald-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none transition-all" placeholder="ফোন" value={spAllocPhone} onChange={(e) => setSpAllocPhone(e.target.value)} />
                    <input className="h-7 text-[11px] border border-emerald-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none transition-all" placeholder="দপ্তর" value={spAllocDept} onChange={(e) => setSpAllocDept(e.target.value)} />
                    <input className="h-7 text-[11px] border border-emerald-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none transition-all" type="date" value={spAllocDate} onChange={(e) => setSpAllocDate(e.target.value)} />
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-6 text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white gap-1 px-3 rounded-lg shadow-sm" onClick={handleSpAlloc} disabled={spAllocating || !spAllocName.trim() || !spAllocDate}>
                      {spAllocating ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="size-3" />}
                      বরাদ্দ করুন
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg" onClick={() => setGpActiveForm(null)}>বাতিল</Button>
                  </div>
                </div>
              )}
              {gpActiveForm === "guest" && (
                <div className="bg-blue-50/80 border-2 border-blue-300 rounded-xl p-3 space-y-2 shadow-lg shadow-blue-100/50">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-blue-800 flex items-center gap-1"><UserCheck className="size-3.5" />গেস্ট বুকিং</p>
                    <button onClick={() => setGpActiveForm(null)} className="size-5 rounded-full hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"><X className="size-3.5" /></button>
                  </div>
                  <div className="flex gap-1 bg-blue-100/50 rounded-lg p-0.5">
                    <button type="button" className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${gpGbIsPaid ? "bg-emerald-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => { setGpGbIsPaid(true); setGpGbBill(""); }}>Paid</button>
                    <button type="button" className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${!gpGbIsPaid ? "bg-orange-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => { setGpGbIsPaid(false); setGpGbBill(""); }}>Non Paid</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="col-span-2 h-7 text-[11px] border border-blue-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all" placeholder="গেস্টের নাম *" value={gpGbName} onChange={(e) => setGpGbName(e.target.value)} />
                    <input className="h-7 text-[11px] border border-blue-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all" placeholder="মোবাইল" value={gpGbMobile} onChange={(e) => setGpGbMobile(e.target.value)} />
                    <input className="h-7 text-[11px] border border-blue-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all" type="date" value={gpGbCheckIn} onChange={(e) => setGpGbCheckIn(e.target.value)} />
                    <input className="h-7 text-[11px] border border-blue-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all" type="time" value={gpGbCheckInTime} onChange={(e) => setGpGbCheckInTime(e.target.value)} />
                    <input className="h-7 text-[11px] border border-blue-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all" type="date" value={gpGbCheckOut} onChange={(e) => setGpGbCheckOut(e.target.value)} />
                    <input className="h-7 text-[11px] border border-blue-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all" type="time" value={gpGbCheckOutTime} onChange={(e) => setGpGbCheckOutTime(e.target.value)} />
                    {gpGbIsPaid && <input className="h-7 text-[11px] border border-blue-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all" type="number" placeholder="মোট বিল" value={gpGbBill} onChange={(e) => setGpGbBill(e.target.value)} />}
                    <input className="col-span-2 h-7 text-[11px] border border-blue-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all" placeholder="নোট (ঐচ্ছিক)" value={gpGbNote} onChange={(e) => setGpGbNote(e.target.value)} />
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 text-white gap-1 px-3 rounded-lg shadow-sm" onClick={handleGpGbBook} disabled={gpGbBooking || !gpGbName.trim() || !gpGbCheckIn}>
                      {gpGbBooking ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserCheck className="size-3" />}
                      বুক করুন
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] border-blue-300 text-blue-700 hover:bg-blue-50 rounded-lg" onClick={() => setGpActiveForm(null)}>বাতিল</Button>
                  </div>
                </div>
              )}
              {gpActiveForm === "roomUser" && (
                <div className="bg-violet-50/80 border-2 border-violet-300 rounded-xl p-3 space-y-2 shadow-lg shadow-violet-100/50">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-violet-800 flex items-center gap-1"><UserPlus className="size-3.5" />নতুন ব্যবহারকারী যোগ করুন</p>
                    <button onClick={() => setGpActiveForm(null)} className="size-5 rounded-full hover:bg-violet-100 flex items-center justify-center text-violet-600 transition-colors"><X className="size-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="col-span-2 h-7 text-[11px] border border-violet-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none transition-all" placeholder="নাম *" value={spAddRoomUserName} onChange={(e) => setSpAddRoomUserName(e.target.value)} />
                    <input className="h-7 text-[11px] border border-violet-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none transition-all" placeholder="পদবি" value={spAddRoomUserDesig} onChange={(e) => setSpAddRoomUserDesig(e.target.value)} />
                    <input className="h-7 text-[11px] border border-violet-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none transition-all" placeholder="ফোন" value={spAddRoomUserPhone} onChange={(e) => setSpAddRoomUserPhone(e.target.value)} />
                    <input className="h-7 text-[11px] border border-violet-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none transition-all" placeholder="দপ্তর" value={spAddRoomUserDept} onChange={(e) => setSpAddRoomUserDept(e.target.value)} />
                    <input className="h-7 text-[11px] border border-violet-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none transition-all" type="date" value={spAddRoomUserDate} onChange={(e) => setSpAddRoomUserDate(e.target.value)} />
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-6 text-[10px] bg-violet-600 hover:bg-violet-700 text-white gap-1 px-3 rounded-lg shadow-sm" onClick={handleSpAddRoomUser} disabled={spAddingRoomUser || !spAddRoomUserName.trim() || !spAddRoomUserDate}>
                      {spAddingRoomUser ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="size-3" />}
                      যোগ করুন
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] border-violet-300 text-violet-700 hover:bg-violet-50 rounded-lg" onClick={() => setGpActiveForm(null)}>বাতিল</Button>
                  </div>
                </div>
              )}
              {gpActiveForm === "vacate" && roomDetail.currentTenants.length > 0 && (
                <div className="bg-orange-50/80 border-2 border-orange-300 rounded-xl p-3 space-y-2 shadow-lg shadow-orange-100/50">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-orange-800 flex items-center gap-1"><LogOut className="size-3.5" />বরাদ্দ বাতিল</p>
                    <button onClick={() => setGpActiveForm(null)} className="size-5 rounded-full hover:bg-orange-100 flex items-center justify-center text-orange-600 transition-colors"><X className="size-3.5" /></button>
                  </div>
                  <p className="text-[10px] text-orange-700">কোন ভাড়াটে রুম ছাড়বেন তা নির্বাচন করুন:</p>
                  <div className="space-y-1.5">
                    {roomDetail.currentTenants.map((t) => (
                      <button key={t.id} onClick={() => setGpVacateTenantId(t.id)} className={`w-full text-left px-3 py-2 rounded-lg border text-[11px] transition-all ${gpVacateTenantId === t.id ? 'border-orange-400 bg-orange-100 text-orange-800 shadow-sm ring-1 ring-orange-300/50' : 'border-orange-200 hover:bg-orange-50 text-orange-700'}`}>
                        <span className="font-medium">{t.name}</span>
                        {t.designation && <span className="text-[10px] text-orange-600 ml-1">({t.designation})</span>}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-6 text-[10px] bg-orange-600 hover:bg-orange-700 text-white gap-1 px-3 rounded-lg shadow-sm" onClick={handleGpVacate} disabled={!gpVacateTenantId || gpVacating}>
                      {gpVacating ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogOut className="size-3" />}
                      বরাদ্দ বাতিল করুন
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] border-orange-300 text-orange-700 hover:bg-orange-50 rounded-lg" onClick={() => setGpActiveForm(null)}>বাতিল</Button>
                  </div>
                </div>
              )}

              {/* Detail tab switcher */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                <button type="button" className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${gpDetailTab === "users" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`} onClick={() => { setGpDetailTab("users"); }}>
                  বর্তমান ব্যবহারকারী
                  {roomDetail.currentRoomUsers.length > 0 && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 ml-0.5">{toBanglaNumber(roomDetail.currentRoomUsers.length)}</Badge>}
                </button>
                <button type="button" className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${gpDetailTab === "inventory" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-emerald-600"}`} onClick={() => { setGpDetailTab("inventory"); setGpSelectedVacateRecord(null); }}>
                  মালামাল
                </button>
                <button type="button" className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${gpDetailTab === "prevTenants" ? "bg-white text-orange-700 shadow-sm" : "text-gray-500 hover:text-orange-600"}`} onClick={() => { setGpDetailTab("prevTenants"); setGpPrevTenantPage(1); setGpSelectedVacateRecord(null); }}>
                  স্ন্যাপশট
                  {(roomDetail.inventorySnapshots.length > 0 || roomDetail.vacateRecords.length > 0) && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 ml-0.5">{toBanglaNumber(roomDetail.inventorySnapshots.length)}</Badge>}
                </button>
                <button type="button" className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${gpDetailTab === "prevUsers" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-purple-600"}`} onClick={() => { setGpDetailTab("prevUsers"); setSpPrevRoomUserPage(1); }}>
                  পূর্বের ব্যবহারকারী
                  {roomDetail.previousRoomUsers.length > 0 && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 ml-0.5">{toBanglaNumber(roomDetail.previousRoomUsers.length)}</Badge>}
                </button>
              </div>

              {gpDetailTab === "users" ? (
                /* Current room users tab */
                <div>
                  {roomDetail.currentRoomUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground bg-gray-50 rounded px-2 py-1.5">কোনো ব্যবহারকারী নেই</p>
                  ) : (
                    <div className="space-y-1.5">
                      {roomDetail.currentRoomUsers.map((u, uIdx) => {
                        const userGradients = [
                          "bg-gradient-to-br from-sky-200 via-blue-200 to-indigo-200 shadow-md shadow-blue-200/50 ring-1 ring-white/50",
                          "bg-gradient-to-br from-teal-200 via-emerald-200 to-green-200 shadow-md shadow-emerald-200/50 ring-1 ring-white/50",
                          "bg-gradient-to-br from-violet-200 via-purple-200 to-fuchsia-200 shadow-md shadow-violet-200/50 ring-1 ring-white/50",
                          "bg-gradient-to-br from-rose-200 via-pink-200 to-red-200 shadow-md shadow-rose-200/50 ring-1 ring-white/50",
                          "bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200 shadow-md shadow-amber-200/50 ring-1 ring-white/50",
                          "bg-gradient-to-br from-cyan-200 via-sky-200 to-blue-200 shadow-md shadow-cyan-200/50 ring-1 ring-white/50",
                        ];
                        const gradClass = userGradients[uIdx % 6];
                        const isExpanded = spRoomUserExpanded === u.id;
                        return (
                          <div key={u.id} className={`${gradClass} rounded-xl p-2 text-gray-800 transition-all duration-300 shadow-xl cursor-pointer ${isExpanded ? "ring-2 ring-gray-300 scale-[1.01]" : "hover:scale-[1.01]"}`} onClick={() => setSpRoomUserExpanded(isExpanded ? null : u.id)}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-gray-800">{u.name}</p>
                                {u.designation && <p className="text-[9px] text-gray-600">{u.designation}</p>}
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); setSpEditRoomUserData({ id: u.id, name: u.name, designation: u.designation || '', phone: u.phone || '', department: u.department || '', startDate: u.startDate || '' }); setSpEditRoomUserOpen(true); }} className="size-5 rounded-md bg-white/50 hover:bg-white/70 flex items-center justify-center transition-colors text-blue-600" title="সম্পাদনা"><Edit3 className="size-2.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setSpDeleteRoomUserId(u.id); setSpDeleteRoomUserName(u.name); setSpDeleteRoomUserOpen(true); }} className="size-5 rounded-md bg-white/50 hover:bg-red-100 flex items-center justify-center transition-colors text-red-500" title="মুছুন"><Trash2 className="size-2.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleSpLeaveRoomUser(u.id); }} className="size-5 rounded-md bg-white/50 hover:bg-orange-100 flex items-center justify-center transition-colors text-orange-600" disabled={spLeavingRoomUser === u.id} title="রুম ত্যাগ">{spLeavingRoomUser === u.id ? <div className="size-2.5 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" /> : <LogOut className="size-2.5" />}</button>
                              </div>
                            </div>
                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="mt-2 pt-2 border-t border-white/60 space-y-1">
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
                                  {u.phone && (
                                    <div className="flex items-center gap-1 text-gray-700">
                                      <Phone className="size-2.5 text-gray-500" />
                                      <span>{u.phone}</span>
                                    </div>
                                  )}
                                  {u.department && (
                                    <div className="flex items-center gap-1 text-gray-700">
                                      <Building2 className="size-2.5 text-gray-500" />
                                      <span>{u.department}</span>
                                    </div>
                                  )}
                                  {u.startDate && (
                                    <div className="flex items-center gap-1 text-gray-700">
                                      <Calendar className="size-2.5 text-gray-500" />
                                      <span>শুরু: {toBanglaNumber(u.startDate)}</span>
                                    </div>
                                  )}
                                  {u.endDate && (
                                    <div className="flex items-center gap-1 text-gray-700">
                                      <Calendar className="size-2.5 text-gray-500" />
                                      <span>শেষ: {toBanglaNumber(u.endDate)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : gpDetailTab === "prevTenants" ? (
                /* Inventory snapshots tab (assign + vacate) — grouped by tenant name */
                <div>
                  {roomDetail.inventorySnapshots.length === 0 ? (
                    <p className="text-xs text-muted-foreground bg-gray-50 rounded px-2 py-1.5">কোনো স্ন্যাপশট নেই</p>
                  ) : (() => {
                    // Group snapshots by tenantName (case-insensitive)
                    const groupMap = new Map<string, typeof roomDetail.inventorySnapshots>();
                    const groupOrder: string[] = [];
                    for (const snap of roomDetail.inventorySnapshots) {
                      const key = (snap.tenantName || '').toLowerCase().trim();
                      if (!groupMap.has(key)) { groupMap.set(key, []); groupOrder.push(key); }
                      groupMap.get(key)!.push(snap);
                    }
                    // Each group: sort by createdAt desc
                    for (const [, snaps] of groupMap) { snaps.sort((a, b) => ((b.createdAt || '').localeCompare(a.createdAt || ''))); }
                    const allGroupEntries = groupOrder.map(k => ({ key: k, name: groupMap.get(k)![0].tenantName, snaps: groupMap.get(k)! }));
                    const pageItems = allGroupEntries.slice((gpPrevTenantPage - 1) * GP_PREV_TENANT_PER_PAGE, gpPrevTenantPage * GP_PREV_TENANT_PER_PAGE);
                    const gradientClasses = [
                      "bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-100 shadow-md shadow-blue-100/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-teal-100 via-emerald-100 to-green-100 shadow-md shadow-emerald-100/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-violet-100 via-purple-100 to-fuchsia-100 shadow-md shadow-violet-100/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-rose-100 via-pink-100 to-red-100 shadow-md shadow-rose-100/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 shadow-md shadow-amber-100/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-cyan-100 via-sky-100 to-blue-100 shadow-md shadow-cyan-100/50 ring-1 ring-white/50",
                    ];
                    const renderSnapCard = (snap: typeof roomDetail.inventorySnapshots[0]) => {
                      const isAssign = snap.snapshotType === 'assign';
                      const isExpanded = gpSelectedVacateRecord?.id === snap.id;
                      let snapshotItems: any[] = [];
                      try { snapshotItems = snap.inventorySnapshot ? JSON.parse(snap.inventorySnapshot) : []; } catch { snapshotItems = []; }
                      return (
                        <div key={snap.id} className={`rounded-xl p-2 text-gray-800 ${isAssign ? 'border border-emerald-200/70 bg-emerald-50/30' : 'border border-red-200/70 bg-red-50/20'}`}>
                          <div className="flex items-center justify-between gap-1">
                            <button className="flex items-center gap-1 text-left flex-1 min-w-0" onClick={() => setGpSelectedVacateRecord(isExpanded ? null : snap)}>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold ${isAssign ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-300/50' : 'bg-red-500/20 text-red-700 border border-red-300/50'}`}>
                                {isAssign ? 'বরাদ্দ' : 'বাতিল'}
                              </span>
                              <span className="text-[8px] text-gray-500">{snap.createdAt ? formatDate(snap.createdAt) : "-"}</span>
                            </button>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button className="size-5 rounded-md bg-white/50 hover:bg-white/70 flex items-center justify-center transition-colors text-blue-600" onClick={(e) => { e.stopPropagation(); handleEditSnapshot(snap); }} title="সম্পাদনা"><Edit3 className="size-2.5" /></button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><button className="size-5 rounded-md bg-white/50 hover:bg-red-100 flex items-center justify-center transition-colors text-gray-600" onClick={(e) => e.stopPropagation()}><Trash2 className="size-2.5" /></button></AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>স্ন্যাপশট মুছে ফেলবেন?</AlertDialogTitle><AlertDialogDescription>{snap.tenantName}-এর {isAssign ? 'বরাদ্দ' : 'বাতিল'} স্ন্যাপশট স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>বাতিল</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={(e) => { e.preventDefault(); handleDeleteSnapshot(snap.id); }} disabled={deletingSnapshotRec}>{deletingSnapshotRec ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "মুছুন"}</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <button className="size-5 rounded-md bg-white/50 hover:bg-emerald-100 flex items-center justify-center transition-colors text-emerald-600" onClick={(e) => { e.stopPropagation(); handleDownloadSnapshotXlsx(snap, snap.tenantName, snap.snapshotType, roomDetail.roomNumber); }} title="ডাউনলোড"><Download className="size-2.5" /></button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-1.5"><div className="bg-white/95 rounded-lg overflow-hidden">
                              {snapshotItems.length === 0 ? (<p className="text-[9px] text-gray-400 px-2 py-1.5">কোনো মালামাল স্ন্যাপশট নেই</p>) : (
                                <div className="overflow-x-auto"><table className="w-full text-[9px]"><thead><tr className="bg-gray-100"><th className="text-left px-2 py-1 font-medium text-gray-600">মালামাল</th><th className="text-center px-1 py-1 font-medium text-gray-600">পরিমাণ</th><th className="text-center px-1 py-1 font-medium text-gray-600">অবস্থা</th><th className="text-left px-1 py-1 font-medium text-gray-600">নোট</th><th className="text-left px-1 py-1 font-medium text-gray-600">রিপেয়ার/রিপ্লেস</th></tr></thead><tbody>
                                  {snapshotItems.map((item: any, i: number) => { const repairInfo = item.latestRepair ? `রিপেয়ার: ${item.latestRepair?.split('T')[0] || item.latestRepair}` : ''; const replaceInfo = item.latestReplace ? `রিপ্লেস: ${item.latestReplace?.split('T')[0] || item.latestReplace}` : ''; return (<tr key={i} className="border-t border-gray-100"><td className="px-2 py-0.5 text-gray-700">{item.itemName || item.name || "-"}</td><td className="px-1 py-0.5 text-center text-gray-600">{toBanglaNumber(item.quantity || 0)}</td><td className="px-1 py-0.5 text-center text-gray-600">{item.condition || "-"}</td><td className="px-1 py-0.5 text-gray-600 max-w-[80px] truncate">{item.note || "-"}</td><td className="px-1 py-0.5 text-gray-600 text-[8px]">{repairInfo || replaceInfo || "-"}</td></tr>); })}
                                </tbody></table></div>
                              )}
                            </div></div>
                          )}
                        </div>
                      );
                    };
                    return (
                      <div className="space-y-3">
                        {pageItems.map((group, gIdx) => {
                          const assignSnap = group.snaps.find(s => s.snapshotType === 'assign');
                          const vacateSnap = group.snaps.find(s => s.snapshotType === 'vacate');
                          const gradClass = gradientClasses[gIdx % 6];
                          return (
                            <div key={group.key} className={`${gradClass} rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.01] shadow-xl`}>
                              <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1">
                                <Users className="size-3.5 shrink-0 opacity-90 text-gray-700" />
                                <p className="text-[12px] font-bold truncate text-gray-800">{group.name}</p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 px-2 pb-2">
                                {assignSnap && renderSnapCard(assignSnap)}
                                {vacateSnap && renderSnapCard(vacateSnap)}
                                {!assignSnap && !vacateSnap && <p className="text-[9px] text-gray-400 px-2">কোনো স্ন্যাপশট নেই</p>}
                              </div>
                            </div>
                          );
                        })}
                        {allGroupEntries.length > GP_PREV_TENANT_PER_PAGE && (
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground">{toBanglaNumber((gpPrevTenantPage - 1) * GP_PREV_TENANT_PER_PAGE + 1)}-{toBanglaNumber(Math.min(gpPrevTenantPage * GP_PREV_TENANT_PER_PAGE, allGroupEntries.length))} / {toBanglaNumber(allGroupEntries.length)}</span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-5 text-[8px] px-1.5" disabled={gpPrevTenantPage <= 1} onClick={() => setGpPrevTenantPage(p => p - 1)}>পূর্ববর্তী</Button>
                              <Button size="sm" variant="outline" className="h-5 text-[8px] px-1.5" disabled={gpPrevTenantPage * GP_PREV_TENANT_PER_PAGE >= allGroupEntries.length} onClick={() => setGpPrevTenantPage(p => p + 1)}>পরবর্তী</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : gpDetailTab === "prevUsers" ? (
                /* Previous room users tab with 3D gradient cards */
                <div>
                  {roomDetail.previousRoomUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground bg-gray-50 rounded px-2 py-1.5">কোনো পূর্বের রুম ব্যবহারকারী নেই</p>
                  ) : (() => {
                    const totalPrev = roomDetail.previousRoomUsers.length;
                    const totalPages = Math.max(1, Math.ceil(totalPrev / SP_PREV_ROOM_USER_PER_PAGE));
                    const pageItems = roomDetail.previousRoomUsers.slice((spPrevRoomUserPage - 1) * SP_PREV_ROOM_USER_PER_PAGE, spPrevRoomUserPage * SP_PREV_ROOM_USER_PER_PAGE);
                    const prevUserGradients = [
                      "bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-100 shadow-md shadow-blue-100/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-teal-100 via-emerald-100 to-green-100 shadow-md shadow-emerald-100/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-violet-100 via-purple-100 to-fuchsia-100 shadow-md shadow-violet-100/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-rose-100 via-pink-100 to-red-100 shadow-md shadow-rose-100/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 shadow-md shadow-amber-100/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-cyan-100 via-sky-100 to-blue-100 shadow-md shadow-cyan-100/50 ring-1 ring-white/50",
                    ];
                    return (
                      <div className="space-y-2">
                        {pageItems.map((u, uIdx) => {
                          const isExp = spPrevRoomUserExpanded === u.id;
                          const gradClass = prevUserGradients[uIdx % 6];
                          return (
                            <div key={u.id} className={`${gradClass} rounded-xl p-2 text-gray-800 transition-all duration-200 hover:scale-[1.02] shadow-xl`}>
                              <div className="flex items-center justify-between gap-2">
                                <button className="flex items-center gap-1.5 text-left flex-1 min-w-0" onClick={() => setSpPrevRoomUserExpanded(isExp ? null : u.id)}>
                                  <UserPlus className="size-3 shrink-0 opacity-90" />
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold truncate">{u.name}</p>
                                    <p className="text-[8px] text-gray-500">
                                      {u.designation && <span>{u.designation} • </span>}
                                      {u.phone && <span>{u.phone} • </span>}
                                      {u.startDate ? formatDate(u.startDate) : "-"} — {u.endDate ? formatDate(u.endDate) : "..."}
                                    </p>
                                  </div>
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button className="size-5 rounded-md bg-white/50 hover:bg-white/70 flex items-center justify-center transition-colors text-gray-600" onClick={(e) => { e.stopPropagation(); setSpEditRoomUserData({ id: u.id, name: u.name, designation: u.designation || '', phone: u.phone || '', department: u.department || '', startDate: u.startDate || '' }); setSpEditRoomUserOpen(true); }}>
                                    <Edit3 className="size-2.5" />
                                  </button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <button className="size-5 rounded-md bg-white/50 hover:bg-red-100 flex items-center justify-center transition-colors text-gray-600" onClick={(e) => e.stopPropagation()}>
                                        <Trash2 className="size-2.5" />
                                      </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>মুছে ফেলবেন?</AlertDialogTitle>
                                        <AlertDialogDescription>{u.name}-এর রুম ব্যবহারকারী তথ্য স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>বাতিল</AlertDialogCancel>
                                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={(e) => { e.preventDefault(); setSpDeletePrevRoomUserId(u.id); setSpDeletePrevRoomUserName(u.name); handleSpDeletePrevRoomUser(); }} disabled={spDeletingPrevRoomUser}>
                                          {spDeletingPrevRoomUser ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "মুছুন"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                              {isExp && (
                                <div className="mt-2">
                                  <div className="bg-white/95 rounded-lg overflow-hidden">
                                    <div className="grid grid-cols-2 gap-2 text-xs px-3 py-2">
                                      {u.designation && <div><span className="text-muted-foreground">পদবি:</span> {u.designation}</div>}
                                      {u.phone && <div><span className="text-muted-foreground">ফোন:</span> {u.phone}</div>}
                                      {u.department && <div><span className="text-muted-foreground">দপ্তর:</span> {u.department}</div>}
                                      <div><span className="text-muted-foreground">সময়কাল:</span> {u.startDate ? formatDate(u.startDate) : "-"} — {u.endDate ? formatDate(u.endDate) : "..."}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground">
                              {toBanglaNumber((spPrevRoomUserPage - 1) * SP_PREV_ROOM_USER_PER_PAGE + 1)}-{toBanglaNumber(Math.min(spPrevRoomUserPage * SP_PREV_ROOM_USER_PER_PAGE, totalPrev))} / {toBanglaNumber(totalPrev)}
                            </span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-5 text-[8px] px-1.5" disabled={spPrevRoomUserPage <= 1} onClick={() => setSpPrevRoomUserPage(p => p - 1)}>পূর্ববর্তী</Button>
                              <Button size="sm" variant="outline" className="h-5 text-[8px] px-1.5" disabled={spPrevRoomUserPage >= totalPages} onClick={() => setSpPrevRoomUserPage(p => p + 1)}>পরবর্তী</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
              /* Inventory list */
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-gray-600 flex items-center gap-1">
                    <Package className="size-3" />
                    {roomDetail.currentInventory.length > 0 ? (
                      <>মালামাল তালিকা <Badge variant="secondary" className="text-[9px] h-4 px-1">{toBanglaNumber(roomDetail.currentInventory.length)}</Badge></>
                    ) : roomDetail.previousInventory.length > 0 ? (
                      <>পূর্বের ভাড়াটে কর্তৃক ব্যবহৃত মালামাল <Badge variant="outline" className="text-[9px] h-4 px-1 border-orange-300 text-orange-600">{toBanglaNumber(roomDetail.previousInventory.length)}</Badge></>
                    ) : (
                      <>মালামাল তালিকা</>
                    )}
                  </p>
                  <div className="flex items-center gap-1">
                    {roomDetail.currentInventory.length > 0 && <button onClick={() => {
                      if (spBulkEditMode) { setSpBulkEditMode(false); setSpBulkEditData({}); }
                      else {
                        setSpBulkEditMode(true);
                        const data: Record<string, { quantity: string; condition: string }> = {};
                        roomDetail.currentInventory.forEach(item => { data[item.id] = { quantity: String(item.quantity), condition: item.condition }; });
                        setSpBulkEditData(data);
                      }
                    }} className={`text-[9px] px-1.5 py-0.5 rounded ${spBulkEditMode ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} hover:opacity-80`}>
                      {spBulkEditMode ? 'বাল্ক বন্ধ' : 'বাল্ক এডিট'}
                    </button>}
                    <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 px-1.5 text-blue-600 border-blue-300 hover:bg-blue-50" onClick={handleSpDownloadInventory} disabled={spDownloadingInv}>
                      {spDownloadingInv ? <div className="size-2.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /> : <Download className="size-2.5" />}
                      XLSX
                    </Button>
                    <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 px-1.5 text-blue-600 border-blue-300 hover:bg-blue-50" onClick={() => { setSpAddInvOpen(!spAddInvOpen); setSpAddInvName(""); setSpAddInvQty("1"); setSpAddInvCond("আছে"); setSpAddInvNote(""); }}>
                      <Plus className="size-2.5" />নতুন
                    </Button>
                    <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 px-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={handleLoadCommon} disabled={loadingCommon}>
                      {loadingCommon ? <div className="size-2.5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /> : <Package className="size-2.5" />}
                      কমন লোড
                    </Button>

                  </div>
                </div>
                {/* Add new item form */}
                {spAddInvOpen && (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2 mb-1.5 space-y-1.5">
                    <p className="text-[10px] font-semibold text-blue-700">নতুন মালামাল যোগ করুন</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      <input className="col-span-2 h-6 text-[10px] border rounded px-1.5 bg-white" placeholder="মালামালের নাম *" value={spAddInvName} onChange={(e) => setSpAddInvName(e.target.value)} />
                      <input className="h-6 text-[10px] border rounded px-1.5 bg-white text-center" type="number" min={0} value={spAddInvQty} onChange={(e) => setSpAddInvQty(e.target.value)} />
                      <select className="h-6 text-[10px] border rounded px-0.5 bg-white" value={spAddInvCond} onChange={(e) => setSpAddInvCond(e.target.value)}>
                        <option value="আছে">আছে</option><option value="নেই">নেই</option><option value="ভালো">ভালো</option><option value="খারাপ">খারাপ</option><option value="নতুন">নতুন</option><option value="পুরাতন">পুরাতন</option><option value="নস্ট">নস্ট</option><option value="ভাঙা">ভাঙা</option><option value="মাঝারি">মাঝারি</option>
                      </select>
                    </div>
                    <input className="w-full h-6 text-[10px] border rounded px-1.5 bg-white" placeholder="নোট (ঐচ্ছিক)" value={spAddInvNote} onChange={(e) => setSpAddInvNote(e.target.value)} />
                    <div className="flex gap-1">
                      <Button size="sm" className="h-5 text-[9px] bg-blue-600 hover:bg-blue-700 text-white gap-0.5 px-2" onClick={handleSpAddInv} disabled={spAddingInv || !spAddInvName.trim()}>
                        {spAddingInv ? <div className="size-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                        যোগ করুন
                      </Button>
                      <Button size="sm" variant="outline" className="h-5 text-[9px]" onClick={() => setSpAddInvOpen(false)}>বাতিল</Button>
                    </div>
                  </div>
                )}
                {roomDetail.currentInventory.length === 0 && roomDetail.previousInventory.length === 0 && commonItems.length === 0 && !spAddInvOpen && gpActiveForm === null ? (
                  <p className="text-xs text-muted-foreground bg-gray-50 rounded px-2 py-1.5">কোনো মালামাল নেই। উপরের বাটন থেকে যোগ করুন।</p>
                ) : (
                  <div className="space-y-1 max-h-52 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {(roomDetail.currentInventory.length > 0 ? roomDetail.currentInventory : roomDetail.previousInventory).map((item) => {
                      const rInfo = repairDates[item.id];
                      return (
                        <div key={item.id} className="bg-amber-50/50 rounded px-2 py-1.5 border border-amber-100/60">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex-1 min-w-0 flex items-center gap-1">
                              <span className="font-medium text-[11px] text-gray-800 truncate">{item.itemName}</span>
                              {spBulkEditMode && roomDetail.currentInventory.length > 0 ? (
                                <input className="w-10 h-5 text-[10px] border rounded px-0.5 text-center" type="number" min={0} value={spBulkEditData[item.id]?.quantity || ''} onChange={(e) => { setSpBulkEditData(prev => ({...prev, [item.id]: {...prev[item.id], quantity: e.target.value}})); }} />
                              ) : (
                                <span className="text-[9px] text-muted-foreground shrink-0">({toBanglaNumber(item.quantity)})</span>
                              )}
                              {spBulkEditMode && roomDetail.currentInventory.length > 0 ? (
                                <select className="h-5 text-[10px] border rounded px-0.5" value={spBulkEditData[item.id]?.condition || ''} onChange={(e) => { setSpBulkEditData(prev => ({...prev, [item.id]: {...prev[item.id], condition: e.target.value}})); }}>
                                  <option value="আছে">আছে</option><option value="নেই">নেই</option><option value="ভালো">ভালো</option><option value="খারাপ">খারাপ</option><option value="নতুন">নতুন</option><option value="পুরাতন">পুরাতন</option><option value="নস্ট">নস্ট</option><option value="ভাঙা">ভাঙা</option><option value="মাঝারি">মাঝারি</option>
                                </select>
                              ) : (
                                <span className="text-[9px]">{getConditionBadge(item.condition)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button variant="ghost" size="sm" className="size-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-100" onClick={async () => {
                                setEditInvItem({ id: item.id, itemName: item.itemName, quantity: item.quantity, condition: item.condition, note: item.note });
                                setNewRepairDate(""); setNewRepairNote(""); setNewReplaceDate(""); setNewReplaceNote("");
                                setShowInvHistory(false); setInvHistoryPage(1); setInvRepairHistory([]);
                                setInvLatestRepairDate(""); setInvLatestReplaceDate("");
                                try {
                                  const res = await fetch(`/api/inventory/repair-replace?inventoryId=${item.id}`);
                                  if (res.ok) {
                                    const records = await res.json();
                                    setInvRepairHistory(records);
                                    const repairRecord = records.find((r: any) => r.type === "repair");
                                    const replaceRecord = records.find((r: any) => r.type === "replace");
                                    if (repairRecord) setInvLatestRepairDate(repairRecord.actionDate ? repairRecord.actionDate.split("T")[0] : "");
                                    if (replaceRecord) setInvLatestReplaceDate(replaceRecord.actionDate ? replaceRecord.actionDate.split("T")[0] : "");
                                  }
                                } catch { /* silent */ }
                                setEditInvOpen(true);
                              }}><Edit3 className="size-3" /></Button>
                              <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="size-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-100"><Trash2 className="size-3" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>মালামাল মুছে ফেলবেন?</AlertDialogTitle><AlertDialogDescription>&quot;{item.itemName}&quot; স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>বাতিল</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDeleteInventory(item.id)} disabled={deletingInv}>মুছে ফেলুন</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                            </div>
                          </div>
                          {(rInfo?.latestRepair || rInfo?.latestReplace) && (
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                              {rInfo?.latestRepair && <span className="text-blue-600">রিপেয়ার: {formatDate(rInfo.latestRepair)}</span>}
                              {rInfo?.latestReplace && <span className="text-orange-600">রিপ্লেস: {formatDate(rInfo.latestReplace)}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {spBulkEditMode && (
                  <div className="flex gap-2 mt-2 justify-end">
                    <Button size="sm" className="h-5 text-[9px] bg-emerald-600 text-white gap-1 px-2" onClick={async () => {
                      setSpSavingBulk(true);
                      try {
                        const items = Object.entries(spBulkEditData).map(([id, data]) => ({ id, ...data }));
                        const res = await fetch("/api/inventory/bulk-update", { method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ items }) });
                        if (res.ok) { toast.success("সব মালামাল আপডেট হয়েছে"); setSpBulkEditMode(false); setSpBulkEditData({}); if (selectedTenant) silentRefreshSearchDetail(); }
                        else toast.error("আপডেট করতে সমস্যা");
                      } catch { toast.error("আপডেট করতে সমস্যা"); }
                      setSpSavingBulk(false);
                    }} disabled={spSavingBulk}>
                      {spSavingBulk ? "সেভ হচ্ছে..." : "সব সেভ করুন"}
                    </Button>
                  </div>
                )}
              </div>
              )}
              {/* Common belongings loaded - add to room */}
              {commonItems.length > 0 && (
                <div className="border-t pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                      <Package className="size-3" /> {toBanglaNumber(commonItems.length)} টি কমন মালামাল লোড হয়েছে
                    </span>
                    <Button size="sm" className="h-5 text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white gap-0.5 px-2" onClick={handleAddCommonToTenant} disabled={addingCommonToTenant}>
                      {addingCommonToTenant ? <div className="size-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Package className="size-2.5" />}
                      রুমে মালামাল যোগ
                    </Button>
                  </div>
                  <div className="space-y-0.5 max-h-36 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {commonItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-emerald-50/50 rounded text-[10px] border border-emerald-100/60">
                        {editCommonIdx === idx ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input className="flex-1 h-5 text-[10px] border rounded px-1 bg-white" value={editCommonName} onChange={(e) => setEditCommonName(e.target.value)} />
                            <input type="number" className="w-10 h-5 text-[10px] border rounded px-1 bg-white text-center" value={editCommonQty} onChange={(e) => setEditCommonQty(e.target.value)} />
                            <select className="h-5 text-[10px] border rounded px-0.5 bg-white" value={editCommonCond} onChange={(e) => setEditCommonCond(e.target.value)}>
                              <option value="আছে">আছে</option><option value="নেই">নেই</option><option value="ভালো">ভালো</option><option value="খারাপ">খারাপ</option><option value="নতুন">নতুন</option><option value="পুরাতন">পুরাতন</option><option value="নস্ট">নস্ট</option><option value="ভাঙা">ভাঙা</option><option value="মাঝারি">মাঝারি</option>
                            </select>
                            <Button variant="ghost" size="sm" className="size-5 p-0 text-emerald-600 hover:bg-emerald-100" onClick={() => {
                              setCommonItems(prev => prev.map((c, i) => i === idx ? { itemName: editCommonName, quantity: editCommonQty, condition: editCommonCond } : c));
                              setEditCommonIdx(null);
                            }}><CheckCircle2 className="size-3" /></Button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 truncate text-gray-800">{item.itemName}</span>
                            <span className="text-muted-foreground">({toBanglaNumber(parseInt(item.quantity) || 0)})</span>
                            <Button variant="ghost" size="sm" className="size-5 p-0 text-blue-500 hover:bg-blue-100" onClick={() => {
                              setEditCommonIdx(idx); setEditCommonName(item.itemName); setEditCommonQty(item.quantity); setEditCommonCond(item.condition);
                            }}><Edit3 className="size-2.5" /></Button>
                            <Button variant="ghost" size="sm" className="size-5 p-0 text-red-400 hover:bg-red-100" onClick={() => setCommonItems(prev => prev.filter((_, i) => i !== idx))}><Trash2 className="size-2.5" /></Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">রুমের তথ্য পাওয়া যায়নি</div>
          )}
        </div>
      )}

      {/* Edit Snapshot Dialog */}
      <Dialog open={editSnapshotOpen} onOpenChange={(open) => { setEditSnapshotOpen(open); if (!open) { setEditSnapshotData([]); setEditSnapshotId(""); setEditSnapshotName(""); setEditSnapshotType(""); setEditSnapshotDate(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Edit3 className="size-5" />
              মালামাল স্ন্যাপশট সম্পাদনা
            </DialogTitle>
            <DialogDescription>স্ন্যাপশটের সব তথ্য সম্পাদনা করুন</DialogDescription>
          </DialogHeader>
          {/* Header fields: name, type, date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-blue-50 rounded-lg p-2.5 border border-blue-100">
            <div className="space-y-0.5">
              <label className="text-[10px] font-semibold text-blue-700">ব্যক্তির নাম *</label>
              <input className="w-full h-8 text-xs border rounded px-2 bg-white" placeholder="নাম লিখুন" value={editSnapshotName} onChange={(e) => setEditSnapshotName(e.target.value)} />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] font-semibold text-blue-700">ধরন</label>
              <select className="w-full h-8 text-xs border rounded px-1 bg-white" value={editSnapshotType} onChange={(e) => setEditSnapshotType(e.target.value)}>
                <option value="assign">বরাদ্দ</option>
                <option value="vacate">বাতিল</option>
              </select>
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] font-semibold text-blue-700">তারিখ</label>
              <input className="w-full h-8 text-xs border rounded px-2 bg-white" type="date" value={editSnapshotDate} onChange={(e) => setEditSnapshotDate(e.target.value)} />
            </div>
          </div>
          {/* Item list */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {editSnapshotData.map((item, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-bold w-5 shrink-0 text-center">{toBanglaNumber(idx + 1)}</span>
                  <input className="flex-1 min-w-0 h-7 text-xs border rounded px-1.5 bg-white" placeholder="মালামালের নাম" value={item.itemName} onChange={(e) => setEditSnapshotData(prev => prev.map((d, i) => i === idx ? { ...d, itemName: e.target.value } : d))} />
                  <input className="w-12 h-7 text-xs border rounded px-1 bg-white text-center" type="number" min={0} value={item.quantity} onChange={(e) => setEditSnapshotData(prev => prev.map((d, i) => i === idx ? { ...d, quantity: parseInt(e.target.value) || 0 } : d))} />
                  <select className="h-7 text-xs border rounded px-0.5 bg-white" value={item.condition} onChange={(e) => setEditSnapshotData(prev => prev.map((d, i) => i === idx ? { ...d, condition: e.target.value } : d))}>
                    <option value="আছে">আছে</option><option value="নেই">নেই</option><option value="ভালো">ভালো</option><option value="খারাপ">খারাপ</option><option value="নতুন">নতুন</option><option value="পুরাতন">পুরাতন</option><option value="নস্ট">নস্ট</option><option value="ভাঙা">ভাঙা</option><option value="মাঝারি">মাঝারি</option>
                  </select>
                  <input className="w-20 h-7 text-xs border rounded px-1 bg-white" placeholder="নোট" value={item.note || ''} onChange={(e) => setEditSnapshotData(prev => prev.map((d, i) => i === idx ? { ...d, note: e.target.value } : d))} />
                  <button className="size-6 shrink-0 rounded-md hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors" onClick={() => setEditSnapshotData(prev => prev.filter((_, i) => i !== idx))} title="সরান">
                    <Trash2 className="size-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 pl-6">
                  <span className="text-[9px] text-muted-foreground w-16 shrink-0">রিপেয়ার:</span>
                  <input className="flex-1 h-6 text-[10px] border rounded px-1 bg-white" type="date" value={item.latestRepair ? item.latestRepair.split('T')[0] : ''} onChange={(e) => setEditSnapshotData(prev => prev.map((d, i) => i === idx ? { ...d, latestRepair: e.target.value || '' } : d))} />
                  <span className="text-[9px] text-muted-foreground w-16 shrink-0">রিপ্লেস:</span>
                  <input className="flex-1 h-6 text-[10px] border rounded px-1 bg-white" type="date" value={item.latestReplace ? item.latestReplace.split('T')[0] : ''} onChange={(e) => setEditSnapshotData(prev => prev.map((d, i) => i === idx ? { ...d, latestReplace: e.target.value || '' } : d))} />
                </div>
              </div>
            ))}
            <button className="w-full py-1.5 text-xs text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors" onClick={() => setEditSnapshotData(prev => [...prev, { itemName: '', quantity: 1, condition: 'আছে', note: '', latestRepair: '', latestReplace: '' }])}>
              + নতুন মালামাল যোগ করুন
            </button>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEditSnapshotOpen(false); setEditSnapshotData([]); setEditSnapshotId(""); setEditSnapshotName(""); setEditSnapshotType(""); setEditSnapshotDate(""); }}>বাতিল</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveEditSnapshot} disabled={editSnapshotSaving || !editSnapshotName.trim() || editSnapshotData.length === 0 || editSnapshotData.some(d => !d.itemName.trim())}>
              {editSnapshotSaving ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              সেভ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editInvOpen} onOpenChange={(open) => { setEditInvOpen(open); if (!open) { setEditInvItem(null); setNewRepairDate(""); setNewReplaceDate(""); setNewRepairNote(""); setNewReplaceNote(""); setInvRepairHistory([]); setInvLatestRepairDate(""); setInvLatestReplaceDate(""); setShowInvHistory(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Edit3 className="size-5" />
              মালামাল সম্পাদনা
            </DialogTitle>
          </DialogHeader>
          {editInvItem && (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {/* Basic info */}
              <div className="space-y-1">
                <Label className="text-xs">জিনিসের নাম</Label>
                <Input className="h-8 text-sm" value={editInvItem.itemName} onChange={(e) => setEditInvItem({ ...editInvItem, itemName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">পরিমাণ</Label>
                  <Input className="h-8 text-sm" type="number" min={0} value={editInvItem.quantity} onChange={(e) => setEditInvItem({ ...editInvItem, quantity: e.target.value === '' ? '' : Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">অবস্থা</Label>
                  <Select value={editInvItem.condition} onValueChange={(v) => setEditInvItem({ ...editInvItem, condition: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="আছে">আছে</SelectItem><SelectItem value="নেই">নেই</SelectItem><SelectItem value="ভালো">ভালো</SelectItem><SelectItem value="খারাপ">খারাপ</SelectItem><SelectItem value="নতুন">নতুন</SelectItem><SelectItem value="পুরাতন">পুরাতন</SelectItem><SelectItem value="নস্ট">নস্ট</SelectItem><SelectItem value="ভাঙা">ভাঙা</SelectItem><SelectItem value="মাঝারি">মাঝারি</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">নোট</Label>
                <Input className="h-8 text-sm" value={editInvItem.note || ""} onChange={(e) => setEditInvItem({ ...editInvItem, note: e.target.value })} />
              </div>

              {/* Divider */}
              <div className="border-t pt-2 mt-2">
                <p className="text-xs font-semibold text-gray-500 mb-2">Repair / Replace রেকর্ড</p>
              </div>

              {/* Latest Repair Date (read-only) */}
              {invLatestRepairDate && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="size-3.5 text-blue-500" />
                    <span className="text-xs text-blue-700 font-medium">সর্বশেষ Repair:</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-800">{formatDate(invLatestRepairDate)}</span>
                </div>
              )}

              {/* Latest Replace Date (read-only) */}
              {invLatestReplaceDate && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className="size-3.5 text-amber-500" />
                    <span className="text-xs text-amber-700 font-medium">সর্বশেষ Replace:</span>
                  </div>
                  <span className="text-xs font-semibold text-amber-800">{formatDate(invLatestReplaceDate)}</span>
                </div>
              )}

              {/* Add new Repair */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 space-y-2">
                <p className="text-xs font-medium text-gray-600 flex items-center gap-1"><Wrench className="size-3" />Repair</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-7 text-xs" type="date" value={newRepairDate} onChange={(e) => setNewRepairDate(e.target.value)} placeholder="তারিখ" />
                  <Input className="h-7 text-xs" value={newRepairNote} onChange={(e) => setNewRepairNote(e.target.value)} placeholder="নোট (ঐচ্ছিক)" />
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs w-full border-blue-200 text-blue-600 hover:bg-blue-50" disabled={!newRepairDate || savingRepairRecord} onClick={() => handleSaveQuickRepair("repair")}>
                  {savingRepairRecord ? "হচ্ছে..." : "Repair সেভ করুন"}
                </Button>
              </div>

              {/* Add new Replace */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 space-y-2">
                <p className="text-xs font-medium text-gray-600 flex items-center gap-1"><RefreshCw className="size-3" />Replace</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-7 text-xs" type="date" value={newReplaceDate} onChange={(e) => setNewReplaceDate(e.target.value)} placeholder="তারিখ" />
                  <Input className="h-7 text-xs" value={newReplaceNote} onChange={(e) => setNewReplaceNote(e.target.value)} placeholder="নোট (ঐচ্ছিক)" />
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs w-full border-amber-200 text-amber-600 hover:bg-amber-50" disabled={!newReplaceDate || savingRepairRecord} onClick={() => handleSaveQuickRepair("replace")}>
                  {savingRepairRecord ? "হচ্ছে..." : "Replace সেভ করুন"}
                </Button>
              </div>

              {/* Collapsible history with pagination */}
              {invRepairHistory.length > 0 && (
                <div className="border-t pt-2">
                  <button
                    onClick={() => { setShowInvHistory(!showInvHistory); if (!showInvHistory) setInvHistoryPage(1); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors w-full"
                  >
                    {showInvHistory ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                    <span>সকল রেকর্ড দেখুন ({toBanglaNumber(invRepairHistory.length)})</span>
                  </button>
                  {showInvHistory && (() => {
                    const totalPages = Math.ceil(invRepairHistory.length / INV_HISTORY_PER_PAGE);
                    const pagedRecords = invRepairHistory.slice((invHistoryPage - 1) * INV_HISTORY_PER_PAGE, invHistoryPage * INV_HISTORY_PER_PAGE);
                    return (
                      <div className="mt-2">
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {pagedRecords.map((r) => (
                            <div key={r.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-md px-2.5 py-1.5">
                              <div className="flex items-center gap-2">
                                {r.type === "repair" ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"><Wrench className="size-2.5" />Repair</span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700"><RefreshCw className="size-2.5" />Replace</span>
                                )}
                                <span className="text-xs text-gray-600">{formatDate(r.actionDate)}</span>
                                {r.note && <span className="text-[10px] text-gray-400">({r.note})</span>}
                              </div>
                              <button onClick={() => handleDeleteRepairRecord(r.id)} className="size-5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center" title="মুছুন">
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                            <button onClick={() => setInvHistoryPage((p) => Math.max(1, p - 1))} disabled={invHistoryPage <= 1} className="size-6 rounded text-[10px] flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                              <button key={pg} onClick={() => setInvHistoryPage(pg)} className={`size-6 rounded text-[10px] flex items-center justify-center border ${pg === invHistoryPage ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"}`}>{toBanglaNumber(pg)}</button>
                            ))}
                            <button onClick={() => setInvHistoryPage((p) => Math.min(totalPages, p + 1))} disabled={invHistoryPage >= totalPages} className="size-6 rounded text-[10px] flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setEditInvOpen(false); setEditInvItem(null); }}>বাতিল</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleEditInventory} disabled={editingInv || !editInvItem?.itemName.trim()}>
              {editingInv ? "হচ্ছে..." : "আপডেট করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Previous Tenant Dialog */}
      <Dialog open={editPrevTenantOpen} onOpenChange={(open) => { if (!open) { setEditPrevTenantOpen(false); setEditPrevTenantData(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit3 className="size-4" />পূর্বের ভাড়াটে তথ্য সম্পাদনা</DialogTitle>
            <DialogDescription>ভাড়াটের নাম, পদবি ও ফোন নম্বর পরিবর্তন করুন</DialogDescription>
          </DialogHeader>
          {editPrevTenantData && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">নাম *</Label>
                <Input className="h-9 text-sm" value={editPrevTenantData.tenantName} onChange={(e) => setEditPrevTenantData({ ...editPrevTenantData, tenantName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">পদবি</Label>
                <Input className="h-9 text-sm" value={editPrevTenantData.designation} onChange={(e) => setEditPrevTenantData({ ...editPrevTenantData, designation: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ফোন নম্বর</Label>
                <Input className="h-9 text-sm" value={editPrevTenantData.phone} onChange={(e) => setEditPrevTenantData({ ...editPrevTenantData, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">শুরুর তারিখ</Label>
                  <Input className="h-9 text-sm" type="date" value={editPrevTenantData.startDate} onChange={(e) => setEditPrevTenantData({ ...editPrevTenantData, startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">শেষ তারিখ</Label>
                  <Input className="h-9 text-sm" type="date" value={editPrevTenantData.endDate} onChange={(e) => setEditPrevTenantData({ ...editPrevTenantData, endDate: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setEditPrevTenantOpen(false); setEditPrevTenantData(null); }}>বাতিল</Button>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSaveEditPrevTenant} disabled={editingPrevTenant || !editPrevTenantData?.tenantName.trim()}>
              {editingPrevTenant ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" /> : null}
              আপডেট করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Room User Dialog */}
      <Dialog open={spEditRoomUserOpen} onOpenChange={setSpEditRoomUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-blue-600"><Edit3 className="size-4" />ব্যবহারকারী সম্পাদনা</DialogTitle></DialogHeader>
          {spEditRoomUserData && (
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-xs">নাম</Label><Input className="h-8 text-sm" value={spEditRoomUserData.name} onChange={(e) => setSpEditRoomUserData({ ...spEditRoomUserData, name: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">পদবি</Label><Input className="h-8 text-sm" value={spEditRoomUserData.designation} onChange={(e) => setSpEditRoomUserData({ ...spEditRoomUserData, designation: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">ফোন</Label><Input className="h-8 text-sm" value={spEditRoomUserData.phone} onChange={(e) => setSpEditRoomUserData({ ...spEditRoomUserData, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">দপ্তর</Label><Input className="h-8 text-sm" value={spEditRoomUserData.department} onChange={(e) => setSpEditRoomUserData({ ...spEditRoomUserData, department: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">শুরুর তারিখ</Label><Input className="h-8 text-sm" type="date" value={spEditRoomUserData.startDate} onChange={(e) => setSpEditRoomUserData({ ...spEditRoomUserData, startDate: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setSpEditRoomUserOpen(false); setSpEditRoomUserData(null); }}>বাতিল</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSpEditRoomUser} disabled={spEditingRoomUser}>{spEditingRoomUser ? "হচ্ছে..." : "আপডেট করুন"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Current Room User */}
      <AlertDialog open={spDeleteRoomUserOpen} onOpenChange={setSpDeleteRoomUserOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="text-red-600">ব্যবহারকারী মুছে ফেলুন</AlertDialogTitle><AlertDialogDescription>"{spDeleteRoomUserName}" এর সকল তথ্য স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setSpDeleteRoomUserOpen(false); setSpDeleteRoomUserId(""); }}>বাতিল</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSpDeleteRoomUser} disabled={spDeletingRoomUser}>{spDeletingRoomUser ? "হচ্ছে..." : "মুছে ফেলুন"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Previous Room User */}
      <AlertDialog open={spDeletePrevRoomUserOpen} onOpenChange={setSpDeletePrevRoomUserOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="text-red-600">পূর্বের ব্যবহারকারী মুছে ফেলুন</AlertDialogTitle><AlertDialogDescription>"{spDeletePrevRoomUserName}" এর সকল তথ্য স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setSpDeletePrevRoomUserOpen(false); setSpDeletePrevRoomUserId(""); }}>বাতিল</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSpDeletePrevRoomUser} disabled={spDeletingPrevRoomUser}>{spDeletingPrevRoomUser ? "হচ্ছে..." : "মুছে ফেলুন"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Tenant Dialog (Global Search Panel) */}
      <Dialog open={gpEditTenantOpen} onOpenChange={(open) => { setGpEditTenantOpen(open); if (!open) setGpEditTenantData(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-emerald-600"><Edit3 className="size-4" />বরাদ্দকৃত ব্যক্তি সম্পাদনা</DialogTitle></DialogHeader>
          {gpEditTenantData && (
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-xs">নাম</Label><Input className="h-8 text-sm" value={gpEditTenantData.name} onChange={(e) => setGpEditTenantData({ ...gpEditTenantData, name: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">পদবি</Label><Input className="h-8 text-sm" value={gpEditTenantData.designation} onChange={(e) => setGpEditTenantData({ ...gpEditTenantData, designation: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">ফোন</Label><Input className="h-8 text-sm" value={gpEditTenantData.phone} onChange={(e) => setGpEditTenantData({ ...gpEditTenantData, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">দপ্তর</Label><Input className="h-8 text-sm" value={gpEditTenantData.department} onChange={(e) => setGpEditTenantData({ ...gpEditTenantData, department: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">যোগদানের তারিখ</Label><Input className="h-8 text-sm" type="date" value={gpEditTenantData.startDate} onChange={(e) => setGpEditTenantData({ ...gpEditTenantData, startDate: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setGpEditTenantOpen(false); setGpEditTenantData(null); }}>বাতিল</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleGpSaveTenantEdit} disabled={gpSavingTenantEdit}>{gpSavingTenantEdit ? "হচ্ছে..." : "আপডেট করুন"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Dialog (Global Search Panel) */}
      <AlertDialog open={gpDeleteTenantOpen} onOpenChange={setGpDeleteTenantOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="text-red-600">{gpDeleteTenantName}-কে মুছে ফেলবেন?</AlertDialogTitle><AlertDialogDescription>এই ভাড়াটের সকল তথ্য স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setGpDeleteTenantOpen(false); setGpDeleteTenantId(""); setGpDeleteTenantName(""); }}>বাতিল</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={(e) => { e.preventDefault(); handleGpDeleteTenant(); }} disabled={gpDeletingTenant}>{gpDeletingTenant ? "হচ্ছে..." : "মুছুন"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DashboardHeader({ user, onLogout, onChangePassword }: {
  user: { id: string; username: string } | null;
  onLogout: () => void;
  onChangePassword: () => void;
}) {
  return (
    <header className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <img src="/logo.jpg" alt="লোগো" className="size-10 rounded-xl shadow-lg shadow-emerald-200 object-cover" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            আবাসিক ম্যানেজমেন্ট
          </h1>
        </div>
        {/* Desktop: search + buttons in same row */}
        <div className="hidden sm:flex items-center gap-2">
          <GlobalSearchPanel />
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <div className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
              {user?.username?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <span className="text-sm font-medium text-emerald-800">Admin</span>
          </div>
          <Button variant="ghost" size="sm" className="size-9 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={onChangePassword} title="পাসওয়ার্ড পরিবর্তন">
            <KeyRound className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="size-9 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={onLogout} title="লগআউট">
            <LogOut className="size-4" />
          </Button>
        </div>
        {/* Mobile: only buttons */}
        <div className="flex sm:hidden items-center gap-0.5">
          <Button variant="ghost" size="sm" className="size-9 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={onChangePassword} title="পাসওয়ার্ড">
            <KeyRound className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="size-9 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={onLogout} title="লগআউট">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
      {/* Mobile: search below header */}
      <div className="mt-3 sm:hidden">
        <GlobalSearchPanel />
      </div>
    </header>
  );
}

// ── Main Tabs ────────────────────────────────────────────────────────────

function MainTabs() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('activeTab') || 'buildings';
    }
    return 'buildings';
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('activeTab', value);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1 bg-gray-100/80">
        <TabsTrigger value="buildings" className="flex-1 sm:flex-auto gap-1.5 border border-gray-200">
          <Building2 className="size-4" />
          <span className="hidden sm:inline">বিল্ডিং ও রুম</span>
          <span className="sm:hidden">বিল্ডিং</span>
        </TabsTrigger>

        <TabsTrigger value="guests" className="flex-1 sm:flex-auto gap-1.5 border border-gray-200">
          <UserCheck className="size-4" />
          <span className="hidden sm:inline">গেস্ট বুকিং</span>
          <span className="sm:hidden">গেস্ট</span>
        </TabsTrigger>
        <TabsTrigger value="troubles" className="flex-1 sm:flex-auto gap-1.5 border border-gray-200">
          <AlertTriangle className="size-4" />
          <span className="hidden sm:inline">ট্রাবল রিপোর্ট</span>
          <span className="sm:hidden">ট্রাবল</span>
        </TabsTrigger>
        <TabsTrigger value="belongings" className="flex-1 sm:flex-auto gap-1.5 border border-gray-200">
          <Package className="size-4" />
          <span className="hidden sm:inline">মালামাল টেম্পলেট</span>
          <span className="sm:hidden">মালামাল</span>
        </TabsTrigger>
        <a href="https://store-room-inventory.vercel.app/" target="_self" className="flex-1 sm:flex-auto flex items-center justify-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-sm font-medium text-foreground whitespace-nowrap transition-[color,box-shadow] min-w-0">
          <span className="hidden sm:inline">স্টোর রুম</span>
          <span className="sm:hidden">স্টোর</span>
        </a>
        <TabsTrigger value="downloads" className="flex-1 sm:flex-auto gap-1.5 border border-gray-200">
          <Download className="size-4" />
          <span className="hidden sm:inline">ডাউনলোড</span>
          <span className="sm:hidden">ডাউনলোড</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="buildings" className="mt-6">
        <TabErrorBoundary><BuildingsTab /></TabErrorBoundary>
      </TabsContent>

      <TabsContent value="guests" className="mt-6">
        <TabErrorBoundary><GuestsTab /></TabErrorBoundary>
      </TabsContent>
      <TabsContent value="troubles" className="mt-6">
        <TabErrorBoundary><TroublesTab /></TabErrorBoundary>
      </TabsContent>
      <TabsContent value="belongings" className="mt-6">
        <TabErrorBoundary><BelongingsTab /></TabErrorBoundary>
      </TabsContent>
      <TabsContent value="downloads" className="mt-6">
        <TabErrorBoundary><DownloadTab /></TabErrorBoundary>
      </TabsContent>
    </Tabs>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — Buildings & Rooms
// ═══════════════════════════════════════════════════════════════════════════

function BuildingsTab() {
  const { buildings, reloadBuildings, bookedRoomIds, reloadBookedRooms } = useBuildingsContext();
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(
    new Set()
  );

  // Dialog states
  const [addBuildingOpen, setAddBuildingOpen] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [newBuildingFloors, setNewBuildingFloors] = useState("");
  const [newBuildingCapacity, setNewBuildingCapacity] = useState("1");

  const [addRoomFloorId, setAddRoomFloorId] = useState("");
  const [addRoomNumber, setAddRoomNumber] = useState("");
  const [addRoomOpen, setAddRoomOpen] = useState(false);

  // Loading states
  const [creatingBuilding, setCreatingBuilding] = useState(false);
  const [deletingBuilding, setDeletingBuilding] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);

  // Edit building dialog
  const [editBuildingOpen, setEditBuildingOpen] = useState(false);
  const [editBuildingId, setEditBuildingId] = useState("");
  const [editBuildingName, setEditBuildingName] = useState("");
  const [editBuildingCapacity, setEditBuildingCapacity] = useState("");
  const [updatingBuilding, setUpdatingBuilding] = useState(false);

  // Edit room dialog
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [editRoomId, setEditRoomId] = useState("");
  const [editRoomNumber, setEditRoomNumber] = useState("");
  const [updatingRoom, setUpdatingRoom] = useState(false);

  // Delete building password dialog
  const [deleteBuildingId, setDeleteBuildingId] = useState("");
  const [deleteBuildingName, setDeleteBuildingName] = useState("");
  const [deletePassOpen, setDeletePassOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  // Room detail dialog state
  const [roomDetailOpen, setRoomDetailOpen] = useState(false);
  const [roomDetailData, setRoomDetailData] = useState<{
    roomId: string;
    roomNumber: string;
    buildingName: string;
    currentTenants: { id: string; name: string; designation: string | null; phone: string | null; startDate: string }[];
    previousTenants: { id: string; name: string; designation: string | null; phone: string | null; startDate: string; endDate: string | null }[];
    currentInventory: { id: string; itemName: string; quantity: number; condition: string; note: string | null; addedDate: string; tenantName: string | null }[];
    previousInventory: { id: string; itemName: string; quantity: number; condition: string; note: string | null; addedDate: string; tenantName: string | null }[];
    vacateRecords: { id: string; tenantId: string; tenantName: string; vacatedAt: string; inventorySnapshot: string }[];
    currentRoomUsers: any[];
    previousRoomUsers: any[];
  } | null>(null);
  const [roomDetailLoading, setRoomDetailLoading] = useState(false);

  // Add tenant from room detail dialog
  const [addTenantToRoom, setAddTenantToRoom] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantDesignation, setNewTenantDesignation] = useState("");
  const [newTenantPhone, setNewTenantPhone] = useState("");
  const [newTenantDept, setNewTenantDept] = useState("");
  const [newTenantStartDate, setNewTenantStartDate] = useState("");
  const [addingTenantToRoom, setAddingTenantToRoom] = useState(false);
  // Previous inventory items loaded for new tenant (auto-filled)
  const [roomPrevInvItems, setRoomPrevInvItems] = useState<{ itemName: string; quantity: string; condition: string }[]>([]);
  const [roomPrevTenantName, setRoomPrevTenantName] = useState("");
  const [loadingRoomPrevInv, setLoadingRoomPrevInv] = useState(false);
  const [editingCommonItemIdx, setEditingCommonItemIdx] = useState<number | null>(null);
  const [editCommonItemName, setEditCommonItemName] = useState("");
  const [editCommonItemQty, setEditCommonItemQty] = useState("");
  const [editCommonItemCond, setEditCommonItemCond] = useState("ভালো");

  // Vacate tenant from room detail dialog
  const [vacateTenantOpen, setVacateTenantOpen] = useState(false);
  const [vacateTenantId, setVacateTenantId] = useState("");
  const [vacateTenantName, setVacateTenantName] = useState("");
  const [vacatingTenant, setVacatingTenant] = useState(false);

  // Guest form from room detail dialog
  const [addGuestToRoom, setAddGuestToRoom] = useState(false);
  // Room detail dialog sub-tab: "info" | "tenant" | "guest" | "roomuser"
  const [roomDetailTab, setRoomDetailTab] = useState<"info" | "tenant" | "guest" | "roomuser">("info");
  const [guestName, setGuestName] = useState("");
  const [guestMobile, setGuestMobile] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [guestReferredBy, setGuestReferredBy] = useState("");
  const [guestCheckInDate, setGuestCheckInDate] = useState("");
  const [guestCheckOutDate, setGuestCheckOutDate] = useState("");
  const [guestTotalBill, setGuestTotalBill] = useState("");
  const [guestNote, setGuestNote] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);

  // Guest time fields
  const [guestCheckInTime, setGuestCheckInTime] = useState("");
  const [guestCheckOutTime, setGuestCheckOutTime] = useState("");
  const [guestIsPaid, setGuestIsPaid] = useState(true);

  // Current guests for this room
  const [currentGuestsInRoom, setCurrentGuestsInRoom] = useState<{
    id: string; name: string; mobile: string | null; address: string | null; referredBy: string | null;
    checkInDate: string; checkInTime: string | null; checkOutDate: string | null; checkOutTime: string | null;
    totalBill: string | null; note: string | null; isPaid: boolean; isBooked: boolean;
  }[]>([]);
  const [previousGuestsInRoom, setPreviousGuestsInRoom] = useState<{
    id: string; name: string; mobile: string | null; address: string | null; referredBy: string | null;
    checkInDate: string; checkInTime: string | null; checkOutDate: string | null; checkOutTime: string | null;
    totalBill: string | null; note: string | null; isPaid: boolean; isBooked: boolean;
  }[]>([]);

  // Edit guest dialog
  const [editGuestInRoom, setEditGuestInRoom] = useState(false);
  const [editGuestIdInRoom, setEditGuestIdInRoom] = useState("");
  const [editGuestNameInRoom, setEditGuestNameInRoom] = useState("");
  const [editGuestMobileInRoom, setEditGuestMobileInRoom] = useState("");
  const [editGuestAddressInRoom, setEditGuestAddressInRoom] = useState("");
  const [editGuestReferredByInRoom, setEditGuestReferredByInRoom] = useState("");
  const [editGuestCheckInDateInRoom, setEditGuestCheckInDateInRoom] = useState("");
  const [editGuestCheckInTimeInRoom, setEditGuestCheckInTimeInRoom] = useState("");
  const [editGuestCheckOutDateInRoom, setEditGuestCheckOutDateInRoom] = useState("");
  const [editGuestCheckOutTimeInRoom, setEditGuestCheckOutTimeInRoom] = useState("");
  const [editGuestTotalBillInRoom, setEditGuestTotalBillInRoom] = useState("");
  const [editGuestNoteInRoom, setEditGuestNoteInRoom] = useState("");
  const [editGuestIsPaidInRoom, setEditGuestIsPaidInRoom] = useState(true);
  const [savingGuestEditInRoom, setSavingGuestEditInRoom] = useState(false);

  // Delete guest confirm dialog
  const [deleteGuestInRoomOpen, setDeleteGuestInRoomOpen] = useState(false);
  const [deleteGuestIdInRoom, setDeleteGuestIdInRoom] = useState("");
  const [deleteGuestNameInRoom, setDeleteGuestNameInRoom] = useState("");
  const [deletingGuestInRoom, setDeletingGuestInRoom] = useState(false);

  // Vacate guest (room checkout) dialog
  const [vacateGuestInRoomOpen, setVacateGuestInRoomOpen] = useState(false);
  const [vacateGuestIdInRoom, setVacateGuestIdInRoom] = useState("");
  const [vacateGuestNameInRoom, setVacateGuestNameInRoom] = useState("");
  const [vacateCheckOutDate, setVacateCheckOutDate] = useState("");
  const [vacateCheckOutTime, setVacateCheckOutTime] = useState("");
  const [vacatingGuestInRoom, setVacatingGuestInRoom] = useState(false);

  // Previous tenants pagination in room detail dialog
  const [prevTenantPage, setPrevTenantPage] = useState(1);
  const PREV_TENANT_PER_PAGE = 5;
  const [rtExpandedPrevTenant, setRtExpandedPrevTenant] = useState<string | null>(null);
  const [rtEditPrevOpen, setRtEditPrevOpen] = useState(false);
  const [rtEditPrevData, setRtEditPrevData] = useState<{ id: string; tenantId: string; tenantName: string; designation: string; phone: string; startDate: string; endDate: string } | null>(null);
  const [rtEditingPrev, setRtEditingPrev] = useState(false);
  const [rtDeletingPrev, setRtDeletingPrev] = useState(false);
  const [rtDeletingSnapshot, setRtDeletingSnapshot] = useState(false);

  // Inventory pagination in room detail dialog
  const [invPage, setInvPage] = useState(1);
  const INV_PER_PAGE = 15;
  const [prevInvPage, setPrevInvPage] = useState(1);

  // Edit tenant from room detail dialog
  const [editTenantInRoom, setEditTenantInRoom] = useState(false);
  const [editTenantIdInRoom, setEditTenantIdInRoom] = useState("");
  const [editTenantNameInRoom, setEditTenantNameInRoom] = useState("");
  const [editTenantDesigInRoom, setEditTenantDesigInRoom] = useState("");
  const [editTenantPhoneInRoom, setEditTenantPhoneInRoom] = useState("");
  const [editTenantDeptInRoom, setEditTenantDeptInRoom] = useState("");
  const [editTenantStartDateInRoom, setEditTenantStartDateInRoom] = useState("");
  const [savingTenantEditInRoom, setSavingTenantEditInRoom] = useState(false);

  // Delete tenant from room detail dialog
  const [deleteTenantInRoomOpen, setDeleteTenantInRoomOpen] = useState(false);
  const [deleteTenantInRoomId, setDeleteTenantInRoomId] = useState("");
  const [deleteTenantInRoomName, setDeleteTenantInRoomName] = useState("");
  const [deletingTenantInRoom, setDeletingTenantInRoom] = useState(false);

  // Room User (ব্যবহারকারী) states
  const [addRoomUserOpen, setAddRoomUserOpen] = useState(false);
  const [ruName, setRuName] = useState("");
  const [ruDesignation, setRuDesignation] = useState("");
  const [ruPhone, setRuPhone] = useState("");
  const [ruDept, setRuDept] = useState("");
  const [ruStartDate, setRuStartDate] = useState("");
  const [addingRoomUser, setAddingRoomUser] = useState(false);
  const [editRoomUserOpen, setEditRoomUserOpen] = useState(false);
  const [editRoomUserData, setEditRoomUserData] = useState<{ id: string; name: string; designation: string; phone: string; department: string; startDate: string; } | null>(null);
  const [editingRoomUser, setEditingRoomUser] = useState(false);
  const [deleteRoomUserOpen, setDeleteRoomUserOpen] = useState(false);
  const [deleteRoomUserId, setDeleteRoomUserId] = useState("");
  const [deleteRoomUserName, setDeleteRoomUserName] = useState("");
  const [deletingRoomUser, setDeletingRoomUser] = useState(false);
  const [ruCurrentPage, setRuCurrentPage] = useState(1);
  const [ruPrevPage, setRuPrevPage] = useState(1);
  const [rtExpandedCurrentUser, setRtExpandedCurrentUser] = useState<string | null>(null);
  const [rtExpandedPrevRoomUser, setRtExpandedPrevRoomUser] = useState<string | null>(null);

  // Edit inventory from room detail dialog
  const [editInvInRoom, setEditInvInRoom] = useState(false);
  const [editInvIdInRoom, setEditInvIdInRoom] = useState("");
  const [editInvItemName, setEditInvItemName] = useState("");
  const [editInvQuantity, setEditInvQuantity] = useState("");
  const [editInvCondition, setEditInvCondition] = useState("ভালো");
  const [editInvNote, setEditInvNote] = useState("");
  const [savingInvEditInRoom, setSavingInvEditInRoom] = useState(false);
  // Repair / Replace history for inventory edit dialog
  const [invRepairHistory, setInvRepairHistory] = useState<{ id: string; type: string; actionDate: string; note: string | null }[]>([]);
  const [invLatestRepairDate, setInvLatestRepairDate] = useState("");
  const [invLatestReplaceDate, setInvLatestReplaceDate] = useState("");
  const [showInvHistory, setShowInvHistory] = useState(false);
  const [newRepairDate, setNewRepairDate] = useState("");
  const [newRepairNote, setNewRepairNote] = useState("");
  const [newReplaceDate, setNewReplaceDate] = useState("");
  const [newReplaceNote, setNewReplaceNote] = useState("");
  const [savingRepairRecord, setSavingRepairRecord] = useState(false);
  const [invHistoryPage, setInvHistoryPage] = useState(1);
  const INV_HISTORY_PER_PAGE = 10;

  // Repair/replace dates for room detail inventory table
  const [roomInvRepairDates, setRoomInvRepairDates] = useState<Record<string, { latestRepair: string; latestReplace: string; repairNote: string | null; replaceNote: string | null }>>({});

  // Delete inventory from room detail dialog
  const [deleteInvInRoomOpen, setDeleteInvInRoomOpen] = useState(false);
  const [deleteInvIdInRoom, setDeleteInvIdInRoom] = useState("");
  const [deleteInvNameInRoom, setDeleteInvNameInRoom] = useState("");
  const [deletingInvInRoom, setDeletingInvInRoom] = useState(false);

  // Add new inventory item directly from room detail info tab
  const [addNewInvOpen, setAddNewInvOpen] = useState(false);
  const [addNewInvName, setAddNewInvName] = useState("");
  const [addNewInvQty, setAddNewInvQty] = useState("1");
  const [addNewInvCondition, setAddNewInvCondition] = useState("আছে");
  const [addNewInvNote, setAddNewInvNote] = useState("");
  const [addingNewInv, setAddingNewInv] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<Record<string, { quantity: string; condition: string }>>({});
  const [savingBulk, setSavingBulk] = useState(false);

  const handleAddNewInvToRoom = async () => {
    if (!addNewInvName.trim() || !roomDetailData?.roomId) {
      toast.error("মালামালের নাম দিন");
      return;
    }
    setAddingNewInv(true);
    try {
      // Find first active tenant to associate with, or add without tenant
      const tenantId = roomDetailData.currentTenants.length > 0 ? roomDetailData.currentTenants[0].id : null;
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: addNewInvName.trim(),
          quantity: parseInt(addNewInvQty) || 0,
          condition: addNewInvCondition,
          roomId: roomDetailData.roomId,
          roomNumber: roomDetailData.roomNumber,
          tenantId,
          note: addNewInvNote.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("নতুন মালামাল যোগ হয়েছে");
      setAddNewInvName("");
      setAddNewInvQty("1");
      setAddNewInvCondition("আছে");
      setAddNewInvNote("");
      setAddNewInvOpen(false);
      // Reload room detail to show updated inventory
      silentRefreshRoomDetail();
    } catch {
      toast.error("মালামাল যোগ করতে সমস্যা");
    } finally {
      setAddingNewInv(false);
    }
  };

  // Full tenant add dialog (same as TenantsTab form) — triggered from room detail
  const [fullTenantDialogOpen, setFullTenantDialogOpen] = useState(false);
  const [ftBuildingId, setFtBuildingId] = useState("");
  const [ftFloorId, setFtFloorId] = useState("");
  const [ftRoomId, setFtRoomId] = useState("");
  const [ftRoomNumber, setFtRoomNumber] = useState("");
  const [ftName, setFtName] = useState("");
  const [ftDesignation, setFtDesignation] = useState("");
  const [ftPhone, setFtPhone] = useState("");
  const [ftDept, setFtDept] = useState("");
  const [ftStartDate, setFtStartDate] = useState("");
  const [ftShowTenant2, setFtShowTenant2] = useState(false);
  const [ft2Name, setFt2Name] = useState("");
  const [ft2Designation, setFt2Designation] = useState("");
  const [ft2Phone, setFt2Phone] = useState("");
  const [ft2Dept, setFt2Dept] = useState("");
  const [ft2StartDate, setFt2StartDate] = useState("");
  const [ftInvItems, setFtInvItems] = useState<{ itemName: string; quantity: string; condition: string }[]>([{ itemName: "", quantity: "1", condition: "আছে" }]);
  const [ftEditingInvIdx, setFtEditingInvIdx] = useState<number | null>(null);
  const [ftAddingTenant, setFtAddingTenant] = useState(false);
  const [ftPreviousTenantName, setFtPreviousTenantName] = useState("");
  const [ftLoadingPrevItems, setFtLoadingPrevItems] = useState(false);
  const [ftLoadingCommonItems, setFtLoadingCommonItems] = useState(false);

  const ftSelectedBuilding = buildings.find((b) => b.id === ftBuildingId);
  const ftSelectedFloor = ftSelectedBuilding?.floors?.find((f) => f.id === ftFloorId);

  const openFullTenantDialog = () => {
    if (!roomDetailData) return;
    let foundBuildingId = "";
    let foundFloorId = "";
    for (const b of buildings) {
      for (const f of b.floors || []) {
        for (const r of f.rooms || []) {
          if (r.id === roomDetailData.roomId) {
            foundBuildingId = b.id;
            foundFloorId = f.id;
          }
        }
      }
    }
    setFtBuildingId(foundBuildingId);
    setFtFloorId(foundFloorId);
    setFtRoomId(roomDetailData.roomId);
    setFtRoomNumber(roomDetailData.roomNumber);
    setFtName("");
    setFtDesignation("");
    setFtPhone("");
    setFtStartDate(new Date().toISOString().split('T')[0]);
    setFtShowTenant2(false);
    setFt2Name("");
    setFt2Designation("");
    setFt2Phone("");
    setFt2StartDate("");
    setFtInvItems([{ itemName: "", quantity: "1", condition: "আছে" }]);
    setFtEditingInvIdx(null);
    setFtPreviousTenantName("");
    setFullTenantDialogOpen(true);
    // Load previous inventory
    if (roomDetailData.roomId) {
      setFtLoadingPrevItems(true);
      fetch(`/api/inventory?roomId=${roomDetailData.roomId}&lastTenant=true`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && !Array.isArray(data) && data.items && data.items.length > 0) {
            setFtInvItems(data.items.map((item: { itemName: string; quantity: number; condition: string }) => ({
              itemName: item.itemName, quantity: String(item.quantity), condition: item.condition
            })));
            setFtPreviousTenantName(data.tenantName || "");
          }
        }).catch(() => {}).finally(() => setFtLoadingPrevItems(false));
    }
    // Close room detail
    setRoomDetailOpen(false);
    setRoomDetailData(null);
  };

  const handleFullTenantAdd = async () => {
    if (!ftName.trim() || !ftRoomId || !ftStartDate) {
      toast.error("নাম, রুম এবং শুরুর তারিখ দিন");
      return;
    }
    if (ftShowTenant2 && !ft2Name.trim()) {
      toast.error("২য় ভাড়াটের নাম দিন");
      return;
    }
    setFtAddingTenant(true);
    try {
      const res1 = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ftName.trim(),
          designation: ftDesignation.trim() || null,
          phone: ftPhone.trim() || null,
          department: ftDept.trim() || null,
          roomId: ftRoomId,
          roomNumber: ftRoomNumber,
          startDate: ftStartDate,
          inventoryItems: ftInvItems.filter(i => i.itemName.trim()),
          skipDeactivate: true,
        }),
      });
      if (!res1.ok) throw new Error();
      if (ftShowTenant2 && ft2Name.trim()) {
        const res2 = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: ft2Name.trim(),
            designation: ft2Designation.trim() || null,
            phone: ft2Phone.trim() || null,
            department: ft2Dept.trim() || null,
            roomId: ftRoomId,
            roomNumber: ftRoomNumber,
            startDate: ft2StartDate || ftStartDate,
            inventoryItems: ftInvItems.filter(i => i.itemName.trim()),
            skipDeactivate: true,
          }),
        });
        if (!res2.ok) throw new Error();
      }
      toast.success(ftShowTenant2 ? "দুইজন ভাড়াটে যোগ হয়েছে" : "ভাড়াটে যোগ হয়েছে");
      setFullTenantDialogOpen(false);
      refreshData();
    } catch {
      toast.error("ভাড়াটে যোগ করতে সমস্যা হয়েছে");
    } finally {
      setFtAddingTenant(false);
    }
  };

  const handleAddTenantToRoom = async () => {
    if (!newTenantName.trim() || !newTenantStartDate || !roomDetailData?.roomId) {
      toast.error("নাম ও যোগদানের তারিখ দিন");
      return;
    }
    setAddingTenantToRoom(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTenantName.trim(),
          designation: newTenantDesignation.trim(),
          phone: newTenantPhone.trim(),
          department: newTenantDept.trim(),
          roomId: roomDetailData.roomId,
          roomNumber: roomDetailData.roomNumber,
          startDate: newTenantStartDate,
          inventoryItems: roomPrevInvItems.filter(i => i.itemName.trim()),
          skipDeactivate: true,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("ভাড়াটে যোগ হয়েছে");
      setNewTenantName("");
      setNewTenantDesignation("");
      setNewTenantPhone("");
      setNewTenantDept("");
      setNewTenantStartDate("");
      setRoomPrevInvItems([]);
      setRoomPrevTenantName("");
      setAddTenantToRoom(false);
      refreshData();
      // Reload room detail
      silentRefreshRoomDetail();
    } catch {
      toast.error("ভাড়াটে যোগ করতে সমস্যা হয়েছে");
    } finally {
      setAddingTenantToRoom(false);
    }
  };

  // Open add-tenant form and auto-load previous inventory
  const openAddTenantToRoom = async () => {
    setAddTenantToRoom(true);
    setRoomPrevInvItems([]);
    setRoomPrevTenantName("");
    if (!roomDetailData?.roomId) return;
    try {
      setLoadingRoomPrevInv(true);
      const res = await fetch(`/api/inventory?roomId=${roomDetailData.roomId}&lastTenant=true`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (Array.isArray(data) || !data.items || data.items.length === 0) {
        setRoomPrevInvItems([]);
        setRoomPrevTenantName("");
      } else {
        setRoomPrevInvItems(data.items.map((item: any) => ({
          itemName: item.itemName,
          quantity: String(item.quantity),
          condition: item.condition,
        })));
        setRoomPrevTenantName(data.tenantName || "");
      }
    } catch {
      setRoomPrevInvItems([]);
      setRoomPrevTenantName("");
    } finally {
      setLoadingRoomPrevInv(false);
    }
  };

  const handleLoadCommonBelongings = async () => {
    if (!roomDetailData?.roomId) return;
    try {
      // Find buildingId from buildings state by matching buildingName
      let bId = "";
      if (roomDetailData.buildingName) {
        const found = buildings.find(b => b.name === roomDetailData.buildingName);
        if (found) bId = found.id;
      }
      if (!bId) {
        // Fallback: fetch room-wise-data to get building info
        const rwd = await fetch(`/api/room-wise-data?roomId=${roomDetailData.roomId}`);
        if (rwd.ok) {
          const rwdData = await rwd.json();
          // Try to get from rooms data
          if (rwdData.mode === 'singleRoom' && rwdData.buildingId) bId = rwdData.buildingId;
        }
      }
      if (!bId) { toast.error("বিল্ডিং পাওয়া যায়নি"); return; }
      const r = await fetch(`/api/belongings?buildingId=${bId}`);
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          // Filter out items already in room's current inventory
          const existingNames = new Set(
            (roomDetailData.currentInventory || []).map((inv: any) => inv.itemName.trim().toLowerCase())
          );
          const filtered = data.filter((item: any) => !existingNames.has(item.itemName.trim().toLowerCase()));
          if (filtered.length === 0) {
            toast.info("সব মালামাল ইতিমধ্যে এই রুমে আছে");
          } else {
            setRoomPrevInvItems(filtered.map((item: any) => ({ itemName: item.itemName, quantity: String(item.quantity), condition: "আছে" })));
            const skipped = data.length - filtered.length;
            toast.success(`${toBanglaNumber(filtered.length)} টি কমন মালামাল লোড হয়েছে${skipped > 0 ? ` (${toBanglaNumber(skipped)} টি ডুপ্লিকেট বাদ)` : ''}`);
          }
        } else { toast.error("এই বিল্ডিংয়ে কোনো কমন মালামাল নেই"); }
      }
    } catch { toast.error("কমন মালামাল লোড করতে সমস্যা"); }
  };

  // Add loaded common belongings to existing tenant's inventory — batch API for speed
  const [addingCommonToTenant, setAddingCommonToTenant] = useState(false);
  const handleAddCommonToExistingTenant = async () => {
    if (!roomDetailData?.roomId) {
      toast.error("রুম পাওয়া যায়নি");
      return;
    }
    if (roomPrevInvItems.length === 0) {
      toast.error("কোনো মালামাল লোড করা হয়নি");
      return;
    }

    setAddingCommonToTenant(true);
    try {
      const res = await fetch("/api/inventory/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: roomPrevInvItems.filter(i => i.itemName.trim()),
          roomId: roomDetailData.roomId,
          roomNumber: roomDetailData.roomNumber,
        }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      toast.success(result.message || `${toBanglaNumber(result.added)} টি মালামাল যোগ হয়েছে${result.skipped > 0 ? `, ${toBanglaNumber(result.skipped)} টি ডুপ্লিকেট বাদ` : ''}`);
      setRoomPrevInvItems([]);
      setEditingCommonItemIdx(null);
      refreshData();
      silentRefreshRoomDetail();
    } catch { toast.error("মালামাল যোগ করতে সমস্যা"); } finally { setAddingCommonToTenant(false); }
  };

  const handleVacateTenant = async () => {
    if (!vacateTenantId) return;
    setVacatingTenant(true);
    try {
      // Use /api/vacate endpoint which properly handles:
      // - Creating vacate record with inventory snapshot
      // - Disconnecting inventory items (set tenantId to null) so they become "previous inventory"
      // - Cleaning up old disconnected items for the room
      const res = await fetch("/api/vacate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: vacateTenantId }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${vacateTenantName} রুম ছেড়েছেন`);
      setVacateTenantOpen(false);
      refreshData();
      if (roomDetailData) {
        silentRefreshRoomDetail();
      }
    } catch {
      toast.error("রুম ছাড়াতে সমস্যা হয়েছে");
    } finally {
      setVacatingTenant(false);
    }
  };

  const loadCurrentGuestsForRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/guests?roomId=${roomId}&active=true`);
      if (res.ok) {
        const data = await res.json();
        setCurrentGuestsInRoom(data);
      }
    } catch { /* silent */ }
  };

  const handleAddGuestToRoom = async () => {
    if (!guestName.trim() || !guestCheckInDate || !roomDetailData?.roomId) {
      toast.error("গেস্টের নাম ও চেক-ইন তারিখ দিন");
      return;
    }
    setAddingGuest(true);
    try {
      const checkInDateTime = guestCheckInTime ? `${guestCheckInDate}T${guestCheckInTime}` : guestCheckInDate;
      const checkOutDateTime = guestCheckOutDate ? (guestCheckOutTime ? `${guestCheckOutDate}T${guestCheckOutTime}` : guestCheckOutDate) : null;
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guestName.trim(),
          mobile: guestMobile.trim(),
          address: guestAddress.trim(),
          referredBy: guestReferredBy.trim(),
          checkInDate: checkInDateTime,
          checkInTime: guestCheckInTime.trim() || null,
          checkOutDate: checkOutDateTime,
          checkOutTime: guestCheckOutTime.trim() || null,
          totalBill: guestIsPaid ? (guestTotalBill.trim() || null) : "Non Paid",
          note: guestNote.trim(),
          roomId: roomDetailData.roomId,
          roomNumber: roomDetailData.roomNumber,
          isBooked: true,
          isPaid: guestIsPaid,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("গেস্ট বুক হয়েছে");
      setGuestName("");
      setGuestMobile("");
      setGuestAddress("");
      setGuestReferredBy("");
      setGuestCheckInDate("");
      setGuestCheckInTime("");
      setGuestCheckOutDate("");
      setGuestCheckOutTime("");
      setGuestTotalBill("");
      setGuestNote("");
      setGuestIsPaid(true);
      setAddGuestToRoom(false);
      loadCurrentGuestsForRoom(roomDetailData.roomId);
      refreshData();
    } catch {
      toast.error("গেস্ট যোগ করতে সমস্যা হয়েছে");
    } finally {
      setAddingGuest(false);
    }
  };

  const openEditGuestInRoom = (g: typeof currentGuestsInRoom[0]) => {
    setEditGuestIdInRoom(g.id);
    setEditGuestNameInRoom(g.name);
    setEditGuestMobileInRoom(g.mobile || "");
    setEditGuestAddressInRoom(g.address || "");
    setEditGuestReferredByInRoom(g.referredBy || "");
    setEditGuestCheckInDateInRoom(g.checkInDate?.split('T')[0] || "");
    setEditGuestCheckInTimeInRoom(g.checkInTime || "");
    setEditGuestCheckOutDateInRoom(g.checkOutDate?.split('T')[0] || "");
    setEditGuestCheckOutTimeInRoom(g.checkOutTime || "");
    setEditGuestTotalBillInRoom(g.totalBill === "Non Paid" ? "" : g.totalBill || "");
    setEditGuestNoteInRoom(g.note || "");
    setEditGuestIsPaidInRoom(g.isPaid);
    setEditGuestInRoom(true);
  };

  const handleSaveGuestEditInRoom = async () => {
    if (!editGuestNameInRoom.trim() || !editGuestIdInRoom) return;
    setSavingGuestEditInRoom(true);
    try {
      const checkInDateTime = editGuestCheckInTimeInRoom ? `${editGuestCheckInDateInRoom}T${editGuestCheckInTimeInRoom}` : editGuestCheckInDateInRoom;
      const checkOutDateTime = editGuestCheckOutDateInRoom ? (editGuestCheckOutTimeInRoom ? `${editGuestCheckOutDateInRoom}T${editGuestCheckOutTimeInRoom}` : editGuestCheckOutDateInRoom) : null;
      const res = await fetch("/api/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editGuestIdInRoom,
          name: editGuestNameInRoom.trim(),
          mobile: editGuestMobileInRoom.trim(),
          address: editGuestAddressInRoom.trim(),
          referredBy: editGuestReferredByInRoom.trim(),
          checkInDate: checkInDateTime,
          checkInTime: editGuestCheckInTimeInRoom.trim() || null,
          checkOutDate: checkOutDateTime,
          checkOutTime: editGuestCheckOutTimeInRoom.trim() || null,
          totalBill: editGuestIsPaidInRoom ? (editGuestTotalBillInRoom.trim() || null) : "Non Paid",
          note: editGuestNoteInRoom.trim(),
          isPaid: editGuestIsPaidInRoom,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("গেস্ট তথ্য আপডেট হয়েছে");
      setEditGuestInRoom(false);
      if (roomDetailData) {
        loadCurrentGuestsForRoom(roomDetailData.roomId);
      }
    } catch {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setSavingGuestEditInRoom(false);
    }
  };

  const openDeleteGuestInRoom = (g: typeof currentGuestsInRoom[0]) => {
    setDeleteGuestIdInRoom(g.id);
    setDeleteGuestNameInRoom(g.name);
    setDeleteGuestInRoomOpen(true);
  };

  const handleDeleteGuestInRoom = async () => {
    if (!deleteGuestIdInRoom) return;
    setDeletingGuestInRoom(true);
    try {
      const res = await fetch("/api/guests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteGuestIdInRoom }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${deleteGuestNameInRoom} মুছে ফেলা হয়েছে`);
      setDeleteGuestInRoomOpen(false);
      if (roomDetailData) {
        loadCurrentGuestsForRoom(roomDetailData.roomId);
      }
      refreshData();
    } catch {
      toast.error("মুছে ফেলতে সমস্যা হয়েছে");
    } finally {
      setDeletingGuestInRoom(false);
    }
  };

  const openVacateGuestInRoom = (g: typeof currentGuestsInRoom[0]) => {
    setVacateGuestIdInRoom(g.id);
    setVacateGuestNameInRoom(g.name);
    const now = new Date();
    setVacateCheckOutDate(now.toISOString().split('T')[0]);
    setVacateCheckOutTime(now.toTimeString().slice(0, 5));
    setVacateGuestInRoomOpen(true);
  };

  const handleVacateGuestInRoom = async () => {
    if (!vacateGuestIdInRoom || !vacateCheckOutDate) return;
    setVacatingGuestInRoom(true);
    try {
      const checkOutDateTime = vacateCheckOutTime ? `${vacateCheckOutDate}T${vacateCheckOutTime}` : vacateCheckOutDate;
      const res = await fetch("/api/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: vacateGuestIdInRoom,
          checkOutDate: checkOutDateTime,
          checkOutTime: vacateCheckOutTime.trim() || null,
          isBooked: false,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${vacateGuestNameInRoom} রুম খালি করা হয়েছে`);
      setVacateGuestInRoomOpen(false);
      if (roomDetailData) {
        loadCurrentGuestsForRoom(roomDetailData.roomId);
      }
      refreshData();
    } catch {
      toast.error("রুম খালি করতে সমস্যা হয়েছে");
    } finally {
      setVacatingGuestInRoom(false);
    }
  };

  const openEditTenantInRoom = (t: { id: string; name: string; designation: string | null; phone: string | null; startDate: string }) => {
    setEditTenantIdInRoom(t.id);
    setEditTenantNameInRoom(t.name);
    setEditTenantDesigInRoom(t.designation || "");
    setEditTenantPhoneInRoom(t.phone || "");
    setEditTenantDeptInRoom((t as any).department || "");
    setEditTenantStartDateInRoom(t.startDate ? t.startDate.split('T')[0] : "");
    setEditTenantInRoom(true);
  };

  const handleSaveTenantEditInRoom = async () => {
    if (!editTenantNameInRoom.trim() || !editTenantIdInRoom) return;
    setSavingTenantEditInRoom(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTenantIdInRoom,
          action: "updateInfo",
          name: editTenantNameInRoom.trim(),
          designation: editTenantDesigInRoom.trim(),
          phone: editTenantPhoneInRoom.trim(),
          department: editTenantDeptInRoom.trim() || null,
          startDate: editTenantStartDateInRoom || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("ভাড়াটের তথ্য আপডেট হয়েছে");
      setEditTenantInRoom(false);
      if (roomDetailData) {
        silentRefreshRoomDetail();
      }
    } catch {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setSavingTenantEditInRoom(false);
    }
  };

  const openDeleteTenantInRoom = (t: { id: string; name: string }) => {
    setDeleteTenantInRoomId(t.id);
    setDeleteTenantInRoomName(t.name);
    setDeleteTenantInRoomOpen(true);
  };

  const handleDeleteTenantInRoom = async () => {
    if (!deleteTenantInRoomId) return;
    setDeletingTenantInRoom(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTenantInRoomId }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${deleteTenantInRoomName} মুছে ফেলা হয়েছে`);
      setDeleteTenantInRoomOpen(false);
      refreshData();
      if (roomDetailData) {
        silentRefreshRoomDetail();
      }
    } catch {
      toast.error("মুছে ফেলতে সমস্যা হয়েছে");
    } finally {
      setDeletingTenantInRoom(false);
    }
  };

  const rtRefreshRoomDetail = async () => {
    if (!roomDetailData) return;
    try {
      const res = await fetch(`/api/room-wise-data?roomId=${roomDetailData.roomId}`);
      if (res.ok) {
        const data = await res.json();
        setRoomDetailData({
          roomId: roomDetailData.roomId,
          roomNumber: roomDetailData.roomNumber,
          buildingName: roomDetailData.buildingName,
          currentTenants: data.currentTenants || [],
          previousTenants: data.previousTenants || [],
          currentInventory: data.currentInventory || [],
          previousInventory: data.previousInventory || [],
          vacateRecords: (data.vacateRecords || []).map((vr: any) => ({ id: vr.id, tenantId: vr.tenantId, tenantName: vr.tenantName, vacatedAt: vr.vacatedAt, inventorySnapshot: vr.inventorySnapshot })),
          currentRoomUsers: data.currentRoomUsers || [],
          previousRoomUsers: data.previousRoomUsers || [],
        });
        // Re-fetch repair/replace dates for all inventory items (current + previous)
        const allInvIds = [
          ...(data.currentInventory || []).map((inv: any) => inv.id),
          ...(data.previousInventory || []).map((inv: any) => inv.id),
        ];
        if (allInvIds.length > 0) {
          try {
            const repairRes = await fetch(`/api/inventory/repair-replace?inventoryIds=${allInvIds.join(',')}`);
            if (repairRes.ok) {
              setRoomInvRepairDates(await repairRes.json());
            }
          } catch { /* silent */ }
        }
      }
    } catch { /* silent */ }
  };

  const rtHandleEditPrevTenant = (vr: any, pt: any) => {
    setRtEditPrevData({
      id: vr.id,
      tenantId: vr.tenantId,
      tenantName: vr.tenantName,
      designation: pt?.designation || "",
      phone: pt?.phone || "",
      startDate: pt?.startDate ? pt.startDate.split("T")[0] : "",
      endDate: pt?.endDate ? pt.endDate.split("T")[0] : "",
    });
    setRtEditPrevOpen(true);
  };

  const rtHandleSaveEditPrevTenant = async () => {
    if (!rtEditPrevData) return;
    setRtEditingPrev(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rtEditPrevData.tenantId,
          action: "updateInfo",
          name: rtEditPrevData.tenantName,
          designation: rtEditPrevData.designation,
          phone: rtEditPrevData.phone || null,
          startDate: rtEditPrevData.startDate || undefined,
          endDate: rtEditPrevData.endDate || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      await fetch("/api/vacate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rtEditPrevData.id, tenantName: rtEditPrevData.tenantName }),
      });
      await rtRefreshRoomDetail();
      setRtEditPrevOpen(false);
      setRtEditPrevData(null);
      toast.success("তথ্য আপডেট হয়েছে");
    } catch { toast.error("আপডেট করতে সমস্যা হয়েছে"); }
    finally { setRtEditingPrev(false); }
  };

  const rtHandleDeletePrevTenant = async (vacateId: string) => {
    setRtDeletingPrev(true);
    try {
      const res = await fetch("/api/vacate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vacateId }),
      });
      if (!res.ok) throw new Error();
      await rtRefreshRoomDetail();
      setRtExpandedPrevTenant(null);
      toast.success("ভাড়াটে রেকর্ড মুছে ফেলা হয়েছে");
    } catch { toast.error("মুছে ফেলতে সমস্যা হয়েছে"); }
    finally { setRtDeletingPrev(false); }
  };

  const rtHandleDeleteSnapshot = async (vacateId: string) => {
    setRtDeletingSnapshot(true);
    try {
      await fetch("/api/vacate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vacateId, inventorySnapshot: "[]" }),
      });
      await rtRefreshRoomDetail();
      toast.success("মালামাল স্ন্যাপশট মুছে ফেলা হয়েছে");
    } catch { toast.error("মুছে ফেলতে সমস্যা"); }
    finally { setRtDeletingSnapshot(false); }
  };

  const rtHandleDownloadSnapshot = async (vr: any, pt: any) => {
    try {
      let snapshotItems: any[] = [];
      try { snapshotItems = vr.inventorySnapshot ? JSON.parse(vr.inventorySnapshot) : []; } catch { snapshotItems = []; }
      if (snapshotItems.length === 0) { toast.error("কোনো মালামাল স্ন্যাপশট নেই"); return; }
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("মালামাল তালিকা");
      const parts1: string[] = [];
      if (pt?.name) parts1.push(`নাম-${pt.name}`);
      if (pt?.designation) parts1.push(`পদবী-${pt.designation}`);
      if (pt?.phone) parts1.push(`মোবাইল-${pt.phone}`);
      const line1 = parts1.length > 0 ? parts1.join(",") : vr.tenantName;
      const vacateDateStr = vr.vacatedAt ? formatDate(vr.vacatedAt) : "";
      const line2 = `${vacateDateStr} তারিখে রেখে যাওয়া মালামাল তালিকা`;
      sheet.mergeCells("A1:G1");
      sheet.mergeCells("A2:G2");
      const tc1 = sheet.getCell("A1"); tc1.value = line1; tc1.font = { bold: true, size: 12 }; tc1.alignment = { horizontal: "center", vertical: "middle" };
      const tc2 = sheet.getCell("A2"); tc2.value = line2; tc2.font = { bold: true, size: 12 }; tc2.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 25; sheet.getRow(2).height = 25;
      const headers = ["ক্রম", "মালামালের নাম", "পরিমাণ", "অবস্থা", "নোট", "সর্বশেষ রিপেয়ার", "সর্বশেষ রিপ্লেস"];
      const headerRow = sheet.addRow(headers); headerRow.height = 22;
      const hf = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } } as any;
      const hfn = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const tb = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      headerRow.eachCell((cell: any) => { cell.fill = hf; cell.font = hfn; cell.border = tb; cell.alignment = { horizontal: "center", vertical: "middle" }; });
      snapshotItems.forEach((item: any, idx: number) => {
        const repairDate = item.latestRepair ? (item.latestRepair.split('T')[0] || item.latestRepair) : '';
        const replaceDate = item.latestReplace ? (item.latestReplace.split('T')[0] || item.latestReplace) : '';
        const row = sheet.addRow([idx + 1, item.itemName || item.name || "-", item.quantity || 0, item.condition || "-", item.note || "-", repairDate || "-", replaceDate || "-"]);
        row.eachCell((cell: any) => { cell.border = tb; cell.alignment = { horizontal: "center", vertical: "middle" }; });
      });
      sheet.columns.forEach((col: any, i: number) => {
        if (i === 0) { col.width = 5; return; }
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (cell: any) => { const val = String(cell.value || ""); if (val.length > maxLen) maxLen = val.length; });
        const headerVal = headers[i] || "";
        col.width = Math.ceil(Math.max(headerVal.length, maxLen) * 1.3) + 1;
      });
      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 3, topLeftCell: "A4", activeCell: "A4" }];
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `মালামাল_তালিকা_${vr.tenantName}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); }
  };

  // Download current inventory XLSX for BuildingsTab room detail
  const [rtDownloadingCurrentInv, setRtDownloadingCurrentInv] = useState(false);
  const rtHandleDownloadCurrentInv = async () => {
    if (!roomDetailData) return;
    const items = roomDetailData.currentInventory;
    if (items.length === 0) { toast.error("কোনো মালামাল নেই"); return; }
    setRtDownloadingCurrentInv(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("মালামাল তালিকা");

      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
      const thinBorder = { top: { style: "thin", color: { argb: "FFCCCCCC" } }, bottom: { style: "thin", color: { argb: "FFCCCCCC" } }, left: { style: "thin", color: { argb: "FFCCCCCC" } }, right: { style: "thin", color: { argb: "FFCCCCCC" } } };
      const centerAlign = { horizontal: "center", vertical: "middle", wrapText: false };

      const titleRow = sheet.addRow([`মালামাল তালিকা — ${roomDetailData.buildingName}, রুম ${roomDetailData.roomNumber}`]);
      sheet.mergeCells(1, 1, 1, 5);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 13, color: { argb: "FF2563EB" } };
      titleCell.alignment = centerAlign;
      titleRow.height = 32;

      const headers = ["ক্রম", "মালামাল", "পরিমাণ", "অবস্থা", "নোট"];
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; cell.border = border; cell.alignment = centerAlign; });
      headerRow.height = 28;

      items.forEach((item, idx) => {
        const r = sheet.addRow([
          idx + 1,
          item.itemName,
          toBanglaNumber(item.quantity),
          item.condition,
          item.note || "—",
        ]);
        r.eachCell((cell) => { cell.border = thinBorder; cell.alignment = centerAlign; });
      });

      // Auto-fit column widths
      sheet.columns.forEach((col, i) => {
        if (i === 0) { col.width = 5; return; }
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (cell) => {
          const val = String(cell.value || "");
          if (val.length > maxLen) maxLen = val.length;
        });
        const headerVal = headers[i] || "";
        col.width = Math.ceil(Math.max(headerVal.length, maxLen) * 1.3) + 1;
      });

      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 2, topLeftCell: "A3", activeCell: "A3" }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `মালামাল_${roomDetailData.buildingName}_রুম_${roomDetailData.roomNumber}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("XLSX ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); } finally { setRtDownloadingCurrentInv(false); }
  };

  // Download previous inventory XLSX for BuildingsTab
  const [rtDownloadingPrevInv, setRtDownloadingPrevInv] = useState(false);
  const rtHandleDownloadPrevInv = async () => {
    if (!roomDetailData) return;
    const items = roomDetailData.previousInventory;
    if (items.length === 0) { toast.error("কোনো পূর্বের মালামাল নেই"); return; }
    setRtDownloadingPrevInv(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("পূর্বের মালামাল তালিকা");

      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
      const thinBorder = { top: { style: "thin", color: { argb: "FFCCCCCC" } }, bottom: { style: "thin", color: { argb: "FFCCCCCC" } }, left: { style: "thin", color: { argb: "FFCCCCCC" } }, right: { style: "thin", color: { argb: "FFCCCCCC" } } };
      const centerAlign = { horizontal: "center", vertical: "middle", wrapText: false };

      const titleRow = sheet.addRow([`পূর্বের ভাড়াটে কর্তৃক ব্যবহৃত মালামাল — ${roomDetailData.buildingName}, রুম ${roomDetailData.roomNumber}`]);
      sheet.mergeCells(1, 1, 1, 9);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 13, color: { argb: "FF2563EB" } };
      titleCell.alignment = centerAlign;
      titleRow.height = 32;

      const headers = ["ক্রম", "মালামাল", "পরিমাণ", "অবস্থা", "নোট", "সর্বশেষ রিপেয়ার", "সর্বশেষ রিপ্লেস", "সকল রিপেয়ার তারিখ", "সকল রিপ্লেস তারিখ"];
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; cell.border = border; cell.alignment = centerAlign; });
      headerRow.height = 28;

      // Fetch ALL repair/replace records for each item individually
      const allRepairDatesMap: Record<string, string[]> = {};
      const allReplaceDatesMap: Record<string, string[]> = {};
      const latestRepairMap: Record<string, string> = {};
      const latestReplaceMap: Record<string, string> = {};
      await Promise.all(items.map(async (item) => {
        try {
          const res = await fetch(`/api/inventory/repair-replace?inventoryId=${item.id}`);
          if (res.ok) {
            const records = await res.json();
            const repairDates = records.filter((r: any) => r.type === "repair").map((r: any) => r.actionDate).filter(Boolean).sort().reverse();
            const replaceDates = records.filter((r: any) => r.type === "replace").map((r: any) => r.actionDate).filter(Boolean).sort().reverse();
            allRepairDatesMap[item.id] = repairDates;
            allReplaceDatesMap[item.id] = replaceDates;
            if (repairDates.length > 0) latestRepairMap[item.id] = repairDates[0];
            if (replaceDates.length > 0) latestReplaceMap[item.id] = replaceDates[0];
          }
        } catch { /* silent */ }
      }));

      items.forEach((item, idx) => {
        const repairDates = allRepairDatesMap[item.id] || [];
        const replaceDates = allReplaceDatesMap[item.id] || [];
        const r = sheet.addRow([
          idx + 1,
          item.itemName,
          toBanglaNumber(item.quantity),
          item.condition,
          item.note || "—",
          latestRepairMap[item.id] ? new Date(latestRepairMap[item.id]).toLocaleDateString("bn-BD") : "—",
          latestReplaceMap[item.id] ? new Date(latestReplaceMap[item.id]).toLocaleDateString("bn-BD") : "—",
          repairDates.length > 0 ? repairDates.map((d) => new Date(d).toLocaleDateString("bn-BD")).join(", ") : "—",
          replaceDates.length > 0 ? replaceDates.map((d) => new Date(d).toLocaleDateString("bn-BD")).join(", ") : "—",
        ]);
        r.eachCell((cell) => { cell.border = thinBorder; cell.alignment = centerAlign; });
      });

      // Auto-fit column widths
      sheet.columns.forEach((col, i) => {
        if (i === 0) { col.width = 5; return; }
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (cell) => {
          const val = String(cell.value || "");
          if (val.length > maxLen) maxLen = val.length;
        });
        const headerVal = headers[i] || "";
        col.width = Math.ceil(Math.max(headerVal.length, maxLen) * 1.3) + 1;
      });

      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 2, topLeftCell: "A3", activeCell: "A3" }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `পূর্বের_মালামাল_${roomDetailData.buildingName}_রুম_${roomDetailData.roomNumber}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("XLSX ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); } finally { setRtDownloadingPrevInv(false); }
  };

  // Room User handlers
  const handleAddRoomUser = async () => {
    if (!ruName.trim() || !ruStartDate || !roomDetailData?.roomId) {
      toast.error("নাম ও শুরুর তারিখ দিন");
      return;
    }
    setAddingRoomUser(true);
    try {
      const res = await fetch("/api/room-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruName.trim(),
          designation: ruDesignation.trim() || null,
          phone: ruPhone.trim() || null,
          department: ruDept.trim() || null,
          roomId: roomDetailData.roomId,
          startDate: ruStartDate,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("রুম ব্যবহারকারী যোগ হয়েছে");
      setRuName(""); setRuDesignation(""); setRuPhone(""); setRuDept(""); setRuStartDate("");
      setAddRoomUserOpen(false);
      if (roomDetailData) {
        silentRefreshRoomDetail();
      }
    } catch {
      toast.error("রুম ব্যবহারকারী যোগ করতে সমস্যা");
    } finally {
      setAddingRoomUser(false);
    }
  };

  const handleEditRoomUser = async () => {
    if (!editRoomUserData) return;
    setEditingRoomUser(true);
    try {
      const res = await fetch("/api/room-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editRoomUserData.id,
          action: "updateInfo",
          name: editRoomUserData.name,
          designation: editRoomUserData.designation,
          phone: editRoomUserData.phone || null,
          department: editRoomUserData.department || null,
          startDate: editRoomUserData.startDate || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("রুম ব্যবহারকারী তথ্য আপডেট হয়েছে");
      setEditRoomUserOpen(false);
      setEditRoomUserData(null);
      if (roomDetailData) {
        silentRefreshRoomDetail();
      }
    } catch {
      toast.error("আপডেট করতে সমস্যা");
    } finally {
      setEditingRoomUser(false);
    }
  };

  const handleDeleteRoomUser = async () => {
    if (!deleteRoomUserId) return;
    setDeletingRoomUser(true);
    try {
      const res = await fetch("/api/room-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteRoomUserId }),
      });
      if (!res.ok) throw new Error();
      toast.success("রুম ব্যবহারকারী মুছে ফেলা হয়েছে");
      setDeleteRoomUserOpen(false);
      if (roomDetailData) {
        silentRefreshRoomDetail();
      }
    } catch {
      toast.error("মুছে ফেলতে সমস্যা");
    } finally {
      setDeletingRoomUser(false);
    }
  };

  const handleLeaveRoomUser = async (id: string) => {
    try {
      const res = await fetch("/api/room-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("রুম ব্যবহারকারী রুম ছেড়েছেন");
      if (roomDetailData) {
        silentRefreshRoomDetail();
      }
    } catch {
      toast.error("রুম ছাড়াতে সমস্যা");
    }
  };

  const openEditInvInRoom = async (item: { id: string; itemName: string; quantity: number; condition: string; note: string | null }) => {
    setEditInvIdInRoom(item.id);
    setEditInvItemName(item.itemName);
    setEditInvQuantity(String(item.quantity));
    setEditInvCondition(item.condition);
    setEditInvNote(item.note || "");
    setNewRepairDate("");
    setNewRepairNote("");
    setNewReplaceDate("");
    setNewReplaceNote("");
    setShowInvHistory(false);
    setInvRepairHistory([]);
    setInvLatestRepairDate("");
    setInvLatestReplaceDate("");
    setInvHistoryPage(1);
    // Load repair/replace history
    try {
      const res = await fetch(`/api/inventory/repair-replace?inventoryId=${item.id}`);
      if (res.ok) {
        const records = await res.json();
        setInvRepairHistory(records);
        const repairRecord = records.find((r: any) => r.type === "repair");
        const replaceRecord = records.find((r: any) => r.type === "replace");
        if (repairRecord) setInvLatestRepairDate(repairRecord.actionDate ? repairRecord.actionDate.split("T")[0] : "");
        if (replaceRecord) setInvLatestReplaceDate(replaceRecord.actionDate ? replaceRecord.actionDate.split("T")[0] : "");
      }
    } catch { /* silent */ }
    setEditInvInRoom(true);
  };

  const handleSaveInvEditInRoom = async () => {
    if (!editInvItemName.trim() || !editInvIdInRoom) return;
    setSavingInvEditInRoom(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editInvIdInRoom,
          itemName: editInvItemName.trim(),
          quantity: editInvQuantity,
          condition: editInvCondition,
          note: editInvNote.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      // Save repair record if date provided
      if (newRepairDate.trim()) {
        await fetch("/api/inventory/repair-replace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryId: editInvIdInRoom, type: "repair", actionDate: newRepairDate, note: newRepairNote.trim() || null }),
        }).catch(() => {});
      }
      // Save replace record if date provided
      if (newReplaceDate.trim()) {
        await fetch("/api/inventory/repair-replace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryId: editInvIdInRoom, type: "replace", actionDate: newReplaceDate, note: newReplaceNote.trim() || null }),
        }).catch(() => {});
      }
      toast.success("মালামাল আপডেট হয়েছে");
      setEditInvInRoom(false);
      if (roomDetailData) {
        silentRefreshRoomDetail();
      }
    } catch {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setSavingInvEditInRoom(false);
    }
  };

  const handleSaveQuickRepair = async (type: "repair" | "replace") => {
    if (!editInvIdInRoom) return;
    const date = type === "repair" ? newRepairDate : newReplaceDate;
    const note = type === "repair" ? newRepairNote : newReplaceNote;
    if (!date.trim()) {
      toast.error(type === "repair" ? "Repair তারিখ দিন" : "Replace তারিখ দিন");
      return;
    }
    setSavingRepairRecord(true);
    try {
      const res = await fetch("/api/inventory/repair-replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId: editInvIdInRoom, type, actionDate: date, note: note.trim() || null }),
      });
      if (!res.ok) throw new Error();
      // Reload history
      const histRes = await fetch(`/api/inventory/repair-replace?inventoryId=${editInvIdInRoom}`);
      if (histRes.ok) {
        const records = await histRes.json();
        setInvRepairHistory(records);
        const repairRecord = records.find((r: any) => r.type === "repair");
        const replaceRecord = records.find((r: any) => r.type === "replace");
        setInvLatestRepairDate(repairRecord ? (repairRecord.actionDate ? repairRecord.actionDate.split("T")[0] : "") : "");
        setInvLatestReplaceDate(replaceRecord ? (replaceRecord.actionDate ? replaceRecord.actionDate.split("T")[0] : "") : "");
      }
      if (type === "repair") { setNewRepairDate(""); setNewRepairNote(""); }
      else { setNewReplaceDate(""); setNewReplaceNote(""); }
      toast.success(type === "repair" ? "Repair রেকর্ড সেভ হয়েছে" : "Replace রেকর্ড সেভ হয়েছে");
    } catch {
      toast.error("রেকর্ড সেভ করতে সমস্যা");
    } finally {
      setSavingRepairRecord(false);
    }
  };

  const handleDeleteRepairRecord = async (recordId: string) => {
    try {
      await fetch("/api/inventory/repair-replace", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recordId }),
      });
      setInvRepairHistory(prev => prev.filter(r => r.id !== recordId));
      toast.success("রেকর্ড মুছে ফেলা হয়েছে");
    } catch {
      toast.error("মুছে ফেলতে সমস্যা");
    }
  };

  const openDeleteInvInRoom = (item: { id: string; itemName: string }) => {
    setDeleteInvIdInRoom(item.id);
    setDeleteInvNameInRoom(item.itemName);
    setDeleteInvInRoomOpen(true);
  };

  const handleDeleteInvInRoom = async () => {
    if (!deleteInvIdInRoom) return;
    setDeletingInvInRoom(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteInvIdInRoom }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${deleteInvNameInRoom} মুছে ফেলা হয়েছে`);
      setDeleteInvInRoomOpen(false);
      if (roomDetailData) {
        silentRefreshRoomDetail();
      }
    } catch {
      toast.error("মুছে ফেলতে সমস্যা হয়েছে");
    } finally {
      setDeletingInvInRoom(false);
    }
  };

  // Silent refresh — updates room detail data in-place without showing loading or resetting tab/pagination
  const silentRefreshRoomDetail = async () => {
    if (!roomDetailData) return;
    try {
      const [roomRes, currentGuestRes, previousGuestRes] = await Promise.all([
        fetch(`/api/room-wise-data?roomId=${roomDetailData.roomId}`),
        fetch(`/api/guests?roomId=${roomDetailData.roomId}&active=true`).catch(() => null),
        fetch(`/api/guests?roomId=${roomDetailData.roomId}`).catch(() => null),
      ]);
      if (!roomRes.ok) return;
      const data = await roomRes.json();
      setRoomDetailData({
        roomId: roomDetailData.roomId,
        roomNumber: roomDetailData.roomNumber,
        buildingName: roomDetailData.buildingName,
        currentTenants: data.currentTenants || [],
        previousTenants: data.previousTenants || [],
        currentInventory: data.currentInventory || [],
        previousInventory: data.previousInventory || [],
        vacateRecords: (data.vacateRecords || []).map((vr: any) => ({ id: vr.id, tenantId: vr.tenantId, tenantName: vr.tenantName, vacatedAt: vr.vacatedAt, inventorySnapshot: vr.inventorySnapshot })),
        currentRoomUsers: data.currentRoomUsers || [],
        previousRoomUsers: data.previousRoomUsers || [],
      });
      // Re-fetch repair/replace dates
      const allInvIds = [
        ...(data.currentInventory || []).map((inv: any) => inv.id),
        ...(data.previousInventory || []).map((inv: any) => inv.id),
      ];
      if (allInvIds.length > 0) {
        try {
          const repairRes = await fetch(`/api/inventory/repair-replace?inventoryIds=${allInvIds.join(',')}`);
          if (repairRes.ok) setRoomInvRepairDates(await repairRes.json());
        } catch { /* silent */ }
      }
      // Update guest data silently
      if (currentGuestRes && currentGuestRes.ok) setCurrentGuestsInRoom(await currentGuestRes.json());
      if (previousGuestRes && previousGuestRes.ok) setPreviousGuestsInRoom(await previousGuestRes.json());
    } catch { /* silent */ }
  };

  const openRoomDetailDialog = async (roomId: string, roomNumber: string, buildingName: string) => {
    setRoomDetailLoading(true);
    setRoomDetailOpen(true);
    setRoomDetailData(null);
    setPrevTenantPage(1);
    setInvPage(1);
    setPrevInvPage(1);
    setRuCurrentPage(1);
    setRuPrevPage(1);
    setRoomInvRepairDates({});
    try {
      // Fetch room data, current guests, and previous guests in parallel
      const [roomRes, currentGuestRes, previousGuestRes] = await Promise.all([
        fetch(`/api/room-wise-data?roomId=${roomId}`),
        fetch(`/api/guests?roomId=${roomId}&active=true`).catch(() => null),
        fetch(`/api/guests?roomId=${roomId}`).catch(() => null),
      ]);
      if (!roomRes.ok) throw new Error();
      const data = await roomRes.json();
      setRoomDetailData({
        roomId,
        roomNumber,
        buildingName,
        currentTenants: data.currentTenants || [],
        previousTenants: data.previousTenants || [],
        currentInventory: data.currentInventory || [],
        previousInventory: data.previousInventory || [],
        vacateRecords: (data.vacateRecords || []).map((vr: any) => ({ id: vr.id, tenantId: vr.tenantId, tenantName: vr.tenantName, vacatedAt: vr.vacatedAt, inventorySnapshot: vr.inventorySnapshot })),
        currentRoomUsers: data.currentRoomUsers || [],
        previousRoomUsers: data.previousRoomUsers || [],
      });
      // Fetch repair/replace dates for all inventory items (current + previous) in batch
      const allInvIds = [
        ...(data.currentInventory || []).map((inv: any) => inv.id),
        ...(data.previousInventory || []).map((inv: any) => inv.id),
      ];
      if (allInvIds.length > 0) {
        try {
          const repairRes = await fetch(`/api/inventory/repair-replace?inventoryIds=${allInvIds.join(',')}`);
          if (repairRes.ok) {
            const repairData = await repairRes.json();
            setRoomInvRepairDates(repairData);
          }
        } catch { /* silent */ }
      }
      // Set current guest data
      if (currentGuestRes && currentGuestRes.ok) {
        const guestData = await currentGuestRes.json();
        setCurrentGuestsInRoom(guestData);
      } else {
        setCurrentGuestsInRoom([]);
      }
      // Set previous guest data (non-active = checked out)
      if (previousGuestRes && previousGuestRes.ok) {
        const prevGuestData = await previousGuestRes.json();
        setPreviousGuestsInRoom(prevGuestData);
      } else {
        setPreviousGuestsInRoom([]);
      }
    } catch {
      toast.error("রুমের তথ্য লোড করতে সমস্যা হয়েছে");
    } finally {
      setRoomDetailLoading(false);
    }
  };

  const handleEditBuilding = async () => {
    if (!editBuildingName.trim()) {
      toast.error("বিল্ডিং এর নাম দিন");
      return;
    }
    setUpdatingBuilding(true);
    try {
      const body: any = { id: editBuildingId, name: editBuildingName.trim() };
      if (editBuildingCapacity) {
        body.capacityPerRoom = parseInt(editBuildingCapacity);
      }
      const res = await fetch("/api/buildings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "বিল্ডিং আপডেট করতে সমস্যা হয়েছে");
        return;
      }
      toast.success("বিল্ডিং আপডেট হয়েছে");
      setEditBuildingOpen(false);
      refreshData();
    } catch {
      toast.error("বিল্ডিং আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setUpdatingBuilding(false);
    }
  };

  const openEditBuildingDialog = (buildingId: string, buildingName: string, capacityPerRoom: number) => {
    setEditBuildingId(buildingId);
    setEditBuildingName(buildingName);
    setEditBuildingCapacity(String(capacityPerRoom || 1));
    setEditBuildingOpen(true);
  };

  const handleEditRoom = async () => {
    if (!editRoomNumber.trim()) {
      toast.error("রুম নম্বর দিন");
      return;
    }
    setUpdatingRoom(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editRoomId, roomNumber: editRoomNumber.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("রুম নম্বর আপডেট হয়েছে");
      setEditRoomOpen(false);
      refreshData();
    } catch {
      toast.error("রুম আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setUpdatingRoom(false);
    }
  };

  const openEditRoomDialog = (roomId: string, roomNumber: string) => {
    setEditRoomId(roomId);
    setEditRoomNumber(roomNumber);
    setEditRoomOpen(true);
  };

  const refreshData = useCallback(() => {
    window.dispatchEvent(new Event("dashboard-data-changed"));
    reloadBuildings();
    reloadBookedRooms();
  }, [reloadBuildings, reloadBookedRooms]);

  const toggleBuilding = (id: string) => {
    setExpandedBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateBuilding = async () => {
    if (!newBuildingName.trim() || !newBuildingFloors) {
      toast.error("বিল্ডিং এর নাম এবং তলা সংখ্যা দিন");
      return;
    }
    setCreatingBuilding(true);
    try {
      const res = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBuildingName.trim(),
          totalFloors: parseInt(newBuildingFloors),
          capacityPerRoom: parseInt(newBuildingCapacity) || 1,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("বিল্ডিং তৈরি হয়েছে");
      setNewBuildingName("");
      setNewBuildingFloors("");
      setNewBuildingCapacity("1");
      setAddBuildingOpen(false);
      refreshData();
    } catch {
      toast.error("বিল্ডিং তৈরি করতে সমস্যা হয়েছে");
    } finally {
      setCreatingBuilding(false);
    }
  };

  const handleDeleteBuilding = async () => {
    if (!deletePassword.trim()) {
      toast.error("এডমিন পাসওয়ার্ড দিন");
      return;
    }
    setDeletingBuilding(true);
    try {
      const res = await fetch("/api/buildings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteBuildingId, adminPassword: deletePassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "বিল্ডিং মুছে ফেলতে সমস্যা হয়েছে");
        return;
      }
      toast.success("বিল্ডিং মুছে ফেলা হয়েছে");
      setDeletePassOpen(false);
      setDeletePassword("");
      refreshData();
    } catch {
      toast.error("বিল্ডিং মুছে ফেলতে সমস্যা হয়েছে");
    } finally {
      setDeletingBuilding(false);
    }
  };

  const openDeleteDialog = (buildingId: string, buildingName: string) => {
    setDeleteBuildingId(buildingId);
    setDeleteBuildingName(buildingName);
    setDeletePassword("");
    setDeletePassOpen(true);
  };

  const handleCreateRoom = async () => {
    if (!addRoomNumber.trim() || !addRoomFloorId) {
      toast.error("রুম নম্বর দিন");
      return;
    }
    setCreatingRoom(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: addRoomNumber.trim(),
          floorId: addRoomFloorId,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("রুম তৈরি হয়েছে");
      setAddRoomNumber("");
      setAddRoomFloorId("");
      setAddRoomOpen(false);
      refreshData();
    } catch {
      toast.error("রুম তৈরি করতে সমস্যা হয়েছে");
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    setDeletingRoom(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("রুম মুছে ফেলা হয়েছে");
      refreshData();
    } catch {
      toast.error("রুম মুছে ফেলতে সমস্যা হয়েছে");
    } finally {
      setDeletingRoom(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="size-5 text-emerald-600" />
          বিল্ডিং ও রুম ম্যানেজমেন্ট
        </h2>
        <Dialog open={addBuildingOpen} onOpenChange={setAddBuildingOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="size-4" />
              নতুন বিল্ডিং
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>নতুন বিল্ডিং যোগ করুন</DialogTitle>
              <DialogDescription>
                বিল্ডিং এর নাম, মোট তলার সংখ্যা এবং প্রতি রুমে সিট সংখ্যা লিখুন
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bname">বিল্ডিং এর নাম</Label>
                <Input
                  id="bname"
                  placeholder="যেমন: এ ব্লক"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bfloors">মোট তলা সংখ্যা</Label>
                <Input
                  id="bfloors"
                  type="number"
                  min={1}
                  placeholder="৩"
                  value={newBuildingFloors}
                  onChange={(e) => setNewBuildingFloors(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bcapacity">প্রতি রুমে সিট সংখ্যা</Label>
                <Input
                  id="bcapacity"
                  type="number"
                  min={1}
                  placeholder="১"
                  value={newBuildingCapacity}
                  onChange={(e) => setNewBuildingCapacity(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">প্রতি রুমে কয়জন ভাড়াটে থাকতে পারবে (যেমন: ১, ২, ৩...)</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddBuildingOpen(false)}
              >
                বাতিল
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCreateBuilding}
                disabled={creatingBuilding}
              >
                {creatingBuilding ? "তৈরি হচ্ছে..." : "তৈরি করুন"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Building Password Dialog */}
        <Dialog open={deletePassOpen} onOpenChange={(open) => { setDeletePassOpen(open); if (!open) setDeletePassword(""); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Shield className="size-5" />
                বিল্ডিং মুছে ফেলবেন?
              </DialogTitle>
              <DialogDescription>
                &quot;{deleteBuildingName}&quot; বিল্ডিং এবং এর সকল তলা ও রুম স্থায়ীভাবে মুছে যাবে। নিশ্চিত করতে আপনার এডমিন পাসওয়ার্ড দিন।
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>এডমিন পাসওয়ার্ড</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    type="password"
                    placeholder="পাসওয়ার্ড লিখুন"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleDeleteBuilding(); }}
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDeletePassOpen(false); setDeletePassword(""); }}>বাতিল</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteBuilding}
                disabled={deletingBuilding || !deletePassword.trim()}
              >
                {deletingBuilding ? "মুছে ফেলা হচ্ছে..." : "মুছে ফেলুন"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Building Dialog */}
        <Dialog open={editBuildingOpen} onOpenChange={setEditBuildingOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <Edit3 className="size-5" />
                বিল্ডিং এডিট করুন
              </DialogTitle>
              <DialogDescription>
                বিল্ডিং এর নাম এবং প্রতি রুমে সিট সংখ্যা পরিবর্তন করুন
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editBname">বিল্ডিং এর নাম</Label>
                <Input
                  id="editBname"
                  placeholder="নতুন নাম লিখুন"
                  value={editBuildingName}
                  onChange={(e) => setEditBuildingName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleEditBuilding(); }}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBcap">প্রতি রুমে সিট সংখ্যা</Label>
                <Input
                  id="editBcap"
                  type="number"
                  min={1}
                  placeholder="১"
                  value={editBuildingCapacity}
                  onChange={(e) => setEditBuildingCapacity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleEditBuilding(); }}
                />
                <p className="text-[11px] text-muted-foreground">প্রতি রুমে কয়জন ভাড়াটে থাকতে পারবে (যেমন: ১, ২, ৩...)</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditBuildingOpen(false)}>বাতিল</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleEditBuilding}
                disabled={updatingBuilding || !editBuildingName.trim() || !editBuildingCapacity}
              >
                {updatingBuilding ? "আপডেট হচ্ছে..." : "আপডেট করুন"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Room Dialog */}
        <Dialog open={editRoomOpen} onOpenChange={setEditRoomOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <Edit3 className="size-5" />
                রুম নম্বর পরিবর্তন করুন
              </DialogTitle>
              <DialogDescription>
                রুম এর নতুন নম্বর লিখুন
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editRoom">রুম নম্বর</Label>
                <Input
                  id="editRoom"
                  placeholder="নতুন রুম নম্বর লিখুন"
                  value={editRoomNumber}
                  onChange={(e) => setEditRoomNumber(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleEditRoom(); }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRoomOpen(false)}>বাতিল</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleEditRoom}
                disabled={updatingRoom || !editRoomNumber.trim()}
              >
                {updatingRoom ? "আপডেট হচ্ছে..." : "আপডেট করুন"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Room Detail Dialog — Tenant & Belongings Info */}
        <Dialog open={roomDetailOpen} onOpenChange={(open) => { setRoomDetailOpen(open); if (!open) { setRoomDetailData(null); setAddTenantToRoom(false); setAddGuestToRoom(false); setAddRoomUserOpen(false); setRoomDetailTab("info"); setCurrentGuestsInRoom([]); setPreviousGuestsInRoom([]); setAddNewInvOpen(false); } }}>
          <DialogContent className="max-w-lg sm:max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BedDouble className="size-5 text-emerald-600" />
                <span>রুম {roomDetailData?.roomNumber || ''}</span>
                {roomDetailData?.buildingName && (
                  <Badge variant="outline" className="text-xs font-normal">{roomDetailData.buildingName}</Badge>
                )}
              </DialogTitle>
              <DialogDescription>এই রুমের ভাড়াটে এবং মালামালের বিস্তারিত তথ্য</DialogDescription>
            </DialogHeader>

            {/* Tab-style navigation inside room detail */}
            {!roomDetailLoading && roomDetailData && (
              <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                <button type="button" className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${roomDetailTab === "info" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`} onClick={() => { setRoomDetailTab("info"); setAddTenantToRoom(false); setAddGuestToRoom(false); setAddRoomUserOpen(false); }}>
                  <BedDouble className="size-3" />তথ্য
                </button>
                <button type="button" className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${roomDetailTab === "tenant" ? "bg-emerald-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`} onClick={() => { setRoomDetailTab("tenant"); setAddTenantToRoom(true); setAddGuestToRoom(false); setAddRoomUserOpen(false); }}>
                  <Plus className="size-3" />রুম বরাদ্দ
                </button>
                <button type="button" className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${roomDetailTab === "guest" ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`} onClick={() => { setRoomDetailTab("guest"); const now = new Date(); setGuestCheckInDate(now.toISOString().split('T')[0]); setGuestCheckInTime(now.toTimeString().slice(0, 5)); setAddGuestToRoom(true); setAddTenantToRoom(false); setAddRoomUserOpen(false); }}>
                  <UserCheck className="size-3" />গেস্ট বুকিং
                </button>
                <button type="button" className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${roomDetailTab === "roomuser" ? "bg-purple-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`} onClick={() => { setRoomDetailTab("roomuser"); setRuName(""); setRuDesignation(""); setRuPhone(""); setRuDept(""); const now = new Date(); setRuStartDate(now.toISOString().split('T')[0]); setAddRoomUserOpen(true); setAddTenantToRoom(false); setAddGuestToRoom(false); }}>
                  <UserPlus className="size-3" />রুম ব্যবহারকারী
                </button>
              </div>
            )}

            {/* Add Tenant Form — show only when tenant tab is active */}
            {addTenantToRoom && roomDetailTab === "tenant" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-3">
                <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                  <UserCheck className="size-4" /> রুম বরাদ্দ করুন
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">নাম *</Label>
                    <Input className="h-8 text-sm" placeholder="ভাড়াটের নাম" value={newTenantName} onChange={(e) => setNewTenantName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">পদবি</Label>
                    <Input className="h-8 text-sm" placeholder="পদবি" value={newTenantDesignation} onChange={(e) => setNewTenantDesignation(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ফোন</Label>
                    <Input className="h-8 text-sm" placeholder="ফোন নম্বর" value={newTenantPhone} onChange={(e) => setNewTenantPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">দপ্তর</Label>
                    <Input className="h-8 text-sm" placeholder="দপ্তরের নাম" value={newTenantDept} onChange={(e) => setNewTenantDept(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">যোগদানের তারিখ *</Label>
                    <Input className="h-8 text-sm" type="date" value={newTenantStartDate} onChange={(e) => setNewTenantStartDate(e.target.value)} />
                  </div>
                </div>
                {/* Common belongings load for room detail tenant tab */}
                <div className="space-y-2 border-t border-emerald-200 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">কমন মালামাল</Label>
                    {roomDetailData?.roomId && (
                      <Button variant="outline" size="sm" className="gap-1 text-[11px] border-emerald-300 text-emerald-600 hover:bg-emerald-50 h-6" onClick={handleLoadCommonBelongings}>কমন মালামাল থেকে লোড</Button>
                    )}
                  </div>
                  {roomPrevInvItems.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {roomPrevInvItems.map((item, idx) => (
                        editingCommonItemIdx === idx ? (
                          <div key={idx} className="flex items-center gap-1 text-xs bg-emerald-50 rounded px-2 py-1 border border-emerald-200">
                            <input className="flex-1 min-w-0 h-6 px-1 border rounded text-xs" value={editCommonItemName} onChange={(e) => setEditCommonItemName(e.target.value)} />
                            <input className="w-10 h-6 px-1 border rounded text-xs text-center" type="number" min={0} value={editCommonItemQty} onChange={(e) => setEditCommonItemQty(e.target.value)} />
                            <select className="h-6 px-1 border rounded text-xs" value={editCommonItemCond} onChange={(e) => setEditCommonItemCond(e.target.value)}>
                              <option value="আছে">আছে</option><option value="নেই">নেই</option><option value="ভালো">ভালো</option><option value="খারাপ">খারাপ</option><option value="নতুন">নতুন</option><option value="পুরাতন">পুরাতন</option><option value="নস্ট">নস্ট</option><option value="ভাঙা">ভাঙা</option><option value="মাঝারি">মাঝারি</option>
                            </select>
                            <button onClick={() => {
                              if (editCommonItemName.trim()) {
                                setRoomPrevInvItems(prev => prev.map((it, i) => i === idx ? { itemName: editCommonItemName.trim(), quantity: editCommonItemQty || "1", condition: editCommonItemCond } : it));
                                setEditingCommonItemIdx(null);
                              }
                            }} className="size-5 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center"><CheckCircle2 className="size-3" /></button>
                            <button onClick={() => setEditingCommonItemIdx(null)} className="size-5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"><X className="size-3" /></button>
                          </div>
                        ) : (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border">
                            <span className="flex-1">{item.itemName}</span>
                            <span className="text-muted-foreground">{toBanglaNumber(item.quantity)}</span>
                            <span className={`px-1 rounded ${item.condition === 'ভালো' ? 'text-emerald-600' : item.condition === 'মাঝারি' ? 'text-amber-600' : 'text-red-600'}`}>{item.condition}</span>
                            <button onClick={() => { setEditingCommonItemIdx(idx); setEditCommonItemName(item.itemName); setEditCommonItemQty(item.quantity); setEditCommonItemCond(item.condition); }} className="size-5 rounded bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center"><Edit3 className="size-3" /></button>
                            <button onClick={() => setRoomPrevInvItems(prev => prev.filter((_, i) => i !== idx))} className="size-5 rounded bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"><Trash2 className="size-3" /></button>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                  {/* Add to room button */}
                  {roomPrevInvItems.length > 0 && (
                    <div className="space-y-1.5">
                      <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={handleAddCommonToExistingTenant} disabled={addingCommonToTenant}>
                        {addingCommonToTenant ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Package className="size-3" />}
                        রুমে মালামাল যোগ করুন
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAddTenantToRoom} disabled={addingTenantToRoom || !newTenantName.trim() || !newTenantStartDate}>
                    {addingTenantToRoom ? "যোগ হচ্ছে..." : "যোগ করুন"}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => { setAddTenantToRoom(false); setRoomPrevInvItems([]); setRoomPrevTenantName(""); }}>বাতিল</Button>
                </div>
              </div>
            )}

            {/* Add Guest Form — show only when guest tab is active */}
            {addGuestToRoom && roomDetailTab === "guest" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                  <Plus className="size-4" /> গেস্ট বুকিং
                </h4>
                <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                  <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${guestIsPaid ? "bg-emerald-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => setGuestIsPaid(true)}>Paid</button>
                  <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!guestIsPaid ? "bg-orange-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => { setGuestIsPaid(false); setGuestTotalBill(""); }}>Non Paid</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">রুম নম্বর</Label>
                    <Input className="h-8 text-sm bg-gray-100" value={roomDetailData?.roomNumber || ""} readOnly />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">নাম *</Label>
                    <Input className="h-8 text-sm" placeholder="গেস্টের নাম" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ফোন</Label>
                    <Input className="h-8 text-sm" placeholder="ফোন নম্বর" value={guestMobile} onChange={(e) => setGuestMobile(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ঠিকানা</Label>
                    <Input className="h-8 text-sm" placeholder="ঠিকানা" value={guestAddress} onChange={(e) => setGuestAddress(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">রেফার করেছেন</Label>
                    <Input className="h-8 text-sm" placeholder="রেফারার" value={guestReferredBy} onChange={(e) => setGuestReferredBy(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">চেক-ইন তারিখ *</Label>
                    <Input className="h-8 text-sm" type="date" value={guestCheckInDate} onChange={(e) => setGuestCheckInDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">চেক-ইন সময়</Label>
                    <Input className="h-8 text-sm" type="time" value={guestCheckInTime} onChange={(e) => setGuestCheckInTime(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">চেক-আউট তারিখ</Label>
                    <Input className="h-8 text-sm" type="date" value={guestCheckOutDate} onChange={(e) => setGuestCheckOutDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">চেক-আউট সময়</Label>
                    <Input className="h-8 text-sm" type="time" value={guestCheckOutTime} onChange={(e) => setGuestCheckOutTime(e.target.value)} />
                  </div>
                  {guestIsPaid ? (
                    <div className="space-y-1">
                      <Label className="text-xs">মোট বিল</Label>
                      <Input className="h-8 text-sm" type="number" placeholder="মোট বিল" value={guestTotalBill} onChange={(e) => setGuestTotalBill(e.target.value)} />
                    </div>
                  ) : (
                    <div className="col-span-1 sm:col-span-2 bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                      <p className="text-sm font-medium text-orange-700">Total Bill: Non Paid</p>
                      <p className="text-xs text-orange-600 mt-0.5">এই গেস্ট Non Paid হিসেবে চিহ্নিত হবে</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">নোট</Label>
                    <Input className="h-8 text-sm" placeholder="নোট" value={guestNote} onChange={(e) => setGuestNote(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddGuestToRoom} disabled={addingGuest || !guestName.trim() || !guestCheckInDate}>
                    {addingGuest ? "হচ্ছে..." : "বুক করুন"}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setAddGuestToRoom(false)}>বাতিল</Button>
                </div>
              </div>
            )}

            {/* Add Room User Form — show only when roomuser tab is active */}
            {addRoomUserOpen && roomDetailTab === "roomuser" && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
                <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
                  <UserPlus className="size-4" /> নতুন রুম ব্যবহারকারী যোগ করুন
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">নাম *</Label>
                    <Input className="h-8 text-sm" placeholder="নাম" value={ruName} onChange={(e) => setRuName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">পদবী</Label>
                    <Input className="h-8 text-sm" placeholder="পদবী" value={ruDesignation} onChange={(e) => setRuDesignation(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ফোন</Label>
                    <Input className="h-8 text-sm" placeholder="ফোন নম্বর" value={ruPhone} onChange={(e) => setRuPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">দপ্তর</Label>
                    <Input className="h-8 text-sm" placeholder="দপ্তরের নাম" value={ruDept} onChange={(e) => setRuDept(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">শুরুর তারিখ *</Label>
                    <Input className="h-8 text-sm" type="date" value={ruStartDate} onChange={(e) => setRuStartDate(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="text-xs bg-purple-600 hover:bg-purple-700 text-white" onClick={handleAddRoomUser} disabled={addingRoomUser || !ruName.trim() || !ruStartDate}>
                    {addingRoomUser ? "যোগ হচ্ছে..." : "যোগ করুন"}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setAddRoomUserOpen(false)}>বাতিল</Button>
                </div>
              </div>
            )}

            {/* Current Guests in Room — show in info and guest tabs */}
            {!roomDetailLoading && currentGuestsInRoom.length > 0 && (roomDetailTab === "info" || roomDetailTab === "guest") && (
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-2">
                  <UserCheck className="size-4 text-blue-600" />
                  বুক করা গেস্ট
                  <Badge className="bg-blue-100 text-blue-700 text-[10px]">{toBanglaNumber(currentGuestsInRoom.length)} জন</Badge>
                </h4>
                <div className="space-y-1.5">
                  {currentGuestsInRoom.map((g) => (
                    <div key={g.id} className="bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-2.5">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-800">{g.name} <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ml-1 ${g.isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>{g.isPaid ? "Paid" : "Non Paid"}</span></p>
                          {g.mobile && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="size-3" />{g.mobile}</p>}
                          {g.address && <p className="text-xs text-gray-500">{g.address}</p>}
                          {g.referredBy && <p className="text-xs text-gray-400">রেফার: {g.referredBy}</p>}
                          <p className="text-xs text-gray-500 mt-0.5">
                            <Calendar className="size-3 inline mr-0.5" />
                            চেক-ইন: {formatDate(g.checkInDate)}{g.checkInTime ? ` ${g.checkInTime}` : ''}
                          </p>
                          {g.checkOutDate && (
                            <p className="text-xs text-red-500 mt-0.5">
                              <LogOut className="size-3 inline mr-0.5" />
                              চেক-আউট: {formatDate(g.checkOutDate)}{g.checkOutTime ? ` ${g.checkOutTime}` : ''}
                            </p>
                          )}
                          {g.totalBill && <p className="text-xs text-gray-600 mt-0.5">বিল: {g.totalBill}</p>}
                          {!g.isPaid && !g.totalBill && <p className="text-xs text-orange-600 mt-0.5 font-medium">Non Paid</p>}
                          {g.note && <p className="text-xs text-gray-400 mt-0.5">{g.note}</p>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-2">
                          <button onClick={() => openEditGuestInRoom(g)} className="size-6 rounded-md bg-white shadow-sm border text-blue-500 hover:bg-blue-50 flex items-center justify-center" title="এডিট">
                            <Edit3 className="size-3" />
                          </button>
                          <button onClick={() => openVacateGuestInRoom(g)} className="size-6 rounded-md bg-orange-50 border border-orange-200 text-orange-500 hover:bg-orange-100 flex items-center justify-center" title="রুম ত্যাগ">
                            <LogOut className="size-3" />
                          </button>
                          <button onClick={() => openDeleteGuestInRoom(g)} className="size-6 rounded-md bg-white shadow-sm border text-red-400 hover:bg-red-50 flex items-center justify-center" title="মুছুন">
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Previous Guests in Room — show only in guest tab */}
            {!roomDetailLoading && previousGuestsInRoom.length > 0 && roomDetailTab === "guest" && (
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 mb-2">
                  <Clock className="size-4 text-gray-400" />
                  পূর্বের গেস্ট
                  <Badge variant="outline" className="text-[10px]">{toBanglaNumber(previousGuestsInRoom.length)} জন</Badge>
                </h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {previousGuestsInRoom.slice(0, 10).map((g) => (
                    <div key={g.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-700">{g.name}</span>
                        {g.mobile && <span className="text-gray-400 ml-1">— {g.mobile}</span>}
                        {g.totalBill && <span className="text-gray-400 ml-1">— বিল: {g.totalBill}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>{formatDate(g.checkInDate)}</span>
                        {g.checkOutDate && <span>→ {formatDate(g.checkOutDate)}</span>}
                      </div>
                    </div>
                  ))}
                  {previousGuestsInRoom.length > 10 && (
                    <p className="text-[10px] text-gray-400 text-center pt-1">আরও {toBanglaNumber(previousGuestsInRoom.length - 10)} জন...</p>
                  )}
                </div>
              </div>
            )}

            {roomDetailLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="size-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <span className="ml-3 text-sm text-muted-foreground">তথ্য লোড হচ্ছে...</span>
              </div>
            ) : roomDetailData ? (
              <div className="space-y-4">
                {/* Current Tenants — show in info and tenant tabs */}
                {(roomDetailTab === "info" || roomDetailTab === "tenant") && <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-2">
                    <Users className="size-4 text-emerald-600" />
                    বর্তমান বরাদ্দকৃত ব্যক্তি
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{toBanglaNumber(roomDetailData.currentTenants.length)} জন</Badge>
                  </h4>
                  {roomDetailData.currentTenants.length === 0 ? (
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 text-center">এই রুমে কোনো ভাড়াটে নেই</p>
                  ) : (
                    <div className="space-y-1.5">
                      {roomDetailData.currentTenants.map((t) => (
                        <div key={t.id} className="flex items-start justify-between bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 border-2 border-indigo-300 rounded-xl px-3 py-2.5 shadow-md shadow-indigo-100 hover:shadow-lg transition-shadow">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-gray-800">{t.name}</p>
                            {t.designation && <p className="text-xs text-gray-500">{t.designation}</p>}
                            {t.phone && (
                              <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                <Phone className="size-3" />{t.phone}
                              </p>
                            )}
                            <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <Calendar className="size-3" />
                              যোগদান: {formatDate(t.startDate)}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openEditTenantInRoom(t)} className="size-6 rounded-md bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center" title="এডিট">
                              <Edit3 className="size-3" />
                            </button>
                            <AlertDialog open={vacateTenantOpen && vacateTenantId === t.id} onOpenChange={(open) => { setVacateTenantOpen(open); if (!open) { setVacateTenantId(""); setVacateTenantName(""); } }}>
                              <AlertDialogTrigger asChild>
                                <button onClick={() => { setVacateTenantId(t.id); setVacateTenantName(t.name); }} className="size-6 rounded-md bg-orange-50 text-orange-500 hover:bg-orange-100 flex items-center justify-center" title="বরাদ্দ বাতিল">
                                  <LogOut className="size-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-red-600">বরাদ্দ বাতিল নিশ্চিতকরণ</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t.name} কে রুম {roomDetailData?.roomNumber} থেকে বাতিল করতে চান?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => { setVacateTenantId(""); setVacateTenantName(""); }}>বাতিল</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={handleVacateTenant}
                                    disabled={vacatingTenant}
                                  >
                                    {vacatingTenant ? "হচ্ছে..." : "বরাদ্দ বাতিল করুন"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <button onClick={() => openDeleteTenantInRoom(t)} className="size-6 rounded-md bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center" title="মুছুন">
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>}

                {/* Current Room Users (ব্যবহারকারী) — show in info and roomuser tabs */}
                {(roomDetailTab === "info" || roomDetailTab === "roomuser") && <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 mb-2">
                    <UserCheck className="size-3.5 text-teal-600" />
                    বর্তমান রুম ব্যবহারকারী
                    <Badge className="bg-teal-100 text-teal-700 text-[9px]">{toBanglaNumber(roomDetailData.currentRoomUsers.length)} জন</Badge>
                  </h4>
                  {roomDetailData.currentRoomUsers.length === 0 ? (
                    <p className="text-[10px] text-amber-500 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-center">কোনো রুম ব্যবহারকারী নেই</p>
                  ) : (
                    <div className="space-y-1">
                      {roomDetailData.currentRoomUsers.map((u: any) => {
                        const isExpanded = rtExpandedCurrentUser === u.id;
                        return (
                          <div key={u.id} className="bg-gradient-to-br from-cyan-200 via-sky-200 to-blue-200 border border-cyan-300 rounded-xl shadow-md shadow-cyan-100/60 overflow-hidden">
                            {/* Compact header - always visible */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer hover:shadow-sm transition-all" onClick={() => setRtExpandedCurrentUser(rtExpandedCurrentUser === u.id ? null : u.id)}>
                              {isExpanded ? <ChevronDown className="size-3 text-cyan-700 shrink-0" /> : <ChevronRight className="size-3 text-cyan-700 shrink-0" />}
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-[11px] text-gray-800">{u.name}</span>
                                {u.designation && <span className="text-[10px] text-gray-600 ml-1">({u.designation})</span>}
                                {u.phone && <span className="text-[10px] text-gray-500 ml-1 hidden sm:inline">{u.phone}</span>}
                              </div>
                            </div>
                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="bg-white/60 border-t border-cyan-200 px-2.5 py-2 space-y-1.5">
                                {u.designation && <p className="text-[10px] text-gray-600">পদবি: {u.designation}</p>}
                                {u.phone && <p className="text-[10px] text-gray-600">ফোন: {u.phone}</p>}
                                {u.department && <p className="text-[10px] text-gray-600">বিভাগ: {u.department}</p>}
                                {u.startDate && <p className="text-[10px] text-gray-400">শুরু: {formatDate(u.startDate)}</p>}
                                <div className="flex gap-1 pt-0.5">
                                  <button onClick={(e) => { e.stopPropagation(); setEditRoomUserData({id: u.id, name: u.name, designation: u.designation || '', phone: u.phone || '', department: u.department || '', startDate: u.startDate}); setEditRoomUserOpen(true); }} className="size-5 rounded bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center"><Edit3 className="size-3" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteRoomUserId(u.id); setDeleteRoomUserName(u.name); setDeleteRoomUserOpen(true); }} className="size-5 rounded bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center"><Trash2 className="size-3" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleLeaveRoomUser(u.id); }} className="size-5 rounded bg-orange-100 text-orange-600 hover:bg-orange-200 flex items-center justify-center" title="রুম ছাড়ুন"><LogOut className="size-3" /></button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>}

                {/* Current Inventory / Belongings — show only in info tab */}
                {roomDetailTab === "info" && (() => {
                  const allInv = roomDetailData.currentInventory;
                  const totalPages = Math.ceil(allInv.length / INV_PER_PAGE);
                  const pageInv = allInv.slice((invPage - 1) * INV_PER_PAGE, invPage * INV_PER_PAGE);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                          <Package className="size-4 text-blue-600" />
                          বর্তমান রুম এবং বাথরুমের মালামাল
                          {allInv.length > 0 && <Badge className="bg-blue-100 text-blue-700 text-[10px]">{toBanglaNumber(allInv.length)} টি</Badge>}
                        </h4>
                        <div className="flex items-center gap-1">
                          <button onClick={() => {
                            if (bulkEditMode) { setBulkEditMode(false); setBulkEditData({}); }
                            else {
                              setBulkEditMode(true);
                              const data: Record<string, { quantity: string; condition: string }> = {};
                              roomDetailData.currentInventory.forEach(item => { data[item.id] = { quantity: String(item.quantity), condition: item.condition }; });
                              setBulkEditData(data);
                            }
                          }} className={`text-[10px] px-2 py-0.5 rounded ${bulkEditMode ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} hover:opacity-80`}>
                            {bulkEditMode ? 'বাল্ক এডিট বন্ধ' : 'বাল্ক এডিট'}
                          </button>
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-1.5 text-blue-600 border-blue-300 hover:bg-blue-50" onClick={rtHandleDownloadCurrentInv} disabled={rtDownloadingCurrentInv}>
                            {rtDownloadingCurrentInv ? <div className="size-2.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /> : <Download className="size-2.5" />}
                            XLSX
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-1.5 text-blue-600 border-blue-300 hover:bg-blue-50" onClick={() => { setAddNewInvOpen(!addNewInvOpen); setAddNewInvName(""); setAddNewInvQty("1"); setAddNewInvCondition("আছে"); setAddNewInvNote(""); }}>
                            <Plus className="size-3" />
                            নতুন আইটেম যোগ
                          </Button>
                        </div>
                      </div>
                      {/* Add new item inline form */}
                      {addNewInvOpen && (
                        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 mb-2 space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="col-span-2 sm:col-span-1">
                              <Label className="text-[10px]">জিনিসের নাম *</Label>
                              <Input className="h-7 text-xs" placeholder="মালামালের নাম" value={addNewInvName} onChange={(e) => setAddNewInvName(e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-[10px]">পরিমাণ</Label>
                              <Input className="h-7 text-xs" type="number" min={0} value={addNewInvQty} onChange={(e) => setAddNewInvQty(e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-[10px]">অবস্থা</Label>
                              <Select value={addNewInvCondition} onValueChange={setAddNewInvCondition}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ভালো">ভালো</SelectItem>
                                  <SelectItem value="মাঝারি">মাঝারি</SelectItem>
                                  <SelectItem value="খারাপ">খারাপ</SelectItem>
                                  <SelectItem value="নস্ট">নস্ট</SelectItem>
                                  <SelectItem value="আছে">আছে</SelectItem>
                                  <SelectItem value="নেই">নেই</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <Label className="text-[10px]">নোট</Label>
                              <Input className="h-7 text-xs" placeholder="ঐচ্ছিক" value={addNewInvNote} onChange={(e) => setAddNewInvNote(e.target.value)} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 text-white gap-0.5 px-2" onClick={handleAddNewInvToRoom} disabled={addingNewInv || !addNewInvName.trim()}>
                              {addingNewInv ? <div className="size-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="size-2.5" />}
                              যোগ করুন
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setAddNewInvOpen(false)}>বাতিল</Button>
                          </div>
                        </div>
                      )}
                      {allInv.length === 0 && !addNewInvOpen && (
                        <p className="text-xs text-muted-foreground bg-gray-50 rounded-lg px-3 py-2 text-center">কোনো মালামাল নেই। "নতুন আইটেম যোগ" বাটনে ক্লিক করে মালামাল যোগ করুন।</p>
                      )}
                      {allInv.length > 0 && <>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-blue-50/50">
                              <TableHead className="text-xs h-8 w-10 text-center">ক্রম</TableHead>
                              <TableHead className="text-xs h-8">জিনিস</TableHead>
                              <TableHead className="text-xs h-8 text-center">পরিমাণ</TableHead>
                              <TableHead className="text-xs h-8 text-center">অবস্থা</TableHead>
                              <TableHead className="text-xs h-8 text-center">রিপেয়ার/রিপ্লেস</TableHead>
                              <TableHead className="text-xs h-8 text-center">অ্যাকশন</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pageInv.map((item, idx) => (
                              <TableRow key={item.id} className="text-xs">
                                <TableCell className="py-1.5 text-center text-muted-foreground">{toBanglaNumber((invPage - 1) * INV_PER_PAGE + idx + 1)}</TableCell>
                                <TableCell className="py-1.5 font-medium">{item.itemName}</TableCell>
                                <TableCell className="py-1.5 text-center">
                                  {bulkEditMode ? (
                                    <input className="w-10 h-5 text-[10px] border rounded px-0.5 text-center" type="number" min={0} value={bulkEditData[item.id]?.quantity || ''} onChange={(e) => { setBulkEditData(prev => ({...prev, [item.id]: {...prev[item.id], quantity: e.target.value}})); }} />
                                  ) : (
                                    <span>{toBanglaNumber(item.quantity)}</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-1.5 text-center">
                                  {bulkEditMode ? (
                                    <select className="h-5 text-[10px] border rounded px-0.5" value={bulkEditData[item.id]?.condition || ''} onChange={(e) => { setBulkEditData(prev => ({...prev, [item.id]: {...prev[item.id], condition: e.target.value}})); }}>
                                      <option value="আছে">আছে</option><option value="নেই">নেই</option><option value="ভালো">ভালো</option><option value="খারাপ">খারাপ</option><option value="নতুন">নতুন</option><option value="পুরাতন">পুরাতন</option><option value="নস্ট">নস্ট</option><option value="ভাঙা">ভাঙা</option><option value="মাঝারি">মাঝারি</option>
                                    </select>
                                  ) : (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.condition === 'ভালো' ? 'bg-emerald-100 text-emerald-700' : item.condition === 'মাঝারি' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                      {item.condition}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="py-1.5 text-center">
                                  {(() => {
                                    const rd = roomInvRepairDates[item.id];
                                    if (!rd || (!rd.latestRepair && !rd.latestReplace)) return <span className="text-muted-foreground">—</span>;
                                    return (
                                      <div className="flex flex-col items-center gap-0.5">
                                        {rd.latestRepair && <span className="text-[10px] text-blue-600" title={rd.repairNote || ''}>রিপেয়ার: {formatDate(rd.latestRepair)}</span>}
                                        {rd.latestReplace && <span className="text-[10px] text-amber-600" title={rd.replaceNote || ''}>রিপ্লেস: {formatDate(rd.latestReplace)}</span>}
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="py-1.5 text-center">
                                  <div className="flex justify-center gap-1">
                                    <button onClick={() => openEditInvInRoom(item)} className="size-5 rounded bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center">
                                      <Edit3 className="size-2.5" />
                                    </button>
                                    <button onClick={() => openDeleteInvInRoom(item)} className="size-5 rounded bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center">
                                      <Trash2 className="size-2.5" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {bulkEditMode && (
                        <div className="flex gap-2 mt-2 justify-end">
                          <Button size="sm" className="h-6 text-[10px] bg-emerald-600 text-white gap-1" onClick={async () => {
                            setSavingBulk(true);
                            try {
                              const items = Object.entries(bulkEditData).map(([id, data]) => ({ id, ...data }));
                              const res = await fetch("/api/inventory/bulk-update", { method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ items }) });
                              if (res.ok) { toast.success("সব মালামাল আপডেট হয়েছে"); setBulkEditMode(false); setBulkEditData({}); silentRefreshRoomDetail(); }
                              else toast.error("আপডেট করতে সমস্যা");
                            } catch { toast.error("আপডেট করতে সমস্যা"); }
                            setSavingBulk(false);
                          }} disabled={savingBulk}>
                            {savingBulk ? "সেভ হচ্ছে..." : "সব সেভ করুন"}
                          </Button>
                        </div>
                      )}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={invPage <= 1} onClick={() => setInvPage(invPage - 1)}>আগে</Button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <Button key={p} variant={p === invPage ? "default" : "outline"} size="sm" className="h-6 w-6 text-[10px] p-0" onClick={() => setInvPage(p)}>{p}</Button>
                          ))}
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={invPage >= totalPages} onClick={() => setInvPage(invPage + 1)}>পরে</Button>
                        </div>
                      )}
                      </>}
                    </div>
                  );
                })()}

                {/* Previous Tenants — show in info and tenant tabs */}
                {(roomDetailTab === "info" || roomDetailTab === "tenant") && (() => {
                  const prevTenants = roomDetailData.previousTenants;
                  const vacateRecords = roomDetailData.vacateRecords;
                  const totalPages = Math.ceil(prevTenants.length / PREV_TENANT_PER_PAGE);
                  const pageTenants = prevTenants.slice((prevTenantPage - 1) * PREV_TENANT_PER_PAGE, prevTenantPage * PREV_TENANT_PER_PAGE);
                  if (prevTenants.length === 0) return null;
                  const gradients = [
                    "bg-gradient-to-br from-violet-300 via-purple-300 to-fuchsia-300 shadow-md shadow-violet-200/50 ring-1 ring-white/50",
                    "bg-gradient-to-br from-rose-300 via-pink-300 to-red-200 shadow-md shadow-rose-200/50 ring-1 ring-white/50",
                    "bg-gradient-to-br from-amber-200 via-orange-300 to-red-200 shadow-md shadow-amber-200/50 ring-1 ring-white/50",
                    "bg-gradient-to-br from-emerald-200 via-green-300 to-teal-200 shadow-md shadow-emerald-200/50 ring-1 ring-white/50",
                    "bg-gradient-to-br from-blue-200 via-indigo-300 to-blue-300 shadow-md shadow-blue-200/50 ring-1 ring-white/50",
                    "bg-gradient-to-br from-cyan-200 via-sky-300 to-blue-200 shadow-md shadow-cyan-200/50 ring-1 ring-white/50",
                  ];
                  return (
                    <div>
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-1.5">
                        <Clock className="size-4 text-gray-400" />
                        পূর্বের ভাড়াটে
                        <Badge variant="outline" className="text-[10px]">{toBanglaNumber(prevTenants.length)} জন</Badge>
                      </h4>
                      <div className="space-y-1.5">
                        {pageTenants.map((t, tIdx) => {
                          const vr = vacateRecords.find((v: any) => v.tenantId === t.id);
                          const gradClass = gradients[tIdx % 6];
                          const isExp = rtExpandedPrevTenant === t.id;
                          let snapItems: any[] = [];
                          try { snapItems = vr?.inventorySnapshot ? JSON.parse(vr.inventorySnapshot) : []; } catch { snapItems = []; }
                          return (
                            <div key={t.id} className={`${gradClass} rounded-xl p-2 text-gray-800 transition-all duration-200 hover:scale-[1.02] shadow-xl`}>
                              <div className="flex items-center justify-between gap-2">
                                <button className="flex items-center gap-1.5 text-left flex-1 min-w-0" onClick={() => setRtExpandedPrevTenant(isExp ? null : t.id)}>
                                  <Users className="size-3 shrink-0 text-gray-600" />
                                  <div className="min-w-0">
                                    <p className="text-[12px] font-bold truncate">{t.name}</p>
                                    <p className="text-[9px] text-gray-500">
                                      {t.designation && <span>{t.designation} • </span>}
                                      {t.phone && <span>{t.phone} • </span>}
                                      {t.startDate ? formatDate(t.startDate) : "-"} — {t.endDate ? formatDate(t.endDate) : "-"}
                                    </p>
                                  </div>
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                  {vr && <button className="size-5 rounded-md bg-white/50 hover:bg-white/70 flex items-center justify-center transition-colors text-gray-600" onClick={(e) => { e.stopPropagation(); rtHandleEditPrevTenant(vr, t); }}>
                                    <Edit3 className="size-2.5" />
                                  </button>}
                                  {vr && <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <button className="size-5 rounded-md bg-white/50 hover:bg-red-100 flex items-center justify-center transition-colors text-gray-600">
                                        <Trash2 className="size-2.5" />
                                      </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>মুছে ফেলবেন?</AlertDialogTitle>
                                        <AlertDialogDescription>{t.name}-এর ভাড়াটে রেকর্ড ও টেন্যান্ট তথ্য স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>বাতিল</AlertDialogCancel>
                                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={(e) => { e.preventDefault(); rtHandleDeletePrevTenant(vr.id); }} disabled={rtDeletingPrev}>
                                          {rtDeletingPrev ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "মুছুন"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>}
                                </div>
                              </div>
                              {isExp && vr && (
                                <div className="mt-2">
                                  {snapItems.length > 0 && (
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <button className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-500/30 hover:bg-red-500/50 transition-colors" onClick={() => rtHandleDeleteSnapshot(vr.id)} disabled={rtDeletingSnapshot}>
                                        <Trash2 className="size-3" />
                                        {rtDeletingSnapshot ? "হচ্ছে..." : "সব মালামাল মুছুন"}
                                      </button>
                                      <button className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/30 hover:bg-emerald-500/50 transition-colors" onClick={() => rtHandleDownloadSnapshot(vr, t)}>
                                        <Download className="size-3" />
                                        ডাউনলোড
                                      </button>
                                    </div>
                                  )}
                                  <div className="bg-white/95 rounded-lg overflow-hidden">
                                    {snapItems.length === 0 ? (
                                      <p className="text-[10px] text-gray-400 px-2 py-1.5">কোনো মালামাল স্ন্যাপশট নেই</p>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-[10px]">
                                          <thead>
                                            <tr className="bg-gray-100">
                                              <th className="text-left px-2 py-1 font-medium text-gray-600">মালামাল</th>
                                              <th className="text-center px-1 py-1 font-medium text-gray-600">পরিমাণ</th>
                                              <th className="text-center px-1 py-1 font-medium text-gray-600">অবস্থা</th>
                                              <th className="text-left px-1 py-1 font-medium text-gray-600">নোট</th>
                                              <th className="text-left px-1 py-1 font-medium text-gray-600">রিপেয়ার/রিপ্লেস</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {snapItems.map((item: any, i: number) => {
                                              const repairInfo = item.latestRepair ? `রিপেয়ার: ${item.latestRepair?.split('T')[0] || item.latestRepair}` : '';
                                              const replaceInfo = item.latestReplace ? `রিপ্লেস: ${item.latestReplace?.split('T')[0] || item.latestReplace}` : '';
                                              return (
                                                <tr key={i} className="border-t border-gray-100">
                                                  <td className="px-2 py-0.5 text-gray-700">{item.itemName || item.name || "-"}</td>
                                                  <td className="px-1 py-0.5 text-center text-gray-600">{toBanglaNumber(item.quantity || 0)}</td>
                                                  <td className="px-1 py-0.5 text-center text-gray-600">{item.condition || "-"}</td>
                                                  <td className="px-1 py-0.5 text-gray-600 max-w-[80px] truncate">{item.note || "-"}</td>
                                                  <td className="px-1 py-0.5 text-gray-600 text-[9px]">{repairInfo || replaceInfo || "-"}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={prevTenantPage <= 1} onClick={() => setPrevTenantPage(prevTenantPage - 1)}>আগে</Button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <Button key={p} variant={p === prevTenantPage ? "default" : "outline"} size="sm" className="h-6 w-6 text-[10px] p-0" onClick={() => setPrevTenantPage(p)}>{p}</Button>
                          ))}
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={prevTenantPage >= totalPages} onClick={() => setPrevTenantPage(prevTenantPage + 1)}>পরে</Button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Previous Room Users — show in info and roomuser tabs */}
                {(roomDetailTab === "info" || roomDetailTab === "roomuser") && roomDetailData.previousRoomUsers.length > 0 && (() => {
                  const RU_PREV_PER_PAGE = 5;
                  const ruPrevTotalPages = Math.max(1, Math.ceil(roomDetailData.previousRoomUsers.length / RU_PREV_PER_PAGE));
                  const ruPrevItems = roomDetailData.previousRoomUsers.slice((ruPrevPage - 1) * RU_PREV_PER_PAGE, ruPrevPage * RU_PREV_PER_PAGE);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                          <Users className="size-3" /> পূর্বের রুম ব্যবহারকারী
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{roomDetailData.previousRoomUsers.length}</Badge>
                        </h4>
                      </div>
                      <div className="space-y-1">
                        {ruPrevItems.map((u: any) => {
                          const isExp = rtExpandedPrevRoomUser === u.id;
                          return (
                            <div key={u.id} className="bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-100 border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer hover:shadow-sm transition-all" onClick={() => setRtExpandedPrevRoomUser(rtExpandedPrevRoomUser === u.id ? null : u.id)}>
                                {isExp ? <ChevronDown className="size-3 text-gray-500 shrink-0" /> : <ChevronRight className="size-3 text-gray-500 shrink-0" />}
                                <span className="font-medium text-[11px] text-gray-700">{u.name}</span>
                                {u.designation && <span className="text-[10px] text-gray-500">({u.designation})</span>}
                              </div>
                              {isExp && (
                                <div className="bg-white/60 border-t border-gray-200 px-2.5 py-1.5 space-y-0.5">
                                  {u.designation && <p className="text-[10px] text-gray-600">পদবি: {u.designation}</p>}
                                  {u.phone && <p className="text-[10px] text-gray-600">ফোন: {u.phone}</p>}
                                  {u.department && <p className="text-[10px] text-gray-600">বিভাগ: {u.department}</p>}
                                  {u.startDate && <p className="text-[10px] text-gray-400">শুরু: {formatDate(u.startDate)} — শেষ: {u.endDate ? formatDate(u.endDate) : '...'}</p>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {ruPrevTotalPages > 1 && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Button variant="outline" size="sm" className="h-5 text-[9px] px-1.5" disabled={ruPrevPage <= 1} onClick={() => setRuPrevPage(p => p - 1)}>পূর্বের</Button>
                          <span className="text-[10px] text-gray-500">{toBanglaNumber(ruPrevPage)} / {toBanglaNumber(ruPrevTotalPages)}</span>
                          <Button variant="outline" size="sm" className="h-5 text-[9px] px-1.5" disabled={ruPrevPage >= ruPrevTotalPages} onClick={() => setRuPrevPage(p => p + 1)}>পরবর্তী</Button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Previous Inventory — show only in info tab */}
                {roomDetailTab === "info" && (() => {
                  const allPrevInv = roomDetailData.previousInventory;
                  if (allPrevInv.length === 0) return null;
                  const totalPages = Math.ceil(allPrevInv.length / INV_PER_PAGE);
                  const pageInv = allPrevInv.slice((prevInvPage - 1) * INV_PER_PAGE, prevInvPage * INV_PER_PAGE);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                          <Package className="size-4 text-gray-400" />
                          পূর্বের ভাড়াটে কর্তৃক ব্যবহৃত মালামাল
                          <Badge variant="outline" className="text-[10px]">{toBanglaNumber(allPrevInv.length)} টি</Badge>
                        </h4>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-2 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={rtHandleDownloadPrevInv} disabled={rtDownloadingPrevInv}>
                          {rtDownloadingPrevInv ? <div className="size-2.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /> : <Download className="size-2.5" />}
                          XLSX
                        </Button>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="text-xs h-8 w-10 text-center">ক্রম</TableHead>
                              <TableHead className="text-xs h-8">জিনিস</TableHead>
                              <TableHead className="text-xs h-8 text-center">পরিমাণ</TableHead>
                              <TableHead className="text-xs h-8 text-center">অবস্থা</TableHead>
                              <TableHead className="text-xs h-8 w-20 text-center">পদক্ষেপ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pageInv.map((item, idx) => {
                              const rInfo = roomInvRepairDates[item.id];
                              return (
                                <TableRow key={item.id} className="text-xs text-gray-500">
                                  <TableCell className="py-1.5 text-center">{toBanglaNumber((prevInvPage - 1) * INV_PER_PAGE + idx + 1)}</TableCell>
                                  <TableCell className="py-1.5">
                                    <div>
                                      {item.itemName}
                                      {(rInfo?.latestRepair || rInfo?.latestReplace) && (
                                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                                          {rInfo?.latestRepair && <span className="text-blue-600">রিপেয়ার: {formatDate(rInfo.latestRepair)}</span>}
                                          {rInfo?.latestReplace && <span className="text-orange-600">রিপ্লেস: {formatDate(rInfo.latestReplace)}</span>}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-1.5 text-center">{toBanglaNumber(item.quantity)}</TableCell>
                                  <TableCell className="py-1.5 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${item.condition === 'ভালো' ? 'bg-emerald-100 text-emerald-700' : item.condition === 'মাঝারি' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                      {item.condition}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-1.5 text-center">
                                    <div className="flex items-center justify-center gap-0.5">
                                      <button onClick={() => openEditInvInRoom({ id: item.id, itemName: item.itemName, quantity: item.quantity, condition: item.condition, note: item.note })} className="size-5 rounded bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center">
                                        <Edit3 className="size-2.5" />
                                      </button>
                                      <AlertDialog><AlertDialogTrigger asChild><button onClick={() => openDeleteInvInRoom({ id: item.id, itemName: item.itemName })} className="size-5 rounded bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"><Trash2 className="size-2.5" /></button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>মালামাল মুছে ফেলবেন?</AlertDialogTitle><AlertDialogDescription>&quot;{item.itemName}&quot; স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>বাতিল</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteInvInRoom} disabled={deletingInvInRoom}>{deletingInvInRoom ? "হচ্ছে..." : "মুছে ফেলুন"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={prevInvPage <= 1} onClick={() => setPrevInvPage(prevInvPage - 1)}>আগে</Button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <Button key={p} variant={p === prevInvPage ? "default" : "outline"} size="sm" className="h-6 w-6 text-[10px] p-0" onClick={() => setPrevInvPage(p)}>{p}</Button>
                          ))}
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={prevInvPage >= totalPages} onClick={() => setPrevInvPage(prevInvPage + 1)}>পরে</Button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* No data message — tab specific */}
                {roomDetailTab === "info" && roomDetailData.currentTenants.length === 0 && roomDetailData.currentInventory.length === 0 && roomDetailData.previousTenants.length === 0 && currentGuestsInRoom.length === 0 && roomDetailData.currentRoomUsers.length === 0 && (
                  <div className="text-center py-6">
                    <BedDouble className="size-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">এই রুমে কোনো তথ্য নেই</p>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Edit Tenant in Room Dialog */}
        <Dialog open={editTenantInRoom} onOpenChange={setEditTenantInRoom}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <Edit3 className="size-5" />
                ভাড়াটের তথ্য সম্পাদনা
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">নাম</Label>
                <Input className="h-8 text-sm" value={editTenantNameInRoom} onChange={(e) => setEditTenantNameInRoom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">পদবি</Label>
                <Input className="h-8 text-sm" value={editTenantDesigInRoom} onChange={(e) => setEditTenantDesigInRoom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ফোন</Label>
                <Input className="h-8 text-sm" value={editTenantPhoneInRoom} onChange={(e) => setEditTenantPhoneInRoom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">দপ্তর</Label>
                <Input className="h-8 text-sm" value={editTenantDeptInRoom} onChange={(e) => setEditTenantDeptInRoom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">শুরুর তারিখ</Label>
                <Input className="h-8 text-sm" type="date" value={editTenantStartDateInRoom} onChange={(e) => setEditTenantStartDateInRoom(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditTenantInRoom(false)}>বাতিল</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveTenantEditInRoom} disabled={savingTenantEditInRoom || !editTenantNameInRoom.trim()}>
                {savingTenantEditInRoom ? "হচ্ছে..." : "আপডেট করুন"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Tenant Confirm Dialog */}
        <AlertDialog open={deleteTenantInRoomOpen} onOpenChange={setDeleteTenantInRoomOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">ভাড়াটে মুছে ফেলবেন?</AlertDialogTitle>
              <AlertDialogDescription>
                &quot;{deleteTenantInRoomName}&quot; এর সকল তথ্য স্থায়ীভাবে মুছে যাবে।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>বাতিল</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteTenantInRoom} disabled={deletingTenantInRoom}>
                {deletingTenantInRoom ? "হচ্ছে..." : "মুছে ফেলুন"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Previous Tenant Dialog - Room Detail */}
        <Dialog open={rtEditPrevOpen} onOpenChange={(open) => { if (!open) { setRtEditPrevOpen(false); setRtEditPrevData(null); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Edit3 className="size-4" />পূর্বের ভাড়াটে তথ্য সম্পাদনা</DialogTitle>
              <DialogDescription>ভাড়াটের নাম, পদবি ও ফোন নম্বর পরিবর্তন করুন</DialogDescription>
            </DialogHeader>
            {rtEditPrevData && (
              <div className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">নাম *</Label><Input className="h-9 text-sm" value={rtEditPrevData.tenantName} onChange={(e) => setRtEditPrevData({ ...rtEditPrevData, tenantName: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">পদবি</Label><Input className="h-9 text-sm" value={rtEditPrevData.designation} onChange={(e) => setRtEditPrevData({ ...rtEditPrevData, designation: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">ফোন নম্বর</Label><Input className="h-9 text-sm" value={rtEditPrevData.phone} onChange={(e) => setRtEditPrevData({ ...rtEditPrevData, phone: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">শুরুর তারিখ</Label><Input className="h-9 text-sm" type="date" value={rtEditPrevData.startDate} onChange={(e) => setRtEditPrevData({ ...rtEditPrevData, startDate: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">শেষ তারিখ</Label><Input className="h-9 text-sm" type="date" value={rtEditPrevData.endDate} onChange={(e) => setRtEditPrevData({ ...rtEditPrevData, endDate: e.target.value })} /></div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setRtEditPrevOpen(false); setRtEditPrevData(null); }}>বাতিল</Button>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={rtHandleSaveEditPrevTenant} disabled={rtEditingPrev || !rtEditPrevData?.tenantName.trim()}>
                {rtEditingPrev ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" /> : null}
                আপডেট করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Room User Dialog */}
        <Dialog open={editRoomUserOpen} onOpenChange={setEditRoomUserOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-600">
                <Edit3 className="size-5" />
                রুম ব্যবহারকারী সম্পাদনা
              </DialogTitle>
            </DialogHeader>
            {editRoomUserData && (
              <div className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">নাম</Label><Input className="h-8 text-sm" value={editRoomUserData.name} onChange={(e) => setEditRoomUserData({ ...editRoomUserData, name: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">পদবী</Label><Input className="h-8 text-sm" value={editRoomUserData.designation} onChange={(e) => setEditRoomUserData({ ...editRoomUserData, designation: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">ফোন</Label><Input className="h-8 text-sm" value={editRoomUserData.phone} onChange={(e) => setEditRoomUserData({ ...editRoomUserData, phone: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">দপ্তর</Label><Input className="h-8 text-sm" value={editRoomUserData.department} onChange={(e) => setEditRoomUserData({ ...editRoomUserData, department: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">শুরুর তারিখ</Label><Input className="h-8 text-sm" type="date" value={editRoomUserData.startDate} onChange={(e) => setEditRoomUserData({ ...editRoomUserData, startDate: e.target.value })} /></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setEditRoomUserOpen(false); setEditRoomUserData(null); }}>বাতিল</Button>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleEditRoomUser} disabled={editingRoomUser}>{editingRoomUser ? "হচ্ছে..." : "আপডেট করুন"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Room User Confirm Dialog */}
        <AlertDialog open={deleteRoomUserOpen} onOpenChange={setDeleteRoomUserOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">রুম ব্যবহারকারী মুছে ফেলবেন?</AlertDialogTitle>
              <AlertDialogDescription>"{deleteRoomUserName}" এর সকল তথ্য স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setDeleteRoomUserOpen(false); setDeleteRoomUserId(""); }}>বাতিল</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteRoomUser} disabled={deletingRoomUser}>মুছে ফেলুন</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Inventory Dialog */}
        <Dialog open={editInvInRoom} onOpenChange={setEditInvInRoom}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <Edit3 className="size-5" />
                মালামাল সম্পাদনা
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {/* Basic info */}
              <div className="space-y-1">
                <Label className="text-xs">জিনিসের নাম</Label>
                <Input className="h-8 text-sm" value={editInvItemName} onChange={(e) => setEditInvItemName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">পরিমাণ</Label>
                  <Input className="h-8 text-sm" type="number" min={0} value={editInvQuantity} onChange={(e) => setEditInvQuantity(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">অবস্থা</Label>
                  <Select value={editInvCondition} onValueChange={setEditInvCondition}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ভালো">ভালো</SelectItem>
                      <SelectItem value="মাঝারি">মাঝারি</SelectItem>
                      <SelectItem value="খারাপ">খারাপ</SelectItem>
                      <SelectItem value="নস্ট">নস্ট</SelectItem>
                      <SelectItem value="আছে">আছে</SelectItem>
                      <SelectItem value="নেই">নেই</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">নোট</Label>
                <Input className="h-8 text-sm" value={editInvNote} onChange={(e) => setEditInvNote(e.target.value)} />
              </div>

              {/* Divider */}
              <div className="border-t pt-2 mt-2">
                <p className="text-xs font-semibold text-gray-500 mb-2">Repair / Replace রেকর্ড</p>
              </div>

              {/* Latest Repair Date (read-only) */}
              {invLatestRepairDate && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="size-3.5 text-blue-500" />
                    <span className="text-xs text-blue-700 font-medium">সর্বশেষ Repair:</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-800">{formatDate(invLatestRepairDate)}</span>
                </div>
              )}

              {/* Latest Replace Date (read-only) */}
              {invLatestReplaceDate && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className="size-3.5 text-amber-500" />
                    <span className="text-xs text-amber-700 font-medium">সর্বশেষ Replace:</span>
                  </div>
                  <span className="text-xs font-semibold text-amber-800">{formatDate(invLatestReplaceDate)}</span>
                </div>
              )}

              {/* Add new Repair */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 space-y-2">
                <p className="text-xs font-medium text-gray-600 flex items-center gap-1"><Wrench className="size-3" />Repair</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-7 text-xs" type="date" value={newRepairDate} onChange={(e) => setNewRepairDate(e.target.value)} placeholder="তারিখ" />
                  <Input className="h-7 text-xs" value={newRepairNote} onChange={(e) => setNewRepairNote(e.target.value)} placeholder="নোট (ঐচ্ছিক)" />
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs w-full border-blue-200 text-blue-600 hover:bg-blue-50" disabled={!newRepairDate || savingRepairRecord} onClick={() => handleSaveQuickRepair("repair")}>
                  {savingRepairRecord ? "হচ্ছে..." : "Repair সেভ করুন"}
                </Button>
              </div>

              {/* Add new Replace */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 space-y-2">
                <p className="text-xs font-medium text-gray-600 flex items-center gap-1"><RefreshCw className="size-3" />Replace</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-7 text-xs" type="date" value={newReplaceDate} onChange={(e) => setNewReplaceDate(e.target.value)} placeholder="তারিখ" />
                  <Input className="h-7 text-xs" value={newReplaceNote} onChange={(e) => setNewReplaceNote(e.target.value)} placeholder="নোট (ঐচ্ছিক)" />
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs w-full border-amber-200 text-amber-600 hover:bg-amber-50" disabled={!newReplaceDate || savingRepairRecord} onClick={() => handleSaveQuickRepair("replace")}>
                  {savingRepairRecord ? "হচ্ছে..." : "Replace সেভ করুন"}
                </Button>
              </div>

              {/* Collapsible history with pagination */}
              {invRepairHistory.length > 0 && (
                <div className="border-t pt-2">
                  <button
                    onClick={() => { setShowInvHistory(!showInvHistory); if (!showInvHistory) setInvHistoryPage(1); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors w-full"
                  >
                    {showInvHistory ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                    <span>সকল রেকর্ড দেখুন ({toBanglaNumber(invRepairHistory.length)})</span>
                  </button>
                  {showInvHistory && (() => {
                    const totalPages = Math.ceil(invRepairHistory.length / INV_HISTORY_PER_PAGE);
                    const pagedRecords = invRepairHistory.slice((invHistoryPage - 1) * INV_HISTORY_PER_PAGE, invHistoryPage * INV_HISTORY_PER_PAGE);
                    return (
                      <div className="mt-2">
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {pagedRecords.map((r, idx) => (
                            <div key={r.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-md px-2.5 py-1.5">
                              <div className="flex items-center gap-2">
                                {r.type === "repair" ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"><Wrench className="size-2.5" />Repair</span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700"><RefreshCw className="size-2.5" />Replace</span>
                                )}
                                <span className="text-xs text-gray-600">{formatDate(r.actionDate)}</span>
                                {r.note && <span className="text-[10px] text-gray-400">({r.note})</span>}
                              </div>
                              <button onClick={() => handleDeleteRepairRecord(r.id)} className="size-5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center" title="মুছুন">
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                            <button
                              onClick={() => setInvHistoryPage((p) => Math.max(1, p - 1))}
                              disabled={invHistoryPage <= 1}
                              className="size-6 rounded text-[10px] flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >‹</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                              <button
                                key={pg}
                                onClick={() => setInvHistoryPage(pg)}
                                className={`size-6 rounded text-[10px] flex items-center justify-center border ${pg === invHistoryPage ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"}`}
                              >{toBanglaNumber(pg)}</button>
                            ))}
                            <button
                              onClick={() => setInvHistoryPage((p) => Math.min(totalPages, p + 1))}
                              disabled={invHistoryPage >= totalPages}
                              className="size-6 rounded text-[10px] flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >›</button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditInvInRoom(false)}>বাতিল</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveInvEditInRoom} disabled={savingInvEditInRoom || !editInvItemName.trim()}>
                {savingInvEditInRoom ? "হচ্ছে..." : "আপডেট করুন"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Inventory Confirm Dialog */}
        <AlertDialog open={deleteInvInRoomOpen} onOpenChange={setDeleteInvInRoomOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">মালামাল মুছে ফেলবেন?</AlertDialogTitle>
              <AlertDialogDescription>
                &quot;{deleteInvNameInRoom}&quot; স্থায়ীভাবে মুছে যাবে।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>বাতিল</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteInvInRoom} disabled={deletingInvInRoom}>
                {deletingInvInRoom ? "হচ্ছে..." : "মুছে ফেলুন"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Guest in Room Dialog */}
        <Dialog open={editGuestInRoom} onOpenChange={setEditGuestInRoom}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <Edit3 className="size-5" />
                গেস্ট তথ্য সম্পাদনা
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${editGuestIsPaidInRoom ? "bg-emerald-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => setEditGuestIsPaidInRoom(true)}>Paid</button>
                <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!editGuestIsPaidInRoom ? "bg-orange-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => { setEditGuestIsPaidInRoom(false); setEditGuestTotalBillInRoom(""); }}>Non Paid</button>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">নাম</Label>
                <Input className="h-8 text-sm" value={editGuestNameInRoom} onChange={(e) => setEditGuestNameInRoom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ফোন</Label>
                <Input className="h-8 text-sm" value={editGuestMobileInRoom} onChange={(e) => setEditGuestMobileInRoom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ঠিকানা</Label>
                <Input className="h-8 text-sm" value={editGuestAddressInRoom} onChange={(e) => setEditGuestAddressInRoom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">রেফার করেছেন</Label>
                <Input className="h-8 text-sm" value={editGuestReferredByInRoom} onChange={(e) => setEditGuestReferredByInRoom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">চেক-ইন তারিখ</Label>
                <Input className="h-8 text-sm" type="date" value={editGuestCheckInDateInRoom} onChange={(e) => setEditGuestCheckInDateInRoom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">চেক-ইন সময়</Label>
                <Input className="h-8 text-sm" type="time" value={editGuestCheckInTimeInRoom} onChange={(e) => setEditGuestCheckInTimeInRoom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">চেক-আউট তারিখ</Label>
                <Input className="h-8 text-sm" type="date" value={editGuestCheckOutDateInRoom} onChange={(e) => setEditGuestCheckOutDateInRoom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">চেক-আউট সময়</Label>
                <Input className="h-8 text-sm" type="time" value={editGuestCheckOutTimeInRoom} onChange={(e) => setEditGuestCheckOutTimeInRoom(e.target.value)} />
              </div>
              {editGuestIsPaidInRoom ? (
                <div className="space-y-1">
                  <Label className="text-xs">বিল</Label>
                  <Input className="h-8 text-sm" type="number" value={editGuestTotalBillInRoom} onChange={(e) => setEditGuestTotalBillInRoom(e.target.value)} />
                </div>
              ) : (
                <div className="col-span-1 sm:col-span-2 bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                  <p className="text-sm font-medium text-orange-700">Total Bill: Non Paid</p>
                  <p className="text-xs text-orange-600 mt-0.5">এই গেস্ট Non Paid হিসেবে চিহ্নিত হবে</p>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">নোট</Label>
                <Input className="h-8 text-sm" value={editGuestNoteInRoom} onChange={(e) => setEditGuestNoteInRoom(e.target.value)} />
              </div>
            </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditGuestInRoom(false)}>বাতিল</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveGuestEditInRoom} disabled={savingGuestEditInRoom || !editGuestNameInRoom.trim()}>
                {savingGuestEditInRoom ? "হচ্ছে..." : "আপডেট করুন"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Guest Confirm Dialog */}
        <AlertDialog open={deleteGuestInRoomOpen} onOpenChange={setDeleteGuestInRoomOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">গেস্ট মুছে ফেলবেন?</AlertDialogTitle>
              <AlertDialogDescription>
                &quot;{deleteGuestNameInRoom}&quot; এর সকল তথ্য স্থায়ীভাবে মুছে যাবে।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>বাতিল</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteGuestInRoom} disabled={deletingGuestInRoom}>
                {deletingGuestInRoom ? "হচ্ছে..." : "মুছে ফেলুন"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Vacate Guest (Room Checkout) Dialog */}
        <Dialog open={vacateGuestInRoomOpen} onOpenChange={setVacateGuestInRoomOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <LogOut className="size-5" />
                রুম খালি করুন
              </DialogTitle>
              <DialogDescription>
                &quot;{vacateGuestNameInRoom}&quot; এর চেক-আউট তথ্য দিন। রুম খালি হয়ে যাবে এবং তথ্য রেকর্ড থাকবে।
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">চেক-আউট তারিখ *</Label>
                <Input className="h-8 text-sm" type="date" value={vacateCheckOutDate} onChange={(e) => setVacateCheckOutDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">চেক-আউট সময়</Label>
                <Input className="h-8 text-sm" type="time" value={vacateCheckOutTime} onChange={(e) => setVacateCheckOutTime(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setVacateGuestInRoomOpen(false)}>বাতিল</Button>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleVacateGuestInRoom} disabled={!vacateCheckOutDate || vacatingGuestInRoom}>
                {vacatingGuestInRoom ? "হচ্ছে..." : "রুম খালি করুন"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {buildings.length === 0 && (
        <Alert>
          <Building2 className="size-4" />
          <AlertDescription>
            কোনো বিল্ডিং নেই। নতুন বিল্ডিং যোগ করুন।
          </AlertDescription>
        </Alert>
      )}

      {/* Building Square Color Boxes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4" style={{gridAutoFlow:'dense'}}>
        {buildings.map((building, bIdx) => {
          const totalRooms = building.floors?.reduce((sum, f) => sum + (f.rooms?.length || 0), 0) || 0;
          const totalEmptySeats = building.floors?.reduce((totalEmpty, f) => {
            const cap = building.capacityPerRoom || 1;
            return totalEmpty + (f.rooms || []).reduce((empty, r) => {
              const active = (r.tenants?.length || 0);
              return empty + Math.max(0, cap - active);
            }, 0);
          }, 0) || 0;
          const totalTenants = building.floors?.reduce((total, f) => total + (f.rooms || []).reduce((t, r) => t + (r.tenants?.length || 0), 0), 0) || 0;
          const isExpanded = expandedBuildings.has(building.id);

          // Square box color schemes — soft muted pastel colors
          const boxColors = [
            { base: 'bg-slate-600', hover: 'hover:bg-slate-700', ring: 'ring-slate-400', text: 'text-white', detailBg: 'bg-slate-50', detailBorder: 'border-slate-200', iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
            { base: 'bg-stone-600', hover: 'hover:bg-stone-700', ring: 'ring-stone-400', text: 'text-white', detailBg: 'bg-stone-50', detailBorder: 'border-stone-200', iconBg: 'bg-stone-100', iconColor: 'text-stone-600' },
            { base: 'bg-cyan-600', hover: 'hover:bg-cyan-700', ring: 'ring-cyan-400', text: 'text-white', detailBg: 'bg-cyan-50', detailBorder: 'border-cyan-200', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-700' },
            { base: 'bg-sky-600', hover: 'hover:bg-sky-700', ring: 'ring-sky-400', text: 'text-white', detailBg: 'bg-sky-50', detailBorder: 'border-sky-200', iconBg: 'bg-sky-100', iconColor: 'text-sky-700' },
            { base: 'bg-indigo-600', hover: 'hover:bg-indigo-700', ring: 'ring-indigo-400', text: 'text-white', detailBg: 'bg-indigo-50', detailBorder: 'border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-700' },
            { base: 'bg-violet-600', hover: 'hover:bg-violet-700', ring: 'ring-violet-400', text: 'text-white', detailBg: 'bg-violet-50', detailBorder: 'border-violet-200', iconBg: 'bg-violet-100', iconColor: 'text-violet-700' },
            { base: 'bg-teal-600', hover: 'hover:bg-teal-700', ring: 'ring-teal-400', text: 'text-white', detailBg: 'bg-teal-50', detailBorder: 'border-teal-200', iconBg: 'bg-teal-100', iconColor: 'text-teal-700' },
            { base: 'bg-emerald-600', hover: 'hover:bg-emerald-700', ring: 'ring-emerald-400', text: 'text-white', detailBg: 'bg-emerald-50', detailBorder: 'border-emerald-200', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700' },
          ];
          const clr = boxColors[bIdx % boxColors.length];

          return (
            <div key={building.id} className="relative group">
              {/* Square Color Box */}
              <div
                onClick={() => toggleBuilding(building.id)}
                className={`aspect-square rounded-2xl ${clr.base} ${clr.hover} ${isExpanded ? `ring-4 ${clr.ring} shadow-lg scale-[0.97]` : 'shadow-md hover:shadow-lg hover:scale-[1.03]'} cursor-pointer transition-all duration-200 ease-in-out relative overflow-hidden max-w-[240px] mx-auto w-full`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-2 right-2 size-20 rounded-full border-2 border-white/30" />
                  <div className="absolute bottom-2 left-2 size-14 rounded-full border-2 border-white/20" />
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-2 sm:p-3 text-center">
                  {/* Building Icon */}
                  <div className="flex items-center justify-center size-9 sm:size-11 rounded-xl bg-white/20 backdrop-blur-sm mb-1.5 sm:mb-2">
                    <Building2 className="size-4 sm:size-5 text-white" />
                  </div>
                  {/* Building Name */}
                  <h3 className="text-white font-bold text-sm sm:text-lg leading-tight line-clamp-2 mb-1 sm:mb-2">{building.name}</h3>
                  {/* Quick Stats */}
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] text-white/90">
                    <span className="flex items-center gap-0.5">
                      <Layers className="size-2.5 sm:size-3" />
                      {toBanglaNumber(building.totalFloors)}
                    </span>
                    <span className="text-white/40">|</span>
                    <span className="flex items-center gap-0.5">
                      <BedDouble className="size-2.5 sm:size-3" />
                      {toBanglaNumber(totalRooms)}
                    </span>
                    <span className="text-white/40">|</span>
                    <span className="flex items-center gap-0.5">
                      <Users className="size-2.5 sm:size-3" />
                      {toBanglaNumber(totalTenants)}
                    </span>
                  </div>
                  {/* Expand Indicator */}
                  <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2">
                    {isExpanded ? (
                      <ChevronDown className="size-3.5 sm:size-4 text-white/70" />
                    ) : (
                      <ChevronRight className="size-3.5 sm:size-4 text-white/70" />
                    )}
                  </div>
                </div>

                {/* Action Buttons (visible on hover) */}
                <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditBuildingDialog(building.id, building.name, building.capacityPerRoom); }}
                    className="flex items-center justify-center size-6 sm:size-7 rounded-lg bg-white/25 backdrop-blur-sm text-white hover:bg-white/40 transition-colors"
                  >
                    <Edit3 className="size-3 sm:size-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDeleteDialog(building.id, building.name); }}
                    className="flex items-center justify-center size-6 sm:size-7 rounded-lg bg-white/25 backdrop-blur-sm text-white hover:bg-red-400/60 transition-colors"
                  >
                    <Trash2 className="size-3 sm:size-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded Building Details Panel — same layout on mobile & desktop */}
              {isExpanded && (
                <div className={`mt-2 sm:mt-3 rounded-xl border ${clr.detailBorder} ${clr.detailBg} shadow-md overflow-hidden col-span-full max-w-full sm:max-w-none w-full`}>
                  {/* Stats Bar */}
                  <div className="grid grid-cols-4 gap-0 px-2 py-2 sm:px-3 sm:py-2.5 border-b border-white/50">
                    <div className={`flex flex-col items-center ${clr.iconBg} rounded-lg py-1 sm:py-1.5`}>
                      <span className={`text-[10px] sm:text-xs font-bold ${clr.iconColor}`}>{toBanglaNumber(building.totalFloors)}</span>
                      <span className="text-[8px] sm:text-[10px] text-muted-foreground">তলা</span>
                    </div>
                    <div className={`flex flex-col items-center ${clr.iconBg} rounded-lg py-1 sm:py-1.5`}>
                      <span className={`text-[10px] sm:text-xs font-bold ${clr.iconColor}`}>{toBanglaNumber(totalRooms)}</span>
                      <span className="text-[8px] sm:text-[10px] text-muted-foreground">রুম</span>
                    </div>
                    <div className={`flex flex-col items-center ${clr.iconBg} rounded-lg py-1 sm:py-1.5`}>
                      <span className={`text-[10px] sm:text-xs font-bold ${clr.iconColor}`}>{toBanglaNumber(totalTenants)}</span>
                      <span className="text-[8px] sm:text-[10px] text-muted-foreground">ভাড়াটে</span>
                    </div>
                    <div className={`flex flex-col items-center ${clr.iconBg} rounded-lg py-1 sm:py-1.5`}>
                      <span className={`text-[10px] sm:text-xs font-bold ${clr.iconColor}`}>{toBanglaNumber(totalEmptySeats)}</span>
                      <span className="text-[8px] sm:text-[10px] text-muted-foreground">খালি সিট</span>
                    </div>
                  </div>

                  {/* Floors & Rooms */}
                  <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
                    {building.floors?.length === 0 && (
                      <p className="text-center text-muted-foreground py-3 text-xs">
                        কোনো তলা নেই
                      </p>
                    )}
                    {building.floors?.map((floor) => (
                      <div key={floor.id} className="border border-white/60 rounded-lg p-2 sm:p-3 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-xs sm:text-sm flex items-center gap-1.5">
                            <span className={`flex items-center justify-center size-5 sm:size-6 rounded-full ${clr.iconBg} ${clr.iconColor} text-[10px] sm:text-xs font-bold`}>
                              {floor.floorNumber}
                            </span>
                            {floor.floorNumber === 1
                              ? "১ম তলা"
                              : floor.floorNumber === 2
                                ? "২য় তলা"
                                : floor.floorNumber === 3
                                  ? "৩য় তলা"
                                  : floor.floorNumber === 4
                                    ? "৪র্থ তলা"
                                    : floor.floorNumber === 5
                                      ? "৫ম তলা"
                                      : `${floor.floorNumber} তলা`}
                          </h4>
                          <Dialog open={addRoomOpen} onOpenChange={setAddRoomOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-[10px] sm:text-xs h-6 sm:h-7 px-1.5 sm:px-2"
                                onClick={() => setAddRoomFloorId(floor.id)}
                              >
                                <Plus className="size-2.5 sm:size-3" />
                                <span className="hidden sm:inline">রুম যোগ করুন</span>
                                <span className="sm:hidden">+</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>নতুন রুম যোগ করুন</DialogTitle>
                                <DialogDescription>
                                  {building.name} - {floor.floorNumber} তলায় নতুন রুম যোগ করুন
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>রুম নম্বর</Label>
                                  <Input
                                    placeholder="যেমন: ১০১"
                                    value={addRoomNumber}
                                    onChange={(e) => setAddRoomNumber(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setAddRoomOpen(false)}>বাতিল</Button>
                                <Button
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={handleCreateRoom}
                                  disabled={creatingRoom}
                                >
                                  {creatingRoom ? "যোগ হচ্ছে..." : "যোগ করুন"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {floor.rooms?.length === 0 && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground pl-6 sm:pl-8">এই তলায় কোনো রুম নেই</p>
                        )}

                        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2 pl-4 sm:pl-6">
                          {floor.rooms?.map((room) => {
                            const tenantCount = room.tenants?.length || 0;
                            const hasGuestBooking = bookedRoomIds.has(room.id);
                            let roomBg = 'bg-gradient-to-br from-white to-gray-50 border-gray-300 shadow-sm';
                            if (hasGuestBooking) {
                              roomBg = 'bg-gradient-to-br from-red-50 to-rose-100 border-red-400 shadow-red-200 shadow-sm';
                            } else if (tenantCount === 1) {
                              roomBg = 'bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-400 shadow-emerald-200 shadow-sm';
                            } else if (tenantCount >= 2) {
                              roomBg = 'bg-gradient-to-br from-orange-50 to-amber-100 border-orange-400 shadow-orange-200 shadow-sm';
                            }
                            return (
                            <div
                              key={room.id}
                              className={`relative flex flex-col items-center justify-center rounded-xl border-2 ${roomBg} py-2 sm:py-4 text-center cursor-pointer transition-all duration-150 hover:shadow-lg hover:scale-[1.05] hover:-translate-y-0.5 group/room overflow-hidden w-full`}
                              onClick={() => openRoomDetailDialog(room.id, room.roomNumber, building.name)}
                            >
                              <BedDouble className={`size-4 sm:size-5 mb-0.5 shrink-0 ${hasGuestBooking ? 'text-red-500' : tenantCount === 0 ? 'text-gray-400' : tenantCount === 1 ? 'text-emerald-600' : 'text-orange-500'}`} />
                              <span className="font-bold text-[11px] sm:text-sm text-gray-800 leading-tight break-words max-w-full">{room.roomNumber}</span>
                              {hasGuestBooking ? (
                                <span className="mt-0.5 flex items-center gap-0.5 text-[9px] sm:text-[10px] text-red-500 font-medium">
                                  <UserCheck className="size-2 sm:size-2.5" />গেস্ট বুক
                                </span>
                              ) : tenantCount === 0 ? (
                                <span className="mt-0.5 text-[9px] sm:text-[10px] text-gray-400">খালি</span>
                              ) : tenantCount === 1 ? (
                                <span className="mt-0.5 flex items-center gap-0.5 text-[9px] sm:text-[10px] text-emerald-600 font-medium">
                                  <Users className="size-2 sm:size-2.5" />{toBanglaNumber(tenantCount)} জন
                                </span>
                              ) : (
                                <span className="mt-0.5 flex items-center gap-0.5 text-[9px] sm:text-[10px] text-orange-500 font-medium">
                                  <Users className="size-2 sm:size-2.5" />{toBanglaNumber(tenantCount)} জন
                                </span>
                              )}
                              {/* Edit & Delete on hover */}
                              <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover/room:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditRoomDialog(room.id, room.roomNumber); }}
                                  className="flex items-center justify-center size-5 rounded-md bg-white shadow-sm border text-blue-500 hover:bg-blue-50 transition-colors"
                                >
                                  <Edit3 className="size-2.5" />
                                </button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center justify-center size-5 rounded-md bg-white shadow-sm border text-red-400 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 className="size-2.5" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>রুম মুছে ফেলবেন?</AlertDialogTitle>
                                      <AlertDialogDescription>রুম {room.roomNumber} স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>বাতিল</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        onClick={() => handleDeleteRoom(room.id)}
                                        disabled={deletingRoom}
                                      >
                                        মুছে ফেলুন
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Full Tenant Add Dialog — same form as TenantsTab */}
      <Dialog open={fullTenantDialogOpen} onOpenChange={(open) => { if (!open) setFullTenantDialogOpen(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>রুম বরাদ্দ করুন</DialogTitle>
            <DialogDescription>ভাড়াটে এর তথ্য এবং কমন মালামালের তালিকা দিন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Room selection cascade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>বিল্ডিং নির্বাচন</Label>
                <Select value={ftBuildingId} onValueChange={(v) => { setFtBuildingId(v); setFtFloorId(""); setFtRoomId(""); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="বিল্ডিং বেছে নিন" /></SelectTrigger>
                  <SelectContent>{buildings.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>তলা নির্বাচন</Label>
                <Select value={ftFloorId} onValueChange={(v) => { setFtFloorId(v); setFtRoomId(""); }} disabled={!ftBuildingId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="তলা বেছে নিন" /></SelectTrigger>
                  <SelectContent>{ftSelectedBuilding?.floors?.map((f) => (<SelectItem key={f.id} value={f.id}>{f.floorNumber} তলা</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>রুম নির্বাচন</Label>
                <Select value={ftRoomId} onValueChange={(v) => { setFtRoomId(v); const rm = ftSelectedFloor?.rooms?.find(r => r.id === v); if (rm) setFtRoomNumber(rm.roomNumber); }} disabled={!ftFloorId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="রুম বেছে নিন" /></SelectTrigger>
                  <SelectContent>{ftSelectedFloor?.rooms?.map((r) => (<SelectItem key={r.id} value={r.id}>{r.roomNumber}{(r.tenants?.length || 0) >= (ftSelectedBuilding?.capacityPerRoom || 1) && " (ভর্তি)"}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Tenant 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2"><Users className="size-4 text-emerald-600" /><span className="font-medium text-sm">১ম ভাড়াটে</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>নাম *</Label><Input placeholder="ভাড়াটে এর নাম" value={ftName} onChange={(e) => setFtName(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>পদবী</Label><Input placeholder="যেমন: ছাত্র, চাকরিজীবী" value={ftDesignation} onChange={(e) => setFtDesignation(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>ফোন নম্বর</Label><Input placeholder="০১XXXXXXXXX" value={ftPhone} onChange={(e) => setFtPhone(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>দপ্তর</Label><Input placeholder="দপ্তরের নাম" value={ftDept} onChange={(e) => setFtDept(e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>শুরুর তারিখ *</Label><Input type="date" value={ftStartDate} onChange={(e) => setFtStartDate(e.target.value)} /></div>
            </div>

            {/* Add 2nd tenant */}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground">একই রুমে আরেকজন ভাড়াটে থাকবেন?</span>
              <Button type="button" variant={ftShowTenant2 ? "default" : "outline"} size="sm" className={ftShowTenant2 ? "bg-emerald-600 hover:bg-emerald-700 text-white gap-1" : "gap-1"} onClick={() => setFtShowTenant2(!ftShowTenant2)}>
                <Plus className="size-3" />{ftShowTenant2 ? "২য় ভাড়াটে সরান" : "২য় ভাড়াটে যোগ"}
              </Button>
            </div>
            {ftShowTenant2 && (
              <div className="space-y-3 bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-2"><Users className="size-4 text-blue-600" /><span className="font-medium text-sm">২য় ভাড়াটে</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>নাম *</Label><Input placeholder="২য় ভাড়াটে এর নাম" value={ft2Name} onChange={(e) => setFt2Name(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>পদবী</Label><Input placeholder="যেমন: ছাত্র, চাকরিজীবী" value={ft2Designation} onChange={(e) => setFt2Designation(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>ফোন নম্বর</Label><Input placeholder="০১XXXXXXXXX" value={ft2Phone} onChange={(e) => setFt2Phone(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>দপ্তর</Label><Input placeholder="দপ্তরের নাম" value={ft2Dept} onChange={(e) => setFt2Dept(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>শুরুর তারিখ</Label><Input type="date" value={ft2StartDate} onChange={(e) => setFt2StartDate(e.target.value)} />
                  <p className="text-xs text-muted-foreground">খালি রাখলে ১ম ভাড়াটে এর তারিখ ব্যবহার হবে</p>
                </div>
              </div>
            )}

            {/* Inventory items */}
            <div className="space-y-3">
              {ftPreviousTenantName && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Package className="size-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">আগের মালামাল অটো লোড হয়েছে</p>
                      <p className="text-xs text-blue-600 mt-0.5">&quot;{ftPreviousTenantName}&quot; এর মালামালের তালিকা নিচে দেওয়া হয়েছে।</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>কমন মালামাল</Label>
                <div className="flex gap-2">
                  {ftBuildingId && (
                    <Button variant="outline" size="sm" className="gap-1 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50" disabled={ftLoadingCommonItems} onClick={async () => {
                      setFtLoadingCommonItems(true);
                      try {
                        const r = await fetch(`/api/belongings?buildingId=${ftBuildingId}`);
                        if (r.ok) {
                          const data = await r.json();
                          if (Array.isArray(data) && data.length > 0) {
                            setFtInvItems(data.map((item: { itemName: string; quantity: number }) => ({ itemName: item.itemName, quantity: String(item.quantity), condition: "আছে" })));
                            toast.success(`${toBanglaNumber(data.length)} টি কমন মালামাল লোড হয়েছে`);
                          } else { toast.error("এই বিল্ডিংয়ে কোনো কমন মালামাল নেই"); }
                        }
                      } catch { toast.error("কমন মালামাল লোড করতে সমস্যা"); } finally { setFtLoadingCommonItems(false); }
                    }}>
                      {ftLoadingCommonItems ? <div className="size-3 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /> : <Package className="size-3" />}
                      কমন মালামাল থেকে লোড
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setFtInvItems(prev => [...prev, { itemName: "", quantity: "1", condition: "আছে" }])}>
                    <Plus className="size-3" />আইটেম যোগ
                  </Button>
                </div>
              </div>
              {ftLoadingPrevItems && (
                <div className="flex items-center justify-center py-4">
                  <div className="size-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground ml-2">আগের মালামাল লোড হচ্ছে...</span>
                </div>
              )}
              {!ftLoadingPrevItems && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ftInvItems.map((item, idx) => (
                    <div key={idx} className="grid gap-2 items-end grid-cols-[1fr_80px_100px_32px_32px]">
                      {ftEditingInvIdx === idx ? (
                        <>
                          <div className="space-y-1">{idx === 0 && <span className="text-xs text-muted-foreground">মালামালের নাম</span>}<Input placeholder="নাম" value={item.itemName} onChange={(e) => setFtInvItems(prev => prev.map((it, i) => i === idx ? { ...it, itemName: e.target.value } : it))} /></div>
                          <div className="space-y-1">{idx === 0 && <span className="text-xs text-muted-foreground">পরিমাণ</span>}<Input placeholder="১" value={item.quantity} onChange={(e) => setFtInvItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it))} /></div>
                          <div className="space-y-1">{idx === 0 && <span className="text-xs text-muted-foreground">অবস্থা</span>}
                            <Select value={item.condition} onValueChange={(v) => setFtInvItems(prev => prev.map((it, i) => i === idx ? { ...it, condition: v } : it))}>
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="আছে">আছে</SelectItem><SelectItem value="নেই">নেই</SelectItem><SelectItem value="ভালো">ভালো</SelectItem><SelectItem value="খারাপ">খারাপ</SelectItem><SelectItem value="নতুন">নতুন</SelectItem><SelectItem value="পুরাতন">পুরাতন</SelectItem><SelectItem value="নস্ট">নস্ট</SelectItem><SelectItem value="ভাঙা">ভাঙা</SelectItem><SelectItem value="মাঝারি">মাঝারি</SelectItem></SelectContent>
                            </Select>
                          </div>
                          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 size-8 p-0" onClick={() => setFtEditingInvIdx(null)}><Edit3 className="size-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50 size-8 p-0" onClick={() => setFtInvItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)}><X className="size-4" /></Button>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">{idx === 0 && <span className="text-xs text-muted-foreground">মালামালের নাম</span>}<div className="flex items-center h-9 px-3 rounded-md border bg-white text-sm">{item.itemName || <span className="text-muted-foreground">নাম</span>}</div></div>
                          <div className="space-y-1">{idx === 0 && <span className="text-xs text-muted-foreground">পরিমাণ</span>}<div className="flex items-center h-9 px-3 rounded-md border bg-white text-sm">{item.quantity}</div></div>
                          <div className="space-y-1">{idx === 0 && <span className="text-xs text-muted-foreground">অবস্থা</span>}<div className="flex items-center h-9 px-3 rounded-md border bg-white">{getConditionBadge(item.condition)}</div></div>
                          <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 size-8 p-0" onClick={() => setFtEditingInvIdx(idx)}><Edit3 className="size-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50 size-8 p-0" onClick={() => setFtInvItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)}><X className="size-4" /></Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFullTenantDialogOpen(false)}>বাতিল</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleFullTenantAdd} disabled={ftAddingTenant || !ftName.trim() || !ftRoomId || !ftStartDate}>
              {ftAddingTenant ? "যোগ হচ্ছে..." : "ভাড়াটে যোগ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — Tenant Management
// ═══════════════════════════════════════════════════════════════════════════

function TenantsTab() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const { buildings } = useBuildingsContext();
  const [loading, setLoading] = useState(true);

  // Month/Year search filter
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [tenantPage, setTenantPage] = useState(1);
  const TENANT_PAGE_SIZE = 10;

  // Edit tenant dialog
  const [editTenantOpen, setEditTenantOpen] = useState(false);
  const [editTenantData, setEditTenantData] = useState<{ id: string; name: string; designation: string; phone: string; department: string; startDate: string; endDate: string }>({ id: "", name: "", designation: "", phone: "", department: "", startDate: "", endDate: "" });
  const [savingTenant, setSavingTenant] = useState(false);

  // Delete tenant dialog
  const [deleteTenantId, setDeleteTenantId] = useState("");
  const [deleteTenantName, setDeleteTenantName] = useState("");
  const [deleteTenantOpen, setDeleteTenantOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState(false);

  // Add tenant dialog
  const [addOpen, setAddOpen] = useState(false);
  // Tenant 1
  const [tName, setTName] = useState("");
  const [tDesignation, setTDesignation] = useState("");
  const [tPhone, setTPhone] = useState("");
  const [tDept, setTDept] = useState("");
  const [tStartDate, setTStartDate] = useState("");
  // Tenant 2 (optional co-tenant)
  const [t2Name, setT2Name] = useState("");
  const [t2Designation, setT2Designation] = useState("");
  const [t2Phone, setT2Phone] = useState("");
  const [t2Dept, setT2Dept] = useState("");
  const [t2StartDate, setT2StartDate] = useState("");
  const [showTenant2, setShowTenant2] = useState(false);
  // Room selection
  const [tBuildingId, setTBuildingId] = useState("");
  const [tFloorId, setTFloorId] = useState("");
  const [tRoomId, setTRoomId] = useState("");
  const [tRoomNumber, setTRoomNumber] = useState("");
  const [invItems, setInvItems] = useState<
    { itemName: string; quantity: string; condition: string }[]
  >([{ itemName: "", quantity: "1", condition: "আছে" }]);
  const [editingInvIdx, setEditingInvIdx] = useState<number | null>(null);
  const [previousTenantName, setPreviousTenantName] = useState("");
  const [loadingPrevItems, setLoadingPrevItems] = useState(false);
  const [loadingCommonItems, setLoadingCommonItems] = useState(false);

  // Add dialog sub-tabs
  const [addDialogTab, setAddDialogTab] = useState<"add" | "empty">("add");
  const [emptyBuildingId, setEmptyBuildingId] = useState("");

  // Vacate dialog
  const [vacateOpen, setVacateOpen] = useState(false);
  const [vacateTenant, setVacateTenant] = useState<Tenant | null>(null);
  const [vacateItems, setVacateItems] = useState<VacateInventoryItem[]>([]);
  const [vacateLoading, setVacateLoading] = useState(false);
  const [editingVacateIdx, setEditingVacateIdx] = useState<number | null>(null);

  // Loading states
  const [addingTenant, setAddingTenant] = useState(false);
  const [vacateLoading2, setVacateLoading2] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const tRes = await fetch("/api/tenants");
      if (!tRes.ok) throw new Error();
      const data = await tRes.json();
      setTenants(data);
      const yearSet = new Set<number>();
      data.forEach((t: Tenant) => yearSet.add(new Date(t.startDate).getFullYear()));
      setAvailableYears([...yearSet].sort((a, b) => b - a));
      window.dispatchEvent(new Event("dashboard-data-changed"));
    } catch {
      toast.error("তথ্য লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  }, []);

  const silentLoadTenants = useCallback(async () => {
    try {
      const tRes = await fetch("/api/tenants");
      if (!tRes.ok) return;
      const data = await tRes.json();
      setTenants(data);
      const yearSet = new Set<number>();
      data.forEach((t: Tenant) => yearSet.add(new Date(t.startDate).getFullYear()));
      setAvailableYears([...yearSet].sort((a, b) => b - a));
      window.dispatchEvent(new Event("dashboard-data-changed"));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedBuilding = buildings.find((b) => b.id === tBuildingId);
  const selectedFloor = selectedBuilding?.floors?.find(
    (f) => f.id === tFloorId
  );
  const selectedRoom = selectedFloor?.rooms?.find((r) => r.id === tRoomId);



  // When room is selected, set room number and load previous inventory
  useEffect(() => {
    if (selectedRoom) {
      setTRoomNumber(selectedRoom.roomNumber);
      // Auto-load previous tenant's inventory items
      loadPreviousInventory(selectedRoom.id);
    } else {
      setTRoomNumber("");
      setPreviousTenantName("");
    }
  }, [selectedRoom]);

  const loadPreviousInventory = async (roomId: string) => {
    try {
      setLoadingPrevItems(true);
      const res = await fetch(`/api/inventory?roomId=${roomId}&lastTenant=true`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      // data can be [] (no items) or { tenantName, tenantId, items: [...] }
      if (Array.isArray(data) || !data.items || data.items.length === 0) {
        // No previous items, keep empty form
        setInvItems([{ itemName: "", quantity: "1", condition: "আছে" }]);
        setPreviousTenantName("");
      } else {
        // Auto-fill inventory from previous tenant
        setInvItems(
          data.items.map((item: { itemName: string; quantity: number; condition: string }) => ({
            itemName: item.itemName,
            quantity: String(item.quantity),
            condition: item.condition,
          }))
        );
        setPreviousTenantName(data.tenantName || "");
      }
    } catch {
      setInvItems([{ itemName: "", quantity: "1", condition: "আছে" }]);
      setPreviousTenantName("");
    } finally {
      setLoadingPrevItems(false);
    }
  };

  const loadCommonBelongings = async (buildingId: string) => {
    try {
      setLoadingCommonItems(true);
      const res = await fetch(`/api/belongings?buildingId=${buildingId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setInvItems(
          data.map((item: { itemName: string; quantity: number }) => ({
            itemName: item.itemName,
            quantity: String(item.quantity),
            condition: "আছে",
          }))
        );
        setPreviousTenantName("");
        toast.success(`${toBanglaNumber(data.length)} টি কমন মালামাল লোড হয়েছে`);
      } else {
        toast.error("এই বিল্ডিংয়ে কোনো কমন মালামাল নেই। প্রথমে কমন মালামাল ট্যাবে যোগ করুন।");
      }
    } catch {
      toast.error("কমন মালামাল লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoadingCommonItems(false);
    }
  };

  const handleAddTenant = async () => {
    if (!tName.trim() || !tRoomId || !tStartDate) {
      toast.error("নাম, রুম এবং শুরুর তারিখ দিন");
      return;
    }
    if (showTenant2 && !t2Name.trim()) {
      toast.error("২য় ভাড়াটের নাম দিন");
      return;
    }
    setAddingTenant(true);
    try {
      // Create tenant 1
      const res1 = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tName.trim(),
          designation: tDesignation.trim() || null,
          phone: tPhone.trim() || null,
          department: tDept.trim() || null,
          roomId: tRoomId,
          roomNumber: tRoomNumber,
          startDate: tStartDate,
          inventoryItems: invItems.filter((i) => i.itemName.trim()),
          skipDeactivate: true,
        }),
      });
      if (!res1.ok) throw new Error();

      // If tenant 2 exists, create without deactivating tenant 1
      if (showTenant2 && t2Name.trim()) {
        const res2 = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: t2Name.trim(),
            designation: t2Designation.trim() || null,
            phone: t2Phone.trim() || null,
            department: t2Dept.trim() || null,
            roomId: tRoomId,
            roomNumber: tRoomNumber,
            startDate: t2StartDate || tStartDate,
            inventoryItems: invItems.filter((i) => i.itemName.trim()),
            skipDeactivate: true,
          }),
        });
        if (!res2.ok) throw new Error();
      }

      toast.success(showTenant2 ? "দুইজন ভাড়াটে যোগ হয়েছে" : "ভাড়াটে যোগ হয়েছে");
      resetAddForm();
      setAddOpen(false);
      silentLoadTenants();
    } catch {
      toast.error("ভাড়াটে যোগ করতে সমস্যা হয়েছে");
    } finally {
      setAddingTenant(false);
    }
  };

  const resetAddForm = () => {
    setTName("");
    setTDesignation("");
    setTPhone("");
    setTDept("");
    setTStartDate("");
    setT2Name("");
    setT2Designation("");
    setT2Phone("");
    setT2Dept("");
    setT2StartDate("");
    setShowTenant2(false);
    setTBuildingId("");
    setTFloorId("");
    setTRoomId("");
    setTRoomNumber("");
    setInvItems([{ itemName: "", quantity: "1", condition: "আছে" }]);
    setPreviousTenantName("");
    setAddDialogTab("add");
    setEmptyBuildingId("");
  };

  const addInvRow = () =>
    setInvItems((prev) => [
      ...prev,
      { itemName: "", quantity: "1", condition: "আছে" },
    ]);

  const removeInvRow = (idx: number) =>
    setInvItems((prev) => prev.filter((_, i) => i !== idx));

  const updateInvRow = (
    idx: number,
    field: "itemName" | "quantity" | "condition",
    value: string
  ) =>
    setInvItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );

  const handleVacate = async () => {
    if (!vacateTenant) return;
    try {
      setVacateLoading(true);
      const res = await fetch("/api/vacate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: vacateTenant.id,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("ভাড়াটে রুম ছেড়ে দিয়েছেন");
      setVacateOpen(false);
      setVacateTenant(null);
      silentLoadTenants();
    } catch {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setVacateLoading(false);
    }
  };

  // Vacate inventory helpers
  const updateVacateItem = (idx: number, field: keyof VacateInventoryItem, value: string | number) => {
    setVacateItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };
  const removeVacateItem = (idx: number) => {
    if (vacateItems.length <= 1) return;
    setVacateItems((prev) => prev.filter((_, i) => i !== idx));
  };
  const addVacateItem = () => {
    setVacateItems((prev) => [...prev, { itemName: "", quantity: 1, condition: "আছে" }]);
  };

  // Filter tenants by building/month/year
  const filteredTenants = React.useMemo(() => {
    if (!filterMonth && !filterYear && !filterBuilding) return tenants;
    return tenants.filter((t) => {
      const d = new Date(t.startDate);
      const mOk = !filterMonth || d.getMonth() + 1 === parseInt(filterMonth);
      const yOk = !filterYear || d.getFullYear() === parseInt(filterYear);
      const bOk = !filterBuilding || t.buildingName === filterBuilding;
      return mOk && yOk && bOk;
    });
  }, [tenants, filterMonth, filterYear, filterBuilding]);

  const totalTenantPages = Math.max(1, Math.ceil(filteredTenants.length / TENANT_PAGE_SIZE));
  const paginatedTenants = filteredTenants.slice((tenantPage - 1) * TENANT_PAGE_SIZE, tenantPage * TENANT_PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => { setTenantPage(1); }, [filterMonth, filterYear, filterBuilding]);

  // Edit tenant handlers
  const openEditTenant = (tenant: Tenant) => {
    setEditTenantData({ id: tenant.id, name: tenant.name, designation: tenant.designation || "", phone: tenant.phone || "", department: (tenant as any).department || "", startDate: tenant.startDate ? tenant.startDate.split('T')[0] : "", endDate: tenant.endDate ? tenant.endDate.split('T')[0] : "" });
    setEditTenantOpen(true);
  };

  const handleSaveTenant = async () => {
    if (!editTenantData.name.trim()) { toast.error("ভাড়াটের নাম দিন"); return; }
    setSavingTenant(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editTenantData.id, action: "updateInfo", name: editTenantData.name.trim(), designation: editTenantData.designation.trim() || null, phone: editTenantData.phone.trim() || null, department: editTenantData.department.trim() || null, startDate: editTenantData.startDate || undefined, endDate: editTenantData.endDate || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("ভাড়াটে তথ্য আপডেট হয়েছে");
      setEditTenantOpen(false);
      silentLoadTenants();
    } catch { toast.error("আপডেট করতে সমস্যা হয়েছে"); }
    finally { setSavingTenant(false); }
  };

  const openDeleteTenant = (tenant: Tenant) => {
    setDeleteTenantId(tenant.id);
    setDeleteTenantName(tenant.name);
    setDeleteTenantOpen(true);
  };

  const handleDeleteTenant = async () => {
    setDeletingTenant(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTenantId }),
      });
      if (!res.ok) throw new Error();
      toast.success("ভাড়াটে মুছে ফেলা হয়েছে");
      setDeleteTenantOpen(false);
      silentLoadTenants();
    } catch { toast.error("মুছে ফেলতে সমস্যা হয়েছে"); }
    finally { setDeletingTenant(false); }
  };

  // XLSX download
  const handleDownloadTenants = async () => {
    if (filteredTenants.length === 0) { toast.error("ডাউনলোড করার মতো কোনো ভাড়াটে নেই"); return; }
    try {
      // Fetch room-wise data to get room users info
      let roomUserMap: Record<string, string> = {};
      try {
        const bId = buildings.find((b) => b.name === filterBuilding)?.id;
        if (bId) {
          const rwRes = await fetch(`/api/room-wise-data?buildingId=${bId}`);
          if (rwRes.ok) {
            const rwData = await rwRes.json();
            if (rwData.rooms) {
              for (const room of rwData.rooms) {
                const users = room.currentRoomUsers || [];
                if (users.length > 0) {
                  roomUserMap[room.roomId || ""] = users.map((u: any) => u.name).join(", ");
                }
              }
            }
          }
        }
      } catch { /* silent */ }

      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("ভাড়াটে তালিকা");

      // Green header style
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF22C55E" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
      const thinBorder = { top: { style: "thin", color: { argb: "FFCCCCCC" } }, bottom: { style: "thin", color: { argb: "FFCCCCCC" } }, left: { style: "thin", color: { argb: "FFCCCCCC" } }, right: { style: "thin", color: { argb: "FFCCCCCC" } } };
      const centerAlign = { horizontal: "center", vertical: "middle", wrapText: false };

      // Merged title header row
      const titleRow = sheet.addRow(["রুম বরাদ্দ পাওয়া ব্যক্তিবর্গের তালিকা"]);
      sheet.mergeCells(1, 1, 1, 10);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 14, color: { argb: "FF22C55E" } };
      titleCell.alignment = centerAlign;
      titleRow.height = 36;

      const headers = ["ক্রম", "বিল্ডিং নাম", "নাম", "পদবী", "রুম নম্বর", "ফোন", "শুরুর তারিখ", "রুম ছাড়ার তারিখ", "অবস্থা", "রুম ব্যবহারকারী"];
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; cell.border = border; cell.alignment = centerAlign; });
      headerRow.height = 28;

      filteredTenants.forEach((t, idx) => {
        const roomUserName = (t.room?.id && roomUserMap[t.room.id]) || "-";
        const row = sheet.addRow([
          idx + 1,
          t.buildingName || "-",
          t.name,
          t.designation || "-",
          t.room?.roomNumber || "-",
          t.phone || "-",
          t.startDate ? new Date(t.startDate).toLocaleDateString("bn-BD") : "-",
          t.endDate ? new Date(t.endDate).toLocaleDateString("bn-BD") : "-",
          t.isActive ? "সক্রিয়" : "অসক্রিয়",
          roomUserName,
        ]);
        row.eachCell((cell) => {
          cell.border = thinBorder;
          cell.alignment = centerAlign;
        });
      });

      // Auto-fit column widths based on data content
      sheet.columns.forEach((col, i) => {
        if (i === 0) { col.width = 5; return; } // ক্রম
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (cell) => {
          const val = String(cell.value || "");
          const len = val.length;
          if (len > maxLen) maxLen = len;
        });
        const headerVal = headers[i] || "";
        const headerLen = headerVal.length;
        col.width = Math.ceil(Math.max(headerLen, maxLen) * 1.3) + 1;
      });

      // Freeze panes: freeze title row (1) and header row (2) + first column
      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 2, topLeftCell: "A3", activeCell: "A3" }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ভাড়াটে_তালিকা${filterBuilding ? `_${filterBuilding}` : ""}${filterMonth ? `_${BENGALI_MONTHS[parseInt(filterMonth) - 1]?.label}` : ""}${filterYear ? `_${filterYear}` : ""}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("XLSX ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="size-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="size-5 text-emerald-600" />
          রুম বরাদ্দ ম্যানেজমেন্ট
          <span className="text-sm font-normal text-muted-foreground ml-1 hidden sm:inline">— বরাদ্দকৃত ব্যক্তির তথ্য</span>
        </h2>
        <div className="flex items-center gap-2">
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) resetAddForm();
            }}
          >
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="size-4" />
              রুম বরাদ্দ করুন
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>রুম বরাদ্দ করুন</DialogTitle>
              <DialogDescription>
                ভাড়াটে এর তথ্য এবং কমন মালামালের তালিকা দিন
              </DialogDescription>
            </DialogHeader>

            {/* Dialog Sub-Tabs */}
            <div className="flex border-b mb-4">
              <button
                type="button"
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  addDialogTab === "add"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setAddDialogTab("add")}
              >
                <Users className="size-4 inline-block mr-1.5 -mt-0.5" />
                রুম বরাদ্দ করুন
              </button>
              <button
                type="button"
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  addDialogTab === "empty"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setAddDialogTab("empty")}
              >
                <BedDouble className="size-4 inline-block mr-1.5 -mt-0.5" />
                খালি রুম/সিট
              </button>
            </div>

            {addDialogTab === "add" && (
            <div className="space-y-4">
              {/* Room selection cascade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>বিল্ডিং নির্বাচন</Label>
                  <Select
                    value={tBuildingId}
                    onValueChange={(v) => {
                      setTBuildingId(v);
                      setTFloorId("");
                      setTRoomId("");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="বিল্ডিং বেছে নিন" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>তলা নির্বাচন</Label>
                  <Select
                    value={tFloorId}
                    onValueChange={(v) => {
                      setTFloorId(v);
                      setTRoomId("");
                    }}
                    disabled={!tBuildingId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="তলা বেছে নিন" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedBuilding?.floors?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.floorNumber} তলা
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>রুম নির্বাচন</Label>
                  <Select
                    value={tRoomId}
                    onValueChange={setTRoomId}
                    disabled={!tFloorId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="রুম বেছে নিন" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedFloor?.rooms?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.roomNumber}
                          {(r.tenants?.length || 0) >= (selectedBuilding?.capacityPerRoom || 1) && " (ভর্তি)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tenant 1 details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-emerald-600" />
                  <span className="font-medium text-sm">১ম ভাড়াটে</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>নাম *</Label>
                    <Input
                      placeholder="ভাড়াটে এর নাম"
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>পদবী</Label>
                    <Input
                      placeholder="যেমন: ছাত্র, চাকরিজীবী"
                      value={tDesignation}
                      onChange={(e) => setTDesignation(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ফোন নম্বর</Label>
                    <Input
                      placeholder="০১XXXXXXXXX"
                      value={tPhone}
                      onChange={(e) => setTPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>দপ্তর</Label>
                    <Input
                      placeholder="দপ্তরের নাম"
                      value={tDept}
                      onChange={(e) => setTDept(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>শুরুর তারিখ *</Label>
                  <Input
                    type="date"
                    value={tStartDate}
                    onChange={(e) => setTStartDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Add 2nd tenant toggle */}
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">একই রুমে আরেকজন ভাড়াটে থাকবেন?</span>
                <Button
                  type="button"
                  variant={showTenant2 ? "default" : "outline"}
                  size="sm"
                  className={showTenant2 ? "bg-emerald-600 hover:bg-emerald-700 text-white gap-1" : "gap-1"}
                  onClick={() => setShowTenant2(!showTenant2)}
                >
                  <Plus className="size-3" />
                  {showTenant2 ? "২য় ভাড়াটে সরান" : "২য় ভাড়াটে যোগ"}
                </Button>
              </div>

              {/* Tenant 2 details */}
              {showTenant2 && (
                <div className="space-y-3 bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-blue-600" />
                    <span className="font-medium text-sm">২য় ভাড়াটে</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>নাম *</Label>
                      <Input
                        placeholder="২য় ভাড়াটে এর নাম"
                        value={t2Name}
                        onChange={(e) => setT2Name(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>পদবী</Label>
                      <Input
                        placeholder="যেমন: ছাত্র, চাকরিজীবী"
                        value={t2Designation}
                        onChange={(e) => setT2Designation(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>ফোন নম্বর</Label>
                      <Input
                        placeholder="০১XXXXXXXXX"
                        value={t2Phone}
                        onChange={(e) => setT2Phone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>দপ্তর</Label>
                      <Input
                        placeholder="দপ্তরের নাম"
                        value={t2Dept}
                        onChange={(e) => setT2Dept(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>শুরুর তারিখ</Label>
                    <Input
                      type="date"
                      value={t2StartDate}
                      onChange={(e) => setT2StartDate(e.target.value)}
                      placeholder="১ম ভাড়াটে এর তারিখ ব্যবহার হবে"
                    />
                    <p className="text-xs text-muted-foreground">
                      খালি রাখলে ১ম ভাড়াটে এর তারিখ ব্যবহার হবে
                    </p>
                  </div>
                </div>
              )}

              {/* Inventory items */}
              <div className="space-y-3">
                {/* Auto-load banner */}
                {previousTenantName && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Package className="size-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          আগের মালামাল অটো লোড হয়েছে
                        </p>
                        <p className="text-xs text-blue-600 mt-0.5">
                          &quot;{previousTenantName}&quot; এর মালামালের তালিকা নিচে
                          দেওয়া হয়েছে। প্রয়োজনে এডিট, মুছুন বা নতুন যোগ করুন।
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label>কমন মালামাল</Label>
                  <div className="flex gap-2">
                    {tBuildingId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => loadCommonBelongings(tBuildingId)}
                        disabled={loadingCommonItems}
                      >
                        {loadingCommonItems ? <div className="size-3 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /> : <Package className="size-3" />}
                        কমন মালামাল থেকে লোড করুন
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={addInvRow}
                    >
                      <Plus className="size-3" />
                      আইটেম যোগ
                    </Button>
                  </div>
                </div>

                {loadingPrevItems && (
                  <div className="flex items-center justify-center py-4">
                    <div className="size-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground ml-2">
                      আগের মালামাল লোড হচ্ছে...
                    </span>
                  </div>
                )}

                {!loadingPrevItems && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {invItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`grid gap-2 items-end ${editingInvIdx === idx ? "grid-cols-[1fr_80px_100px_32px_32px]" : "grid-cols-[1fr_80px_100px_32px_32px]"}`}
                    >
                      {editingInvIdx === idx ? (
                        <>
                          <div className="space-y-1">
                            {idx === 0 && (
                              <span className="text-xs text-muted-foreground">
                                মালামালের নাম
                              </span>
                            )}
                            <Input
                              placeholder="নাম"
                              value={item.itemName}
                              onChange={(e) =>
                                updateInvRow(idx, "itemName", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            {idx === 0 && (
                              <span className="text-xs text-muted-foreground">
                                পরিমাণ
                              </span>
                            )}
                            <Input
                              placeholder="১"
                              value={item.quantity}
                              onChange={(e) =>
                                updateInvRow(idx, "quantity", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            {idx === 0 && (
                              <span className="text-xs text-muted-foreground">
                                অবস্থা
                              </span>
                            )}
                            <Select
                              value={item.condition}
                              onValueChange={(v) =>
                                updateInvRow(idx, "condition", v)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ভালো">ভালো</SelectItem>
                                <SelectItem value="মাঝারি">মাঝারি</SelectItem>
                                <SelectItem value="খারাপ">খারাপ</SelectItem>
                                <SelectItem value="নস্ট">নস্ট</SelectItem>
                                <SelectItem value="আছে">আছে</SelectItem>
                                <SelectItem value="নেই">নেই</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 size-8 p-0"
                            onClick={() => setEditingInvIdx(null)}
                          >
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 size-8 p-0"
                            onClick={() => removeInvRow(idx)}
                            disabled={invItems.length <= 1}
                          >
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            {idx === 0 && (
                              <span className="text-xs text-muted-foreground">
                                মালামালের নাম
                              </span>
                            )}
                            <div className="flex items-center h-9 px-3 rounded-md border bg-white text-sm">
                              {item.itemName || <span className="text-muted-foreground">নাম</span>}
                            </div>
                          </div>
                          <div className="space-y-1">
                            {idx === 0 && (
                              <span className="text-xs text-muted-foreground">
                                পরিমাণ
                              </span>
                            )}
                            <div className="flex items-center h-9 px-3 rounded-md border bg-white text-sm">
                              {item.quantity}
                            </div>
                          </div>
                          <div className="space-y-1">
                            {idx === 0 && (
                              <span className="text-xs text-muted-foreground">
                                অবস্থা
                              </span>
                            )}
                            <div className="flex items-center h-9 px-3 rounded-md border bg-white">
                              {getConditionBadge(item.condition)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 size-8 p-0"
                            onClick={() => setEditingInvIdx(idx)}
                          >
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 size-8 p-0"
                            onClick={() => removeInvRow(idx)}
                            disabled={invItems.length <= 1}
                          >
                            <X className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
            )}

            {addDialogTab === "empty" && (
            <div className="space-y-4">
              {/* Building selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">বিল্ডিং নির্বাচন করুন</Label>
                <Select value={emptyBuildingId} onValueChange={(v) => {
                  setEmptyBuildingId(v);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="বিল্ডিং বেছে নিন" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Floor-wise empty rooms list */}
              {emptyBuildingId && (() => {
                const bldg = buildings.find(b => b.id === emptyBuildingId);
                if (!bldg || !bldg.floors?.length) return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="size-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">এই বিল্ডিংয়ে কোন তলা নেই</p>
                  </div>
                );

                const capacity = bldg.capacityPerRoom || 1;

                // Compute stats
                let totalRooms = 0;
                let totalEmptySeats = 0;
                let totalFullRooms = 0;
                bldg.floors.forEach(floor => {
                  (floor.rooms || []).forEach(room => {
                    totalRooms++;
                    const active = (room.tenants?.filter(t => t.isActive) || []).length;
                    const empty = capacity - active;
                    if (empty > 0) totalEmptySeats += empty;
                    else totalFullRooms++;
                  });
                });

                const sortedFloors = [...bldg.floors].sort((a, b) => b.floorNumber - a.floorNumber);

                return (
                  <div className="space-y-3">
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-lg font-bold text-blue-700">{toBanglaNumber(totalRooms)}</p>
                        <p className="text-[10px] text-blue-500 mt-0.5">মোট রুম</p>
                      </div>
                      <div className="text-center p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-lg font-bold text-amber-600">{toBanglaNumber(totalEmptySeats)}</p>
                        <p className="text-[10px] text-amber-500 mt-0.5">খালি সিট</p>
                      </div>
                      <div className="text-center p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-lg font-bold text-emerald-600">{toBanglaNumber(totalFullRooms)}</p>
                        <p className="text-[10px] text-emerald-500 mt-0.5">পূর্ণ রুম</p>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-3 px-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded bg-amber-400" /> খালি সিট</span>
                      <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded bg-emerald-500" /> ভর্তি সিট</span>
                      {capacity > 1 && <span className="flex items-center gap-1"><BedDouble className="size-3 text-blue-500" /> প্রতি রুমে {toBanglaNumber(capacity)} সিট</span>}
                    </div>

                    {/* Visual Floor Plan */}
                    <div className="space-y-2">
                      {sortedFloors.map(floor => {
                        const floorRooms = floor.rooms || [];
                        const roomsWithStatus = floorRooms.map(room => {
                          const activeTenants = room.tenants?.filter(t => t.isActive) || [];
                          const emptySeats = capacity - activeTenants.length;
                          return { ...room, activeTenants, emptySeats, isFull: emptySeats <= 0 };
                        });
                        const emptyRoomCount = roomsWithStatus.filter(r => r.emptySeats > 0).length;
                        const hasEmpty = emptyRoomCount > 0;
                        const totalSeats = floorRooms.length * capacity;
                        const emptySeatCount = roomsWithStatus.reduce((sum, r) => sum + r.emptySeats, 0);

                        return (
                          <div key={floor.id} className={`${hasEmpty ? "bg-gradient-to-r from-amber-50/80 to-transparent border-amber-200" : "bg-gray-50/50 border-gray-200"} border rounded-xl overflow-hidden`}>
                            {/* Floor header */}
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl ${hasEmpty ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gradient-to-r from-slate-500 to-slate-600"}`}>
                              <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-md text-white ${hasEmpty ? "bg-white/20" : "bg-white/15"}`}>
                                {toBanglaNumber(floor.floorNumber)}
                              </span>
                              <span className="text-sm font-semibold text-white tracking-wide">
                                {toBanglaNumber(floor.floorNumber)} তলা
                              </span>
                              <div className="ml-auto flex items-center gap-1.5">
                                {hasEmpty && (
                                  <span className="text-[10px] font-bold text-indigo-900 bg-yellow-300 px-2 py-0.5 rounded-full shadow-sm">
                                    খালি {toBanglaNumber(emptySeatCount)}
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-white bg-white/15 px-2 py-0.5 rounded-full">
                                  সিট {toBanglaNumber(totalSeats)}
                                </span>
                              </div>
                            </div>

                            {/* Room grid */}
                            <div className="p-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${capacity > 1 ? "155px" : "130px"}, 1fr))` }}>
                              {roomsWithStatus.map(room => {
                                if (room.isFull) {
                                  return (
                                    <div key={room.id} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 opacity-60">
                                      <div className="shrink-0">
                                        <div className="flex gap-0.5">
                                          {Array.from({ length: capacity }).map((_, i) => (
                                            <div key={i} className="size-2.5 bg-emerald-500 rounded-full" />
                                          ))}
                                        </div>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-emerald-700 truncate">{room.roomNumber}</p>
                                        <p className="text-[10px] text-emerald-500 truncate">{room.activeTenants.map(t => t.name).join(", ")}</p>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <button
                                    key={room.id}
                                    type="button"
                                    className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
                                    onClick={() => {
                                      setTBuildingId(bldg.id);
                                      setTFloorId(floor.id);
                                      setTRoomId(room.id);
                                      setAddDialogTab("add");
                                    }}
                                  >
                                    {/* Seat indicators */}
                                    <div className="flex gap-1 shrink-0">
                                      {Array.from({ length: capacity }).map((_, i) => (
                                        <div
                                          key={i}
                                          className={`size-4 rounded-full flex items-center justify-center ${room.activeTenants[i] ? "bg-emerald-500" : "border-2 border-dashed border-amber-400 bg-amber-100"}`}
                                          title={room.activeTenants[i]?.name || `সিট ${toBanglaNumber(i + 1)} - খালি`}
                                        >
                                          {!room.activeTenants[i] && <div className="size-1.5 bg-amber-500 rounded-full" />}
                                        </div>
                                      ))}
                                    </div>

                                    <div className="min-w-0 text-left">
                                      <p className="text-xs font-bold text-amber-800 truncate">{room.roomNumber}</p>
                                      {room.activeTenants.length > 0 && (
                                        <p className="text-[10px] text-gray-500 truncate">{room.activeTenants.map(t => t.name).join(", ")}</p>
                                      )}
                                      {room.activeTenants.length === 0 && (
                                        <p className="text-[10px] text-amber-500 font-medium">সম্পূর্ণ খালি</p>
                                      )}
                                    </div>
                                    <Plus className="size-3 text-amber-400 group-hover:text-amber-600 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Click hint */}
                    <p className="text-center text-[10px] text-muted-foreground mt-1">
                      খালি রুমে ক্লিক করুন — ভাড়াটে যোগ করুন
                    </p>
                  </div>
                );
              })()}

              {!emptyBuildingId && (
                <div className="text-center py-10 text-muted-foreground">
                  <BedDouble className="size-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">বিল্ডিং নির্বাচন করলে খালি রুম ও সিটের তালিকা দেখা যাবে</p>
                </div>
              )}
            </div>
            )}

            {addDialogTab === "add" && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                  resetAddForm();
                }}
              >
                বাতিল
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleAddTenant}
                disabled={addingTenant}
              >
                {addingTenant ? "যোগ হচ্ছে..." : "যোগ করুন"}
              </Button>
            </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search filters */}
      <Card><CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">সার্চ:</span>
          <Select value={filterBuilding || "__all"} onValueChange={(v) => setFilterBuilding(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="বিল্ডিং বেছে নিন" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">সব বিল্ডিং</SelectItem>
              {buildings.map((b) => (<SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={(v) => setFilterMonth(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="মাস বেছে নিন" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">সব মাস</SelectItem>
              {BENGALI_MONTHS.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterYear || "__all"} onValueChange={(v) => setFilterYear(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="বছর" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">সব বছর</SelectItem>
              {availableYears.map((y) => (<SelectItem key={y} value={String(y)}>{toBanglaNumber(y)}</SelectItem>))}
            </SelectContent>
          </Select>
          {(filterBuilding || filterMonth || filterYear) && (<Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setFilterBuilding(""); setFilterMonth(""); setFilterYear(""); }}><X className="size-3 mr-1" />মুছুন</Button>)}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={handleDownloadTenants}>
            <Download className="size-3" />
            XLSX ডাউনলোড
          </Button>
          <span className="text-xs text-muted-foreground">মোট: {toBanglaNumber(filteredTenants.length)} জন</span>
        </div>
      </CardContent></Card>

      {filteredTenants.length === 0 && !loading && (
        <Alert>
          <Users className="size-4" />
          <AlertDescription>
            কোনো ভাড়াটে নেই। নতুন ভাড়াটে যোগ করুন।
          </AlertDescription>
        </Alert>
      )}

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-emerald-50/50">
                <TableHead>নাম</TableHead>
                <TableHead>বিল্ডিং নাম</TableHead>
                <TableHead>পদবী</TableHead>
                <TableHead>রুম নম্বর</TableHead>
                <TableHead>ফোন</TableHead>
                <TableHead>শুরুর তারিখ</TableHead>
                <TableHead>অবস্থা</TableHead>
                <TableHead className="text-center">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">{tenant.buildingName || "-"}</Badge></TableCell>
                  <TableCell>{tenant.designation || "-"}</TableCell>
                  <TableCell>{tenant.room?.roomNumber}</TableCell>
                  <TableCell>{tenant.phone || "-"}</TableCell>
                  <TableCell>{formatDate(tenant.startDate)}</TableCell>
                  <TableCell>
                    {tenant.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300">
                        সক্রিয়
                      </Badge>
                    ) : (
                      <Badge variant="secondary">অসক্রিয়</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" className="size-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditTenant(tenant)} title="এডিট করুন">
                        <Edit3 className="size-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => openDeleteTenant(tenant)} title="মুছে ফেলুন">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>&quot;{deleteTenantName}&quot; কে মুছে ফেলবেন?</AlertDialogTitle>
                            <AlertDialogDescription>এই ভাড়াটের তথ্য স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>বাতিল</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteTenant} disabled={deletingTenant}>
                              {deletingTenant ? "মুছে ফেলা হচ্ছে..." : "মুছে ফেলুন"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {tenant.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50 text-[11px]"
                          disabled={vacateLoading2}
                          onClick={async () => {
                            setVacateLoading2(true);
                            try {
                              setVacateTenant(tenant);
                              const res = await fetch(`/api/inventory?tenantId=${tenant.id}`);
                              if (res.ok) {
                                const items = await res.json();
                                if (Array.isArray(items) && items.length > 0) {
                                  setVacateItems(items.map((inv: any) => ({
                                    id: inv.id, itemName: inv.itemName, quantity: inv.quantity, condition: inv.condition, note: inv.note,
                                  })));
                                } else {
                                  setVacateItems([{ itemName: "", quantity: 1, condition: "আছে" }]);
                                }
                              } else {
                                setVacateItems([{ itemName: "", quantity: 1, condition: "আছে" }]);
                              }
                              setEditingVacateIdx(null);
                              setVacateOpen(true);
                            } catch {
                              setVacateItems([{ itemName: "", quantity: 1, condition: "আছে" }]);
                            } finally {
                              setVacateLoading2(false);
                            }
                          }}
                        >
                          বরাদ্দ বাতিল করুন
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {paginatedTenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base">{tenant.name}</p>
                  {tenant.designation && <p className="text-xs text-blue-600 mt-0.5">{tenant.designation}</p>}
                  <p className="text-xs text-purple-600 font-medium mt-1">
                    <Building2 className="size-3 inline-block -mt-0.5 mr-1" />
                    {tenant.buildingName || "-"}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <BedDouble className="size-3" />
                    <span>রুম: {tenant.room?.roomNumber}</span>
                  </div>
                  {tenant.phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <Phone className="size-3" />
                      <span>{tenant.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <Calendar className="size-3" />
                    <span>শুরু: {formatDate(tenant.startDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="size-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditTenant(tenant)}>
                    <Edit3 className="size-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="size-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => openDeleteTenant(tenant)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>&quot;{deleteTenantName}&quot; কে মুছে ফেলবেন?</AlertDialogTitle>
                        <AlertDialogDescription>এই ভাড়াটের তথ্য স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>বাতিল</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteTenant} disabled={deletingTenant}>
                          {deletingTenant ? "মুছে ফেলা হচ্ছে..." : "মুছে ফেলুন"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {tenant.isActive ? (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300">সক্রিয়</Badge>
                ) : (
                  <Badge variant="secondary">অসক্রিয়</Badge>
                )}
                {tenant.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50 text-[11px] flex-1"
                    disabled={vacateLoading2}
                    onClick={async () => {
                      setVacateLoading2(true);
                      try {
                        setVacateTenant(tenant);
                        const res = await fetch(`/api/inventory?tenantId=${tenant.id}`);
                        if (res.ok) {
                          const items = await res.json();
                          if (Array.isArray(items) && items.length > 0) {
                            setVacateItems(items.map((inv: any) => ({
                              id: inv.id, itemName: inv.itemName, quantity: inv.quantity, condition: inv.condition, note: inv.note,
                            })));
                          } else {
                            setVacateItems([{ itemName: "", quantity: 1, condition: "আছে" }]);
                          }
                        } else {
                          setVacateItems([{ itemName: "", quantity: 1, condition: "আছে" }]);
                        }
                        setEditingVacateIdx(null);
                        setVacateOpen(true);
                      } catch {
                        setVacateItems([{ itemName: "", quantity: 1, condition: "আছে" }]);
                      } finally {
                        setVacateLoading2(false);
                      }
                    }}
                  >
                    বরাদ্দ বাতিল করুন
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalTenantPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-3">
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={tenantPage <= 1} onClick={() => setTenantPage(tenantPage - 1)}>আগে</Button>
          {Array.from({ length: totalTenantPages }, (_, i) => i + 1).map((p) => (
            <Button key={p} variant={p === tenantPage ? "default" : "outline"} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => setTenantPage(p)}>{p}</Button>
          ))}
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={tenantPage >= totalTenantPages} onClick={() => setTenantPage(tenantPage + 1)}>পরে</Button>
        </div>
      )}

      {/* Edit Tenant Dialog */}
      <Dialog open={editTenantOpen} onOpenChange={setEditTenantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Edit3 className="size-5" />
              ভাড়াটে তথ্য এডিট করুন
            </DialogTitle>
            <DialogDescription>
              ভাড়াটের নাম, পদবী, ফোন, দপ্তর বা শুরুর তারিখ পরিবর্তন করুন
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editTName">নাম</Label>
              <Input id="editTName" value={editTenantData.name} onChange={(e) => setEditTenantData(prev => ({ ...prev, name: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") handleSaveTenant(); }} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTDesig">পদবী</Label>
              <Input id="editTDesig" value={editTenantData.designation} onChange={(e) => setEditTenantData(prev => ({ ...prev, designation: e.target.value }))} placeholder="পদবী" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTPhone">ফোন নম্বর</Label>
              <Input id="editTPhone" value={editTenantData.phone} onChange={(e) => setEditTenantData(prev => ({ ...prev, phone: e.target.value }))} placeholder="ফোন নম্বর" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTDept">দপ্তর</Label>
              <Input id="editTDept" value={editTenantData.department} onChange={(e) => setEditTenantData(prev => ({ ...prev, department: e.target.value }))} placeholder="দপ্তরের নাম" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTStartDate">শুরুর তারিখ</Label>
              <Input id="editTStartDate" type="date" value={editTenantData.startDate} onChange={(e) => setEditTenantData(prev => ({ ...prev, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTDate">শেষ তারিখ</Label>
              <Input id="endTDate" type="date" value={editTenantData.endDate || ""} onChange={(e) => setEditTenantData(prev => ({ ...prev, endDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenantOpen(false)}>বাতিল</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveTenant} disabled={savingTenant || !editTenantData.name.trim()}>
              {savingTenant ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vacate Dialog */}
      <Dialog open={vacateOpen} onOpenChange={setVacateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ভাড়াটে রুম ছেড়ে দিন</DialogTitle>
            <DialogDescription>
              {vacateTenant?.name} রুম ছেড়ে দিচ্ছেন। মালামালের অবস্থা যাচাই করুন।
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">রুম নম্বর</p>
                <p className="font-semibold">
                  {vacateTenant?.room?.roomNumber}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">ভাড়াটে</p>
                <p className="font-semibold">
                  {vacateTenant?.name}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>মালামালের তালিকা</Label>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addVacateItem}>
                  <Plus className="size-3" />আইটেম যোগ
                </Button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {vacateItems.map((item, idx) => (
                  <div key={idx} className={`rounded-lg border p-2 ${editingVacateIdx === idx ? "bg-emerald-50/50 border-emerald-200" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      {editingVacateIdx === idx ? (
                        <>
                          <div className="flex-1 grid grid-cols-[1fr_70px_100px_100px] gap-2 items-end">
                            {idx === 0 && (
                              <div className="col-span-4 grid grid-cols-[1fr_70px_100px_100px] gap-2">
                                <span className="text-[10px] text-muted-foreground">নাম</span>
                                <span className="text-[10px] text-muted-foreground">পরিমাণ</span>
                                <span className="text-[10px] text-muted-foreground">অবস্থা</span>
                                <span className="text-[10px] text-muted-foreground">নোট</span>
                              </div>
                            )}
                            <Input className="h-8 text-xs" value={item.itemName} onChange={(e) => updateVacateItem(idx, "itemName", e.target.value)} placeholder="মালামালের নাম" />
                            <Input className="h-8 text-xs" type="number" min={0} value={item.quantity} onChange={(e) => updateVacateItem(idx, "quantity", e.target.value === '' ? '' : Number(e.target.value))} />
                            <Select value={item.condition} onValueChange={(v) => updateVacateItem(idx, "condition", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ভালো">ভালো</SelectItem>
                                <SelectItem value="মাঝারি">মাঝারি</SelectItem>
                                <SelectItem value="খারাপ">খারাপ</SelectItem>
                                <SelectItem value="নস্ট">নস্ট</SelectItem>
                                <SelectItem value="আছে">আছে</SelectItem>
                                <SelectItem value="নেই">নেই</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input className="h-8 text-xs" value={item.note || ""} onChange={(e) => updateVacateItem(idx, "note", e.target.value)} placeholder="নোট" />
                          </div>
                          <Button variant="ghost" size="sm" className="size-7 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 shrink-0" onClick={() => setEditingVacateIdx(null)}>
                            <Edit3 className="size-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 flex items-center gap-3 text-sm min-w-0">
                            <span className="font-medium truncate min-w-0 flex-1">{item.itemName || "—"}</span>
                            <span className="text-xs text-muted-foreground shrink-0">×{item.quantity}</span>
                            <span className="shrink-0">{getConditionBadge(item.condition)}</span>
                            {item.note && <span className="text-[10px] text-muted-foreground truncate shrink-0 hidden sm:inline">({item.note})</span>}
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            <Button variant="ghost" size="sm" className="size-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => setEditingVacateIdx(idx)}>
                              <Edit3 className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="size-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeVacateItem(idx)} disabled={vacateItems.length <= 1}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVacateOpen(false)}>
              বাতিল
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleVacate}
              disabled={vacateLoading}
            >
              {vacateLoading ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              নিশ্চিত করুন — রুম ছেড়ে দিন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — Trouble Reports (Pending/Solved tabs + Month/Year search + Pagination)
// ═══════════════════════════════════════════════════════════════════════════

function TroublesTab() {
  const [reports, setReports] = useState<TroubleReport[]>([]);
  const { buildings } = useBuildingsContext();
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"pending" | "solved">("pending");
  const [searchMonth, setSearchMonth] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [solvedPage, setSolvedPage] = useState(1);
  const PAGE_SIZE = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [crBuildingId, setCrBuildingId] = useState("");
  const [crFloorId, setCrFloorId] = useState("");
  const [crRoomId, setCrRoomId] = useState("");
  const [crRoomNumber, setCrRoomNumber] = useState("");
  const [crDescription, setCrDescription] = useState("");
  const [crReportedBy, setCrReportedBy] = useState("");

  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveReport, setResolveReport] = useState<TroubleReport | null>(null);
  const [rsNote, setRsNote] = useState("");
  const [rsResolvedBy, setRsResolvedBy] = useState("");
  const [rsNewItems, setRsNewItems] = useState<
    { itemName: string; quantity: string; condition: string; note: string }[]
  >([]);

  // Loading states
  const [creatingTrouble, setCreatingTrouble] = useState(false);
  const [resolvingTrouble, setResolvingTrouble] = useState(false);
  const [deletingTrouble, setDeletingTrouble] = useState(false);

  // Edit trouble dialog
  const [editTroubleOpen, setEditTroubleOpen] = useState(false);
  const [editTroubleData, setEditTroubleData] = useState<{ id: string; description: string; reportedBy: string }>({ id: "", description: "", reportedBy: "" });
  const [savingTrouble, setSavingTrouble] = useState(false);

  // Delete trouble dialog
  const [deleteTroubleId, setDeleteTroubleId] = useState("");
  const [deleteTroubleDesc, setDeleteTroubleDesc] = useState("");
  const [deleteTroubleOpen, setDeleteTroubleOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const tRes = await fetch("/api/troubles");
      if (!tRes.ok) throw new Error();
      const allReports: TroubleReport[] = await tRes.json();
      setReports(allReports);
      const years = [...new Set(allReports.map((r) => new Date(r.reportedAt).getFullYear()))].sort((a, b) => b - a);
      setAvailableYears(years);
    } catch {
      toast.error("তথ্য লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  }, []);

  const silentLoadTroubles = useCallback(async () => {
    try {
      const tRes = await fetch("/api/troubles");
      if (!tRes.ok) return;
      const allReports: TroubleReport[] = await tRes.json();
      setReports(allReports);
      const years = [...new Set(allReports.map((r) => new Date(r.reportedAt).getFullYear()))].sort((a, b) => b - a);
      setAvailableYears(years);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getFilteredReports = useCallback(() => {
    if (!searchMonth && !searchYear) return reports;
    return reports.filter((r) => {
      const d = new Date(r.reportedAt);
      const mOk = !searchMonth || d.getMonth() + 1 === parseInt(searchMonth);
      const yOk = !searchYear || d.getFullYear() === parseInt(searchYear);
      return mOk && yOk;
    });
  }, [reports, searchMonth, searchYear]);

  const pendingReports = getFilteredReports().filter((r) => r.status !== "সমাধান হয়েছে");
  const solvedReports = getFilteredReports().filter((r) => r.status === "সমাধান হয়েছে");

  const totalPendingPages = Math.max(1, Math.ceil(pendingReports.length / PAGE_SIZE));
  const totalSolvedPages = Math.max(1, Math.ceil(solvedReports.length / PAGE_SIZE));
  const paginatedPending = pendingReports.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE);
  const paginatedSolved = solvedReports.slice((solvedPage - 1) * PAGE_SIZE, solvedPage * PAGE_SIZE);

  const crBuilding = buildings.find((b) => b.id === crBuildingId);
  const crFloor = crBuilding?.floors?.find((f) => f.id === crFloorId);
  const crRoom = crFloor?.rooms?.find((r) => r.id === crRoomId);

  useEffect(() => { if (crRoom) setCrRoomNumber(crRoom.roomNumber); else setCrRoomNumber(""); }, [crRoom]);
  useEffect(() => { setPendingPage(1); setSolvedPage(1); }, [searchMonth, searchYear]);

  const handleCreate = async () => {
    if (!crRoomId || !crDescription.trim() || !crReportedBy.trim()) { toast.error("রুম, বিবরণ ও প্রতিবেদকের নাম দিন"); return; }
    setCreatingTrouble(true);
    try {
      const res = await fetch("/api/troubles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomNumber: crRoomNumber, roomId: crRoomId, description: crDescription.trim(), reportedBy: crReportedBy.trim() }) });
      if (!res.ok) throw new Error();
      toast.success("ট্রাবল রিপোর্ট তৈরি হয়েছে");
      setCreateOpen(false); setCrBuildingId(""); setCrFloorId(""); setCrRoomId(""); setCrRoomNumber(""); setCrDescription(""); setCrReportedBy("");
      silentLoadTroubles();
    } catch { toast.error("ট্রাবল রিপোর্ট তৈরি করতে সমস্যা হয়েছে"); } finally { setCreatingTrouble(false); }
  };

  const handleResolve = async () => {
    if (!resolveReport || !rsResolvedBy.trim()) { toast.error("সমাধানকারীর নাম দিন"); return; }
    setResolvingTrouble(true);
    try {
      const res = await fetch("/api/troubles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: resolveReport.id, resolutionNote: rsNote.trim() || null, resolvedBy: rsResolvedBy.trim(), newItems: rsNewItems.filter((i) => i.itemName.trim()) }) });
      if (!res.ok) throw new Error();
      toast.success("সমস্যা সমাধান হয়েছে");
      setResolveOpen(false); setResolveReport(null); setRsNote(""); setRsResolvedBy(""); setRsNewItems([]);
      silentLoadTroubles();
    } catch { toast.error("সমস্যা সমাধান করতে সমস্যা হয়েছে"); } finally { setResolvingTrouble(false); }
  };

  const addRsItem = useCallback(() => setRsNewItems((prev) => [...prev, { itemName: "", quantity: "1", condition: "আছে", note: "" }]), []);
  const removeRsItem = useCallback((idx: number) => setRsNewItems((prev) => prev.filter((_, i) => i !== idx)), []);
  const updateRsItem = useCallback((idx: number, field: string, value: string) => setRsNewItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))), []);

  // Edit trouble handler
  const openEditTrouble = (report: TroubleReport) => {
    setEditTroubleData({ id: report.id, description: report.description, reportedBy: report.reportedBy });
    setEditTroubleOpen(true);
  };
  const handleSaveTrouble = async () => {
    if (!editTroubleData.description.trim()) { toast.error("বিবরণ দিন"); return; }
    setSavingTrouble(true);
    try {
      const res = await fetch("/api/troubles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editTroubleData.id, description: editTroubleData.description.trim(), reportedBy: editTroubleData.reportedBy.trim() }) });
      if (!res.ok) throw new Error();
      toast.success("রিপোর্ট আপডেট হয়েছে");
      setEditTroubleOpen(false);
      silentLoadTroubles();
    } catch { toast.error("আপডেট করতে সমস্যা হয়েছে"); } finally { setSavingTrouble(false); }
  };

  // Delete trouble handler
  const openDeleteTrouble = (report: TroubleReport) => {
    setDeleteTroubleId(report.id);
    setDeleteTroubleDesc(report.description);
    setDeleteTroubleOpen(true);
  };
  const handleDeleteTrouble = async () => {
    setDeletingTrouble(true);
    try {
      const res = await fetch("/api/troubles", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTroubleId }) });
      if (!res.ok) throw new Error();
      toast.success("রিপোর্ট মুছে ফেলা হয়েছে");
      setDeleteTroubleOpen(false);
      silentLoadTroubles();
    } catch { toast.error("মুছে ফেলতে সমস্যা হয়েছে"); } finally { setDeletingTrouble(false); }
  };

  // XLSX download for trouble reports
  const handleDownloadTroubles = async () => {
    const filtered = getFilteredReports();
    if (filtered.length === 0) { toast.error("ডাউনলোড করার মতো কোনো রিপোর্ট নেই"); return; }
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("ট্রাবল রিপোর্ট");
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF22C55E" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
      const headers = ["ক্রম", "রুম", "বিবরণ", "প্রতিবেদক", "রিপোর্টের তারিখ", "অবস্থা", "সমাধানকারী", "সমাধানের তারিখ", "সমাধানের বিবরণ"];
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; cell.border = border; cell.alignment = { horizontal: "center", vertical: "middle" }; });
      headerRow.height = 28;
      filtered.forEach((r, idx) => {
        const row = sheet.addRow([idx + 1, r.roomNumber, r.description, r.reportedBy, r.reportedAt ? new Date(r.reportedAt).toLocaleDateString("bn-BD") : "-", r.status, r.resolvedBy || "-", r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString("bn-BD") : "-", r.resolutionNote || "-"]);
        row.eachCell((cell, colNumber) => { cell.border = border; cell.alignment = { horizontal: colNumber <= 1 ? "center" : "left", vertical: "middle" }; });
      });
      sheet.columns.forEach((col, i) => {
        if (i === 0) { col.width = 5; return; }
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (cell) => {
          const val = String(cell.value || "");
          if (val.length > maxLen) maxLen = val.length;
        });
        const headerVal = headers[i] || "";
        col.width = Math.ceil(Math.max(headerVal.length, maxLen) * 1.3) + 1;
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ট্রাবল_রিপোর্ট${searchMonth ? `_${BENGALI_MONTHS[parseInt(searchMonth) - 1]?.label}` : ""}${searchYear ? `_${searchYear}` : ""}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("XLSX ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); }
  };

  if (loading) return (<div className="flex flex-col items-center justify-center py-20 gap-3"><div className="size-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /><p className="text-sm text-muted-foreground">তথ্য লোড হচ্ছে...</p></div>);

  const Pagination = ({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-1 mt-3">
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>আগে</Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (<Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => onPageChange(p)}>{p}</Button>))}
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>পরে</Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><AlertTriangle className="size-5 text-emerald-600" />ট্রাবল রিপোর্ট</h2>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setCrBuildingId(""); setCrFloorId(""); setCrRoomId(""); setCrRoomNumber(""); setCrDescription(""); setCrReportedBy(""); } }}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><Plus className="size-4" />নতুন রিপোর্ট</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>নতুন ট্রাবল রিপোর্ট</DialogTitle><DialogDescription>সমস্যার বিবরণ এবং রুম নির্বাচন করুন</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>বিল্ডিং</Label><Select value={crBuildingId} onValueChange={(v) => { setCrBuildingId(v); setCrFloorId(""); setCrRoomId(""); }}><SelectTrigger className="w-full"><SelectValue placeholder="বিল্ডিং" /></SelectTrigger><SelectContent>{buildings.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>তলা</Label><Select value={crFloorId} onValueChange={(v) => { setCrFloorId(v); setCrRoomId(""); }} disabled={!crBuildingId}><SelectTrigger className="w-full"><SelectValue placeholder="তলা" /></SelectTrigger><SelectContent>{crBuilding?.floors?.map((f) => (<SelectItem key={f.id} value={f.id}>{f.floorNumber} তলা</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>রুম</Label><Select value={crRoomId} onValueChange={setCrRoomId} disabled={!crFloorId}><SelectTrigger className="w-full"><SelectValue placeholder="রুম" /></SelectTrigger><SelectContent>{crFloor?.rooms?.map((r) => (<SelectItem key={r.id} value={r.id}>{r.roomNumber}</SelectItem>))}</SelectContent></Select></div>
              </div>
              <div className="space-y-1.5"><Label>সমস্যার বিবরণ *</Label><Textarea placeholder="সমস্যার বিস্তারিত লিখুন..." value={crDescription} onChange={(e) => setCrDescription(e.target.value)} rows={3} /></div>
              <div className="space-y-1.5"><Label>প্রতিবেদকের নাম *</Label><Input placeholder="যে রিপোর্ট করছেন" value={crReportedBy} onChange={(e) => setCrReportedBy(e.target.value)} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>বাতিল</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreate} disabled={creatingTrouble}>{creatingTrouble ? "জমা হচ্ছে..." : "জমা দিন"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search filters */}
      <Card><CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">সার্চ:</span>
          <Select value={searchMonth} onValueChange={(v) => setSearchMonth(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="মাস বেছে নিন" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">সব মাস</SelectItem>
              {BENGALI_MONTHS.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={searchYear || "__all"} onValueChange={(v) => setSearchYear(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="বছর" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">সব বছর</SelectItem>
              {availableYears.map((y) => (<SelectItem key={y} value={String(y)}>{toBanglaNumber(y)}</SelectItem>))}
            </SelectContent>
          </Select>
          {(searchMonth || searchYear) && (<Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setSearchMonth(""); setSearchYear(""); }}><X className="size-3 mr-1" />মুছুন</Button>)}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={handleDownloadTroubles}><Download className="size-3" />XLSX ডাউনলোড</Button>
        </div>
      </CardContent></Card>

      {/* Sub-tabs */}
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button type="button" className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${activeSubTab === "pending" ? "bg-orange-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => setActiveSubTab("pending")}>
          <Clock className="size-3.5" />কাজ চলমান<Badge variant="secondary" className={`text-[10px] h-4 px-1.5 ${activeSubTab === "pending" ? "bg-white/20 text-white border-white/30" : ""}`}>{pendingReports.length}</Badge>
        </button>
        <button type="button" className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${activeSubTab === "solved" ? "bg-emerald-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => setActiveSubTab("solved")}>
          <CheckCircle2 className="size-3.5" />সমাধান হয়েছে
        </button>
      </div>

      {/* Pending */}
      {activeSubTab === "pending" && (
        paginatedPending.length === 0 ? (
          <Alert><Clock className="size-4" /><AlertDescription>কোনো পেন্ডিং ট্রাবল রিপোর্ট নেই।</AlertDescription></Alert>
        ) : (<>
          <Card className="hidden md:block"><CardContent className="p-0"><Table><TableHeader><TableRow className="bg-orange-50/50"><TableHead>রুম</TableHead><TableHead>বিবরণ</TableHead><TableHead>প্রতিবেদক</TableHead><TableHead>তারিখ</TableHead><TableHead>অবস্থা</TableHead><TableHead className="text-center">অ্যাকশন</TableHead></TableRow></TableHeader><TableBody>
            {paginatedPending.map((report) => (<TableRow key={report.id}><TableCell className="font-medium">{report.roomNumber}</TableCell><TableCell className="max-w-xs truncate">{report.description}</TableCell><TableCell>{report.reportedBy}</TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(report.reportedAt)}</TableCell><TableCell>{getStatusBadge(report.status)}</TableCell><TableCell><div className="flex items-center justify-center gap-1"><Button variant="ghost" size="sm" className="size-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditTrouble(report)} title="এডিট"><Edit3 className="size-3.5" /></Button><Button variant="outline" size="sm" className="gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-[11px]" onClick={() => { setResolveReport(report); setRsNote(""); setRsResolvedBy(""); setRsNewItems([]); setResolveOpen(true); }}><CheckCircle2 className="size-3" />সমাধান</Button><Button variant="ghost" size="sm" className="size-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => openDeleteTrouble(report)} title="মুছুন"><Trash2 className="size-3.5" /></Button></div></TableCell></TableRow>))}
          </TableBody></Table></CardContent></Card>
          <div className="md:hidden space-y-3">
            {paginatedPending.map((report) => (<Card key={report.id}><CardContent className="p-4"><div className="flex items-start justify-between gap-2"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><BedDouble className="size-3.5 text-emerald-600" /><span className="font-semibold">রুম: {report.roomNumber}</span></div><p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p><div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground"><span>প্রতিবেদক: {report.reportedBy}</span><span>{formatDate(report.reportedAt)}</span></div></div><div className="flex gap-1 shrink-0"><Button variant="ghost" size="sm" className="size-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditTrouble(report)}><Edit3 className="size-3.5" /></Button><Button variant="ghost" size="sm" className="size-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => openDeleteTrouble(report)}><Trash2 className="size-3.5" /></Button><div>{getStatusBadge(report.status)}</div></div></div><Button variant="outline" size="sm" className="mt-3 w-full gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => { setResolveReport(report); setRsNote(""); setRsResolvedBy(""); setRsNewItems([]); setResolveOpen(true); }}><CheckCircle2 className="size-3" />সমাধান</Button></CardContent></Card>))}
          </div>
          <Pagination page={pendingPage} totalPages={totalPendingPages} onPageChange={setPendingPage} />
        </>)
      )}

      {/* Solved */}
      {activeSubTab === "solved" && (
        paginatedSolved.length === 0 ? (
          <Alert><CheckCircle2 className="size-4" /><AlertDescription>কোনো সমাধান হওয়া রিপোর্ট নেই।</AlertDescription></Alert>
        ) : (<>
          <Card className="hidden md:block"><CardContent className="p-0"><Table><TableHeader><TableRow className="bg-emerald-50/50"><TableHead>রুম</TableHead><TableHead>বিবরণ</TableHead><TableHead>প্রতিবেদক</TableHead><TableHead>তারিখ</TableHead><TableHead>সমাধানকারী</TableHead><TableHead>সমাধানের তারিখ</TableHead><TableHead className="text-center">অ্যাকশন</TableHead></TableRow></TableHeader><TableBody>
            {paginatedSolved.map((report) => (<TableRow key={report.id}><TableCell className="font-medium">{report.roomNumber}</TableCell><TableCell className="max-w-xs truncate">{report.description}</TableCell><TableCell>{report.reportedBy}</TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(report.reportedAt)}</TableCell><TableCell>{report.resolvedBy || "-"}</TableCell><TableCell className="text-sm text-muted-foreground">{report.resolvedAt ? formatDate(report.resolvedAt) : "-"}</TableCell><TableCell><div className="flex items-center justify-center gap-1"><Button variant="ghost" size="sm" className="size-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditTrouble(report)} title="এডিট"><Edit3 className="size-3.5" /></Button><Button variant="ghost" size="sm" className="size-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => openDeleteTrouble(report)} title="মুছুন"><Trash2 className="size-3.5" /></Button></div></TableCell></TableRow>))}
          </TableBody></Table></CardContent></Card>
          <div className="md:hidden space-y-3">
            {paginatedSolved.map((report) => (<Card key={report.id}><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><BedDouble className="size-3.5 text-emerald-600" /><span className="font-semibold">রুম: {report.roomNumber}</span><span className="ml-auto">{getStatusBadge(report.status)}</span></div><p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>{report.resolutionNote && (<p className="text-xs text-emerald-700 mt-1 bg-emerald-50 rounded px-2 py-1">সমাধান: {report.resolutionNote}</p>)}<div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground"><span>প্রতিবেদক: {report.reportedBy}</span><span>সমাধানকারী: {report.resolvedBy || "-"}</span></div><div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground"><span>তারিখ: {formatDate(report.reportedAt)}</span>{report.resolvedAt && <span>সমাধান: {formatDate(report.resolvedAt)}</span>}</div></CardContent></Card>))}
          </div>
          <Pagination page={solvedPage} totalPages={totalSolvedPages} onPageChange={setSolvedPage} />
        </>)
      )}

      {/* Edit Trouble Dialog */}
      <Dialog open={editTroubleOpen} onOpenChange={setEditTroubleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600"><Edit3 className="size-5" />রিপোর্ট এডিট করুন</DialogTitle>
            <DialogDescription>ট্রাবল রিপোর্টের বিবরণ বা প্রতিবেদকের নাম পরিবর্তন করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>সমস্যার বিবরণ</Label><Textarea value={editTroubleData.description} onChange={(e) => setEditTroubleData(prev => ({ ...prev, description: e.target.value }))} rows={3} /></div>
            <div className="space-y-2"><Label>প্রতিবেদকের নাম</Label><Input value={editTroubleData.reportedBy} onChange={(e) => setEditTroubleData(prev => ({ ...prev, reportedBy: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTroubleOpen(false)}>বাতিল</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveTrouble} disabled={savingTrouble}>{savingTrouble ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Trouble Dialog */}
      <Dialog open={deleteTroubleOpen} onOpenChange={setDeleteTroubleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">রিপোর্ট মুছে ফেলবেন?</DialogTitle>
            <DialogDescription>&quot;{deleteTroubleDesc}&quot; — এই ট্রাবল রিপোর্ট স্থায়ীভাবে মুছে যাবে।</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTroubleOpen(false)}>বাতিল</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteTrouble} disabled={deletingTrouble}>{deletingTrouble ? "মুছে ফেলা হচ্ছে..." : "মুছে ফেলুন"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>সমস্যা সমাধান</DialogTitle><DialogDescription>রুম {resolveReport?.roomNumber} - {resolveReport?.description}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm"><p className="text-muted-foreground">মূল সমস্যা: {resolveReport?.description}</p><p className="text-muted-foreground">প্রতিবেদক: {resolveReport?.reportedBy} • তারিখ: {resolveReport && formatDate(resolveReport.reportedAt)}</p></div>
            <div className="space-y-1.5"><Label>সমাধানকারীর নাম *</Label><Input placeholder="যিনি সমাধান করেছেন" value={rsResolvedBy} onChange={(e) => setRsResolvedBy(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>সমাধানের বিবরণ</Label><Textarea placeholder="সমস্যা কীভাবে সমাধান করা হয়েছে..." value={rsNote} onChange={(e) => setRsNote(e.target.value)} rows={3} /></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><Label>নতুন মালামাল যোগ (যদি মেরামতে নতুন কিছু যোগ হয়)</Label><Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addRsItem}><Plus className="size-3" />আইটেম</Button></div>
              {rsNewItems.length > 0 ? (<div className="space-y-2 max-h-60 overflow-y-auto">{rsNewItems.map((item, idx) => (<div key={idx} className="grid grid-cols-[1fr_70px_90px_1fr_32px] gap-2 items-end"><div className="space-y-1">{idx === 0 && <span className="text-xs text-muted-foreground">নাম</span>}<Input placeholder="নাম" value={item.itemName} onChange={(e) => updateRsItem(idx, "itemName", e.target.value)} /></div><div className="space-y-1">{idx === 0 && <span className="text-xs text-muted-foreground">পরিমাণ</span>}<Input placeholder="১" value={item.quantity} onChange={(e) => updateRsItem(idx, "quantity", e.target.value)} /></div><div className="space-y-1">{idx === 0 && <span className="text-xs text-muted-foreground">অবস্থা</span>}<Select value={item.condition} onValueChange={(v) => updateRsItem(idx, "condition", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="আছে">আছে</SelectItem><SelectItem value="নেই">নেই</SelectItem><SelectItem value="ভালো">ভালো</SelectItem><SelectItem value="খারাপ">খারাপ</SelectItem><SelectItem value="নতুন">নতুন</SelectItem><SelectItem value="পুরাতন">পুরাতন</SelectItem><SelectItem value="নস্ট">নস্ট</SelectItem><SelectItem value="ভাঙা">ভাঙা</SelectItem><SelectItem value="মাঝারি">মাঝারি</SelectItem></SelectContent></Select></div><div className="space-y-1">{idx === 0 && <span className="text-xs text-muted-foreground">নোট</span>}<Input placeholder="নোট" value={item.note} onChange={(e) => updateRsItem(idx, "note", e.target.value)} /></div><Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50 size-8 p-0" onClick={() => removeRsItem(idx)}><X className="size-4" /></Button></div>))}</div>) : (<p className="text-xs text-muted-foreground">মেরামতে নতুন কোনো মালামাল যোগ হলে উপরে &quot;আইটেম&quot; বাটনে ক্লিক করুন</p>)}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setResolveOpen(false)}>বাতিল</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleResolve} disabled={resolvingTrouble}>{resolvingTrouble ? "সমাধান হচ্ছে..." : "সমাধান নিশ্চিত করুন"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4 — Room-wise Search (Tenants + Inventory combined view)
// ═══════════════════════════════════════════════════════════════════════════

interface RoomWiseData {
  roomId?: string;
  roomNumber: string;
  currentTenants: {
    id: string; name: string; designation: string | null; phone: string | null; startDate: string;
  }[];
  previousTenants: {
    id: string; name: string; designation: string | null; phone: string | null;
    startDate: string; endDate: string | null;
  }[];
  currentRoomUsers?: {
    id: string; name: string; designation: string | null; phone: string | null; department: string | null; startDate: string;
  }[];
  previousRoomUsers?: {
    id: string; name: string; designation: string | null; phone: string | null; department: string | null; startDate: string; endDate: string | null;
  }[];
  currentInventory: {
    id: string; itemName: string; quantity: number; condition: string;
    note: string | null; addedDate: string; tenantId: string | null;
    tenantName: string | null;
  }[];
  previousInventory: {
    id: string; itemName: string; quantity: number; condition: string;
    note: string | null; addedDate: string; tenantId: string | null;
    tenantName: string | null;
  }[];
  vacateRecords: {
    id: string; tenantId: string; tenantName: string;
    vacatedAt: string; inventorySnapshot: string;
  }[];
}

interface VacateInventoryItem {
  id?: string;
  itemName: string;
  quantity: number;
  condition: string;
  note?: string | null;
  _delete?: boolean;
}

function getConditionBadge(condition: string) {
  const cls =
    condition === "ভালো"
      ? "border-emerald-300 text-emerald-700"
      : condition === "মাঝারি"
        ? "border-yellow-300 text-yellow-700"
        : condition === "নস্ট"
          ? "border-violet-300 text-violet-700 bg-violet-50"
          : condition === "আছে"
            ? "border-cyan-300 text-cyan-700 bg-cyan-50"
            : condition === "নেই"
              ? "border-gray-300 text-gray-500 bg-gray-50"
              : "border-red-300 text-red-700";
  return (
    <Badge variant="outline" className={cls}>
      {condition}
    </Badge>
  );
}

function OverviewTab() {
  const { buildings } = useBuildingsContext();
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [data, setData] = useState<(RoomWiseData & { mode?: string; rooms?: any[] }) | null>(null);
  const [overviewSubTab, setOverviewSubTab] = useState<"tenants" | "inventory">("tenants");
  const [invSearchPage, setInvSearchPage] = useState(1);
  const INV_SEARCH_PER_PAGE = 10;
  const [tenantSearchPage, setTenantSearchPage] = useState(1);
  const TENANT_SEARCH_PER_PAGE = 10;
  const [expandedInvRoomId, setExpandedInvRoomId] = useState<string | null>(null);
  const [invSearchRepairDates, setInvSearchRepairDates] = useState<Record<string, { latestRepair: string; latestReplace: string; repairNote: string | null; replaceNote: string | null }>>({});
  const [prevPage, setPrevPage] = useState(1);
  const prevPerPage = 5;
  const [roomPrevPages, setRoomPrevPages] = useState<Record<string, number>>({});

  const [editTenantOpen, setEditTenantOpen] = useState(false);
  const [editTenantData, setEditTenantData] = useState<{ id: string; name: string; designation: string; phone: string; department: string; startDate: string; endDate: string; } | null>(null);
  const [editInvOpen, setEditInvOpen] = useState(false);
  const [editInvItem, setEditInvItem] = useState<{ id: string; itemName: string; quantity: number; condition: string; note: string | null; } | null>(null);
  const [addInvOpen, setAddInvOpen] = useState(false);
  const [addInvName, setAddInvName] = useState("");
  const [addInvQty, setAddInvQty] = useState("1");
  const [addInvCondition, setAddInvCondition] = useState("আছে");
  const [addInvNote, setAddInvNote] = useState("");
  const [addInvTenantId, setAddInvTenantId] = useState("");
  const [vacateOpen, setVacateOpen] = useState(false);
  const [vacateItems, setVacateItems] = useState<VacateInventoryItem[]>([]);
  const [vacateLoading, setVacateLoading] = useState(false);
  const [editingVacateIdx, setEditingVacateIdx] = useState<number | null>(null);
  const [expandedPrevTenant, setExpandedPrevTenant] = useState<string | null>(null);
  const [ovDeletingSnapshot, setOvDeletingSnapshot] = useState(false);

  // Loading states
  const [editingTenant, setEditingTenant] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState(false);
  const [editingInv, setEditingInv] = useState(false);
  const [deletingInv, setDeletingInv] = useState(false);
  const [editInvRepairDate, setEditInvRepairDate] = useState("");
  const [editInvReplaceDate, setEditInvReplaceDate] = useState("");
  const [editInvRepairNote, setEditInvRepairNote] = useState("");
  const [editInvReplaceNote, setEditInvReplaceNote] = useState("");
  const [addingInv, setAddingInv] = useState(false);
  // Full repair/replace history for edit dialog in OverviewTab
  const [invRepairHistory, setInvRepairHistory] = useState<{ id: string; type: string; actionDate: string; note: string | null }[]>([]);
  const [invLatestRepairDate, setInvLatestRepairDate] = useState("");
  const [invLatestReplaceDate, setInvLatestReplaceDate] = useState("");
  const [showInvHistory, setShowInvHistory] = useState(false);
  const [newRepairDate, setNewRepairDate] = useState("");
  const [newRepairNote, setNewRepairNote] = useState("");
  const [newReplaceDate, setNewReplaceDate] = useState("");
  const [newReplaceNote, setNewReplaceNote] = useState("");
  const [savingRepairRecord, setSavingRepairRecord] = useState(false);
  const [invHistoryPage, setInvHistoryPage] = useState(1);
  const INV_HISTORY_PER_PAGE_OV = 10;
  // Common belongings loading for OverviewTab
  const [commonItems, setCommonItems] = useState<{ itemName: string; quantity: string; condition: string }[]>([]);
  const [loadingCommon, setLoadingCommon] = useState(false);
  const [addingCommonToTenant, setAddingCommonToTenant] = useState(false);
  const [editingCommonIdx, setEditingCommonIdx] = useState<number | null>(null);
  const [editCommonName, setEditCommonName] = useState("");
  const [editCommonQty, setEditCommonQty] = useState("");
  const [editCommonCond, setEditCommonCond] = useState("ভালো");
  const [downloadingInvXlsx, setDownloadingInvXlsx] = useState(false);
  const [expandedTenantRoomId, setExpandedTenantRoomId] = useState<string | null>(null);
  const [downloadingTenantXlsx, setDownloadingTenantXlsx] = useState(false);
  const [ovBulkEditMode, setOvBulkEditMode] = useState(false);
  const [ovBulkEditData, setOvBulkEditData] = useState<Record<string, { quantity: string; condition: string }>>({});
  const [ovSavingBulk, setOvSavingBulk] = useState(false);

  const selectedBuilding = buildings.find((b) => b.id === buildingId);
  const selectedFloor = selectedBuilding?.floors?.find((f) => f.id === floorId);

  // Derive building name and floor number for hierarchy display
  const selectedBuildingName = selectedBuilding?.name || "";
  const selectedFloorNumber = selectedFloor?.floorNumber || null;

  // Expand room card in inventory search — fetch repair/replace dates on demand
  const handleExpandInvRoom = async (roomData: any) => {
    const rid = roomData.roomId;
    if (expandedInvRoomId === rid) {
      setExpandedInvRoomId(null);
      return;
    }
    setExpandedInvRoomId(rid);
    // Fetch repair/replace dates for this room's inventory items
    const allItems = roomData.currentTenants?.length > 0
      ? (roomData.currentInventory || [])
      : [...(roomData.currentInventory || []), ...(roomData.previousInventory || [])];
    const invIds = allItems.map((i: any) => i.id).filter(Boolean);
    if (invIds.length > 0) {
      try {
        const res = await fetch(`/api/inventory/repair-replace?inventoryIds=${invIds.join(',')}`);
        if (res.ok) {
          const repairData = await res.json();
          setInvSearchRepairDates(prev => ({ ...prev, ...repairData }));
        }
      } catch { /* silent */ }
    }
  };

  // Load common belongings for OverviewTab
  const handleLoadCommonOverview = async () => {
    if (!buildingId) { toast.error("বিল্ডিং নির্বাচন করুন"); return; }
    try {
      setLoadingCommon(true);
      const r = await fetch(`/api/belongings?buildingId=${buildingId}`);
      if (r.ok) {
        const belongings = await r.json();
        if (Array.isArray(belongings) && belongings.length > 0) {
          // Filter out items already in room's current inventory (from component state)
          const existingNames = new Set(
            (data?.currentInventory || []).map((inv: any) => inv.itemName.trim().toLowerCase())
          );
          const filtered = belongings.filter((item: any) => !existingNames.has(item.itemName.trim().toLowerCase()));
          if (filtered.length === 0) {
            toast.info("সব মালামাল ইতিমধ্যে এই রুমে আছে");
          } else {
            setCommonItems(filtered.map((item: any) => ({ itemName: item.itemName, quantity: String(item.quantity), condition: "আছে" })));
            const skipped = belongings.length - filtered.length;
            toast.success(`${toBanglaNumber(filtered.length)} টি কমন মালামাল লোড হয়েছে${skipped > 0 ? ` (${toBanglaNumber(skipped)} টি ডুপ্লিকেট বাদ)` : ''}`);
          }
        } else { toast.error("এই বিল্ডিংয়ে কোনো কমন মালামাল নেই"); }
      }
    } catch { toast.error("কমন মালামাল লোড করতে সমস্যা"); }
    finally { setLoadingCommon(false); }
  };

  // Add loaded common belongings to ALL current tenants in single room mode
  const handleAddCommonToTenantOverview = async () => {
    // Use data.roomId (from API) or fall back to roomId state (from dropdown)
    const targetRoomId = data?.roomId || roomId;
    if (!targetRoomId) {
      toast.error("রুম পাওয়া যায়নি");
      return;
    }
    if (commonItems.length === 0) { toast.error("কোনো মালামাল লোড করা হয়নি"); return; }

    setAddingCommonToTenant(true);
    try {
      const res = await fetch("/api/inventory/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: commonItems.filter(i => i.itemName.trim()),
          roomId: targetRoomId,
          roomNumber: data.roomNumber,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "মালামাল যোগ করতে সমস্যা");
        return;
      }

      if (result.added === 0) {
        toast.warning(result.message || "সব মালামাল ইতিমধ্যে রুমে আছে");
      } else {
        toast.success(result.message || `${toBanglaNumber(result.added)} টি মালামাল যোগ হয়েছে`);
      }
      setCommonItems([]);
      setEditingCommonIdx(null);
      // Background refresh to get real data from server
      handleSearch();
    } catch (err) {
      console.error('[AddCommon] Error:', err);
      toast.error("মালামাল যোগ করতে সমস্যা হয়েছে");
    }
    finally { setAddingCommonToTenant(false); }
  };

  const handleSearch = async () => {
    if (!buildingId) { toast.error("বিল্ডিং নির্বাচন করুন"); return; }
    try {
      setSearchLoading(true);
      setInvSearchPage(1); setTenantSearchPage(1); setExpandedInvRoomId(null); setInvSearchRepairDates({}); setRoomPrevPages({});
      let url = `/api/room-wise-data?buildingId=${buildingId}`;
      if (roomId) {
        url = `/api/room-wise-data?roomId=${roomId}`;
      } else if (floorId) {
        url = `/api/room-wise-data?buildingId=${buildingId}&floorId=${floorId}`;
      }
      console.log('[Search] URL:', url, '| buildingId:', buildingId, '| floorId:', floorId, '| roomId:', roomId);
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      console.log('[Search] Result:', JSON.stringify(result).substring(0, 300));
      if (result.mode === 'allRooms' && (!result.rooms || result.rooms.length === 0)) {
        toast.info(`${selectedBuildingName} বিল্ডিং এ কোনো রুম পাওয়া যায়নি`);
      }
      setData(result);
      setSearched(true); setPrevPage(1); setTenantSearchPage(1);
      setInvSearchPage(1); setExpandedInvRoomId(null); setInvSearchRepairDates({});
      // Fetch repair/replace dates for single room mode
      if (result.mode !== 'allRooms' && result.currentInventory?.length > 0) {
        const invIds = result.currentInventory.map((i: any) => i.id).filter(Boolean);
        if (invIds.length > 0) {
          try {
            const rrRes = await fetch(`/api/inventory/repair-replace?inventoryIds=${invIds.join(',')}`);
            if (rrRes.ok) setInvSearchRepairDates(await rrRes.json());
          } catch { /* silent */ }
        }
      }
    } catch (err: any) {
      console.error('[Search] Error:', err);
      toast.error(err?.message || "তথ্য লোড করতে সমস্যা হয়েছে");
    } finally { setSearchLoading(false); }
  };

  const [vacateTenantId, setVacateTenantId] = useState<string | null>(null);

  const openVacateDialog = (tenantId?: string) => {
    const targetId = tenantId || (data?.currentTenants?.[0]?.id);
    if (!targetId) return;
    setVacateTenantId(targetId);
    const items: VacateInventoryItem[] = data.currentInventory.map((inv) => ({ id: inv.id, itemName: inv.itemName, quantity: inv.quantity, condition: inv.condition, note: inv.note }));
    setVacateItems(items.length > 0 ? items : [{ itemName: "", quantity: 1, condition: "আছে" }]);
    setEditingVacateIdx(null);
    setVacateOpen(true);
  };
  const updateVacateItem = (idx: number, field: keyof VacateInventoryItem, value: string | number) => { setVacateItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))); };
  const removeVacateItem = (idx: number) => { if (vacateItems.length <= 1) return; setVacateItems((prev) => prev.filter((_, i) => i !== idx)); };
  const addVacateItem = () => { setVacateItems((prev) => [...prev, { itemName: "", quantity: 1, condition: "আছে" }]); };

  const handleVacate = async () => {
    if (!vacateTenantId) return;
    try {
      setVacateLoading(true);
      const res = await fetch("/api/vacate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId: vacateTenantId }) });
      if (!res.ok) { const errData = await res.json(); toast.error(errData.error || "রুম ছেড়ে দিতে সমস্যা হয়েছে"); return; }
      toast.success("ভাড়াটে রুম ছেড়ে দিয়েছেন"); setVacateOpen(false); handleSearch();
    } catch { toast.error("রুম ছেড়ে দিতে সমস্যা হয়েছে"); } finally { setVacateLoading(false); }
  };

  const handleEditTenant = async () => {
    if (!editTenantData) return;
    setEditingTenant(true);
    try { const res = await fetch("/api/tenants", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editTenantData.id, action: "updateInfo", name: editTenantData.name, designation: editTenantData.designation, phone: editTenantData.phone || null, department: editTenantData.department || null, startDate: editTenantData.startDate || undefined, endDate: editTenantData.endDate || undefined }) }); if (!res.ok) throw new Error(); toast.success("ভাড়াটে তথ্য আপডেট হয়েছে"); setEditTenantOpen(false); setEditTenantData(null); handleSearch(); } catch { toast.error("আপডেট করতে সমস্যা হয়েছে"); } finally { setEditingTenant(false); }
  };
  const handleDeleteTenant = async (id: string) => { setDeletingTenant(true); try { const res = await fetch("/api/tenants", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (!res.ok) throw new Error(); toast.success("ভাড়াটে মুছে ফেলা হয়েছে"); handleSearch(); } catch { toast.error("মুছে ফেলতে সমস্যা হয়েছে"); } finally { setDeletingTenant(false); } };

  const ovHandleDeleteSnapshot = async (vacateId: string) => {
    setOvDeletingSnapshot(true);
    try {
      await fetch("/api/vacate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vacateId, inventorySnapshot: "[]" }),
      });
      handleSearch();
      toast.success("মালামাল স্ন্যাপশট মুছে ফেলা হয়েছে");
    } catch { toast.error("মুছে ফেলতে সমস্যা"); }
    finally { setOvDeletingSnapshot(false); }
  };

  const ovHandleDownloadSnapshot = async (vr: any, tenant: any) => {
    try {
      let snapshotItems: any[] = [];
      try { snapshotItems = vr.inventorySnapshot ? JSON.parse(vr.inventorySnapshot) : []; } catch { snapshotItems = []; }
      if (snapshotItems.length === 0) { toast.error("কোনো মালামাল স্ন্যাপশট নেই"); return; }
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("মালামাল তালিকা");
      const parts1: string[] = [];
      if (tenant.name) parts1.push(`নাম-${tenant.name}`);
      if (tenant.designation) parts1.push(`পদবী-${tenant.designation}`);
      if (tenant.phone) parts1.push(`মোবাইল-${tenant.phone}`);
      const line1 = parts1.length > 0 ? parts1.join(",") : vr.tenantName;
      const vacateDateStr = vr.vacatedAt ? formatDate(vr.vacatedAt) : "";
      const line2 = `${vacateDateStr} তারিখে রেখে যাওয়া মালামাল তালিকা`;
      sheet.mergeCells("A1:G1"); sheet.mergeCells("A2:G2");
      const tc1 = sheet.getCell("A1"); tc1.value = line1; tc1.font = { bold: true, size: 12 }; tc1.alignment = { horizontal: "center", vertical: "middle" };
      const tc2 = sheet.getCell("A2"); tc2.value = line2; tc2.font = { bold: true, size: 12 }; tc2.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 25; sheet.getRow(2).height = 25;
      const headers = ["ক্রম", "মালামালের নাম", "পরিমাণ", "অবস্থা", "নোট", "সর্বশেষ রিপেয়ার", "সর্বশেষ রিপ্লেস"];
      const headerRow = sheet.addRow(headers); headerRow.height = 22;
      const hf = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } } as any;
      const hfn = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const tb = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      headerRow.eachCell((cell: any) => { cell.fill = hf; cell.font = hfn; cell.border = tb; cell.alignment = { horizontal: "center", vertical: "middle" }; });
      snapshotItems.forEach((item: any, idx: number) => {
        const repairDate = item.latestRepair ? (item.latestRepair.split('T')[0] || item.latestRepair) : '';
        const replaceDate = item.latestReplace ? (item.latestReplace.split('T')[0] || item.latestReplace) : '';
        const row = sheet.addRow([idx + 1, item.itemName || item.name || "-", item.quantity || 0, item.condition || "-", item.note || "-", repairDate || "-", replaceDate || "-"]);
        row.eachCell((cell: any) => { cell.border = tb; cell.alignment = { horizontal: "center", vertical: "middle" }; });
      });
      sheet.columns.forEach((col: any, i: number) => {
        if (i === 0) { col.width = 5; return; }
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (cell: any) => { const val = String(cell.value || ""); if (val.length > maxLen) maxLen = val.length; });
        const headerVal = headers[i] || "";
        col.width = Math.ceil(Math.max(headerVal.length, maxLen) * 1.3) + 1;
      });
      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 3, topLeftCell: "A4", activeCell: "A4" }];
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `মালামাল_তালিকা_${vr.tenantName}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); }
  };

  const handleSaveQuickRepair = async (type: "repair" | "replace") => {
    if (!editInvItem) return;
    const date = type === "repair" ? newRepairDate : newReplaceDate;
    const note = type === "repair" ? newRepairNote : newReplaceNote;
    if (!date.trim()) { toast.error(type === "repair" ? "Repair তারিখ দিন" : "Replace তারিখ দিন"); return; }
    setSavingRepairRecord(true);
    try {
      const res = await fetch("/api/inventory/repair-replace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventoryId: editInvItem.id, type, actionDate: date, note: note.trim() || null }) });
      if (!res.ok) throw new Error();
      const histRes = await fetch(`/api/inventory/repair-replace?inventoryId=${editInvItem.id}`);
      if (histRes.ok) {
        const records = await histRes.json();
        setInvRepairHistory(records);
        const repairRecord = records.find((r: any) => r.type === "repair");
        const replaceRecord = records.find((r: any) => r.type === "replace");
        setInvLatestRepairDate(repairRecord ? (repairRecord.actionDate ? repairRecord.actionDate.split("T")[0] : "") : "");
        setInvLatestReplaceDate(replaceRecord ? (replaceRecord.actionDate ? replaceRecord.actionDate.split("T")[0] : "") : "");
      }
      if (type === "repair") { setNewRepairDate(""); setNewRepairNote(""); } else { setNewReplaceDate(""); setNewReplaceNote(""); }
      toast.success(type === "repair" ? "Repair রেকর্ড সেভ হয়েছে" : "Replace রেকর্ড সেভ হয়েছে");
      handleSearch();
    } catch { toast.error("রেকর্ড সেভ করতে সমস্যা"); }
    finally { setSavingRepairRecord(false); }
  };
  const handleDeleteRepairRecord = async (recordId: string) => {
    try {
      await fetch("/api/inventory/repair-replace", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: recordId }) });
      setInvRepairHistory(prev => prev.filter(r => r.id !== recordId));
      toast.success("রেকর্ড মুছে ফেলা হয়েছে");
      if (editInvItem) {
        const histRes = await fetch(`/api/inventory/repair-replace?inventoryId=${editInvItem.id}`);
        if (histRes.ok) {
          const records = await histRes.json();
          const repairRecord = records.find((r: any) => r.type === "repair");
          const replaceRecord = records.find((r: any) => r.type === "replace");
          setInvLatestRepairDate(repairRecord ? (repairRecord.actionDate ? repairRecord.actionDate.split("T")[0] : "") : "");
          setInvLatestReplaceDate(replaceRecord ? (replaceRecord.actionDate ? replaceRecord.actionDate.split("T")[0] : "") : "");
        }
      }
    } catch { toast.error("মুছে ফেলতে সমস্যা"); }
  };
  const handleEditInventory = async () => {
    if (!editInvItem) return;
    setEditingInv(true);
    try {
      const res = await fetch("/api/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editInvItem.id, itemName: editInvItem.itemName, quantity: editInvItem.quantity, condition: editInvItem.condition, note: editInvItem.note }) });
      if (!res.ok) throw new Error();
      if (newRepairDate.trim()) {
        await fetch("/api/inventory/repair-replace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventoryId: editInvItem.id, type: "repair", actionDate: newRepairDate, note: newRepairNote.trim() || null }) }).catch(() => {});
      }
      if (newReplaceDate.trim()) {
        await fetch("/api/inventory/repair-replace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventoryId: editInvItem.id, type: "replace", actionDate: newReplaceDate, note: newReplaceNote.trim() || null }) }).catch(() => {});
      }
      toast.success("মালামাল আপডেট হয়েছে");
      setEditInvOpen(false); setEditInvItem(null);
      setNewRepairDate(""); setNewReplaceDate(""); setNewRepairNote(""); setNewReplaceNote("");
      setInvRepairHistory([]); setInvLatestRepairDate(""); setInvLatestReplaceDate("");
      handleSearch();
    } catch { toast.error("মালামাল আপডেট করতে সমস্যা হয়েছে"); } finally { setEditingInv(false); }
  };
  const handleDeleteInventory = async (id: string) => { setDeletingInv(true); try { const res = await fetch("/api/inventory", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (!res.ok) throw new Error(); toast.success("মালামাল মুছে ফেলা হয়েছে"); handleSearch(); } catch { toast.error("মালামাল মুছে ফেলতে সমস্যা হয়েছে"); } finally { setDeletingInv(false); } };
  const handleAddInventory = async () => { if (!addInvName.trim() || !data) { toast.error("মালামালের নাম দিন"); return; } setAddingInv(true); try { const res = await fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemName: addInvName.trim(), quantity: parseInt(addInvQty) || 0, condition: addInvCondition, roomNumber: data.roomNumber, tenantId: null, roomId, note: addInvNote.trim() || null }) }); const resData = await res.json(); if (!res.ok) { toast.error(resData.error || "মালামাল যোগ করতে সমস্যা"); return; } toast.success("মালামাল যোগ হয়েছে"); setAddInvName(""); setAddInvQty("1"); setAddInvCondition("আছে"); setAddInvNote(""); setAddInvOpen(false); handleSearch(); } catch { toast.error("মালামাল যোগ করতে সমস্যা"); } finally { setAddingInv(false); } };

  const handleDownloadInventoryXlsx = async () => {
    if (!data) return;
    setDownloadingInvXlsx(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("রুমভিত্তিক মালামাল তালিকা");

      // Blue header style
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
      const thinBorder = { top: { style: "thin", color: { argb: "FFCCCCCC" } }, bottom: { style: "thin", color: { argb: "FFCCCCCC" } }, left: { style: "thin", color: { argb: "FFCCCCCC" } }, right: { style: "thin", color: { argb: "FFCCCCCC" } } };
      const centerAlign = { horizontal: "center", vertical: "middle", wrapText: false };

      // Merged title header row
      const titleRow = sheet.addRow(["রুমভিত্তিক মালামাল তালিকা"]);
      sheet.mergeCells(1, 1, 1, 13);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 14, color: { argb: "FF2563EB" } };
      titleCell.alignment = centerAlign;
      titleRow.height = 36;

      const headers = ["ক্রম", "বিল্ডিং নাম", "তলা", "রুম নম্বর", "ভাড়াটে", "রুম ব্যবহারকারী", "জিনিসের নাম", "পরিমাণ", "অবস্থা", "সর্বশেষ রিপেয়ার", "সর্বশেষ রিপ্লেস", "সকল রিপেয়ার তারিখ", "সকল রিপ্লেস তারিখ"];
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; cell.border = border; cell.alignment = centerAlign; });
      headerRow.height = 28;

      // Collect all inventory IDs for batch repair/replace fetch
      let rows: any[] = [];
      if (data.mode === 'allRooms') {
        for (const roomData of (data.rooms || [])) {
          const tenantNames = (roomData.currentTenants || []).map((t: any) => t.name).join(', ') || '—';
          const roomUserNames = (roomData.currentRoomUsers || []).map((u: any) => u.name).join(', ') || '—';
          const allItems = roomData.currentTenants?.length > 0
            ? (roomData.currentInventory || [])
            : [...(roomData.currentInventory || []), ...(roomData.previousInventory || [])];
          const uniqueItems = Array.from(new Map(allItems.map((item: any) => [item.id, item])).values());
          for (const item of uniqueItems) {
            rows.push({
              buildingName: selectedBuildingName,
              floorNumber: roomData.floorNumber || '—',
              roomNumber: roomData.roomNumber,
              tenantNames,
              roomUserNames,
              itemName: item.itemName,
              quantity: item.quantity,
              condition: item.condition,
              inventoryId: item.id,
            });
          }
        }
      } else {
        const tenantNames = (data.currentTenants || []).map((t) => t.name).join(', ') || '—';
        const roomUserNames = (data.currentRoomUsers || []).map((u: any) => u.name).join(', ') || '—';
        // Include both current and previous inventory in single-room mode
        for (const item of (data.currentInventory || [])) {
          rows.push({
            buildingName: selectedBuildingName,
            floorNumber: selectedFloorNumber !== null ? selectedFloorNumber : '—',
            roomNumber: data.roomNumber,
            tenantNames,
            roomUserNames,
            itemName: item.itemName,
            quantity: item.quantity,
            condition: item.condition,
            inventoryId: item.id,
          });
        }
        for (const item of (data.previousInventory || [])) {
          rows.push({
            buildingName: selectedBuildingName,
            floorNumber: selectedFloorNumber !== null ? selectedFloorNumber : '—',
            roomNumber: data.roomNumber,
            tenantNames,
            roomUserNames,
            itemName: item.itemName,
            quantity: item.quantity,
            condition: item.condition,
            inventoryId: item.id,
          });
        }
      }

      // Fetch ALL repair/replace dates individually for each inventory item
      const allInvIds = rows.map(r => r.inventoryId).filter(Boolean);
      const allRepairDatesMap: Record<string, string[]> = {};
      const allReplaceDatesMap: Record<string, string[]> = {};
      let repairMap: Record<string, { latestRepair: string; latestReplace: string }> = {};
      if (allInvIds.length > 0) {
        // Batch fetch for latest dates
        try {
          const repairRes = await fetch(`/api/inventory/repair-replace?inventoryIds=${allInvIds.join(',')}`);
          if (repairRes.ok) repairMap = await repairRes.json();
        } catch { /* silent */ }
        // Individual fetch for ALL dates
        await Promise.all(allInvIds.map(async (invId) => {
          try {
            const res = await fetch(`/api/inventory/repair-replace?inventoryId=${invId}`);
            if (res.ok) {
              const records = await res.json();
              allRepairDatesMap[invId] = records.filter((r: any) => r.type === "repair").map((r: any) => r.actionDate).filter(Boolean).sort().reverse();
              allReplaceDatesMap[invId] = records.filter((r: any) => r.type === "replace").map((r: any) => r.actionDate).filter(Boolean).sort().reverse();
            }
          } catch { /* silent */ }
        }));
      }

      // Write rows
      rows.forEach((row, idx) => {
        const rd = repairMap[row.inventoryId];
        const repairDates = allRepairDatesMap[row.inventoryId] || [];
        const replaceDates = allReplaceDatesMap[row.inventoryId] || [];
        const r = sheet.addRow([
          idx + 1,
          row.buildingName,
          toBanglaNumber(row.floorNumber === '—' ? '—' : row.floorNumber),
          row.roomNumber,
          row.tenantNames,
          row.roomUserNames,
          row.itemName,
          row.quantity,
          row.condition,
          rd?.latestRepair ? new Date(rd.latestRepair).toLocaleDateString("bn-BD") : '—',
          rd?.latestReplace ? new Date(rd.latestReplace).toLocaleDateString("bn-BD") : '—',
          repairDates.length > 0 ? repairDates.map((d) => new Date(d).toLocaleDateString("bn-BD")).join(", ") : '—',
          replaceDates.length > 0 ? replaceDates.map((d) => new Date(d).toLocaleDateString("bn-BD")).join(", ") : '—',
        ]);
        r.eachCell((cell) => { cell.border = thinBorder; cell.alignment = centerAlign; });
      });

      // Auto-fit column widths based on data content
      sheet.columns.forEach((col, i) => {
        if (i === 0) { col.width = 5; return; } // ক্রম
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (cell) => {
          const val = String(cell.value || "");
          const len = val.length;
          if (len > maxLen) maxLen = len;
        });
        const headerVal = headers[i] || "";
        const headerLen = headerVal.length;
        col.width = Math.ceil(Math.max(headerLen, maxLen) * 1.3) + 1;
      });

      // Freeze panes: freeze title row (1) and header row (2) + first column
      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 2, topLeftCell: "A3", activeCell: "A3" }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `রুমভিত্তিক_মালামাল_তালিকা${selectedBuildingName ? `_${selectedBuildingName}` : ""}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("XLSX ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); } finally { setDownloadingInvXlsx(false); }
  };

  const handleDownloadTenantXlsx = async () => {
    if (!data || !data.rooms) return;
    setDownloadingTenantXlsx(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("বরাদ্দকৃত ব্যক্তিবর্গের তালিকা");

      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF22C55E" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
      const thinBorder = { top: { style: "thin", color: { argb: "FFCCCCCC" } }, bottom: { style: "thin", color: { argb: "FFCCCCCC" } }, left: { style: "thin", color: { argb: "FFCCCCCC" } }, right: { style: "thin", color: { argb: "FFCCCCCC" } } };
      const centerAlign = { horizontal: "center", vertical: "middle", wrapText: false };

      const titleRow = sheet.addRow(["রুম বরাদ্দ পাওয়া ব্যক্তিবর্গের তালিকা"]);
      sheet.mergeCells(1, 1, 1, 9);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 14, color: { argb: "FF22C55E" } };
      titleCell.alignment = centerAlign;
      titleRow.height = 36;

      const headers = ["ক্রম", "বিল্ডিং নাম", "তলা", "রুম নম্বর", "নাম", "পদবী", "ফোন", "শুরুর তারিখ", "রুম ব্যবহারকারী"];
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; cell.border = border; cell.alignment = centerAlign; });
      headerRow.height = 28;

      let idx = 0;
      data.rooms.forEach((roomData: any) => {
        const tenants = roomData.currentTenants || [];
        const users = roomData.currentRoomUsers || [];
        const userName = users.map((u: any) => u.name).join(", ") || "-";
        tenants.forEach((t: any) => {
          idx++;
          const row = sheet.addRow([
            idx,
            data.buildingName || "-",
            roomData.floorNumber || 0,
            roomData.roomNumber || "-",
            t.name || "-",
            t.designation || "-",
            t.phone || "-",
            t.startDate ? new Date(t.startDate).toLocaleDateString("bn-BD") : "-",
            userName,
          ]);
          row.eachCell((cell) => { cell.border = thinBorder; cell.alignment = centerAlign; });
        });
      });

      // Auto-fit column widths based on data content
      sheet.columns.forEach((col, i) => {
        if (i === 0) { col.width = 5; return; } // ক্রম
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (cell) => {
          const val = String(cell.value || "");
          const len = val.length;
          if (len > maxLen) maxLen = len;
        });
        // Header width
        const headerVal = headers[i] || "";
        const headerLen = headerVal.length;
        col.width = Math.ceil(Math.max(headerLen, maxLen) * 1.3) + 1;
      });
      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 2, topLeftCell: "A3", activeCell: "A3" }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `রুমভিত্তিক_ভাড়াটে_তালিকা${data.buildingName ? `_${data.buildingName}` : ""}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("XLSX ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); } finally { setDownloadingTenantXlsx(false); }
  };

  const totalPrevPages = data ? Math.ceil((data.previousTenants?.length || 0) / prevPerPage) : 0;
  const paginatedPrevTenants = data?.previousTenants?.slice((prevPage - 1) * prevPerPage, prevPage * prevPerPage) || [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2"><ClipboardList className="size-5 text-emerald-600" />রুমভিত্তিক তালিকা</h2>
      <Card><CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>বিল্ডিং নির্বাচন</Label><Select value={buildingId} onValueChange={(v) => { setBuildingId(v); setFloorId(""); setRoomId(""); setSearched(false); setData(null); }}><SelectTrigger className="w-full"><SelectValue placeholder="বিল্ডিং বেছে নিন" /></SelectTrigger><SelectContent>{buildings.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>তলা নির্বাচন</Label><Select value={floorId || "__all"} onValueChange={(v) => { setFloorId(v === "__all" ? "" : v); setRoomId(""); setSearched(false); setData(null); }} disabled={!buildingId}><SelectTrigger className="w-full"><SelectValue placeholder="তলা বেছে নিন" /></SelectTrigger><SelectContent><SelectItem value="__all">সকল তলা</SelectItem>{selectedBuilding?.floors?.map((f) => (<SelectItem key={f.id} value={f.id}>{f.floorNumber} তলা</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>রুম নির্বাচন</Label><Select value={roomId || "__all"} onValueChange={(v) => { setRoomId(v === "__all" ? "" : v); setSearched(false); setData(null); }} disabled={!buildingId}><SelectTrigger className="w-full"><SelectValue placeholder={!buildingId ? "আগে বিল্ডিং বেছে নিন" : floorId ? "তলা নির্বাচিত" : "রুম বেছে নিন"} /></SelectTrigger><SelectContent><SelectItem value="__all">সকল রুম</SelectItem>{floorId ? (selectedFloor?.rooms?.map((room) => (<SelectItem key={room.id} value={room.id}><span className="flex items-center gap-2">{room.roomNumber}{room.tenants?.length > 0 && (<span className="size-2 rounded-full bg-emerald-500 inline-block" />)}</span></SelectItem>)) || []) : (selectedBuilding?.floors?.sort((a, b) => a.floorNumber - b.floorNumber).map((floor) => (<SelectGroup key={floor.id}><SelectLabel className="text-xs font-semibold text-muted-foreground bg-muted/50">{floor.floorNumber} তলা</SelectLabel>{floor.rooms?.map((room) => (<SelectItem key={room.id} value={room.id}><span className="flex items-center gap-2">{room.roomNumber}{room.tenants?.length > 0 && (<span className="size-2 rounded-full bg-emerald-500 inline-block" />)}</span></SelectItem>))}</SelectGroup>)))}</SelectContent></Select></div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button type="button" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${overviewSubTab === "tenants" ? "bg-emerald-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => setOverviewSubTab("tenants")}>
              <Users className="size-3.5" />বরাদ্দকৃত ব্যক্তির তথ্য
            </button>
            <button type="button" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${overviewSubTab === "inventory" ? "bg-emerald-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => setOverviewSubTab("inventory")}>
              <Package className="size-3.5" />মালামাল
            </button>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 px-6" onClick={handleSearch} disabled={searchLoading || !buildingId}>{searchLoading ? (<div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />) : (<Search className="size-4" />)}সার্চ করুন</Button>
          {searched && overviewSubTab === "tenants" && data && data.mode === 'allRooms' && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10 px-6 text-sm font-semibold" onClick={handleDownloadTenantXlsx} disabled={downloadingTenantXlsx}>
              {downloadingTenantXlsx ? (<div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />) : (<Download className="size-5" />)}
              ডাউনলোড
            </Button>
          )}
          {searched && overviewSubTab === "inventory" && data && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10 px-6 text-sm font-semibold" onClick={handleDownloadInventoryXlsx} disabled={downloadingInvXlsx}>
              {downloadingInvXlsx ? (<div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />) : (<Download className="size-5" />)}
              ডাউনলোড
            </Button>
          )}
        </div>
      </CardContent></Card>
      {!searched && (<Alert><Search className="size-4" /><AlertDescription>বিল্ডিং ও রুম নির্বাচন করে সার্চ করুন</AlertDescription></Alert>)}

      {searchLoading && (<div className="flex flex-col items-center justify-center py-16 gap-3"><div className="size-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /><p className="text-sm text-muted-foreground">তথ্য লোড হচ্ছে...</p></div>)}

      {searched && !searchLoading && data && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border-2 border-emerald-500 px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center size-7 sm:size-8 rounded-lg bg-emerald-500 text-white shrink-0">
                <BedDouble className="size-3.5 sm:size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base text-emerald-700">{data.mode === 'allRooms' ? `সকল রুমের তালিকা (${toBanglaNumber(data.rooms?.length || 0)} টি রুম)` : `রুম: ${data.roomNumber || ''}`}</p>
                <p className="text-xs sm:text-sm text-emerald-600">
                  বিল্ডিং: {selectedBuildingName}
                  {data.mode !== 'allRooms' && selectedFloorNumber !== null && ` • তলা: ${toBanglaNumber(selectedFloorNumber)} তলা`}
                </p>
              </div>
            </div>
          </div>

          {/* All Rooms Mode — Tenants (grouped by floor) */}
          {data.mode === 'allRooms' && overviewSubTab === "tenants" && (() => {
            const allRoomsList = data.rooms || [];
            const totalTenantPages = Math.max(1, Math.ceil(allRoomsList.length / TENANT_SEARCH_PER_PAGE));
            const safeTenantPage = Math.min(tenantSearchPage, totalTenantPages);
            const pageRoomsList = allRoomsList.slice((safeTenantPage - 1) * TENANT_SEARCH_PER_PAGE, safeTenantPage * TENANT_SEARCH_PER_PAGE);

            // Build page number buttons
            const tPageNumbers: number[] = [];
            if (totalTenantPages <= 7) {
              for (let i = 1; i <= totalTenantPages; i++) tPageNumbers.push(i);
            } else {
              tPageNumbers.push(1);
              if (safeTenantPage > 3) tPageNumbers.push(-1);
              for (let i = Math.max(2, safeTenantPage - 1); i <= Math.min(totalTenantPages - 1, safeTenantPage + 1); i++) tPageNumbers.push(i);
              if (safeTenantPage < totalTenantPages - 2) tPageNumbers.push(-1);
              tPageNumbers.push(totalTenantPages);
            }

            // Group paged rooms by floor
            const floorMap: Record<number, any[]> = {};
            pageRoomsList.forEach((roomData: any) => {
              const fn = roomData.floorNumber || 0;
              if (!floorMap[fn]) floorMap[fn] = [];
              floorMap[fn].push(roomData);
            });
            const sortedFloors = Object.keys(floorMap).sort((a, b) => Number(a) - Number(b));
            return (
              <div className="space-y-3">
                {sortedFloors.map((floorNum) => (
              <div key={floorNum} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="size-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">{toBanglaNumber(floorNum)} তলা</span>
                  <div className="flex-1 border-t border-emerald-200" />
                </div>
                {floorMap[Number(floorNum)].map((roomData: any) => {
                  const isExpanded = expandedTenantRoomId === roomData.roomId;
                  return (
                <div key={roomData.roomId} className={`border-2 rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-indigo-400 shadow-lg shadow-indigo-100' : 'border-indigo-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'} bg-gradient-to-r from-indigo-50 via-white to-violet-50`}>
                  {/* Card header — clickable */}
                  <div className="cursor-pointer select-none px-2.5 py-1.5 flex items-center gap-2 hover:bg-indigo-50/50 transition-colors" onClick={() => setExpandedTenantRoomId(isExpanded ? null : roomData.roomId)}>
                    <span className="size-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 font-bold text-[10px] shadow-sm shadow-indigo-200">{roomData.roomNumber}</span>
                    <div className="flex-1 min-w-0">
                      {roomData.currentTenants?.length > 0 ? roomData.currentTenants.map((t: any) => (
                        <span key={t.id} className="text-xs font-medium text-gray-800 truncate block">{t.name}<span className="hidden sm:inline">{t.designation ? ` (${t.designation})` : ''}</span></span>
                      )) : <span className="text-[10px] text-gray-400 italic">কোনো ভাড়াটে নেই</span>}
                    </div>
                    {roomData.currentRoomUsers?.length > 0 && (
                      <div className="shrink-0 hidden sm:block">
                        {roomData.currentRoomUsers.map((u: any) => (
                          <span key={u.id} className="inline-flex items-center gap-0.5 bg-gradient-to-r from-cyan-100 via-sky-100 to-blue-100 border border-cyan-200 text-cyan-800 rounded px-1 py-px text-[9px] font-medium ml-1 first:ml-0">{u.name}{u.designation ? ` (${u.designation})` : ''}</span>
                        ))}
                      </div>
                    )}
                    <ChevronDown className={`size-4 text-gray-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                  {/* Expanded details */}
                  {isExpanded && roomData.currentTenants?.length > 0 && (
                    <div className="px-3 pb-2 pt-0.5 border-t border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-transparent animate-in slide-in-from-top-1 duration-200">
                      {roomData.currentTenants.map((t: any) => (
                        <div key={t.id} className="mt-2 p-2.5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 shadow-sm shadow-blue-100 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                              {t.designation && <p className="text-[11px] text-gray-600">{t.designation}</p>}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600 pl-1">
                            {t.department && <p><span className="text-gray-400">বিভাগ:</span> {t.department}</p>}
                            {t.phone && <p><span className="text-gray-400">ফোন:</span> {t.phone}</p>}
                            {t.startDate && <p><span className="text-gray-400">শুরু:</span> {formatDate(t.startDate)}</p>}
                            {t.endDate && <p><span className="text-gray-400">শেষ:</span> {formatDate(t.endDate)}</p>}
                          </div>
                        </div>
                      ))}
                      {roomData.currentRoomUsers?.length > 0 && (
                        <div className="mt-2 px-1">
                          <p className="text-[10px] text-gray-500 mb-1">রুম ব্যবহারকারী:</p>
                          <div className="space-y-1">
                            {roomData.currentRoomUsers.map((u: any) => (
                              <div key={u.id} className="bg-gradient-to-br from-cyan-100 via-sky-100 to-blue-100 border border-cyan-200 rounded-lg shadow-sm px-2.5 py-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-[11px] text-gray-800">{u.name}</span>
                                  {u.designation && <span className="text-[10px] text-gray-600">({u.designation})</span>}
                                  {u.phone && <span className="text-[10px] text-gray-500 hidden sm:inline">— {u.phone}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {isExpanded && (!roomData.currentTenants || roomData.currentTenants.length === 0) && (
                    <div className="px-3 pb-2.5 pt-0.5 border-t border-yellow-200/60 text-[11px] text-gray-400 italic">
                      এই রুমে কোনো বর্তমান ভাড়াটে নেই
                    </div>
                  )}
                </div>
                  );
                })}
              </div>
            ))}
                {/* Pagination at bottom */}
                {totalTenantPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 pt-2 border-t border-gray-100">
                  <span>মোট {toBanglaNumber(allRoomsList.length)} টি রুম — পাতা {toBanglaNumber(safeTenantPage)}/{toBanglaNumber(totalTenantPages)}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={safeTenantPage <= 1} onClick={() => { setTenantSearchPage(1); setExpandedTenantRoomId(null); }}>প্রথম</Button>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={safeTenantPage <= 1} onClick={() => { setTenantSearchPage(safeTenantPage - 1); setExpandedTenantRoomId(null); }}>আগে</Button>
                    {tPageNumbers.map((p, i) => (
                      p === -1
                        ? <span key={`e${i}`} className="text-[10px] px-1">...</span>
                        : <Button key={p} variant={p === safeTenantPage ? "default" : "outline"} size="sm" className="h-6 w-6 text-[10px] p-0" onClick={() => { setTenantSearchPage(p); setExpandedTenantRoomId(null); }}>{toBanglaNumber(p)}</Button>
                    ))}
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={safeTenantPage >= totalTenantPages} onClick={() => { setTenantSearchPage(safeTenantPage + 1); setExpandedTenantRoomId(null); }}>পরে</Button>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={safeTenantPage >= totalTenantPages} onClick={() => { setTenantSearchPage(totalTenantPages); setExpandedTenantRoomId(null); }}>শেষ</Button>
                  </div>
                </div>
                )}
              </div>
            );
          })()}

          {/* All Rooms Mode — Inventory (paginated expandable cards) */}
          {data.mode === 'allRooms' && overviewSubTab === "inventory" && (() => {
            const allRooms = data.rooms || [];
            const totalPages = Math.max(1, Math.ceil(allRooms.length / INV_SEARCH_PER_PAGE));
            const safePage = Math.min(invSearchPage, totalPages);
            const pageRooms = allRooms.slice((safePage - 1) * INV_SEARCH_PER_PAGE, safePage * INV_SEARCH_PER_PAGE);

            // Build page number buttons
            const pageNumbers: number[] = [];
            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
            } else {
              pageNumbers.push(1);
              if (safePage > 3) pageNumbers.push(-1);
              for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pageNumbers.push(i);
              if (safePage < totalPages - 2) pageNumbers.push(-1);
              pageNumbers.push(totalPages);
            }

            return (
              <div className="space-y-3">
                {/* Room cards */}
                {pageRooms.map((roomData: any) => {
                  const isExpanded = expandedInvRoomId === roomData.roomId;
                  const displayItems = roomData.currentTenants?.length > 0
                    ? (roomData.currentInventory || [])
                    : [...(roomData.currentInventory || []), ...(roomData.previousInventory || [])];
                  const uniqueItems = Array.from(new Map(displayItems.map((item: any) => [item.id, item])).values());
                  const hasTenant = (roomData.currentTenants?.length || 0) > 0;
                  const hasUser = (roomData.currentRoomUsers?.length || 0) > 0;
                  const tenantName = hasTenant ? roomData.currentTenants.map((t: any) => t.name).join(', ') : '';
                  const tenantDesignation = hasTenant ? roomData.currentTenants.map((t: any) => t.designation).filter(Boolean).join(', ') : '';
                  const userName = hasUser ? roomData.currentRoomUsers.map((u: any) => u.name).join(', ') : '';
                  const userDesignation = hasUser ? roomData.currentRoomUsers.map((u: any) => u.designation).filter(Boolean).join(', ') : '';

                  return (
                    <div key={roomData.roomId} className={`transition-all ${isExpanded ? 'ring-1 ring-teal-400 bg-white' : ''} border-b border-teal-100`}>
                      {/* Card header — clickable to expand */}
                      <div className="cursor-pointer select-none flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-0.5 sm:py-0.5 bg-gradient-to-r from-teal-50 to-cyan-50" onClick={() => handleExpandInvRoom(roomData)}>
                          <div className="size-5 sm:size-6 rounded bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-[10px] sm:text-xs">{roomData.roomNumber}</div>
                          <div className="flex-1 min-w-0 flex flex-col gap-0">
                            {hasTenant && roomData.currentTenants.map((t: any) => (
                              <span key={t.id} className="text-xs sm:text-sm font-semibold text-emerald-800 truncate leading-tight">{t.name}<span className="hidden sm:inline">{t.designation ? ` (${t.designation})` : ''}</span></span>
                            ))}
                            {hasUser && roomData.currentRoomUsers.map((u: any) => (
                              <span key={u.id} className="text-xs sm:text-sm font-semibold text-cyan-700 truncate leading-tight">{u.name}<span className="hidden sm:inline">{u.designation ? ` (${u.designation})` : ''}</span></span>
                            ))}
                            {!hasTenant && !hasUser && (
                              <span className="text-xs sm:text-sm text-muted-foreground italic">খালি</span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <span className="text-[10px] sm:text-xs text-blue-600 font-bold">{toBanglaNumber(uniqueItems.length)} মালামাল</span>
                            <ChevronDown className={`size-3 sm:size-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                      </div>

                      {/* Expanded content — detailed inventory */}
                      {isExpanded && (
                        <div className="px-3 sm:px-4 pb-2 pt-1">
                          <div>
                            {uniqueItems.length > 0 ? (
                              <div className="space-y-1">
                                {uniqueItems.map((item: any) => {
                                  const repairInfo = invSearchRepairDates[item.id];
                                  return (
                                    <div key={item.id} className="bg-amber-50/50 rounded-lg px-2.5 py-1.5 border border-amber-100/60">
                                      <div className="flex items-center justify-between gap-1">
                                        <div className="flex-1 min-w-0 flex items-center gap-1">
                                          <span className="font-medium text-xs sm:text-sm text-gray-800 truncate">{item.itemName}</span>
                                          <span className="text-[10px] sm:text-xs text-gray-600 shrink-0">({toBanglaNumber(item.quantity)})</span>
                                          <span className="text-[9px] sm:text-[10px]">{getConditionBadge(item.condition)}</span>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <Button variant="ghost" size="sm" className="size-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-100" onClick={async () => {
                                            const _item = item;
                                            setEditInvItem({ id: _item.id, itemName: _item.itemName, quantity: _item.quantity, condition: _item.condition, note: _item.note });
                                            setNewRepairDate(""); setNewRepairNote(""); setNewReplaceDate(""); setNewReplaceNote("");
                                            setShowInvHistory(false); setInvHistoryPage(1); setInvRepairHistory([]);
                                            setInvLatestRepairDate(""); setInvLatestReplaceDate("");
                                            try {
                                              const res = await fetch(`/api/inventory/repair-replace?inventoryId=${_item.id}`);
                                              if (res.ok) {
                                                const records = await res.json();
                                                setInvRepairHistory(records);
                                                const repairRecord = records.find((r: any) => r.type === "repair");
                                                const replaceRecord = records.find((r: any) => r.type === "replace");
                                                if (repairRecord) setInvLatestRepairDate(repairRecord.actionDate ? repairRecord.actionDate.split("T")[0] : "");
                                                if (replaceRecord) setInvLatestReplaceDate(replaceRecord.actionDate ? replaceRecord.actionDate.split("T")[0] : "");
                                              }
                                            } catch { /* silent */ }
                                            setEditInvOpen(true);
                                          }}><Edit3 className="size-3" /></Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="sm" className="size-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-100"><Trash2 className="size-3" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>মালামাল মুছে ফেলবেন?</AlertDialogTitle>
                                                <AlertDialogDescription>{"\"" + item.itemName + "\" স্থায়ীভাবে মুছে যাবে।"}</AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>বাতিল</AlertDialogCancel>
                                                <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDeleteInventory(item.id)} disabled={deletingInv}>মুছে ফেলুন</AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      </div>
                                      {(repairInfo?.latestRepair || repairInfo?.latestReplace) && (
                                        <div className="flex items-center gap-2 mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground">
                                          {repairInfo?.latestRepair && <span className="text-blue-600">রিপেয়ার: {formatDate(repairInfo.latestRepair)}</span>}
                                          {repairInfo?.latestReplace && <span className="text-orange-600">রিপ্লেস: {formatDate(repairInfo.latestReplace)}</span>}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : <p className="text-[9px] text-muted-foreground text-center py-1">কোনো মালামাল নেই</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Bottom pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 pt-2 border-t border-gray-100">
                    <span>মোট {toBanglaNumber(allRooms.length)} টি রুম — পাতা {toBanglaNumber(safePage)}/{toBanglaNumber(totalPages)}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={safePage <= 1} onClick={() => { setInvSearchPage(safePage - 1); setExpandedInvRoomId(null); }}>আগে</Button>
                      {pageNumbers.map((p, i) => (
                        p === -1
                          ? <span key={`eb${i}`} className="text-[10px] px-1">...</span>
                          : <Button key={p} variant={p === safePage ? "default" : "outline"} size="sm" className="h-6 w-6 text-[10px] p-0" onClick={() => setInvSearchPage(p)}>{toBanglaNumber(p)}</Button>
                      ))}
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={safePage >= totalPages} onClick={() => { setInvSearchPage(safePage + 1); setExpandedInvRoomId(null); }}>পরে</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Single Room Mode — existing content */}
          {data.mode !== 'allRooms' && (<>
          {/* ভাড়াটে তালিকা — only when tenants sub-tab selected */}
          {overviewSubTab === "tenants" && (
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-emerald-700"><Users className="size-3.5" /> ভাড়াটে তালিকা</h3>
            {data.currentTenants?.length > 0 ? (
              <div className="space-y-2 mb-3">
                {(data.currentTenants || []).map((tenant) => (
                  <div key={tenant.id} className="bg-emerald-50/50 border border-emerald-200 rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-sm font-bold shrink-0">{tenant.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0 grid grid-cols-4 gap-2 text-sm">
                        <div><span className="text-muted-foreground text-xs">নাম</span><p className="font-medium truncate">{tenant.name}</p></div>
                        <div><span className="text-muted-foreground text-xs">পদবী</span><p className="font-medium truncate">{tenant.designation || "-"}</p></div>
                        <div><span className="text-muted-foreground text-xs">ফোন</span><p className="font-medium truncate">{tenant.phone || "-"}</p></div>
                        <div><span className="text-muted-foreground text-xs">শুরু</span><p className="font-medium text-xs">{formatDate(tenant.startDate)}</p></div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="size-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => { setEditTenantData({ id: tenant.id, name: tenant.name, designation: tenant.designation || "", phone: tenant.phone || "", department: (tenant as any).department || "", startDate: tenant.startDate ? tenant.startDate.split('T')[0] : "" }); setEditTenantOpen(true); }}><Edit3 className="size-3.5" /></Button>
                        <Button variant="outline" size="sm" className="gap-1 text-xs text-orange-600 border-orange-300 hover:bg-orange-50 h-7 px-2" onClick={() => openVacateDialog(tenant.id)}>রুম ছেড়ে দিন</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (<p className="text-sm text-muted-foreground bg-gray-50 rounded-lg px-3 py-2 mb-3">এই রুমে বর্তমানে কোনো ভাড়াটে নেই</p>)}

            {data.previousTenants?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5"><span className="text-xs font-semibold text-gray-600">পূর্বের ভাড়াটেগণ</span><Badge variant="secondary" className="text-[10px] h-4 px-1.5">{data.previousTenants?.length}</Badge></div>
                <div className="space-y-1.5">
                  {(() => {
                    const gradients = [
                      "bg-gradient-to-br from-violet-300 via-purple-300 to-fuchsia-300 shadow-md shadow-violet-200/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-rose-300 via-pink-300 to-red-200 shadow-md shadow-rose-200/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-amber-200 via-orange-300 to-red-200 shadow-md shadow-amber-200/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-emerald-200 via-green-300 to-teal-200 shadow-md shadow-emerald-200/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-blue-200 via-indigo-300 to-blue-300 shadow-md shadow-blue-200/50 ring-1 ring-white/50",
                      "bg-gradient-to-br from-cyan-200 via-sky-300 to-blue-200 shadow-md shadow-cyan-200/50 ring-1 ring-white/50",
                    ];
                    return paginatedPrevTenants.map((tenant, tIdx) => {
                    const vacateRecord = data.vacateRecords?.find((vr: any) => vr.tenantId === tenant.id);
                    let snapshotItems: VacateInventoryItem[] = [];
                    try { snapshotItems = vacateRecord ? JSON.parse(vacateRecord.inventorySnapshot) : []; } catch { /* empty */ }
                    const gradClass = gradients[tIdx % 6];
                    const isExp = expandedPrevTenant === tenant.id;
                    return (
                      <div key={tenant.id} className={`${gradClass} rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] shadow-xl`}>
                        <div className="flex items-center gap-1.5 px-2.5 py-2 text-gray-800 cursor-pointer" onClick={() => setExpandedPrevTenant(isExp ? null : tenant.id)}>
                          <div className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center text-[10px] font-bold shrink-0 text-gray-600">{tenant.name.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold truncate">{tenant.name}</p>
                            <p className="text-[9px] text-gray-500">{formatDate(tenant.startDate)}{tenant.endDate ? ` — ${formatDate(tenant.endDate)}` : ""} • রুম: {data.roomNumber}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button className="size-5 rounded-md bg-white/50 hover:bg-white/70 flex items-center justify-center transition-colors text-gray-600" onClick={(e) => { e.stopPropagation(); setEditTenantData({ id: tenant.id, name: tenant.name, designation: tenant.designation || "", phone: tenant.phone || "", department: (tenant as any).department || "", startDate: tenant.startDate ? tenant.startDate.split('T')[0] : "", endDate: tenant.endDate ? tenant.endDate.split('T')[0] : "" }); setEditTenantOpen(true); }}>
                              <Edit3 className="size-2.5" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="size-5 rounded-md bg-white/50 hover:bg-red-100 flex items-center justify-center transition-colors text-gray-600" onClick={(e) => e.stopPropagation()}>
                                  <Trash2 className="size-2.5" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>ভাড়াটে মুছে ফেলবেন?</AlertDialogTitle>
                                  <AlertDialogDescription>&quot;{tenant.name}&quot; এর সকল তথ্য মুছে যাবে।</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>বাতিল</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={(e) => { e.preventDefault(); handleDeleteTenant(tenant.id); }} disabled={deletingTenant}>
                                    {deletingTenant ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "মুছে ফেলুন"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        {isExp && (
                          <div className="px-3 pb-2.5">
                            <div className="bg-white/95 rounded-lg overflow-hidden">
                              <div className="grid grid-cols-2 gap-2 text-xs px-3 py-2">
                                <div><span className="text-muted-foreground">ফোন:</span> {tenant.phone || "—"}</div>
                                <div><span className="text-muted-foreground">সময়কাল:</span> {formatDate(tenant.startDate)}{tenant.endDate ? ` — ${formatDate(tenant.endDate)}` : ""}</div>
                              </div>
                              {snapshotItems.length > 0 && (
                                <div className="border-t border-gray-100">
                                  <div className="flex items-center gap-2 px-3 pt-1.5 pb-1">
                                    <button className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors" onClick={(e) => { e.stopPropagation(); ovHandleDeleteSnapshot(vacateRecord!.id); }} disabled={ovDeletingSnapshot}>
                                      <Trash2 className="size-3" />
                                      {ovDeletingSnapshot ? "হচ্ছে..." : "সব মালামাল মুছুন"}
                                    </button>
                                    <button className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors" onClick={(e) => { e.stopPropagation(); ovHandleDownloadSnapshot(vacateRecord!, tenant); }}>
                                      <Download className="size-3" />
                                      ডাউনলোড
                                    </button>
                                  </div>
                                  <div className="px-3 pb-2">
                                    <p className="text-[10px] text-muted-foreground mb-1">চলে যাওয়ার সময়কার মালামাল:</p>
                                    <div className="border rounded divide-y overflow-hidden">
                                      {snapshotItems.map((item, idx) => {
                                        const repairInfo = item.latestRepair ? `রিপেয়ার: ${item.latestRepair?.split('T')[0] || item.latestRepair}` : '';
                                        const replaceInfo = item.latestReplace ? `রিপ্লেস: ${item.latestReplace?.split('T')[0] || item.latestReplace}` : '';
                                        return (
                                          <div key={idx} className="flex items-center gap-2 px-2 py-1 text-xs">
                                            <span className="flex-1 truncate">{item.itemName}</span>
                                            <span className="text-muted-foreground">×{item.quantity}</span>
                                            {getConditionBadge(item.condition)}
                                            {item.note && <span className="text-[10px] text-muted-foreground truncate max-w-[60px] hidden sm:inline" title={item.note}>{item.note}</span>}
                                            {(repairInfo || replaceInfo) && <span className="text-[9px] text-muted-foreground hidden md:inline">{repairInfo || replaceInfo}</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {snapshotItems.length === 0 && (
                                <p className="text-[10px] text-gray-400 px-3 py-2">কোনো মালামাল স্ন্যাপশট নেই</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    });
                  })()}
                </div>
                {totalPrevPages > 1 && (<div className="flex items-center justify-center gap-1 mt-2"><Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={prevPage <= 1} onClick={() => setPrevPage(prevPage - 1)}>আগে</Button>{Array.from({ length: totalPrevPages }, (_, i) => i + 1).map((p) => (<Button key={p} variant={p === prevPage ? "default" : "outline"} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => setPrevPage(p)}>{p}</Button>))}<Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={prevPage >= totalPrevPages} onClick={() => setPrevPage(prevPage + 1)}>পরে</Button></div>)}
              </div>
            )}
          </div>
          )}

          {/* মালামাল তালিকা — only when inventory sub-tab selected */}
          {overviewSubTab === "inventory" && (
          <div>
            <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold flex items-center gap-1.5 text-emerald-700"><Package className="size-3.5" /> মালামাল তালিকা<Badge variant="secondary" className="text-[10px] h-4 px-1.5">{data.currentInventory?.length || 0}</Badge></h3><div className="flex items-center gap-1.5">{(data.currentInventory?.length || 0) > 0 && <button onClick={() => {
              if (ovBulkEditMode) { setOvBulkEditMode(false); setOvBulkEditData({}); }
              else {
                setOvBulkEditMode(true);
                const bData: Record<string, { quantity: string; condition: string }> = {};
                (data.currentInventory || []).forEach((item: any) => { bData[item.id] = { quantity: String(item.quantity), condition: item.condition }; });
                setOvBulkEditData(bData);
              }
            }} className={`text-[9px] px-1.5 py-0.5 rounded ${ovBulkEditMode ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} hover:opacity-80`}>{ovBulkEditMode ? 'বাল্ক বন্ধ' : 'বাল্ক এডিট'}</button>}<Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-2 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleDownloadInventoryXlsx} disabled={downloadingInvXlsx}>{downloadingInvXlsx ? <div className="size-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /> : <Download className="size-2.5" />}XLSX</Button><Button size="sm" className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-0.5 px-2" onClick={() => { setAddInvTenantId(data.currentTenants?.[0]?.id || ""); setAddInvName(""); setAddInvQty("1"); setAddInvCondition("আছে"); setAddInvNote(""); setAddInvOpen(true); }}><Plus className="size-2.5" />যোগ</Button><Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={handleLoadCommonOverview} disabled={loadingCommon}>{loadingCommon ? <div className="size-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /> : <Package className="size-2.5" />}কমন লোড</Button></div></div>
            {/* Loaded common belongings list */}
            {commonItems.length > 0 && (
              <div className="border border-emerald-200 bg-emerald-50/30 rounded-lg p-2 mb-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-emerald-700">{toBanglaNumber(commonItems.length)} টি কমন মালামাল লোড হয়েছে</span>
                  <Button variant="ghost" size="sm" className="h-5 text-[9px] text-red-500 hover:text-red-700 hover:bg-red-50 px-1.5" onClick={() => { setCommonItems([]); setEditingCommonIdx(null); }}>সব মুছুন</Button>
                </div>
                <div className="space-y-0.5 max-h-36 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {commonItems.map((item, idx) => (
                    editingCommonIdx === idx ? (
                      <div key={idx} className="flex items-center gap-1 text-[10px] bg-emerald-50 rounded px-1.5 py-1 border border-emerald-200">
                        <input className="flex-1 min-w-0 h-6 px-1 text-[10px] border rounded bg-white" value={editCommonName} onChange={e => setEditCommonName(e.target.value)} />
                        <input className="w-10 h-6 px-1 text-[10px] border rounded bg-white text-center" type="number" min={0} value={editCommonQty} onChange={e => setEditCommonQty(e.target.value)} />
                        <select className="h-6 px-1 text-[10px] border rounded bg-white" value={editCommonCond} onChange={e => setEditCommonCond(e.target.value)}>
                          <option value="আছে">আছে</option><option value="নেই">নেই</option><option value="ভালো">ভালো</option><option value="খারাপ">খারাপ</option><option value="নতুন">নতুন</option><option value="পুরাতন">পুরাতন</option><option value="নস্ট">নস্ট</option><option value="ভাঙা">ভাঙা</option><option value="মাঝারি">মাঝারি</option>
                        </select>
                        <button className="size-5 text-emerald-600 hover:bg-emerald-100 rounded" onClick={() => { setCommonItems(prev => prev.map((it, i) => i === idx ? { itemName: editCommonName, quantity: editCommonQty, condition: editCommonCond } : it)); setEditingCommonIdx(null); }}>✓</button>
                        <button className="size-5 text-red-400 hover:bg-red-50 rounded" onClick={() => setEditingCommonIdx(null)}>✗</button>
                      </div>
                    ) : (
                      <div key={idx} className="flex items-center gap-1.5 text-[10px] bg-white rounded px-1.5 py-0.5 border">
                        <span className="flex-1 truncate">{item.itemName}</span>
                        <span className="text-muted-foreground">{toBanglaNumber(item.quantity)}</span>
                        <span className={item.condition === 'ভালো' ? 'text-emerald-600' : item.condition === 'মাঝারি' ? 'text-yellow-600' : 'text-red-600'}>{item.condition}</span>
                        <button className="size-4 text-blue-500 hover:bg-blue-50 rounded shrink-0" onClick={() => { setEditingCommonIdx(idx); setEditCommonName(item.itemName); setEditCommonQty(item.quantity); setEditCommonCond(item.condition); }}>✏️</button>
                        <button className="size-4 text-red-400 hover:bg-red-50 rounded shrink-0" onClick={() => setCommonItems(prev => prev.filter((_, i) => i !== idx))}>🗑️</button>
                      </div>
                    )
                  ))}
                </div>
                {/* Add to room button */}
                {commonItems.length > 0 && (
                  <div className="space-y-1">
                    <Button size="sm" className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-0.5 px-2" onClick={handleAddCommonToTenantOverview} disabled={addingCommonToTenant}>
                      {addingCommonToTenant ? <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Package className="size-2.5" />}
                      রুমে মালামাল যোগ করুন
                    </Button>
                  </div>
                )}
              </div>
            )}
            {/* Tenant & User info */}
            {data.currentTenants?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mb-1.5">
                <span className="text-[9px] text-muted-foreground">বরাদ্দকৃত:</span>
                {data.currentTenants.map((t: any) => (
                  <span key={t.id} className="inline-flex items-center gap-0.5 bg-emerald-100/70 text-emerald-800 rounded-full px-1.5 py-px text-[9px] font-medium"><span className="size-1 rounded-full bg-emerald-500" />{t.name}</span>
                ))}
              </div>
            )}
            {data.currentRoomUsers?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mb-1.5">
                <span className="text-[9px] text-muted-foreground">ব্যবহারকারী:</span>
                {data.currentRoomUsers.map((u: any) => (
                  <span key={u.id} className="inline-flex items-center gap-0.5 bg-gradient-to-r from-cyan-100/70 via-sky-100/70 to-blue-100/70 text-cyan-800 rounded-full px-1.5 py-px text-[9px] font-medium"><span className="size-1 rounded-full bg-cyan-500" />{u.name}</span>
                ))}
              </div>
            )}
            {(data.currentInventory?.length || 0) === 0 ? (<p className="text-xs text-muted-foreground bg-gray-50 rounded px-2 py-1.5">কোনো মালামাল নেই</p>) : (
            <div className="space-y-0.5">
              {(data.currentInventory || []).map((item) => {
                const repairInfo = invSearchRepairDates[item.id];
                return (
                  <div key={item.id} className="bg-amber-50/50 rounded px-2 py-1 border border-amber-100/60">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex-1 min-w-0 flex items-center gap-1">
                        <span className="font-medium text-[10px] text-gray-800 truncate">{item.itemName}</span>
                        {ovBulkEditMode ? (
                          <input className="w-10 h-5 text-[10px] border rounded px-0.5 text-center" type="number" min={0} value={ovBulkEditData[item.id]?.quantity || ''} onChange={(e) => { setOvBulkEditData(prev => ({...prev, [item.id]: {...prev[item.id], quantity: e.target.value}})); }} />
                        ) : (
                          <span className="text-[8px] text-muted-foreground shrink-0">({toBanglaNumber(item.quantity)})</span>
                        )}
                        {ovBulkEditMode ? (
                          <select className="h-5 text-[10px] border rounded px-0.5" value={ovBulkEditData[item.id]?.condition || ''} onChange={(e) => { setOvBulkEditData(prev => ({...prev, [item.id]: {...prev[item.id], condition: e.target.value}})); }}>
                            <option value="আছে">আছে</option><option value="নেই">নেই</option><option value="ভালো">ভালো</option><option value="খারাপ">খারাপ</option><option value="নতুন">নতুন</option><option value="পুরাতন">পুরাতন</option><option value="নস্ট">নস্ট</option><option value="ভাঙা">ভাঙা</option><option value="মাঝারি">মাঝারি</option>
                          </select>
                        ) : (
                          <span className="text-[8px]">{getConditionBadge(item.condition)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="sm" className="size-5 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-100" onClick={async () => {
                          setEditInvItem({ id: item.id, itemName: item.itemName, quantity: item.quantity, condition: item.condition, note: item.note });
                          setNewRepairDate(""); setNewRepairNote(""); setNewReplaceDate(""); setNewReplaceNote("");
                          setShowInvHistory(false); setInvHistoryPage(1); setInvRepairHistory([]);
                          setInvLatestRepairDate(""); setInvLatestReplaceDate("");
                          try {
                            const res = await fetch(`/api/inventory/repair-replace?inventoryId=${item.id}`);
                            if (res.ok) {
                              const records = await res.json();
                              setInvRepairHistory(records);
                              const repairRecord = records.find((r: any) => r.type === "repair");
                              const replaceRecord = records.find((r: any) => r.type === "replace");
                              if (repairRecord) setInvLatestRepairDate(repairRecord.actionDate ? repairRecord.actionDate.split("T")[0] : "");
                              if (replaceRecord) setInvLatestReplaceDate(replaceRecord.actionDate ? replaceRecord.actionDate.split("T")[0] : "");
                            }
                          } catch { /* silent */ }
                          setEditInvOpen(true);
                        }}><Edit3 className="size-2.5" /></Button>
                        <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="size-5 p-0 text-red-400 hover:text-red-600 hover:bg-red-100"><Trash2 className="size-2.5" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>মালামাল মুছে ফেলবেন?</AlertDialogTitle><AlertDialogDescription>&quot;{item.itemName}&quot; স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>বাতিল</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDeleteInventory(item.id)} disabled={deletingInv}>মুছে ফেলুন</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                      </div>
                    </div>
                    {(repairInfo?.latestRepair || repairInfo?.latestReplace) && (
                      <div className="flex items-center gap-2 mt-0.5 text-[8px] text-muted-foreground">
                        {repairInfo?.latestRepair && <span className="text-blue-600">রিপেয়ার: {formatDate(repairInfo.latestRepair)}</span>}
                        {repairInfo?.latestReplace && <span className="text-orange-600">রিপ্লেস: {formatDate(repairInfo.latestReplace)}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
            {ovBulkEditMode && (
              <div className="flex gap-2 mt-2 justify-end">
                <Button size="sm" className="h-6 text-[10px] bg-emerald-600 text-white gap-1 px-2" onClick={async () => {
                  setOvSavingBulk(true);
                  try {
                    const items = Object.entries(ovBulkEditData).map(([id, bdata]) => ({ id, ...bdata }));
                    const res = await fetch("/api/inventory/bulk-update", { method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ items }) });
                    if (res.ok) { toast.success("সব মালামাল আপডেট হয়েছে"); setOvBulkEditMode(false); setOvBulkEditData({}); handleSearch(); }
                    else toast.error("আপডেট করতে সমস্যা");
                  } catch { toast.error("আপডেট করতে সমস্যা"); }
                  setOvSavingBulk(false);
                }} disabled={ovSavingBulk}>
                  {ovSavingBulk ? "সেভ হচ্ছে..." : "সব সেভ করুন"}
                </Button>
              </div>
            )}
          </div>
          )}
          </>)}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={editTenantOpen} onOpenChange={setEditTenantOpen}><DialogContent><DialogHeader><DialogTitle>ভাড়াটে তথ্য সম্পাদনা</DialogTitle></DialogHeader>{editTenantData && (<div className="space-y-4"><div className="space-y-1.5"><Label>নাম</Label><Input value={editTenantData.name} onChange={(e) => setEditTenantData({ ...editTenantData, name: e.target.value })} /></div><div className="space-y-1.5"><Label>পদবী</Label><Input value={editTenantData.designation} onChange={(e) => setEditTenantData({ ...editTenantData, designation: e.target.value })} placeholder="যেমন: ছাত্র, চাকরিজীবী" /></div><div className="space-y-1.5"><Label>ফোন নম্বর</Label><Input value={editTenantData.phone} onChange={(e) => setEditTenantData({ ...editTenantData, phone: e.target.value })} placeholder="০১XXXXXXXXX" /></div><div className="space-y-1.5"><Label>দপ্তর</Label><Input value={editTenantData.department} onChange={(e) => setEditTenantData({ ...editTenantData, department: e.target.value })} placeholder="দপ্তরের নাম" /></div><div className="space-y-1.5"><Label>শুরুর তারিখ</Label><Input type="date" value={editTenantData.startDate} onChange={(e) => setEditTenantData({ ...editTenantData, startDate: e.target.value })} /></div><div className="space-y-1.5"><Label>শেষ তারিখ</Label><Input type="date" value={editTenantData.endDate || ""} onChange={(e) => setEditTenantData({ ...editTenantData, endDate: e.target.value })} /></div></div>)}<DialogFooter><Button variant="outline" onClick={() => { setEditTenantOpen(false); setEditTenantData(null); }}>বাতিল</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleEditTenant} disabled={editingTenant}>{editingTenant ? "আপডেট হচ্ছে..." : "আপডেট করুন"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={editInvOpen} onOpenChange={(open) => { setEditInvOpen(open); if (!open) { setEditInvItem(null); setNewRepairDate(""); setNewReplaceDate(""); setNewRepairNote(""); setNewReplaceNote(""); setInvRepairHistory([]); setInvLatestRepairDate(""); setInvLatestReplaceDate(""); setShowInvHistory(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Edit3 className="size-5" />
              মালামাল সম্পাদনা
            </DialogTitle>
          </DialogHeader>
          {editInvItem && (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {/* Basic info */}
              <div className="space-y-1">
                <Label className="text-xs">জিনিসের নাম</Label>
                <Input className="h-8 text-sm" value={editInvItem.itemName} onChange={(e) => setEditInvItem({ ...editInvItem, itemName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">পরিমাণ</Label>
                  <Input className="h-8 text-sm" type="number" min={0} value={editInvItem.quantity} onChange={(e) => setEditInvItem({ ...editInvItem, quantity: e.target.value === '' ? '' : Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">অবস্থা</Label>
                  <Select value={editInvItem.condition} onValueChange={(v) => setEditInvItem({ ...editInvItem, condition: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="আছে">আছে</SelectItem><SelectItem value="নেই">নেই</SelectItem><SelectItem value="ভালো">ভালো</SelectItem><SelectItem value="খারাপ">খারাপ</SelectItem><SelectItem value="নতুন">নতুন</SelectItem><SelectItem value="পুরাতন">পুরাতন</SelectItem><SelectItem value="নস্ট">নস্ট</SelectItem><SelectItem value="ভাঙা">ভাঙা</SelectItem><SelectItem value="মাঝারি">মাঝারি</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">নোট</Label>
                <Input className="h-8 text-sm" value={editInvItem.note || ""} onChange={(e) => setEditInvItem({ ...editInvItem, note: e.target.value })} />
              </div>

              {/* Divider */}
              <div className="border-t pt-2 mt-2">
                <p className="text-xs font-semibold text-gray-500 mb-2">Repair / Replace রেকর্ড</p>
              </div>

              {/* Latest Repair Date (read-only) */}
              {invLatestRepairDate && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="size-3.5 text-blue-500" />
                    <span className="text-xs text-blue-700 font-medium">সর্বশেষ Repair:</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-800">{formatDate(invLatestRepairDate)}</span>
                </div>
              )}

              {/* Latest Replace Date (read-only) */}
              {invLatestReplaceDate && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className="size-3.5 text-amber-500" />
                    <span className="text-xs text-amber-700 font-medium">সর্বশেষ Replace:</span>
                  </div>
                  <span className="text-xs font-semibold text-amber-800">{formatDate(invLatestReplaceDate)}</span>
                </div>
              )}

              {/* Add new Repair */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 space-y-2">
                <p className="text-xs font-medium text-gray-600 flex items-center gap-1"><Wrench className="size-3" />Repair</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-7 text-xs" type="date" value={newRepairDate} onChange={(e) => setNewRepairDate(e.target.value)} placeholder="তারিখ" />
                  <Input className="h-7 text-xs" value={newRepairNote} onChange={(e) => setNewRepairNote(e.target.value)} placeholder="নোট (ঐচ্ছিক)" />
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs w-full border-blue-200 text-blue-600 hover:bg-blue-50" disabled={!newRepairDate || savingRepairRecord} onClick={() => handleSaveQuickRepair("repair")}>
                  {savingRepairRecord ? "হচ্ছে..." : "Repair সেভ করুন"}
                </Button>
              </div>

              {/* Add new Replace */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 space-y-2">
                <p className="text-xs font-medium text-gray-600 flex items-center gap-1"><RefreshCw className="size-3" />Replace</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-7 text-xs" type="date" value={newReplaceDate} onChange={(e) => setNewReplaceDate(e.target.value)} placeholder="তারিখ" />
                  <Input className="h-7 text-xs" value={newReplaceNote} onChange={(e) => setNewReplaceNote(e.target.value)} placeholder="নোট (ঐচ্ছিক)" />
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs w-full border-amber-200 text-amber-600 hover:bg-amber-50" disabled={!newReplaceDate || savingRepairRecord} onClick={() => handleSaveQuickRepair("replace")}>
                  {savingRepairRecord ? "হচ্ছে..." : "Replace সেভ করুন"}
                </Button>
              </div>

              {/* Collapsible history with pagination */}
              {invRepairHistory.length > 0 && (
                <div className="border-t pt-2">
                  <button
                    onClick={() => { setShowInvHistory(!showInvHistory); if (!showInvHistory) setInvHistoryPage(1); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors w-full"
                  >
                    {showInvHistory ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                    <span>সকল রেকর্ড দেখুন ({toBanglaNumber(invRepairHistory.length)})</span>
                  </button>
                  {showInvHistory && (() => {
                    const totalPages = Math.ceil(invRepairHistory.length / INV_HISTORY_PER_PAGE_OV);
                    const pagedRecords = invRepairHistory.slice((invHistoryPage - 1) * INV_HISTORY_PER_PAGE_OV, invHistoryPage * INV_HISTORY_PER_PAGE_OV);
                    return (
                      <div className="mt-2">
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {pagedRecords.map((r) => (
                            <div key={r.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-md px-2.5 py-1.5">
                              <div className="flex items-center gap-2">
                                {r.type === "repair" ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"><Wrench className="size-2.5" />Repair</span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700"><RefreshCw className="size-2.5" />Replace</span>
                                )}
                                <span className="text-xs text-gray-600">{formatDate(r.actionDate)}</span>
                                {r.note && <span className="text-[10px] text-gray-400">({r.note})</span>}
                              </div>
                              <button onClick={() => handleDeleteRepairRecord(r.id)} className="size-5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center" title="মুছুন">
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                            <button onClick={() => setInvHistoryPage((p) => Math.max(1, p - 1))} disabled={invHistoryPage <= 1} className="size-6 rounded text-[10px] flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">&#8249;</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                              <button key={pg} onClick={() => setInvHistoryPage(pg)} className={`size-6 rounded text-[10px] flex items-center justify-center border ${pg === invHistoryPage ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"}`}>{toBanglaNumber(pg)}</button>
                            ))}
                            <button onClick={() => setInvHistoryPage((p) => Math.min(totalPages, p + 1))} disabled={invHistoryPage >= totalPages} className="size-6 rounded text-[10px] flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">&#8250;</button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setEditInvOpen(false); setEditInvItem(null); }}>বাতিল</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleEditInventory} disabled={editingInv || !editInvItem?.itemName.trim()}>
              {editingInv ? "হচ্ছে..." : "আপডেট করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={addInvOpen} onOpenChange={setAddInvOpen}><DialogContent><DialogHeader><DialogTitle>নতুন মালামাল যোগ করুন</DialogTitle><DialogDescription>রুম {data?.roomNumber} এ নতুন মালামাল যোগ করুন</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-1.5"><Label>মালামালের নাম *</Label><Input placeholder="যেমন: ফ্যান" value={addInvName} onChange={(e) => setAddInvName(e.target.value)} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>পরিমাণ</Label><Input type="number" min={0} value={addInvQty} onChange={(e) => setAddInvQty(e.target.value)} /></div><div className="space-y-1.5"><Label>অবস্থা</Label><Select value={addInvCondition} onValueChange={setAddInvCondition}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="আছে">আছে</SelectItem><SelectItem value="নেই">নেই</SelectItem><SelectItem value="ভালো">ভালো</SelectItem><SelectItem value="খারাপ">খারাপ</SelectItem><SelectItem value="নতুন">নতুন</SelectItem><SelectItem value="পুরাতন">পুরাতন</SelectItem><SelectItem value="নস্ট">নস্ট</SelectItem><SelectItem value="ভাঙা">ভাঙা</SelectItem><SelectItem value="মাঝারি">মাঝারি</SelectItem></SelectContent></Select></div></div><div className="space-y-1.5"><Label>নোট (ঐচ্ছিক)</Label><Textarea placeholder="কোনো বিশেষ নোট" value={addInvNote} onChange={(e) => setAddInvNote(e.target.value)} rows={2} /></div></div><DialogFooter><Button variant="outline" onClick={() => setAddInvOpen(false)}>বাতিল</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAddInventory} disabled={addingInv}>{addingInv ? "যোগ হচ্ছে..." : "যোগ করুন"}</Button></DialogFooter></DialogContent></Dialog>

      {/* Vacate Dialog */}
      <Dialog open={vacateOpen} onOpenChange={setVacateOpen}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>ভাড়াটে রুম ছেড়ে দিন</DialogTitle><DialogDescription>{data?.currentTenants?.find((t) => t.id === vacateTenantId)?.name || data?.currentTenants?.[0]?.name} রুম ছেড়ে দিচ্ছেন। মালামালের অবস্থা যাচাই করুন।</DialogDescription></DialogHeader><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-muted-foreground">রুম নম্বর</p><p className="font-semibold">{data?.roomNumber}</p></div><div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-muted-foreground">ভাড়াটে</p><p className="font-semibold">{data?.currentTenants?.find((t) => t.id === vacateTenantId)?.name || data?.currentTenants?.[0]?.name}</p></div></div><div><div className="flex items-center justify-between mb-2"><Label>মালামালের তালিকা</Label><Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addVacateItem}><Plus className="size-3" />আইটেম যোগ</Button></div><div className="space-y-2 max-h-72 overflow-y-auto">{vacateItems.map((item, idx) => (<div key={idx} className={`rounded-lg border p-2 ${editingVacateIdx === idx ? "bg-emerald-50/50 border-emerald-200" : "bg-gray-50"}`}><div className="flex items-center gap-2">{editingVacateIdx === idx ? (<><div className="flex-1 grid grid-cols-[1fr_70px_100px_100px] gap-2 items-end">{idx === 0 && <div className="col-span-4 grid grid-cols-[1fr_70px_100px_100px] gap-2"><span className="text-[10px] text-muted-foreground">নাম</span><span className="text-[10px] text-muted-foreground">পরিমাণ</span><span className="text-[10px] text-muted-foreground">অবস্থা</span><span className="text-[10px] text-muted-foreground">নোট</span></div>}<Input className="h-8 text-xs" value={item.itemName} onChange={(e) => updateVacateItem(idx, "itemName", e.target.value)} placeholder="মালামালের নাম" /><Input className="h-8 text-xs" type="number" min={0} value={item.quantity} onChange={(e) => updateVacateItem(idx, "quantity", e.target.value === '' ? '' : Number(e.target.value))} /><Select value={item.condition} onValueChange={(v) => updateVacateItem(idx, "condition", v)}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="আছে">আছে</SelectItem><SelectItem value="নেই">নেই</SelectItem><SelectItem value="ভালো">ভালো</SelectItem><SelectItem value="খারাপ">খারাপ</SelectItem><SelectItem value="নতুন">নতুন</SelectItem><SelectItem value="পুরাতন">পুরাতন</SelectItem><SelectItem value="নস্ট">নস্ট</SelectItem><SelectItem value="ভাঙা">ভাঙা</SelectItem><SelectItem value="মাঝারি">মাঝারি</SelectItem></SelectContent></Select><Input className="h-8 text-xs" value={item.note || ""} onChange={(e) => updateVacateItem(idx, "note", e.target.value)} placeholder="নোট" /></div><Button variant="ghost" size="sm" className="size-7 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 shrink-0" onClick={() => setEditingVacateIdx(null)}><Edit3 className="size-3.5" /></Button></>) : (<><div className="flex-1 flex items-center gap-3 text-sm min-w-0"><span className="font-medium truncate min-w-0 flex-1">{item.itemName || "—"}</span><span className="text-xs text-muted-foreground shrink-0">×{item.quantity}</span><span className="shrink-0">{getConditionBadge(item.condition)}</span>{item.note && <span className="text-[10px] text-muted-foreground truncate shrink-0 hidden sm:inline">({item.note})</span>}</div><div className="flex gap-0.5 shrink-0"><Button variant="ghost" size="sm" className="size-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => setEditingVacateIdx(idx)}><Edit3 className="size-3.5" /></Button><Button variant="ghost" size="sm" className="size-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeVacateItem(idx)} disabled={vacateItems.length <= 1}><Trash2 className="size-3.5" /></Button></div></>)}</div></div>))}</div></div></div><DialogFooter><Button variant="outline" onClick={() => setVacateOpen(false)}>বাতিল</Button><Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleVacate} disabled={vacateLoading}>{vacateLoading ? (<div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />) : null}নিশ্চিত করুন — রুম ছেড়ে দিন</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Guest Management Component
// ═══════════════════════════════════════════════════════════════════════════

function GuestsTab() {
  const { buildings } = useBuildingsContext();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Sub-tab: current vs past guests
  const [guestSubTab, setGuestSubTab] = useState<"current" | "past">("current");

  // Guest search
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const [guestSearchResults, setGuestSearchResults] = useState<Guest[]>([]);
  const [guestSearchShow, setGuestSearchShow] = useState(false);
  const guestSearchRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const GUESTS_PER_PAGE = 10;

  const [addOpen, setAddOpen] = useState(false);
  const [addIsPaid, setAddIsPaid] = useState(true);
  const [gName, setGName] = useState("");
  const [gAddress, setGAddress] = useState("");
  const [gMobile, setGMobile] = useState("");
  const [gReferredBy, setGReferredBy] = useState("");
  const [gCheckIn, setGCheckIn] = useState("");
  const [gCheckInTime, setGCheckInTime] = useState("");
  const [gCheckOut, setGCheckOut] = useState("");
  const [gCheckOutTime, setGCheckOutTime] = useState("");
  const [gTotalBill, setGTotalBill] = useState("");
  const [gNote, setGNote] = useState("");

  // Building / Floor / Room selectors for add form
  const [gBuildingId, setGBuildingId] = useState("");
  const [gFloorId, setGFloorId] = useState("");
  const [gRoomId, setGRoomId] = useState("");
  const [gRoomNumber, setGRoomNumber] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [eName, setEName] = useState("");
  const [eAddress, setEAddress] = useState("");
  const [eMobile, setEMobile] = useState("");
  const [eReferredBy, setEReferredBy] = useState("");
  const [eCheckIn, setECheckIn] = useState("");
  const [eCheckOut, setECheckOut] = useState("");
  const [eTotalBill, setETotalBill] = useState("");
  const [eNote, setENote] = useState("");
  const [eIsPaid, setEIsPaid] = useState(true);

  // Loading states
  const [editingGuest, setEditingGuest] = useState(false);
  const [deletingGuest, setDeletingGuest] = useState(false);

  // Vacate (রুম ত্যাগ) dialog states for GuestsTab
  const [vacateGuestOpen, setVacateGuestOpen] = useState(false);
  const [vacateGuestId, setVacateGuestId] = useState("");
  const [vacateGuestName, setVacateGuestName] = useState("");
  const [vacateCheckoutDate, setVacateCheckoutDate] = useState("");
  const [vacateCheckoutTime, setVacateCheckoutTime] = useState("");
  const [vacatingGuest, setVacatingGuest] = useState(false);

  // Derive rest-house buildings
  const restHouseBuildings = React.useMemo(() =>
    buildings,
    [buildings]
  );

  // Derive floors for selected building
  const selectedBuildingFloors = React.useMemo(() => {
    if (!gBuildingId) return [];
    const bld = buildings.find((b) => b.id === gBuildingId);
    if (!bld) return [];
    return (bld.floors || []).sort((a, b) => a.floorNumber - b.floorNumber);
  }, [buildings, gBuildingId]);

  // Derive rooms for selected floor
  const selectedFloorRooms = React.useMemo(() => {
    if (!gFloorId) return [];
    for (const b of buildings) {
      for (const f of b.floors || []) {
        if (f.id === gFloorId) return f.rooms || [];
      }
    }
    return [];
  }, [buildings, gFloorId]);

  // Split guests into current (isBooked=true) and past (isBooked=false)
  const currentGuests = React.useMemo(() => guests.filter((g) => g.isBooked).sort((a, b) => {
    const dateA = new Date(a.checkInDate || 0).getTime();
    const dateB = new Date(b.checkInDate || 0).getTime();
    return dateB - dateA;
  }), [guests]);
  const pastGuests = React.useMemo(() => guests.filter((g) => !g.isBooked).sort((a, b) => {
    const dateA = new Date(a.checkOutDate || 0).getTime();
    const dateB = new Date(b.checkOutDate || 0).getTime();
    return dateB - dateA;
  }), [guests]);

  // Active list based on sub-tab
  const activeList = guestSubTab === "current" ? currentGuests : pastGuests;

  // Filter active list by search
  const filteredActiveList = React.useMemo(() => {
    if (!guestSearchQuery.trim()) return activeList;
    const q = guestSearchQuery.trim().toLowerCase();
    return activeList.filter((g) =>
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.roomNumber && g.roomNumber.toLowerCase().includes(q)) ||
      (g.mobile && g.mobile.includes(q)) ||
      (g.note && g.note.toLowerCase().includes(q)) ||
      (g.referredBy && g.referredBy.toLowerCase().includes(q)) ||
      (g.checkInDate && new Date(g.checkInDate).getFullYear().toString().includes(q)) ||
      (g.checkOutDate && new Date(g.checkOutDate).getFullYear().toString().includes(q)) ||
      (g.address && g.address.toLowerCase().includes(q))
    );
  }, [activeList, guestSearchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredActiveList.length / GUESTS_PER_PAGE));
  const paginatedList = React.useMemo(() => {
    const start = (currentPage - 1) * GUESTS_PER_PAGE;
    return filteredActiveList.slice(start, start + GUESTS_PER_PAGE);
  }, [filteredActiveList, currentPage]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (guestSearchRef.current && !guestSearchRef.current.contains(e.target as Node)) {
        setGuestSearchShow(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset page when sub-tab changes or filters change
  useEffect(() => { setCurrentPage(1); }, [guestSubTab, filterMonth, filterYear, guestSearchQuery]);

  const loadAvailableYears = useCallback(async () => {
    try {
      const res = await fetch("/api/guests/years");
      if (res.ok) {
        const years: number[] = await res.json();
        setAvailableYears(years);
      }
    } catch { /* চুপ করে থাকুন */ }
  }, []);

  const loadGuests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterMonth) params.set("month", filterMonth);
      if (filterYear) params.set("year", filterYear);
      const url = `/api/guests${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      setGuests(await res.json());
    } catch { toast.error("গেস্ট লোড করতে সমস্যা হয়েছে"); }
    finally { setLoading(false); }
  }, [filterMonth, filterYear]);

  const silentLoadGuests = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterMonth) params.set("month", filterMonth);
      if (filterYear) params.set("year", filterYear);
      const url = `/api/guests${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      setGuests(await res.json());
    } catch { /* silent */ }
  }, [filterMonth, filterYear]);

  useEffect(() => { loadAvailableYears(); }, [loadAvailableYears]);
  useEffect(() => { loadGuests(); }, [loadGuests]);

  const resetAddForm = () => {
    setAddIsPaid(true); setGName(""); setGAddress(""); setGMobile("");
    setGReferredBy(""); setGCheckIn(""); setGCheckInTime(""); setGCheckOut(""); setGCheckOutTime(""); setGTotalBill(""); setGNote("");
    setGBuildingId(""); setGFloorId(""); setGRoomId(""); setGRoomNumber("");
  };

  const handleAdd = async () => {
    if (!gName.trim() || !gCheckIn) { toast.error("নাম এবং চেক-ইন তারিখ দিন"); return; }
    setSaving(true); setSaveError("");
    try {
      const payload: Record<string, unknown> = {
        name: gName.trim(), address: gAddress.trim() || null, mobile: gMobile.trim() || null,
        referredBy: gReferredBy.trim() || null, checkInDate: gCheckIn, checkInTime: gCheckInTime.trim() || null,
        checkOutDate: gCheckOut || null, checkOutTime: gCheckOutTime.trim() || null,
        totalBill: addIsPaid ? (gTotalBill.trim() || null) : "Non Paid",
        note: gNote.trim() || null, isPaid: addIsPaid, isBooked: true,
      };
      if (gRoomId) {
        payload.roomId = gRoomId;
        payload.roomNumber = gRoomNumber;
      }
      const res = await fetch("/api/guests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.redirected) { setSaveError("সেশন মেয়াদোত্তীর্ণ। পেজ রিফ্রেশ করুন।"); return; }
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) { setSaveError("সার্ভার সমস্যা। পেজ রিফ্রেশ করুন।"); return; }
      const data = await res.json();
      if (!res.ok) { setSaveError(data?.error || `সার্ভার এরর (${res.status})`); return; }
      toast.success(addIsPaid ? "Paid গেস্ট যোগ হয়েছে" : "Non Paid গেস্ট যোগ হয়েছে");
      resetAddForm(); setAddOpen(false); silentLoadGuests(); loadAvailableYears();
      window.dispatchEvent(new Event("dashboard-data-changed"));
    } catch (err) { setSaveError(err instanceof Error ? err.message : "নেটওয়ার্ক সমস্যা"); }
    finally { setSaving(false); }
  };

  const openEdit = (g: Guest) => {
    setEditGuest(g); setEName(g.name); setEAddress(g.address || ""); setEMobile(g.mobile || "");
    setEReferredBy(g.referredBy || ""); setECheckIn(g.checkInDate?.split("T")[0] || "");
    setECheckOut(g.checkOutDate?.split("T")[0] || "");
    setETotalBill(g.totalBill === "Non Paid" ? "" : g.totalBill || "");
    setENote(g.note || ""); setEIsPaid(g.isPaid); setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editGuest || !eName.trim() || !eCheckIn) return;
    setEditingGuest(true);
    try {
      const res = await fetch("/api/guests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editGuest.id, name: eName.trim(), address: eAddress.trim() || null, mobile: eMobile.trim() || null, referredBy: eReferredBy.trim() || null, checkInDate: eCheckIn, checkOutDate: eCheckOut || null, totalBill: eIsPaid ? (eTotalBill.trim() || null) : "Non Paid", note: eNote.trim() || null, isPaid: eIsPaid }) });
      if (!res.ok) throw new Error();
      toast.success("গেস্ট আপডেট হয়েছে"); setEditOpen(false); setEditGuest(null); silentLoadGuests(); loadAvailableYears();
    } catch { toast.error("গেস্ট আপডেট করতে সমস্যা হয়েছে"); } finally { setEditingGuest(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingGuest(true);
    try {
      const res = await fetch("/api/guests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error();
      toast.success("গেস্ট মুছে ফেলা হয়েছে"); setExpandedGuestId(null); silentLoadGuests(); loadAvailableYears();
      window.dispatchEvent(new Event("dashboard-data-changed"));
    } catch { toast.error("গেস্ট মুছে ফেলতে সমস্যা হয়েছে"); } finally { setDeletingGuest(false); }
  };

  // Vacate (রুম ত্যাগ) handlers
  const openVacateGuest = (g: Guest) => {
    setVacateGuestId(g.id);
    setVacateGuestName(g.name);
    const now = new Date();
    setVacateCheckoutDate(now.toISOString().split('T')[0]);
    setVacateCheckoutTime(now.toTimeString().slice(0, 5));
    setVacateGuestOpen(true);
  };

  const handleVacateGuest = async () => {
    if (!vacateGuestId || !vacateCheckoutDate) return;
    setVacatingGuest(true);
    try {
      const checkOutDateTime = vacateCheckoutTime ? `${vacateCheckoutDate}T${vacateCheckoutTime}` : vacateCheckoutDate;
      const res = await fetch("/api/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: vacateGuestId,
          checkOutDate: checkOutDateTime,
          checkOutTime: vacateCheckoutTime.trim() || null,
          isBooked: false,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${vacateGuestName} রুম ত্যাগ করেছেন`);
      setVacateGuestOpen(false);
      silentLoadGuests(); loadAvailableYears();
      window.dispatchEvent(new Event("dashboard-data-changed"));
    } catch {
      toast.error("রুম ত্যাগ করতে সমস্যা হয়েছে");
    } finally {
      setVacatingGuest(false);
    }
  };

  // XLSX download
  const handleDownloadGuests = async () => {
    if (activeList.length === 0) { toast.error("ডাউনলোড করার মতো কোনো গেস্ট নেই"); return; }
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("গেস্ট তালিকা");

      const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF2563EB" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
      const border = { bottom: { style: "thin" as const, color: { argb: "FF000000" } } };
      const thinBorder = { top: { style: "thin" as const, color: { argb: "FFCCCCCC" } }, bottom: { style: "thin" as const, color: { argb: "FFCCCCCC" } }, left: { style: "thin" as const, color: { argb: "FFCCCCCC" } }, right: { style: "thin" as const, color: { argb: "FFCCCCCC" } } };
      const centerAlign = { horizontal: "center" as const, vertical: "middle" as const, wrapText: false };
      const noteAlign = { horizontal: "left" as const, vertical: "middle" as const, wrapText: false, shrinkToFit: true };

      // Merged title header row
      const titleRow = sheet.addRow(["রেস্ট হাউজে অবস্থানরত সকল অতিথির তালিকা"]);
      sheet.mergeCells(1, 1, 1, 10);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 14, color: { argb: "FF2563EB" } };
      titleCell.alignment = centerAlign;
      titleRow.height = 36;

      const headers = ["ক্রম", "নাম", "মোবাইল", "ঠিকানা", "রেফার", "রুম নম্বর", "চেক ইন", "চেক আউট", "বিল", "নোট"];
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell: any) => { cell.fill = headerFill; cell.font = headerFont; cell.border = border; cell.alignment = centerAlign; });
      headerRow.height = 32;

      activeList.forEach((g, idx) => {
        // Mobile: ensure leading zero
        let mobileVal = g.mobile || "-";
        if (mobileVal !== "-" && !mobileVal.startsWith("0") && /^\d+$/.test(mobileVal)) {
          mobileVal = "0" + mobileVal;
        }
        // Bill: always show as number
        let billVal: string | number = g.totalBill || "-";
        if (billVal !== "-" && !isNaN(Number(billVal))) {
          billVal = Number(billVal);
        }

        // Format check-in: date + time in English on one line
        let checkInStr = "-";
        if (g.checkInDate) {
          const d = new Date(g.checkInDate);
          const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
          checkInStr = g.checkInTime ? `${datePart} ${g.checkInTime}` : datePart;
        }

        // Format check-out: date + time in English on one line
        let checkOutStr = "-";
        if (g.checkOutDate) {
          const d = new Date(g.checkOutDate);
          const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
          checkOutStr = g.checkOutTime ? `${datePart} ${g.checkOutTime}` : datePart;
        }

        const row = sheet.addRow([
          idx + 1,
          g.name,
          mobileVal,
          g.address || "-",
          g.referredBy || "-",
          g.roomNumber || "-",
          checkInStr,
          checkOutStr,
          billVal,
          g.note || "-",
        ]);
        row.eachCell((cell: any, colNumber: number) => {
          cell.border = thinBorder;
          // Note-like columns: no wrap, no row height increase
          cell.alignment = (colNumber === 5 || colNumber === 10) ? noteAlign : centerAlign;
        });
        // Set mobile column as text to keep leading zero (col 3)
        const mobileCell = row.getCell(3);
        if (mobileVal !== "-") {
          mobileCell.numFmt = "@";
        }
      });

      // Auto-fit column widths
      sheet.columns.forEach((col: any, i: number) => {
        if (i === 0) { col.width = 5; return; }
        let maxLen = 0;
        col.eachCell({ includeEmpty: false }, (cell: any) => {
          const val = String(cell.value || "");
          if (val.length > maxLen) maxLen = val.length;
        });
        const headerVal = headers[i] || "";
        col.width = Math.ceil(Math.max(headerVal.length, maxLen) * 1.3) + 1;
      });

      // Freeze panes: freeze row 1 (title) and row 2 (headers) + first column
      sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 2, topLeftCell: "A3", activeCell: "A3" }];

      // Print settings: no page breaks, fit all data on one page
      sheet.pageSetup = {
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        orientation: "landscape" as const,
        paperSize: 9, // A4
        margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0, footer: 0 },
      };
      // Remove all row breaks (no page breaks in the worksheet)
      (sheet as any).rowBreaks = [];
      // Set print area to cover all data
      const lastRow = activeList.length + 2; // +2 for title + header
      const lastCol = 10;
      sheet.properties.outlineProperties = undefined;
      sheet.printArea = `A1:${String.fromCharCode(64 + lastCol)}${lastRow}`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `গেস্ট_তালিকা${filterMonth ? `_${months.find(m => m.value === filterMonth)?.label}` : ""}${filterYear ? `_${filterYear}` : ""}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("XLSX ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); }
  };

  const months = [
    { value: "1", label: "জানুয়ারি" }, { value: "2", label: "ফেব্রুয়ারি" }, { value: "3", label: "মার্চ" },
    { value: "4", label: "এপ্রিল" }, { value: "5", label: "মে" }, { value: "6", label: "জুন" },
    { value: "7", label: "জুলাই" }, { value: "8", label: "আগস্ট" }, { value: "9", label: "সেপ্টেম্বর" },
    { value: "10", label: "অক্টোবর" }, { value: "11", label: "নভেম্বর" }, { value: "12", label: "ডিসেম্বর" },
  ];

  if (loading) return (<div className="flex flex-col items-center justify-center py-20 gap-3"><div className="size-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" /><p className="text-sm text-muted-foreground">তথ্য লোড হচ্ছে...</p></div>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><UserCheck className="size-5 text-blue-600" />গেস্ট ম্যানেজমেন্ট</h3>
        <div className="flex items-center gap-2">
          <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { resetAddForm(); setSaveError(""); } }}>
            <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Plus className="size-4" />গেস্ট বুকিং</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><UserCheck className="size-5 text-blue-600" />গেস্ট বুকিং করুন</DialogTitle><DialogDescription>গেস্টের তথ্য দিন</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                  <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${addIsPaid ? "bg-emerald-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => setAddIsPaid(true)}>Paid</button>
                  <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!addIsPaid ? "bg-orange-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => { setAddIsPaid(false); setGTotalBill(""); }}>Non Paid</button>
                </div>

                {/* Building / Floor / Room selectors */}
                <div className="space-y-1.5">
                  <Label>বিল্ডিং নির্বাচন (রেস্ট হাউজ/বিশ্রামাগার)</Label>
                  <Select value={gBuildingId || "__none"} onValueChange={(v) => {
                    const bId = v === "__none" ? "" : v;
                    setGBuildingId(bId); setGFloorId(""); setGRoomId(""); setGRoomNumber("");
                    if (!bId) return;
                    const bld = buildings.find((b) => b.id === bId);
                    if (bld) {
                      // Auto-select first floor if only one
                      const flrs = (bld.floors || []).sort((a, b) => a.floorNumber - b.floorNumber);
                      if (flrs.length === 1) { setGFloorId(flrs[0].id); }
                    }
                  }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="বিল্ডিং বেছে নিন" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">নির্বাচন করুন</SelectItem>
                      {restHouseBuildings.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                {gBuildingId && selectedBuildingFloors.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>তলা নির্বাচন</Label>
                    <Select value={gFloorId || "__none"} onValueChange={(v) => {
                      const fId = v === "__none" ? "" : v;
                      setGFloorId(fId); setGRoomId(""); setGRoomNumber("");
                    }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="তলা বেছে নিন" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">নির্বাচন করুন</SelectItem>
                        {selectedBuildingFloors.map((f) => (<SelectItem key={f.id} value={f.id}>{toBanglaNumber(f.floorNumber)} তলা</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {gFloorId && selectedFloorRooms.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>রুম নির্বাচন</Label>
                    <Select value={gRoomId || "__none"} onValueChange={(v) => {
                      const rId = v === "__none" ? "" : v;
                      setGRoomId(rId);
                      const room = selectedFloorRooms.find((r) => r.id === rId);
                      setGRoomNumber(room ? room.roomNumber : "");
                    }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="রুম বেছে নিন" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">নির্বাচন করুন</SelectItem>
                        {selectedFloorRooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            <span className="flex items-center gap-2">রুম {r.roomNumber}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {gRoomNumber && <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2"><p className="text-xs text-purple-700 font-medium">নির্বাচিত রুম: <span className="font-bold">{gRoomNumber}</span></p></div>}

                <div className="space-y-1.5"><Label>নাম *</Label><Input placeholder="গেস্টের নাম" value={gName} onChange={(e) => setGName(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>ঠিকানা</Label><Input placeholder="ঠিকানা" value={gAddress} onChange={(e) => setGAddress(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>মোবাইল নম্বর</Label><Input placeholder="০১XXXXXXXXX" value={gMobile} onChange={(e) => setGMobile(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Refered By</Label><Input placeholder="রেফার করেছেন" value={gReferredBy} onChange={(e) => setGReferredBy(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>চেক-ইন তারিখ *</Label><Input type="date" value={gCheckIn} onChange={(e) => setGCheckIn(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>চেক-ইন সময়</Label><Input type="time" value={gCheckInTime} onChange={(e) => setGCheckInTime(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>চেক-আউট তারিখ</Label><Input type="date" value={gCheckOut} onChange={(e) => setGCheckOut(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>চেক-আউট সময়</Label><Input type="time" value={gCheckOutTime} onChange={(e) => setGCheckOutTime(e.target.value)} /></div>
                </div>
                {addIsPaid ? <div className="space-y-1.5"><Label>মোট বিল</Label><Input type="number" placeholder="বিলের পরিমাণ" value={gTotalBill} onChange={(e) => setGTotalBill(e.target.value)} /></div> : <div className="bg-orange-50 border border-orange-200 rounded-lg p-3"><p className="text-sm font-medium text-orange-700">Total Bill: Non Paid</p><p className="text-xs text-orange-600 mt-0.5">এই গেস্ট Non Paid হিসেবে চিহ্নিত হবে</p></div>}
                <div className="space-y-1.5"><Label>নোট (ঐচ্ছিক)</Label><Textarea placeholder="বিশেষ নোট" value={gNote} onChange={(e) => setGNote(e.target.value)} rows={2} /></div>
              </div>
              {saveError && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm font-medium text-red-700">সমস্যা: {saveError}</p></div>}
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddOpen(false); resetAddForm(); setSaveError(""); }} disabled={saving}>বাতিল</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAdd} disabled={saving}>{saving ? (<><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> সেভ হচ্ছে...</>) : "সেভ করুন"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-dashed"><CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Text search */}
          <div className="relative w-full sm:w-auto sm:flex-1" ref={guestSearchRef}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="নাম, রুম, মোবাইল, নোট, বছর দিয়ে সার্চ করুন..."
              value={guestSearchQuery}
              onChange={(e) => { setGuestSearchQuery(e.target.value); setCurrentPage(1); setGuestSearchShow(true); }}
              onFocus={() => setGuestSearchShow(true)}
              className="h-8 pl-8 pr-8 text-xs w-full sm:w-full"
            />
            {guestSearchQuery.length > 0 && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 size-5 text-muted-foreground hover:text-foreground rounded-full hover:bg-gray-100 flex items-center justify-center" onClick={() => { setGuestSearchQuery(""); setGuestSearchShow(false); }}>
                <X className="size-3" />
              </button>
            )}
            {/* Search dropdown suggestions */}
            {guestSearchShow && guestSearchQuery.trim().length >= 1 && filteredActiveList.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                {filteredActiveList.slice(0, 8).map((g) => (
                  <button
                    key={g.id}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50/70 border-b border-gray-50 last:border-0 transition-colors text-xs"
                    onClick={() => { setExpandedGuestId(g.id); setGuestSearchShow(false); }}
                  >
                    <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${g.isBooked ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                      {g.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {g.roomNumber && `রুম ${g.roomNumber}`}
                        {g.mobile && ` • ${g.mobile}`}
                        {g.checkInDate && ` • ${new Date(g.checkInDate).toLocaleDateString("bn-BD")}`}
                      </p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${g.isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>{g.isPaid ? "Paid" : "Non Paid"}</span>
                  </button>
                ))}
                {filteredActiveList.length > 8 && (
                  <div className="px-3 py-1.5 text-[10px] text-center text-muted-foreground bg-gray-50">
                    আরও {toBanglaNumber(filteredActiveList.length - 8)} জন পাওয়া গেছে...
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <Select value={filterMonth || "__all__"} onValueChange={(v) => setFilterMonth(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="মাস" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">সব মাস</SelectItem>{months.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
            </Select>
            <Select value={filterYear || "__all__"} onValueChange={(v) => setFilterYear(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-[110px] h-8 text-xs"><SelectValue placeholder="বছর" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">সব বছর</SelectItem>
                {availableYears.map((y) => (<SelectItem key={y} value={String(y)}>{toBanglaNumber(y)}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {(filterMonth || filterYear || guestSearchQuery) && <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-red-500" onClick={() => { setFilterMonth(""); setFilterYear(""); setGuestSearchQuery(""); }}><X className="size-3 mr-1" />মুছুন</Button>}
          <span className="text-xs text-muted-foreground ml-auto">{guestSearchQuery ? `মিলেছে: ${toBanglaNumber(filteredActiveList.length)}` : `মোট: ${toBanglaNumber(guests.length)}`} জন</span>
        </div>
      </CardContent></Card>

      {/* Sub-tabs: Current vs Past */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button type="button" className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-bold transition-all ${guestSubTab === "current" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:text-blue-600 bg-white border border-gray-200"}`} onClick={() => setGuestSubTab("current")}>
          <UserCheck className="size-3.5" />বর্তমান গেস্ট
          <Badge className={`text-[10px] px-1.5 py-0 ${guestSubTab === "current" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}>{toBanglaNumber(currentGuests.length)}</Badge>
        </button>
        <button type="button" className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-bold transition-all ${guestSubTab === "past" ? "bg-orange-600 text-white shadow-md" : "text-gray-500 hover:text-orange-600 bg-white border border-gray-200"}`} onClick={() => setGuestSubTab("past")}>
          <LogOut className="size-3.5" />পূর্বের গেস্ট
          <Badge className={`text-[10px] px-1.5 py-0 ${guestSubTab === "past" ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700"}`}>{toBanglaNumber(pastGuests.length)}</Badge>
        </button>
      </div>

      {filteredActiveList.length === 0 ? (
        <Alert><UserCheck className="size-4" /><AlertDescription>{guestSearchQuery ? `"${guestSearchQuery}" দিয়ে কোনো গেস্ট পাওয়া যায়নি` : (guestSubTab === "current" ? "কোনো বর্তমান গেস্ট নেই।" : "কোনো পূর্বের গেস্ট নেই।")}</AlertDescription></Alert>
      ) : (
        <>
          <div className="space-y-1">{paginatedList.map((guest) => (
            <div key={guest.id} className="border rounded-md overflow-hidden">
              <div className={`group flex items-center gap-2 px-2.5 py-2 bg-white hover:shadow-sm transition-all cursor-pointer ${guestSubTab === "past" ? "rounded-t-md" : ""}`} onClick={() => setExpandedGuestId(expandedGuestId === guest.id ? null : guest.id)}>
                {expandedGuestId === guest.id ? <ChevronDown className="size-3 text-muted-foreground shrink-0" /> : <ChevronRight className="size-3 text-muted-foreground shrink-0" />}
                {guestSubTab === "past" ? (
                  <>
                    <span className="font-medium text-xs truncate min-w-0 flex-1">{guest.name}</span>
                    {guest.address && <span className="text-[10px] text-muted-foreground whitespace-nowrap truncate max-w-[120px]">{guest.address}</span>}
                    {guest.mobile && <span className="text-[10px] text-muted-foreground whitespace-nowrap">{guest.mobile}</span>}
                  </>
                ) : (
                  <>
                    <div className={`size-2 rounded-full shrink-0 ${guest.isPaid ? "bg-emerald-500" : "bg-orange-500"}`} />
                    <span className="font-medium text-xs truncate min-w-0 flex-1">{guest.name}</span>
                    {guest.mobile && <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline"><Phone className="size-2.5 inline mr-0.5 -mt-px" />{guest.mobile}</span>}
                    {guest.roomNumber && <span className="text-[10px] text-purple-600 font-medium whitespace-nowrap"><BedDouble className="size-2.5 inline mr-0.5 -mt-px" />{guest.roomNumber}</span>}
                    {guest.referredBy && <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden md:inline">রেফার: {guest.referredBy}</span>}
                  </>
                )}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${guest.isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>{guest.isPaid ? "Paid" : "Non Paid"}</span>
              </div>
              {expandedGuestId === guest.id && (
                <div className="bg-gray-50/80 border-t px-3 py-3 space-y-3 animate-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                    <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase">নাম</p><p className="font-medium">{guest.name}</p></div>
                    <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase">মোবাইল</p><p className="font-medium">{guest.mobile || "—"}</p></div>
                    <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase">Refered By</p><p className="font-medium">{guest.referredBy || "—"}</p></div>
                    <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase">স্ট্যাটাস</p><p className="font-medium"><span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${guest.isBooked ? "bg-red-50 text-red-700 border-red-200" : guest.isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>{guest.isBooked ? "বুক আছে" : guest.isPaid ? "Paid" : "Non Paid"}</span></p></div>
                    <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase">ঠিকানা</p><p className="font-medium">{guest.address || "—"}</p></div>
                    <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase">চেক-ইন</p><p className="font-medium">{formatDate(guest.checkInDate)}{guest.checkInTime ? <span className="text-blue-600 ml-1">{guest.checkInTime}</span> : null}</p></div>
                    <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase">চেক-আউট</p><p className="font-medium">{guest.checkOutDate ? <>{formatDate(guest.checkOutDate)}{guest.checkOutTime ? <span className="text-blue-600 ml-1">{guest.checkOutTime}</span> : null}</> : "—"}</p></div>
                    <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase">রুম নম্বর</p><p className="font-medium">{guest.roomNumber ? <span className="text-purple-700 font-semibold">রুম: {guest.roomNumber}</span> : "—"}</p></div>
                    <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase">মোট বিল</p><p className="font-medium">{guest.totalBill || "—"}</p></div>
                    {guest.note && <div className="col-span-2 sm:col-span-5 space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase">নোট</p><p className="font-medium">{guest.note}</p></div>}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" size="sm" className="gap-1.5 h-7 text-[11px] px-3 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); openEdit(guest); }}><Edit3 className="size-3" />এডিট</Button>
                    {guest.isBooked && (
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-[11px] px-3 text-orange-600 border-orange-200 hover:bg-orange-50" onClick={(e) => { e.stopPropagation(); openVacateGuest(guest); }}><LogOut className="size-3" />রুম ত্যাগ</Button>
                    )}
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" size="sm" className="gap-1.5 h-7 text-[11px] px-3 text-red-600 border-red-200 hover:bg-red-50" onClick={(e) => e.stopPropagation()}><Trash2 className="size-3" />ডিলিট</Button></AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}><AlertDialogHeader><AlertDialogTitle>গেস্ট মুছে ফেলবেন?</AlertDialogTitle><AlertDialogDescription>&quot;{guest.name}&quot; এর সকল তথ্য স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>বাতিল</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete(guest.id)} disabled={deletingGuest}>মুছে ফেলুন</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          ))}</div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>পূর্ববর্তী</Button>
              <span className="text-xs text-muted-foreground">
                পাতা {toBanglaNumber(currentPage)} / {toBanglaNumber(totalPages)}
              </span>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>পরবর্তী</Button>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditGuest(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit3 className="size-5 text-blue-600" />গেস্ট সম্পাদনা</DialogTitle><DialogDescription>{editGuest?.name} — তথ্য আপডেট করুন</DialogDescription></DialogHeader>
          {editGuest && (
            <div className="space-y-3">
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${eIsPaid ? "bg-emerald-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => setEIsPaid(true)}>Paid</button>
                <button type="button" className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!eIsPaid ? "bg-orange-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`} onClick={() => { setEIsPaid(false); setETotalBill(""); }}>Non Paid</button>
              </div>
              <div className="space-y-1.5"><Label>নাম *</Label><Input value={eName} onChange={(e) => setEName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>ঠিকানা</Label><Input value={eAddress} onChange={(e) => setEAddress(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>মোবাইল</Label><Input value={eMobile} onChange={(e) => setEMobile(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Refered By</Label><Input value={eReferredBy} onChange={(e) => setEReferredBy(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>চেক-ইন *</Label><Input type="date" value={eCheckIn} onChange={(e) => setECheckIn(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>চেক-আউট</Label><Input type="date" value={eCheckOut} onChange={(e) => setECheckOut(e.target.value)} /></div>
              </div>
              {eIsPaid ? <div className="space-y-1.5"><Label>মোট বিল</Label><Input type="number" value={eTotalBill} onChange={(e) => setETotalBill(e.target.value)} /></div> : <div className="bg-orange-50 border border-orange-200 rounded-lg p-3"><p className="text-sm font-medium text-orange-700">Total Bill: Non Paid</p></div>}
              <div className="space-y-1.5"><Label>নোট</Label><Textarea value={eNote} onChange={(e) => setENote(e.target.value)} rows={2} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => { setEditOpen(false); setEditGuest(null); }}>বাতিল</Button><Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleEdit} disabled={editingGuest}>{editingGuest ? "আপডেট হচ্ছে..." : "আপডেট করুন"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vacate Guest (রুম ত্যাগ) Dialog */}
      <Dialog open={vacateGuestOpen} onOpenChange={setVacateGuestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <LogOut className="size-5" />
              রুম ত্যাগ
            </DialogTitle>
            <DialogDescription>
              &quot;{vacateGuestName}&quot; এর চেক-আউট তথ্য দিন। গেস্ট রুম ত্যাগ করবে এবং তথ্য রেকর্ড থাকবে।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">চেক-আউট তারিখ *</Label>
              <Input className="h-8 text-sm" type="date" value={vacateCheckoutDate} onChange={(e) => setVacateCheckoutDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">চেক-আউট সময়</Label>
              <Input className="h-8 text-sm" type="time" value={vacateCheckoutTime} onChange={(e) => setVacateCheckoutTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setVacateGuestOpen(false)}>বাতিল</Button>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleVacateGuest} disabled={!vacateCheckoutDate || vacatingGuest}>
              {vacatingGuest ? "হচ্ছে..." : "রুম ত্যাগ নিশ্চিত করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5 — Belongings Management (মালামাল)
// ═══════════════════════════════════════════════════════════════════════════

interface BelongingTemplate {
  id: string;
  buildingId: string;
  itemName: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

function BelongingsTab() {
  const { buildings } = useBuildingsContext();
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [templates, setTemplates] = useState<BelongingTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Add new item
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [addingItem, setAddingItem] = useState(false);

  // Edit item
  const [editingId, setEditingId] = useState("");
  const [editItemName, setEditItemName] = useState("");
  const [editItemQuantity, setEditItemQuantity] = useState("1");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  // Delete
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [belPage, setBelPage] = useState(1);
  const BEL_PER_PAGE = 10;
  const totalBelPages = Math.max(1, Math.ceil(templates.length / BEL_PER_PAGE));
  const safeBelPage = Math.min(belPage, totalBelPages);
  const paginatedTemplates = templates.slice((safeBelPage - 1) * BEL_PER_PAGE, safeBelPage * BEL_PER_PAGE);

  const loadTemplates = useCallback(async () => {
    if (!selectedBuildingId) {
      setTemplates([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/belongings?buildingId=${selectedBuildingId}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch { /* silent */ }
    finally {
      setLoading(false);
    }
  }, [selectedBuildingId]);

  const silentLoadTemplates = useCallback(async () => {
    if (!selectedBuildingId) return;
    try {
      const res = await fetch(`/api/belongings?buildingId=${selectedBuildingId}`);
      if (res.ok) setTemplates(await res.json());
    } catch { /* silent */ }
  }, [selectedBuildingId]);

  useEffect(() => {
    if (selectedBuildingId) loadTemplates();
    else setTemplates([]);
  }, [selectedBuildingId, loadTemplates]);

  const handleAddItem = async () => {
    if (!newItemName.trim() || !selectedBuildingId) {
      toast.error("মালামালের নাম দিন");
      return;
    }
    setAddingItem(true);
    try {
      const res = await fetch("/api/belongings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildingId: selectedBuildingId,
          itemName: newItemName.trim(),
          quantity: parseInt(newItemQuantity) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("মালামাল যোগ হয়েছে");
      setNewItemName("");
      setNewItemQuantity("1");
      silentLoadTemplates();
    } catch {
      toast.error("মালামাল যোগ করতে সমস্যা হয়েছে");
    } finally {
      setAddingItem(false);
    }
  };

  const handleEditItem = async () => {
    if (!editItemName.trim() || !editingId) {
      toast.error("মালামালের নাম দিন");
      return;
    }
    setEditing(true);
    try {
      const res = await fetch("/api/belongings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          itemName: editItemName.trim(),
          quantity: parseInt(editItemQuantity) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("মালামাল আপডেট হয়েছে");
      setEditOpen(false);
      silentLoadTemplates();
    } catch {
      toast.error("মালামাল আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch("/api/belongings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("মালামাল মুছে ফেলা হয়েছে");
      silentLoadTemplates();
    } catch {
      toast.error("মালামাল মুছে ফেলতে সমস্যা হয়েছে");
    } finally {
      setDeleting(false);
    }
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const url = `/api/belongings/download?all=true`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "ডাউনলোড করতে সমস্যা হয়েছে");
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('spreadsheetml') && !contentType.includes('octet-stream')) {
        toast.error("ডাউনলোড করতে সমস্যা হয়েছে - সেশন মেয়াদোত্তীর্ণ হতে পারে");
        return;
      }
      const blob = await res.blob();
      if (blob.size === 0) {
        toast.error("ডাউনলোড করতে সমস্যা হয়েছে - ফাইল খালি");
        return;
      }
      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      a.download = "সকল_রুমের_মালামাল_তালিকা.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(urlObj);
      toast.success("XLSX ডাউনলোড হচ্ছে");
    } catch {
      toast.error("ডাউনলোড করতে সমস্যা হয়েছে");
    } finally {
      setDownloading(false);
    }
  };

  const openEditDialog = (item: BelongingTemplate) => {
    setEditingId(item.id);
    setEditItemName(item.itemName);
    setEditItemQuantity(String(item.quantity));
    setEditOpen(true);
  };

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="size-5 text-emerald-600" />
          মালামাল ম্যানেজমেন্ট
        </h2>
      </div>

      {/* Building Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <Label>বিল্ডিং নির্বাচন করুন</Label>
            <Select value={selectedBuildingId} onValueChange={(v) => { setSelectedBuildingId(v); setBelPage(1); }}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="বিল্ডিং নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.floors?.reduce((s, f) => s + (f.rooms?.length || 0), 0) || 0} রুম)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedBuildingId && selectedBuilding && (
        <>
          {/* Add New Item */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Plus className="size-4 text-emerald-600" />
                নতুন মালামাল যোগ করুন
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="মালামালের নাম (যেমন: বিছানা)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddItem(); }}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="পরিমাণ"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  className="w-full sm:w-24"
                />
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={handleAddItem}
                  disabled={addingItem || !newItemName.trim()}
                >
                  {addingItem ? "যোগ হচ্ছে..." : "যোগ করুন"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Template Items List */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="size-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="size-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    এই বিল্ডিংয়ে কোনো মালামাল টেমপ্লেট নেই। উপরে থেকে নতুন মালামাল যোগ করুন।
                  </p>
                </div>
              ) : (
                <>
                <div className="space-y-2">
                  {paginatedTemplates.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center size-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                          {toBanglaNumber((safeBelPage - 1) * BEL_PER_PAGE + index + 1)}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            পরিমাণ: {toBanglaNumber(item.quantity)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              disabled={deleting}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>মালামাল মুছে ফেলবেন?</AlertDialogTitle>
                              <AlertDialogDescription>
                                &quot;{item.itemName}&quot; টেমপ্লেট থেকে মুছে যাবে।
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>বাতিল</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                মুছে ফেলুন
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
                {totalBelPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 pt-3 border-t border-gray-100 mt-3">
                    <span>মোট {toBanglaNumber(templates.length)} টি মালামাল — পাতা {toBanglaNumber(safeBelPage)}/{toBanglaNumber(totalBelPages)}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={safeBelPage <= 1} onClick={() => setBelPage(1)}>প্রথম</Button>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={safeBelPage <= 1} onClick={() => setBelPage(safeBelPage - 1)}>আগে</Button>
                      {Array.from({ length: totalBelPages }, (_, i) => i + 1).map((p) => (
                        <Button key={p} variant={p === safeBelPage ? "default" : "outline"} size="sm" className="h-6 w-6 text-[10px] p-0" onClick={() => setBelPage(p)}>{toBanglaNumber(p)}</Button>
                      ))}
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={safeBelPage >= totalBelPages} onClick={() => setBelPage(safeBelPage + 1)}>পরে</Button>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={safeBelPage >= totalBelPages} onClick={() => setBelPage(totalBelPages)}>শেষ</Button>
                    </div>
                  </div>
                )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>মালামাল সম্পাদনা করুন</DialogTitle>
                <DialogDescription>মালামালের নাম ও পরিমাণ পরিবর্তন করুন</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>মালামালের নাম</Label>
                  <Input
                    value={editItemName}
                    onChange={(e) => setEditItemName(e.target.value)}
                    placeholder="মালামালের নাম"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>পরিমাণ</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editItemQuantity}
                    onChange={(e) => setEditItemQuantity(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>বাতিল</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleEditItem}
                  disabled={editing || !editItemName.trim()}
                >
                  {editing ? "সেভ হচ্ছে..." : "সেভ করুন"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {!selectedBuildingId && (
        <Alert>
          <Package className="size-4" />
          <AlertDescription>
            মালামাল ম্যানেজমেন্ট শুরু করতে উপরে থেকে একটি বিল্ডিং নির্বাচন করুন।
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DOWNLOAD TAB — All downloads in one place
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// DOWNLOAD TAB — All downloads in one place
// ═══════════════════════════════════════════════════════════════════════════

function DownloadTab() {
  const { buildings } = useBuildingsContext();
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [dlMonth, setDlMonth] = useState("");
  const [dlYear, setDlYear] = useState("");

  const selectedBuilding = selectedBuildingId ? buildings.find(b => b.id === selectedBuildingId) : null;
  const downloadYears = Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => new Date().getFullYear() - i);

  // 1. ট্রাবল রিপোর্ট (Troubles)
  const handleDownloadTroubles = async () => {
    if (!selectedBuildingId) { toast.error("বিল্ডিং নির্বাচন করুন"); return; }
    setDownloading("troubles");
    try {
      const res = await fetch(`/api/troubles`);
      if (!res.ok) throw new Error();
      const reports: any[] = await res.json();
      if (reports.length === 0) { toast.error("কোনো ট্রাবল রিপোর্ট নেই"); return; }
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("ট্রাবল রিপোর্ট");
      const hFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF22C55E" } };
      const hFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const bdr = { bottom: { style: "thin", color: { argb: "FF000000" } } };
      const tBdr = { top: { style: "thin", color: { argb: "FFCCCCCC" } }, bottom: { style: "thin", color: { argb: "FFCCCCCC" } }, left: { style: "thin", color: { argb: "FFCCCCCC" } }, right: { style: "thin", color: { argb: "FFCCCCCC" } } };
      const cAlign = { horizontal: "center", vertical: "middle" };
      // Title row
      const titleRow = ws.addRow(["ট্রাবল রিপোর্ট"]);
      ws.mergeCells(1, 1, 1, 9);
      titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FF22C55E" } };
      titleRow.getCell(1).alignment = cAlign;
      titleRow.height = 36;
      const headers = ["ক্রম", "রুম নম্বর", "বিবরণ", "প্রতিবেদক", "রিপোর্টের তারিখ", "অবস্থা", "সমাধানকারী", "সমাধানের তারিখ", "সমাধানের বিবরণ"];
      const hRow = ws.addRow(headers);
      hRow.eachCell((c: any) => { c.fill = hFill; c.font = hFont; c.border = bdr; c.alignment = cAlign; });
      hRow.height = 28;
      let rIdx = 0;
      reports.forEach((r: any) => {
        // Apply month/year filter
        if (dlMonth || dlYear) {
          const rd = r.reportedAt ? new Date(r.reportedAt) : null;
          if (rd) {
            const mOk = !dlMonth || rd.getMonth() + 1 === parseInt(dlMonth);
            const yOk = !dlYear || rd.getFullYear() === parseInt(dlYear);
            if (!mOk || !yOk) return;
          } else {
            return;
          }
        }
        rIdx++;
        const row = ws.addRow([rIdx, r.roomNumber, r.description, r.reportedBy, r.reportedAt ? new Date(r.reportedAt).toLocaleDateString("bn-BD") : "-", r.status, r.resolvedBy || "-", r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString("bn-BD") : "-", r.resolutionNote || "-"]);
        row.eachCell((c: any) => { c.border = tBdr; c.alignment = cAlign; });
      });
      if (rIdx === 0) { toast.error("নির্বাচিত মাস/বছরে কোনো ট্রাবল রিপোর্ট নেই"); setDownloading(null); return; }
      // Fixed pixel column widths: রুম নম্বর=54, বিবরণ=170, প্রতিবেদক=110, রিপোর্টের তারিখ=133, অবস্থা=109, সমাধানকারী=115, সমাধানের তারিখ=132, সমাধানের বিবরণ=200
      const troubleColWidths = [5, 10.3, 24.3, 15.7, 19, 15.6, 16.4, 18.9, 28.6];
      ws.columns.forEach((col: any, i: number) => { if (troubleColWidths[i]) col.width = troubleColWidths[i]; });
      ws.views = [{ state: "frozen", xSplit: 0, ySplit: 2, topLeftCell: "A3", activeCell: "A3" }];
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "ট্রাবল_রিপোর্ট.xlsx"; a.click();
      URL.revokeObjectURL(url);
      toast.success("ট্রাবল রিপোর্ট ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); } finally { setDownloading(null); }
  };

  // 2. গেস্ট তালিকা (Guests)
  const handleDownloadGuests = async () => {
    if (!selectedBuildingId) { toast.error("বিল্ডিং নির্বাচন করুন"); return; }
    setDownloading("guests");
    try {
      const res = await fetch(`/api/guests`);
      if (!res.ok) throw new Error();
      const guests: any[] = await res.json();
      if (guests.length === 0) { toast.error("কোনো গেস্ট নেই"); return; }
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("গেস্ট তালিকা");
      const hFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF2563EB" } };
      const hFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
      const bdr = { bottom: { style: "thin" as const, color: { argb: "FF000000" } } };
      const tBdr = { top: { style: "thin" as const, color: { argb: "FFCCCCCC" } }, bottom: { style: "thin" as const, color: { argb: "FFCCCCCC" } }, left: { style: "thin" as const, color: { argb: "FFCCCCCC" } }, right: { style: "thin" as const, color: { argb: "FFCCCCCC" } } };
      const cAlign = { horizontal: "center" as const, vertical: "middle" as const, wrapText: false };
      const titleRow = ws.addRow(["রেস্ট হাউজে অবস্থানরত সকল অতিথির তালিকা"]);
      ws.mergeCells(1, 1, 1, 10);
      titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FF2563EB" } };
      titleRow.getCell(1).alignment = cAlign;
      titleRow.height = 36;
      const headers = ["ক্রম", "নাম", "মোবাইল", "ঠিকানা", "রেফার", "রুম নম্বর", "চেক ইন", "চেক আউট", "বিল", "নোট"];
      const hRow = ws.addRow(headers);
      hRow.eachCell((c: any) => { c.fill = hFill; c.font = hFont; c.border = bdr; c.alignment = cAlign; });
      hRow.height = 32;
      let gIdx = 0;
      guests.forEach((g: any) => {
        // Apply month/year filter
        if (dlMonth || dlYear) {
          const cid = g.checkInDate ? new Date(g.checkInDate) : null;
          if (cid) {
            const mOk = !dlMonth || cid.getMonth() + 1 === parseInt(dlMonth);
            const yOk = !dlYear || cid.getFullYear() === parseInt(dlYear);
            if (!mOk || !yOk) return;
          } else {
            return;
          }
        }
        gIdx++;
        let mobileVal = g.mobile || "-";
        if (mobileVal !== "-" && !mobileVal.startsWith("0") && /^\d+$/.test(mobileVal)) mobileVal = "0" + mobileVal;
        let checkInStr = "-";
        if (g.checkInDate) { const d = new Date(g.checkInDate); checkInStr = g.checkInTime ? `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${g.checkInTime}` : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
        let checkOutStr = "-";
        if (g.checkOutDate) { const d = new Date(g.checkOutDate); checkOutStr = g.checkOutTime ? `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${g.checkOutTime}` : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
        const row = ws.addRow([gIdx, g.name, mobileVal, g.address || "-", g.referredBy || "-", g.roomNumber || "-", checkInStr, checkOutStr, g.totalBill || "-", g.note || "-"]);
        row.eachCell((c: any) => { c.border = tBdr; c.alignment = cAlign; });
      });
      if (gIdx === 0) { toast.error("নির্বাচিত মাস/বছরে কোনো গেস্ট নেই"); setDownloading(null); return; }
      // Fixed pixel column widths: নাম=190, মোবাইল=135, ঠিকানা=140, রেফার=140, রুম নম্বর=90, চেক ইন=135, চেক আউট=135, বিল=90, নোট=275
      const guestColWidths = [5, 27.1, 19.3, 20, 20, 12.9, 19.3, 19.3, 12.9, 39.3];
      ws.columns.forEach((col: any, i: number) => { if (guestColWidths[i]) col.width = guestColWidths[i]; });
      ws.views = [{ state: "frozen", xSplit: 0, ySplit: 2, topLeftCell: "A3", activeCell: "A3" }];
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "গেস্ট_তালিকা.xlsx"; a.click();
      URL.revokeObjectURL(url);
      toast.success("গেস্ট তালিকা ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); } finally { setDownloading(null); }
  };

  // 3. সকল রুমের মালামাল (All rooms belongings - server-side)
  const handleDownloadAllBelongings = async () => {
    if (!selectedBuildingId) { toast.error("বিল্ডিং নির্বাচন করুন"); return; }
    setDownloading("allBelongings");
    try {
      const url = `/api/belongings/download?buildingId=${selectedBuildingId}`;
      const res = await fetch(url);
      if (!res.ok) { const data = await res.json().catch(() => null); toast.error(data?.error || "ডাউনলোড করতে সমস্যা"); return; }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('spreadsheetml') && !contentType.includes('octet-stream')) { toast.error("ডাউনলোড করতে সমস্যা - সেশন মেয়াদোত্তীর্ণ হতে পারে"); return; }
      const blob = await res.blob();
      if (blob.size === 0) { toast.error("ফাইল খালি"); return; }
      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      a.download = `সকল_রুমের_মালামাল${selectedBuilding ? `_${selectedBuilding.name}` : ""}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(urlObj);
      toast.success("মালামাল তালিকা ডাউনলোড হচ্ছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); } finally { setDownloading(null); }
  };

  // 4. রুমভিত্তিক ভাড়াটে তালিকা (Room-wise tenants)
  const handleDownloadRoomTenants = async () => {
    if (!selectedBuildingId) { toast.error("বিল্ডিং নির্বাচন করুন"); return; }
    setDownloading("roomTenants");
    try {
      const res = await fetch(`/api/room-wise-data?buildingId=${selectedBuildingId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.rooms || data.rooms.length === 0) { toast.error("কোনো রুম নেই"); return; }
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("বরাদ্দকৃত ব্যক্তিবর্গের তালিকা");
      const hFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF22C55E" } };
      const hFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const bdr = { bottom: { style: "thin", color: { argb: "FF000000" } } };
      const tBdr = { top: { style: "thin", color: { argb: "FFCCCCCC" } }, bottom: { style: "thin", color: { argb: "FFCCCCCC" } }, left: { style: "thin", color: { argb: "FFCCCCCC" } }, right: { style: "thin", color: { argb: "FFCCCCCC" } } };
      const cAlign = { horizontal: "center", vertical: "middle", wrapText: false };
      const titleRow = ws.addRow(["রুম বরাদ্দ পাওয়া ব্যক্তিবর্গের তালিকা"]);
      ws.mergeCells(1, 1, 1, 9);
      titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FF22C55E" } };
      titleRow.getCell(1).alignment = cAlign;
      titleRow.height = 36;
      const headers = ["ক্রম", "বিল্ডিং নাম", "তলা", "রুম নম্বর", "নাম", "পদবী", "ফোন", "শুরুর তারিখ", "রুম ব্যবহারকারী"];
      const hRow = ws.addRow(headers);
      hRow.eachCell((c: any) => { c.fill = hFill; c.font = hFont; c.border = bdr; c.alignment = cAlign; });
      hRow.height = 28;
      let idx = 0;
      for (const room of data.rooms) {
        const tenants = room.currentTenants || [];
        const users = room.currentRoomUsers || [];
        const userName = users.map((u: any) => u.name).join(", ") || "-";
        tenants.forEach((t: any) => {
          // Apply month/year filter
          if (dlMonth || dlYear) {
            const sd = new Date(t.startDate);
            const mOk = !dlMonth || sd.getMonth() + 1 === parseInt(dlMonth);
            const yOk = !dlYear || sd.getFullYear() === parseInt(dlYear);
            if (!mOk || !yOk) return;
          }
          idx++;
          const row = ws.addRow([idx, data.buildingName || "-", toBanglaNumber(room.floorNumber || 0) + " তলা", room.roomNumber || "-", t.name || "-", t.designation || "-", t.phone || "-", t.startDate ? new Date(t.startDate).toLocaleDateString("bn-BD") : "-", userName]);
          row.eachCell((c: any) => { c.border = tBdr; c.alignment = cAlign; });
        });
      }
      if (idx === 0) { toast.error("নির্বাচিত মাস/বছরে কোনো ভাড়াটে নেই"); setDownloading(null); return; }
      // Fixed pixel column widths: বিল্ডিং নাম=126, তলা=72, রুম নম্বর=82, নাম=320, পদবী=220, ফোন=101, শুরুর তারিখ=100, রুম ব্যবহারকারী=135
      const roomTenantColWidths = [5, 18, 10.3, 11.7, 45.7, 31.4, 14.4, 14.3, 19.3];
      ws.columns.forEach((col: any, i: number) => { if (roomTenantColWidths[i]) col.width = roomTenantColWidths[i]; });
      ws.views = [{ state: "frozen", xSplit: 0, ySplit: 2, topLeftCell: "A3", activeCell: "A3" }];
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `রুমভিত্তিক_ভাড়াটে_তালিকা_${selectedBuilding?.name || ""}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("ভাড়াটে তালিকা ডাউনলোড হয়েছে");
    } catch { toast.error("ডাউনলোড করতে সমস্যা হয়েছে"); } finally { setDownloading(null); }
  };

  const downloadCards = [
    { id: "roomTenants", icon: ClipboardList, title: "রুমভিত্তিক ভাড়াটে তালিকা", desc: "রুমে বরাদ্দকৃত ব্যক্তিদের তালিকা", color: "indigo", onClick: handleDownloadRoomTenants },
    { id: "allBelongings", icon: Archive, title: "সকল রুমের মালামাল", desc: "শীট অনুযায়ী মালামাল ডাউনলোড", color: "teal", onClick: handleDownloadAllBelongings },
    { id: "guests", icon: UserCheck, title: "গেস্ট তালিকা", desc: "রেস্ট হাউজে অবস্থানরত অতিথি", color: "violet", onClick: handleDownloadGuests },
    { id: "troubles", icon: AlertTriangle, title: "ট্রাবল রিপোর্ট", desc: "সকল ট্রাবল রিপোর্টের তালিকা", color: "orange", onClick: handleDownloadTroubles },
  ];

  const colorMap: Record<string, { bg: string; border: string; icon: string; text: string; hover: string }> = {
    indigo: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "text-indigo-600", text: "text-indigo-800", hover: "hover:bg-indigo-100" },
    teal: { bg: "bg-teal-50", border: "border-teal-200", icon: "text-teal-600", text: "text-teal-800", hover: "hover:bg-teal-100" },
    violet: { bg: "bg-violet-50", border: "border-violet-200", icon: "text-violet-600", text: "text-violet-800", hover: "hover:bg-violet-100" },
    orange: { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-600", text: "text-orange-800", hover: "hover:bg-orange-100" },
  };

  return (
    <div className="space-y-4">
      {/* Building selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <label className="text-sm font-semibold text-gray-700 shrink-0 flex items-center gap-1.5">
          <Building2 className="size-4" /> বিল্ডিং নির্বাচন <span className="text-red-500">*</span>:
        </label>
        <Select value={selectedBuildingId || "__none"} onValueChange={(v) => setSelectedBuildingId(v === "__none" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-64 h-9">
            <SelectValue placeholder="বিল্ডিং নির্বাচন করুন" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">বিল্ডিং নির্বাচন করুন</SelectItem>
            {buildings.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!selectedBuildingId && <p className="text-xs text-red-500">⚠ ডাউনলোড করতে বিল্ডিং নির্বাচন করুন</p>}
      </div>

      {/* Month and Year selectors */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <label className="text-sm font-semibold text-gray-700 shrink-0 flex items-center gap-1.5">
          <Calendar className="size-4" /> মাস ও বছর:
        </label>
        <Select value={dlMonth} onValueChange={(v) => setDlMonth(v === "__all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-40 h-9">
            <SelectValue placeholder="সব মাস" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">সব মাস</SelectItem>
            {BENGALI_MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dlYear || "__all"} onValueChange={(v) => setDlYear(v === "__all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-36 h-9">
            <SelectValue placeholder="সব বছর" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">সব বছর</SelectItem>
            {downloadYears.map((y) => (
              <SelectItem key={y} value={String(y)}>{toBanglaNumber(y)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(dlMonth || dlYear) && (<Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setDlMonth(""); setDlYear(""); }}><X className="size-3 mr-1" />মুছুন</Button>)}
      </div>

      {/* Download cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-1.5 sm:gap-3">
        {downloadCards.map((card) => {
          const colors = colorMap[card.color];
          const isDisabled = !selectedBuildingId;
          const isLoading = downloading === card.id;
          return (
            <button
              key={card.id}
              disabled={isDisabled || !!downloading}
              onClick={card.onClick}
              className={`flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-4 rounded-lg sm:rounded-xl border ${colors.border} ${colors.bg} ${colors.hover} transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed ${!isDisabled && !downloading ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer active:scale-[0.98]' : ''}`}
            >
              <div className={`size-7 sm:size-10 rounded-md sm:rounded-lg ${colors.bg} ${colors.border} flex items-center justify-center shrink-0`}>
                {isLoading ? (
                  <div className="size-3 sm:size-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <card.icon className={`size-3.5 sm:size-5 ${colors.icon}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] sm:text-sm font-semibold ${colors.text} leading-tight sm:leading-normal`}>{card.title}</p>
                <p className="text-[9px] sm:text-xs text-gray-500 mt-0 sm:mt-0.5 hidden sm:block">{card.desc}</p>
                {isDisabled && <p className="text-[9px] sm:text-[10px] text-orange-500 mt-0 sm:mt-1">বিল্ডিং নির্বাচন করুন</p>}
              </div>
              <Download className={`size-3 sm:size-4 ${colors.icon} shrink-0`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
