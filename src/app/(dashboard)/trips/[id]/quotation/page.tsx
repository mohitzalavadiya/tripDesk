"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useEnquiry } from "@/context/enquiry-context"
import { useInventory } from "@/context/inventory-context"
import { useCosting } from "@/context/costing-context"
import { useQuotation } from "@/context/quotation-context"
import { QuotationEditor } from "@/components/quotation/quotation-editor"
import { QuotationShareModal } from "@/components/quotation/quotation-share-modal"
import { QuotationVersionModal } from "@/components/quotation/quotation-version-modal"
import { QuotationChangeAlert } from "@/components/quotation/quotation-change-alert"
import { detectQuotationChanges } from "@/lib/quotation/compare-quotation"
import { Quotation } from "@/types"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  FileText,
  Plus,
  Sparkles,
  ExternalLink,
  Share2,
  DollarSign,
  AlertCircle,
  Copy,
} from "lucide-react"

export default function TripQuotationEditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { trips, customers, itineraryDays } = useEnquiry()
  const {
    hotels,
    hotelRooms,
    vehicles,
    activities,
    tripHotels,
    tripVehicles,
    tripActivities,
  } = useInventory()
  const { getCostingForTrip } = useCosting()
  const {
    quotations,
    getQuotationsForTrip,
    createQuotationFromTrip,
    updateQuotation,
    createQuotationVersion,
    markQuotationSent,
  } = useQuotation()

  const trip = trips.find((t) => t.id === id)
  const customer = trip ? customers.find((c) => c.id === trip.customerId) : undefined
  const thisTripHotels = tripHotels.filter((th) => th.tripId === id)
  const thisTripVehicles = tripVehicles.filter((tv) => tv.tripId === id)
  const thisTripActivities = tripActivities.filter((ta) => ta.tripId === id)
  const thisTripItinerary = itineraryDays.filter((d) => d.tripId === id)
  const tripCostingData = trip ? getCostingForTrip(trip.id) : null

  // Quotations for this trip
  const tripQuotations = trip ? getQuotationsForTrip(trip.id) : []
  const activeQuotation = tripQuotations[0]

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false)
  const [isVersionModalOpen, setIsVersionModalOpen] = React.useState(false)

  if (!trip || !customer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <h2 className="text-lg font-bold text-slate-800">Trip Not Found</h2>
          <p className="text-xs text-slate-500">The requested trip proposal does not exist.</p>
          <Button size="sm" onClick={() => router.push("/trips")}>
            Back to Trips
          </Button>
        </div>
      </div>
    )
  }

  // Handle Initial Quotation Creation
  const handleCreateInitialQuotation = () => {
    const newQ = createQuotationFromTrip(
      trip,
      customer,
      thisTripItinerary,
      thisTripHotels,
      thisTripVehicles,
      thisTripActivities,
      tripCostingData?.costing,
      { hotels, hotelRooms, vehicles, activities }
    )
  }

  // Change detection
  const difference = activeQuotation
    ? detectQuotationChanges(
        activeQuotation,
        trip,
        tripCostingData?.costing,
        thisTripItinerary,
        thisTripHotels,
        thisTripVehicles,
        thisTripActivities
      )
    : { hasChanges: false, priceChanged: false, oldPrice: 0, newPrice: 0, messages: [] }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Navigation Breadcrumb Back */}
        <div className="flex items-center justify-between">
          <Link
            href={`/trips/${trip.id}`}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Trip Workspace ({trip.name})</span>
          </Link>

          {activeQuotation && (
            <div className="flex items-center gap-2">
              <Link
                href={`/trips/${trip.id}/quotation/preview`}
                className="inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-8.5 px-3 rounded-xl transition-colors text-slate-700"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Full Preview
              </Link>
            </div>
          )}
        </div>

        {/* Change Divergence Alert if live Trip / Costing was modified */}
        {activeQuotation && difference.hasChanges && (
          <QuotationChangeAlert
            difference={difference}
            onCreateVersion={() => setIsVersionModalOpen(true)}
          />
        )}

        {/* If Quotation Exists: Render Full Editor Workspace */}
        {activeQuotation ? (
          <QuotationEditor
            initialQuotation={activeQuotation}
            onSave={(updated) => updateQuotation(updated.id, updated)}
            onShare={() => setIsShareModalOpen(true)}
            onPreview={() => router.push(`/trips/${trip.id}/quotation/preview`)}
          />
        ) : (
          /* Empty State: Prompt to generate Quotation */
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-xs space-y-4 my-8">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <FileText className="h-7 w-7 stroke-[1.8]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                No Quotation Created Yet
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                Turn this trip, day-by-day itinerary, selected hotels, private fleet, and Phase 5 commercial costing into a customer proposal.
              </p>
            </div>

            <div className="pt-3">
              <Button
                size="sm"
                onClick={handleCreateInitialQuotation}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-xs cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Generate Quotation Snapshot
              </Button>
            </div>
          </div>
        )}

        {/* Share & Version Modals */}
        <QuotationShareModal
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
          quotation={activeQuotation}
          onMarkSent={(id) => markQuotationSent(id)}
        />

        <QuotationVersionModal
          open={isVersionModalOpen}
          onOpenChange={setIsVersionModalOpen}
          quotation={activeQuotation}
          onConfirmVersion={() => {
            if (activeQuotation) {
              const newV = createQuotationVersion(
                activeQuotation.id,
                trip,
                customer,
                thisTripItinerary,
                thisTripHotels,
                thisTripVehicles,
                thisTripActivities,
                tripCostingData?.costing,
                { hotels, hotelRooms, vehicles, activities }
              )
            }
          }}
        />

      </div>
    </div>
  )
}
