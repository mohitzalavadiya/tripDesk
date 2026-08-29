"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Hotel as HotelIcon,
  Plus,
  Search,
  Building2,
  MapPin,
  RotateCcw,
  X,
  Eye,
  MoreVertical,
  Archive,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hotelClient } from "@/lib/api-client";
import { Hotel } from "@prisma/client";
import { toast } from "sonner";

export default function HotelsPage() {
  const router = useRouter();

  // Data states
  const [hotels, setHotels] = React.useState<Hotel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [archivingId, setArchivingId] = React.useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Debounce search input (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch real hotels from API
  const fetchHotels = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await hotelClient.getHotels({
        search: debouncedSearch || undefined,
        page,
        limit: 20,
      });

      if (res.success && res.data) {
        setHotels(res.data);
        setPagination(res.meta);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load hotels from database.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  React.useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const isFilterActive = search.trim() !== "";

  // Archive Hotel
  const handleArchive = async (id: string, name: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted to read-only mode.");
      return;
    }

    if (!confirm(`Archive hotel "${name}"? This soft-deletes the record while keeping historical trip reservations safe.`)) {
      return;
    }

    try {
      setArchivingId(id);
      await hotelClient.archiveHotel(id);
      toast.success(`Hotel "${name}" archived successfully.`);
      await fetchHotels();
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
        toast.error("Subscription expired. Read-only mode is active.");
      } else {
        toast.error(err?.message || "Failed to archive hotel.");
      }
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Hotel Inventory" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Telemetry */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                <HotelIcon className="h-3 w-3 text-indigo-500" />
                Hotel Inventory
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {pagination.total} contracted properties
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Hotels & Resorts
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Manage contracted properties, categories, contact points, and trip accommodations
              </span>
            </div>

            {/* Micro-Telemetry Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                <Building2 className="h-3 w-3 text-emerald-600" />
                <span className="font-bold text-emerald-950">{pagination.total}</span> Properties Registered
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                <span>Page</span>
                <strong className="text-slate-900">{pagination.page}</strong>
                <span>of</span>
                <strong className="text-slate-900">{pagination.totalPages}</strong>
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/hotels/new")}
              disabled={isReadOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Hotel
            </Button>
          </div>
        </div>

        {/* Master Card (Filter Bar + Table) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Search Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search hotels by property name, city, state, or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-9 h-9.5 text-xs bg-slate-50/70 border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 focus-visible:bg-white rounded-xl transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 shrink-0 cursor-pointer font-semibold rounded-lg"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset Filter
                </Button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-16 text-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching hotels from database...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-12 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchHotels()}
                className="text-xs h-8 rounded-lg cursor-pointer"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Table Content */}
          {!loading && !error && hotels.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={HotelIcon}
                title={isFilterActive ? "No matching hotels found" : "No hotel inventory registered yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search query."
                    : "Add your first contracted hotel or resort property to make it available for trip itineraries."
                }
                actionText={isFilterActive ? "Clear Filter" : "Add Hotel"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/hotels/new")}
              />
            </div>
          ) : !loading && !error && (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[300px]">Hotel & Category</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Location</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Contact</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Website</TableHead>
                      <TableHead className="py-3 px-4 w-[80px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotels.map((hotel) => (
                      <TableRow
                        key={hotel.id}
                        onClick={() => router.push(`/hotels/${hotel.id}`)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                      >
                        <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-100 shrink-0">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                {hotel.name}
                              </span>
                              {hotel.category && (
                                <span className="text-[10px] text-slate-500">
                                  {hotel.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>
                              {hotel.city ? `${hotel.city}${hotel.state ? `, ${hotel.state}` : ""}` : (hotel.address || "Unspecified")}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                            {hotel.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {hotel.phone}
                              </span>
                            )}
                            {hotel.email && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Mail className="h-3 w-3 text-slate-400" />
                                {hotel.email}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          {hotel.website ? (
                            <a
                              href={hotel.website.startsWith("http") ? hotel.website : `https://${hotel.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                            >
                              <Globe className="h-3 w-3 text-indigo-400" />
                              <span className="truncate max-w-[140px]">{hotel.website.replace(/^https?:\/\//, "")}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-md rounded-xl p-1 w-44">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">
                                  Hotel Options
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/hotels/${hotel.id}`)}
                                  className="text-xs cursor-pointer rounded-md"
                                >
                                  <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleArchive(hotel.id, hotel.name)}
                                  disabled={isReadOnly || archivingId === hotel.id}
                                  className="text-xs text-rose-600 hover:bg-rose-50 cursor-pointer rounded-md disabled:opacity-50"
                                >
                                  <Archive className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                  {archivingId === hotel.id ? "Archiving..." : "Archive Hotel"}
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-slate-100">
                {hotels.map((hotel) => (
                  <div
                    key={hotel.id}
                    onClick={() => router.push(`/hotels/${hotel.id}`)}
                    className="p-4 space-y-2.5 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{hotel.name}</h4>
                        <p className="text-[11px] text-slate-500">{hotel.category || "Hotel Property"}</p>
                      </div>
                      {hotel.city && (
                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                          {hotel.city}
                        </Badge>
                      )}
                    </div>
                    {hotel.phone && (
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {hotel.phone}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Footer with Pagination */}
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{hotels.length}</strong> of{" "}
              <strong className="text-slate-800">{pagination.total}</strong> hotels
            </span>

            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                <span className="text-xs font-bold text-slate-700 px-1">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages || loading}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
