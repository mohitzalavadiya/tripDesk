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

// 19. trips/[id]/activities/route.ts
patchFile("src/app/api/trips/[id]/activities/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 20. trips/[id]/activities/[activityId]/route.ts
patchFile("src/app/api/trips/[id]/activities/[activityId]/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id, activityId } = validateRouteParams(tripActivityRouteParamsSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id, activityId } = validateRouteParams(tripActivityRouteParamsSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, activityId } = validateRouteParams(tripActivityRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripActivitySchema, request);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, activityId } = validateRouteParams(tripActivityRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripActivitySchema, request);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, activityId } = validateRouteParams(tripActivityRouteParamsSchema, await props.params);

    const deleted = await tripActivityService.deleteTripActivity(`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, activityId } = validateRouteParams(tripActivityRouteParamsSchema, await props.params);

    const deleted = await tripActivityService.deleteTripActivity(`,
  },
]);

// 21. trips/[id]/hotels/route.ts
patchFile("src/app/api/trips/[id]/hotels/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 22. trips/[id]/hotels/[hotelId]/route.ts
patchFile("src/app/api/trips/[id]/hotels/[hotelId]/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id, hotelId } = validateRouteParams(tripHotelRouteParamsSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id, hotelId } = validateRouteParams(tripHotelRouteParamsSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, hotelId } = validateRouteParams(tripHotelRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripHotelSchema, request);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, hotelId } = validateRouteParams(tripHotelRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripHotelSchema, request);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, hotelId } = validateRouteParams(tripHotelRouteParamsSchema, await props.params);

    const deleted = await tripHotelService.deleteTripHotel(`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, hotelId } = validateRouteParams(tripHotelRouteParamsSchema, await props.params);

    const deleted = await tripHotelService.deleteTripHotel(`,
  },
]);

// 23. trips/[id]/vehicles/route.ts
patchFile("src/app/api/trips/[id]/vehicles/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 24. trips/[id]/vehicles/[vehicleId]/route.ts
patchFile("src/app/api/trips/[id]/vehicles/[vehicleId]/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id, vehicleId } = validateRouteParams(tripVehicleRouteParamsSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id, vehicleId } = validateRouteParams(tripVehicleRouteParamsSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, vehicleId } = validateRouteParams(tripVehicleRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripVehicleSchema, request);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, vehicleId } = validateRouteParams(tripVehicleRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripVehicleSchema, request);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, vehicleId } = validateRouteParams(tripVehicleRouteParamsSchema, await props.params);

    const deleted = await tripVehicleService.deleteTripVehicle(`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, vehicleId } = validateRouteParams(tripVehicleRouteParamsSchema, await props.params);

    const deleted = await tripVehicleService.deleteTripVehicle(`,
  },
]);

// 25. trips/[id]/destinations/route.ts
patchFile("src/app/api/trips/[id]/destinations/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 26. trips/[id]/destinations/[destinationId]/route.ts
patchFile("src/app/api/trips/[id]/destinations/[destinationId]/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id, destinationId } = validateRouteParams(tripDestinationRouteParamsSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id, destinationId } = validateRouteParams(tripDestinationRouteParamsSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, destinationId } = validateRouteParams(tripDestinationRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripDestinationSchema, request);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, destinationId } = validateRouteParams(tripDestinationRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripDestinationSchema, request);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, destinationId } = validateRouteParams(tripDestinationRouteParamsSchema, await props.params);

    const deleted = await tripDestinationService.deleteTripDestination(`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, destinationId } = validateRouteParams(tripDestinationRouteParamsSchema, await props.params);

    const deleted = await tripDestinationService.deleteTripDestination(`,
  },
]);

// 27. trips/[id]/destinations/reorder/route.ts
patchFile("src/app/api/trips/[id]/destinations/reorder/route.ts", [
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 28. trips/[id]/travelers/route.ts
patchFile("src/app/api/trips/[id]/travelers/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);`,
  },
]);

// 29. trips/[id]/travelers/[travelerId]/route.ts
patchFile("src/app/api/trips/[id]/travelers/[travelerId]/route.ts", [
  {
    target: `    const context = await requireReadAccess();
    const { id, travelerId } = validateRouteParams(tripTravelerRouteParamsSchema, await props.params);`,
    replacement: `    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "VIEW");
    const { id, travelerId } = validateRouteParams(tripTravelerRouteParamsSchema, await props.params);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, travelerId } = validateRouteParams(tripTravelerRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripTravelerSchema, request);`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, travelerId } = validateRouteParams(tripTravelerRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripTravelerSchema, request);`,
  },
  {
    target: `    const context = await requireWriteAccess();
    const { id, travelerId } = validateRouteParams(tripTravelerRouteParamsSchema, await props.params);

    const deleted = await tripTravelerService.deleteTripTraveler(`,
    replacement: `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, travelerId } = validateRouteParams(tripTravelerRouteParamsSchema, await props.params);

    const deleted = await tripTravelerService.deleteTripTraveler(`,
  },
]);
