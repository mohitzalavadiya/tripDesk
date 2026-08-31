"use client";

import * as React from "react";
import { GuestSatisfactionResult } from "@/lib/api-client/operations-client";
import { Star, MessageSquareQuote, ThumbsUp, Award } from "lucide-react";

interface OperationsSatisfactionCardProps {
  satisfactionData?: GuestSatisfactionResult;
  loading?: boolean;
}

export function OperationsSatisfactionCard({
  satisfactionData,
  loading = false,
}: OperationsSatisfactionCardProps) {
  if (loading || !satisfactionData) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse h-80">
        <div className="h-5 w-48 bg-slate-200 rounded mb-4" />
        <div className="h-40 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"
            }`}
          />
        ))}
      </div>
    );
  };

  const totalQualityRatings =
    satisfactionData.qualityDistribution.excellent +
    satisfactionData.qualityDistribution.good +
    satisfactionData.qualityDistribution.average +
    satisfactionData.qualityDistribution.poor;

  const getPercent = (count: number) => {
    if (totalQualityRatings === 0) return 0;
    return Math.round((count / totalQualityRatings) * 100);
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Guest Experience & Quality
              </h3>
              <p className="text-xs text-slate-500">
                Post-tour guest satisfaction ratings and operations execution grading
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
            {satisfactionData.totalReviews} Reviews ({satisfactionData.reviewCompletionRate}% Rate)
          </span>
        </div>

        {/* Rating Highlights */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">Guest Satisfaction</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {satisfactionData.averageGuestRating > 0
                  ? `${satisfactionData.averageGuestRating} / 5`
                  : "N/A"}
              </div>
            </div>
            {renderStars(satisfactionData.averageGuestRating)}
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">Operator Execution</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {satisfactionData.averageOperatorRating > 0
                  ? `${satisfactionData.averageOperatorRating} / 5`
                  : "N/A"}
              </div>
            </div>
            {renderStars(satisfactionData.averageOperatorRating)}
          </div>
        </div>

        {/* Quality Distribution */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-700 mb-2">
            Service Quality Distribution
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <div className="font-bold text-base">
                {satisfactionData.qualityDistribution.excellent}
              </div>
              <div className="text-[10px] uppercase font-semibold">Excellent ({getPercent(satisfactionData.qualityDistribution.excellent)}%)</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
              <div className="font-bold text-base">
                {satisfactionData.qualityDistribution.good}
              </div>
              <div className="text-[10px] uppercase font-semibold">Good ({getPercent(satisfactionData.qualityDistribution.good)}%)</div>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <div className="font-bold text-base">
                {satisfactionData.qualityDistribution.average}
              </div>
              <div className="text-[10px] uppercase font-semibold">Average ({getPercent(satisfactionData.qualityDistribution.average)}%)</div>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
              <div className="font-bold text-base">
                {satisfactionData.qualityDistribution.poor}
              </div>
              <div className="text-[10px] uppercase font-semibold">Poor ({getPercent(satisfactionData.qualityDistribution.poor)}%)</div>
            </div>
          </div>
        </div>

        {/* Recent Feedback Quotes */}
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2">
            Recent Debrief Remarks
          </div>
          {satisfactionData.recentFeedback.length === 0 ? (
            <div className="py-4 text-center text-slate-500 text-xs">
              No post-tour feedback recorded yet in this date range.
            </div>
          ) : (
            <div className="space-y-2">
              {satisfactionData.recentFeedback.slice(0, 2).map((f) => (
                <div
                  key={f.operationId}
                  className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs text-slate-700"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900">{f.tripNumber}</span>
                    <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                      ★ {f.guestRating}/5 ({f.serviceQuality})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 italic">
                    &ldquo;{f.guestFeedback || f.internalRemarks}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
