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

// 30. trips/[id]/itinerary/route.ts
patchFile("src/app/api/trips/[id]/itinerary/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "VIEW");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "CREATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 31. trips/[id]/itinerary/[itemId]/route.ts
patchFile("src/app/api/trips/[id]/itinerary/[itemId]/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id, itemId } = validateRouteParams(itineraryItemRouteParamsSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "VIEW");
    const { id, itemId } = validateRouteParams(itineraryItemRouteParamsSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, itemId } = validateRouteParams(itineraryItemRouteParamsSchema, await props.params);
    const body = await validateJson(updateItineraryItemSchema, request);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "UPDATE");
    const { id, itemId } = validateRouteParams(itineraryItemRouteParamsSchema, await props.params);
    const body = await validateJson(updateItineraryItemSchema, request);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, itemId } = validateRouteParams(itineraryItemRouteParamsSchema, await props.params);

    const deleted = await itineraryService.deleteItineraryItem(`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "UPDATE");
    const { id, itemId } = validateRouteParams(itineraryItemRouteParamsSchema, await props.params);

    const deleted = await itineraryService.deleteItineraryItem(`,
  },
]);

// 32. trips/[id]/itinerary/reorder-item/route.ts
patchFile("src/app/api/trips/[id]/itinerary/reorder-item/route.ts", [
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "UPDATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 33. trips/[id]/itinerary/reorder-day/route.ts
patchFile("src/app/api/trips/[id]/itinerary/reorder-day/route.ts", [
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "UPDATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 34. trips/[id]/itinerary/duplicate-day/route.ts
patchFile("src/app/api/trips/[id]/itinerary/duplicate-day/route.ts", [
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "CREATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 35. trips/[id]/itinerary/apply-day-template/route.ts
patchFile("src/app/api/trips/[id]/itinerary/apply-day-template/route.ts", [
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "CREATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 36. trips/[id]/itinerary/apply-package-template/route.ts
patchFile("src/app/api/trips/[id]/itinerary/apply-package-template/route.ts", [
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "CREATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 37. trips/[id]/itinerary/save-as-template/route.ts
patchFile("src/app/api/trips/[id]/itinerary/save-as-template/route.ts", [
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "CREATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);
