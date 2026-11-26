const fs = require("fs");

function fix(file, from, to) {
  let content = fs.readFileSync(file, "utf8");
  const isCrlf = content.includes("\r\n");
  let normalized = content.replace(/\r\n/g, "\n");
  const normFrom = from.replace(/\r\n/g, "\n");
  const normTo = to.replace(/\r\n/g, "\n");
  if (!normalized.includes(normFrom)) {
    console.error("Not found in", file);
    return;
  }
  normalized = normalized.replace(normFrom, normTo);
  const finalContent = isCrlf ? normalized.replace(/\n/g, "\r\n") : normalized;
  fs.writeFileSync(file, finalContent, "utf8");
  console.log("Fixed:", file);
}

fix(
  "src/app/api/trips/[id]/travelers/[travelerId]/route.ts",
  `export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, travelerId } = validateRouteParams(`,
  `export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "UPDATE");
    const { id, travelerId } = validateRouteParams(`
);

fix(
  "src/app/api/trips/[id]/itinerary/[itemId]/route.ts",
  `export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, itemId } = validateRouteParams(`,
  `export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "UPDATE");
    const { id, itemId } = validateRouteParams(`
);

