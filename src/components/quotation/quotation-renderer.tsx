"use client"

import * as React from "react"
import {
  Quotation,
  PublicQuotation,
  QuotationSection,
} from "@/types"
import { formatCurrency } from "@/lib/costing-engine"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Building2,
  Hotel,
  Car,
  Ticket,
  Check,
  X,
  Phone,
  Mail,
  Globe,
  ShieldCheck,
  Sparkles,
  Info,
  DollarSign,
  AlertCircle,
  FileText,
  Compass,
} from "lucide-react"

interface QuotationRendererProps {
  quotation: Quotation | PublicQuotation
  previewMode?: "desktop" | "tablet" | "mobile"
  isPublicView?: boolean
  hidePrintControls?: boolean
}

export function QuotationRenderer({
  quotation,
  previewMode = "desktop",
  isPublicView = false,
}: QuotationRendererProps) {
  // Determine customer data whether from Quotation or PublicQuotation
  const customer = "customerSnapshot" in quotation ? quotation.customerSnapshot : quotation.customer
  const trip = "tripSnapshot" in quotation ? quotation.tripSnapshot : quotation.trip
  const itinerary = "itinerarySnapshot" in quotation ? quotation.itinerarySnapshot : quotation.itinerary
  const hotels = "hotelSnapshot" in quotation ? quotation.hotelSnapshot : quotation.hotels
  const vehicle =
    "vehicleSnapshot" in quotation
      ? quotation.vehicleSnapshot
      : "vehicle" in quotation
      ? quotation.vehicle
      : undefined
  const activities = "activitySnapshot" in quotation ? quotation.activitySnapshot : quotation.activities
  const pricing = "pricingSnapshot" in quotation ? quotation.pricingSnapshot : quotation.pricing
  const agency = "agencySnapshot" in quotation ? quotation.agencySnapshot : quotation.agency

  const isExpired = "isExpired" in quotation ? quotation.isExpired : false

  // Visible sections sorted by order
  const visibleSections = React.useMemo(() => {
    return [...quotation.sections]
      .filter((s) => s.visible)
      .sort((a, b) => a.order - b.order)
  }, [quotation.sections])

  const hasSection = (type: string) => visibleSections.some((s) => s.type === type)

  const containerWidthClass =
    previewMode === "mobile"
      ? "max-w-[410px] mx-auto text-xs"
      : previewMode === "tablet"
      ? "max-w-[760px] mx-auto"
      : "max-w-[960px] mx-auto"

  return (
    <div className={`quotation-root bg-white text-slate-900 shadow-sm rounded-2xl border border-slate-200/90 overflow-hidden ${containerWidthClass} transition-all duration-300 font-sans`}>
      
      {/* ─── 1. COVER / HEADER SECTION ───────────────────────────────────── */}
      {hasSection("cover") && (
        <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 lg:p-12 overflow-hidden print:p-8">
          {/* Ambient Background Accent */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          {/* Top Brand Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8 z-10 relative">
            <div>
              <div className="text-sm sm:text-base font-black tracking-wider text-indigo-300 uppercase">
                {agency.name}
              </div>
              {agency.tagline && (
                <div className="text-[11px] text-slate-300 tracking-wide mt-0.5">
                  {agency.tagline}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[10px] sm:text-xs font-mono font-semibold tracking-wider text-indigo-200 border border-white/15 backdrop-blur-sm">
                <span>{quotation.quotationNumber}</span>
              </div>
              {isExpired && (
                <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-1">
                  Expired Quotation
                </div>
              )}
            </div>
          </div>

          {/* Destination Hero Title */}
          <div className="space-y-4 z-10 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider">
              <Compass className="h-3.5 w-3.5 text-indigo-300" />
              <span>Tailored Travel Proposal</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              {quotation.title}
            </h1>

            {quotation.subtitle && (
              <p className="text-xs sm:text-sm text-indigo-100/90 font-medium max-w-2xl leading-relaxed">
                {quotation.subtitle}
              </p>
            )}

            {/* Prepared For & Travel Dates Pill Strip */}
            <div className="flex flex-wrap items-center gap-2.5 pt-4 text-xs">
              <div className="bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-indigo-300" />
                <span>Prepared For: <strong className="text-white">{customer.name}</strong> ({customer.travellersLabel})</span>
              </div>

              <div className="bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-indigo-300" />
                <span>Travel Dates: <strong className="text-white">{trip.startDate} → {trip.endDate}</strong> ({trip.durationLabel})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container for Quotation Body Sections */}
      <div className="p-6 sm:p-10 space-y-10 print:p-8 print:space-y-8">
        
        {/* ─── 2. TRIP HIGHLIGHTS SUMMARY ─────────────────────────────────── */}
        {hasSection("summary") && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight uppercase">
                Trip Overview & Key Details
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Destination</span>
                <span className="font-extrabold text-slate-900 text-sm">{trip.destination}</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                <span className="font-extrabold text-indigo-900 text-sm">{trip.durationLabel}</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Travellers</span>
                <span className="font-extrabold text-slate-900 text-sm">{customer.travellersLabel}</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Travel Dates</span>
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{trip.startDate} – {trip.endDate}</span>
              </div>

              {vehicle && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle</span>
                  <span className="font-bold text-slate-800 text-xs truncate block">{vehicle.vehicleName}</span>
                </div>
              )}

              {hotels.length > 0 && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accommodation</span>
                  <span className="font-bold text-slate-800 text-xs truncate block">
                    {hotels.length} Curated Stays ({hotels[0]?.starCategory || 4}★)
                  </span>
                </div>
              )}
            </div>

            {quotation.customNotes && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950 leading-relaxed font-medium">
                {quotation.customNotes}
              </div>
            )}
          </section>
        )}

        {/* ─── 3. DAY-BY-DAY ITINERARY ────────────────────────────────────── */}
        {hasSection("itinerary") && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight uppercase">
                Day-by-Day Travel Itinerary
              </h2>
            </div>

            <div className="space-y-4">
              {itinerary.map((day) => (
                <div
                  key={day.dayNumber}
                  className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 sm:p-5 space-y-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span className="h-7 w-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {String(day.dayNumber).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                          {day.title}
                        </h3>
                        {day.date && (
                          <div className="text-[11px] font-semibold text-slate-500">
                            {day.date}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      {day.overnightLocation && (
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-slate-700 flex items-center gap-1">
                          <Hotel className="h-3 w-3 text-amber-600" />
                          <span>Night: {day.overnightLocation}</span>
                        </span>
                      )}
                      {day.mealsIncluded && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                          {day.mealsIncluded}
                        </span>
                      )}
                    </div>
                  </div>

                  {day.description && (
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {day.description}
                    </p>
                  )}

                  {/* Sightseeing Places Tagged */}
                  {day.places && day.places.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-2">
                      {day.places.map((place, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs"
                        >
                          <MapPin className="h-3 w-3 text-indigo-500" />
                          <span>{place.name}</span>
                          {place.visitTime && (
                            <span className="text-[10px] text-slate-400 font-mono">({place.visitTime})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── 4. ACCOMMODATIONS & HOTELS ─────────────────────────────────── */}
        {hasSection("hotels") && hotels.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Hotel className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight uppercase">
                Handpicked Accommodations & Resorts
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hotels.map((h) => (
                <div
                  key={h.id}
                  className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                          {h.destination} • {h.nights} Night(s)
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base mt-0.5">
                          {h.hotelName}
                        </h3>
                      </div>
                      {h.starCategory && (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                          {h.starCategory} ★
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                        {h.roomName} ({h.roomsCount} Room{h.roomsCount > 1 ? "s" : ""})
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                        {h.mealPlan}
                      </span>
                    </div>

                    {h.description && (
                      <p className="text-xs text-slate-500 leading-relaxed pt-1">
                        {h.description}
                      </p>
                    )}
                  </div>

                  {h.checkIn && h.checkOut && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>In: {h.checkIn}</span>
                      <span>Out: {h.checkOut}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── 5. PRIVATE TRANSPORTATION ───────────────────────────────────── */}
        {hasSection("vehicle") && vehicle && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Car className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight uppercase">
                Private Transportation & Fleet
              </h2>
            </div>

            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4.5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    {vehicle.vehicleName}
                  </h3>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">
                    {vehicle.vehicleType} • {vehicle.seatingCapacity} Passenger Capacity
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {vehicle.ac && (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-200">
                      Air Conditioned
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-bold border border-indigo-200">
                    Chauffeur Driven
                  </span>
                </div>
              </div>

              {vehicle.notes && (
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {vehicle.notes}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ─── 6. EXPERIENCES & ACTIVITIES ─────────────────────────────────── */}
        {hasSection("activities") && activities.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Ticket className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight uppercase">
                Included Activities & Experiences
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                      {act.activityName}
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                      {act.category}
                    </span>
                  </div>

                  {act.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {act.description}
                    </p>
                  )}

                  {act.duration && (
                    <div className="text-[11px] text-slate-400 font-semibold pt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Duration: {act.duration}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── 7. INCLUSIONS & EXCLUSIONS ─────────────────────────────────── */}
        {(hasSection("inclusions") || hasSection("exclusions")) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inclusions */}
            {hasSection("inclusions") && (
              <div className="bg-emerald-50/40 border border-emerald-200/70 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm uppercase tracking-wider border-b border-emerald-200/50 pb-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Package Inclusions</span>
                </div>

                <ul className="space-y-2 text-xs text-emerald-950 font-medium">
                  {quotation.inclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Exclusions */}
            {hasSection("exclusions") && (
              <div className="bg-rose-50/30 border border-rose-200/70 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs sm:text-sm uppercase tracking-wider border-b border-rose-200/50 pb-2">
                  <X className="h-4 w-4 text-rose-600" />
                  <span>Package Exclusions</span>
                </div>

                <ul className="space-y-2 text-xs text-rose-950 font-medium">
                  {quotation.exclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ─── 8. PRICING & INVESTMENT HERO CARD ──────────────────────────── */}
        {hasSection("pricing") && (
          <section className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest block">
                  Total Commercial Package Investment
                </span>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mt-1">
                  {formatCurrency(pricing.sellingPrice, pricing.currency)}
                </div>
              </div>

              {pricing.perPersonPrice && (
                <div className="sm:text-right bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/15">
                  <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">Estimated / Person</span>
                  <span className="text-lg sm:text-xl font-extrabold text-white">
                    {formatCurrency(pricing.perPersonPrice, pricing.currency)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-200 font-medium">
              <div>{pricing.priceNote || `Total package rate for ${pricing.totalTravellers} traveller(s)`}</div>
              <div className="flex items-center gap-1.5 font-semibold text-white bg-indigo-500/20 px-3 py-1 rounded-lg border border-indigo-400/30">
                <Clock className="h-3.5 w-3.5 text-indigo-300" />
                <span>Price Valid Until: <strong>{pricing.validUntil}</strong></span>
              </div>
            </div>
          </section>
        )}

        {/* ─── 9. TERMS, PAYMENT & CANCELLATION ────────────────────────────── */}
        {(hasSection("paymentTerms") || hasSection("cancellationPolicy") || hasSection("terms")) && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight uppercase">
                Booking Policy & Terms
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {hasSection("paymentTerms") && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                    Payment Terms
                  </h3>
                  <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                    {quotation.paymentTerms}
                  </p>
                </div>
              )}

              {hasSection("cancellationPolicy") && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                    Cancellation Policy
                  </h3>
                  <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                    {quotation.cancellationPolicy}
                  </p>
                </div>
              )}
            </div>

            {hasSection("terms") && (
              <div className="p-4.5 bg-slate-50/60 border border-slate-200 rounded-xl space-y-2 text-xs">
                <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                  Important Notes & Travel Conditions
                </h3>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed font-normal">
                  {quotation.termsAndConditions}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ─── 10. CONTACT & AGENCY FOOTER ─────────────────────────────────── */}
        {hasSection("contact") && (
          <footer className="border-t border-slate-200 pt-6 mt-8 space-y-4 text-xs text-slate-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                  {agency.name}
                </h3>
                {agency.address && <p className="text-slate-500 mt-0.5">{agency.address}</p>}
                {agency.licenseNumber && (
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Govt License: {agency.licenseNumber}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-xs">
                {agency.phone && (
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Phone className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{agency.phone}</span>
                  </div>
                )}
                {agency.email && (
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Mail className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{agency.email}</span>
                  </div>
                )}
                {agency.website && (
                  <div className="flex items-center gap-1.5 font-bold text-indigo-600">
                    <Globe className="h-3.5 w-3.5" />
                    <span>{agency.website.replace("https://", "")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 flex-wrap gap-2">
              <span>Thank you for choosing {agency.name}. Travel with confidence.</span>
              <span>Generated via TripDesk Operating System · {quotation.quotationNumber}</span>
            </div>
          </footer>
        )}

      </div>
    </div>
  )
}
