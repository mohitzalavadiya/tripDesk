const fs = require("fs");
const path = require("path");

function patchFile(filePath, transforms) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error("File not found:", fullPath);
    return;
  }
  let content = fs.readFileSync(fullPath, "utf8");
  const isCrlf = content.includes("\r\n");
  let normalizedContent = content.replace(/\r\n/g, "\n");

  let modified = false;
  for (const { target, replacement } of transforms) {
    const normalizedTarget = target.replace(/\r\n/g, "\n");
    const normalizedReplacement = replacement.replace(/\r\n/g, "\n");
    if (!normalizedContent.includes(normalizedTarget)) {
      console.warn("Target not found in " + filePath + ":\n" + normalizedTarget.substring(0, 80));
    } else {
      normalizedContent = normalizedContent.replace(normalizedTarget, normalizedReplacement);
      modified = true;
    }
  }

  if (modified) {
    const finalContent = isCrlf ? normalizedContent.replace(/\n/g, "\r\n") : normalizedContent;
    fs.writeFileSync(fullPath, finalContent, "utf8");
    console.log("Successfully Patched:", filePath);
  } else {
    console.log("No modifications for:", filePath);
  }
}

// 1. destinations/[destinationId]/route.ts
patchFile("src/app/api/trips/[id]/destinations/[destinationId]/route.ts", [
  {
    target: `  try {
    const context = await requireReadAccess();
    const { id, destinationId } = validateRouteParams(`,
    replacement: `  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id, destinationId } = validateRouteParams(`,
  },
  {
    target: `  try {
    const context = await requireWriteAccess();
    const { id, destinationId } = validateRouteParams(`,
    replacement: `  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, destinationId } = validateRouteParams(`,
  },
]);

// 2. travelers/[travelerId]/route.ts
patchFile("src/app/api/trips/[id]/travelers/[travelerId]/route.ts", [
  {
    target: `  try {
    const context = await requireReadAccess();
    const { id, travelerId } = validateRouteParams(`,
    replacement: `  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id, travelerId } = validateRouteParams(`,
  },
  {
    target: `  try {
    const context = await requireWriteAccess();
    const { id, travelerId } = validateRouteParams(
      travelerRouteParamsSchema,
      await props.params
    );
    const body = await validateJson(updateTravelerSchema, request);`,
    replacement: `  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, travelerId } = validateRouteParams(
      travelerRouteParamsSchema,
      await props.params
    );
    const body = await validateJson(updateTravelerSchema, request);`,
  },
  {
    target: `  try {
    const context = await requireWriteAccess();
    const { id, travelerId } = validateRouteParams(
      travelerRouteParamsSchema,
      await props.params
    );

    const deleted = await travelerService.deleteTraveler(`,
    replacement: `  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, travelerId } = validateRouteParams(
      travelerRouteParamsSchema,
      await props.params
    );

    const deleted = await travelerService.deleteTraveler(`,
  },
]);

// 3. itinerary/[itemId]/route.ts
patchFile("src/app/api/trips/[id]/itinerary/[itemId]/route.ts", [
  {
    target: `  try {
    const context = await requireReadAccess();
    const { id, itemId } = validateRouteParams(`,
    replacement: `  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "VIEW");
    const { id, itemId } = validateRouteParams(`,
  },
  {
    target: `  try {
    const context = await requireWriteAccess();
    const { id, itemId } = validateRouteParams(
      itineraryRouteParamsSchema,
      await props.params
    );
    const body = await validateJson(updateItineraryItemSchema, request);`,
    replacement: `  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "UPDATE");
    const { id, itemId } = validateRouteParams(
      itineraryRouteParamsSchema,
      await props.params
    );
    const body = await validateJson(updateItineraryItemSchema, request);`,
  },
  {
    target: `  try {
    const context = await requireWriteAccess();
    const { id, itemId } = validateRouteParams(
      itineraryRouteParamsSchema,
      await props.params
    );

    const deleted = await itineraryService.deleteItineraryItem(`,
    replacement: `  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "UPDATE");
    const { id, itemId } = validateRouteParams(
      itineraryRouteParamsSchema,
      await props.params
    );

    const deleted = await itineraryService.deleteItineraryItem(`,
  },
]);

