const fs = require('fs');

// 1. activities/[id]/page.tsx
let act = fs.readFileSync('src/app/(dashboard)/activities/[id]/page.tsx', 'utf8');
if (!act.includes('const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();')) {
  act = act.replace(
    'export default function ActivityProfilePage() {',
    `export default function ActivityProfilePage() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();`
  );
  act = act.replace(
    '  // Fetch real activity\n  const fetchActivity = React.useCallback(async () => {',
    `  // Fetch real activity
  const fetchActivity = React.useCallback(async () => {
    if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("ACTIVITIES", "view"))) {
      setLoading(false);
      return;
    }`
  );
  act = act.replace(
    '  return (\n    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">',
    `  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("ACTIVITIES", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Activity Details"
          badgeText="Access Restricted"
          description="You do not have permission to view activity details. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">`
  );
  fs.writeFileSync('src/app/(dashboard)/activities/[id]/page.tsx', act);
  console.log('Patched activities/[id]/page.tsx');
}

// 2. hotels/[id]/page.tsx
let hot = fs.readFileSync('src/app/(dashboard)/hotels/[id]/page.tsx', 'utf8');
if (!hot.includes('const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();')) {
  hot = hot.replace(
    'export default function HotelProfilePage() {',
    `export default function HotelProfilePage() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();`
  );
  hot = hot.replace(
    '  // Fetch real hotel\n  const fetchHotel = React.useCallback(async () => {',
    `  // Fetch real hotel
  const fetchHotel = React.useCallback(async () => {
    if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("HOTELS", "view"))) {
      setLoading(false);
      return;
    }`
  );
  hot = hot.replace(
    '  return (\n    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">',
    `  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("HOTELS", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Hotel Details"
          badgeText="Access Restricted"
          description="You do not have permission to view hotel details. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">`
  );
  fs.writeFileSync('src/app/(dashboard)/hotels/[id]/page.tsx', hot);
  console.log('Patched hotels/[id]/page.tsx');
}

// 3. vehicles/[id]/page.tsx
let veh = fs.readFileSync('src/app/(dashboard)/vehicles/[id]/page.tsx', 'utf8');
if (!veh.includes('const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();')) {
  veh = veh.replace(
    'export default function VehicleProfilePage() {',
    `export default function VehicleProfilePage() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();`
  );
  veh = veh.replace(
    '  // Fetch real vehicle\n  const fetchVehicle = React.useCallback(async () => {',
    `  // Fetch real vehicle
  const fetchVehicle = React.useCallback(async () => {
    if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("VEHICLES", "view"))) {
      setLoading(false);
      return;
    }`
  );
  veh = veh.replace(
    '  return (\n    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">',
    `  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("VEHICLES", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Vehicle Details"
          badgeText="Access Restricted"
          description="You do not have permission to view vehicle details. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">`
  );
  fs.writeFileSync('src/app/(dashboard)/vehicles/[id]/page.tsx', veh);
  console.log('Patched vehicles/[id]/page.tsx');
}

// 4. operations/[tripId]/page.tsx
let ops = fs.readFileSync('src/app/(dashboard)/operations/[tripId]/page.tsx', 'utf8');
if (!ops.includes('const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();')) {
  ops = ops.replace(
    'export default function TripOperationsDetailPage() {',
    `export default function TripOperationsDetailPage() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();`
  );
  ops = ops.replace(
    '  // Fetch full operation details\n  const fetchOperationData = React.useCallback(async () => {',
    `  // Fetch full operation details
  const fetchOperationData = React.useCallback(async () => {
    if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("OPERATIONS", "view"))) {
      setLoading(false);
      return;
    }`
  );
  // find return (
  const retIdx = ops.indexOf('  return (\n    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 pb-24">');
  if (retIdx !== -1) {
    ops = ops.slice(0, retIdx) + `  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("OPERATIONS", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Operations Workspace"
          badgeText="Access Restricted"
          description="You do not have permission to view trip operations. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }\n\n` + ops.slice(retIdx);
    fs.writeFileSync('src/app/(dashboard)/operations/[tripId]/page.tsx', ops);
    console.log('Patched operations/[tripId]/page.tsx');
  } else {
    console.log('Could not find return in operations/[tripId]/page.tsx');
  }
}

