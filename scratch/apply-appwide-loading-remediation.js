import fs from "fs";

function patchFile(filePath, transforms) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");
  const isCrlf = content.includes("\r\n");
  let modified = false;

  transforms.forEach(({ name, search, replace }) => {
    if (typeof search === "string") {
      if (content.includes(search)) {
        content = content.replace(search, replace);
        console.log(`[PASS] ${filePath}: ${name}`);
        modified = true;
      } else {
        console.warn(`[WARN] ${filePath}: "${name}" target not found`);
      }
    } else if (search instanceof RegExp) {
      if (search.test(content)) {
        content = content.replace(search, replace);
        console.log(`[PASS] ${filePath}: ${name}`);
        modified = true;
      } else {
        console.warn(`[WARN] ${filePath}: "${name}" regex match failed`);
      }
    }
  });

  if (modified) {
    if (isCrlf && !content.includes("\r\n")) {
      content = content.replace(/\n/g, "\r\n");
    }
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Successfully updated ${filePath}`);
  }
}

// 1. Customers List
patchFile("src/app/(dashboard)/customers/page.tsx", [
  {
    name: "fetchCustomers signature with isSilent",
    search: "const fetchCustomers = React.useCallback(async () => {",
    replace: "const fetchCustomers = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchCustomers conditional setLoading",
    search: "setLoading(true);",
    replace: "if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchCustomers finally conditional setLoading",
    search: "} finally {\n      setLoading(false);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);",
  },
  {
    name: "fetchCustomers finally CRLF variant",
    search: "} finally {\r\n      setLoading(false);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);",
  },
  {
    name: "handleArchive silent refetch",
    search: "await fetchCustomers();",
    replace: "await fetchCustomers(true);",
  },
  {
    name: "JSX table skeleton guard",
    search: "{loading && (",
    replace: "{loading && customers.length === 0 && (",
  },
  {
    name: "JSX error guard",
    search: "{!loading && error && (",
    replace: "{!loading && error && customers.length === 0 && (",
  },
  {
    name: "JSX empty state guard",
    search: "{!loading && !error && customers.length === 0 ? (",
    replace: "{(!loading || customers.length > 0) && !error && customers.length === 0 ? (",
  },
  {
    name: "JSX table rendered condition",
    search: ") : !loading && !error && (",
    replace: ") : (!loading || customers.length > 0) && !error && (",
  },
]);

// 2. Customers Detail
patchFile("src/app/(dashboard)/customers/[id]/page.tsx", [
  {
    name: "loadCustomer signature with isSilent",
    search: "const loadCustomer = React.useCallback(async () => {",
    replace: "const loadCustomer = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "loadCustomer conditional setLoading",
    search: "const loadCustomer = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoading(true);",
    replace: "const loadCustomer = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "loadCustomer conditional setLoading CRLF",
    search: "const loadCustomer = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoading(true);",
    replace: "const loadCustomer = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "loadCustomer finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }\n  }, [id]);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, [id]);",
  },
  {
    name: "loadCustomer finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, [id]);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, [id]);",
  },
  {
    name: "editFormik post-mutation silent refetch",
    search: "await loadCustomer();\n        }\n      } catch (err: any) {",
    replace: "await loadCustomer(true);\n        }\n      } catch (err: any) {",
  },
  {
    name: "editFormik post-mutation silent refetch CRLF",
    search: "await loadCustomer();\r\n        }\r\n      } catch (err: any) {",
    replace: "await loadCustomer(true);\r\n        }\r\n      } catch (err: any) {",
  },
  {
    name: "handleInteractionSuccess silent refetch",
    search: "await loadCustomer();\n    setIsQuickLogOpen(false);",
    replace: "await loadCustomer(true);\n    setIsQuickLogOpen(false);",
  },
  {
    name: "handleInteractionSuccess silent refetch CRLF",
    search: "await loadCustomer();\r\n    setIsQuickLogOpen(false);",
    replace: "await loadCustomer(true);\r\n    setIsQuickLogOpen(false);",
  },
  {
    name: "loading unmount guard",
    search: "if (loading) {\n    return (\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
    replace: "if (loading && !customer) {\n    return (\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
  },
  {
    name: "loading unmount guard CRLF",
    search: "if (loading) {\r\n    return (\r\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
    replace: "if (loading && !customer) {\r\n    return (\r\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
  },
]);

// 3. Trips List
patchFile("src/app/(dashboard)/trips/page.tsx", [
  {
    name: "fetchTrips signature with isSilent",
    search: "const fetchTrips = React.useCallback(async () => {",
    replace: "const fetchTrips = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchTrips conditional setLoading",
    search: "const fetchTrips = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoading(true);",
    replace: "const fetchTrips = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchTrips conditional setLoading CRLF",
    search: "const fetchTrips = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoading(true);",
    replace: "const fetchTrips = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchTrips finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }\n  }, [search, statusFilter, debouncedDestination, page]);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, [search, statusFilter, debouncedDestination, page]);",
  },
  {
    name: "fetchTrips finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, [search, statusFilter, debouncedDestination, page]);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, [search, statusFilter, debouncedDestination, page]);",
  },
  {
    name: "handleArchive silent refetch",
    search: "await fetchTrips();",
    replace: "await fetchTrips(true);",
  },
  {
    name: "JSX table skeleton guard",
    search: "{loading && (",
    replace: "{loading && trips.length === 0 && (",
  },
  {
    name: "JSX error guard",
    search: "{!loading && error && (",
    replace: "{!loading && error && trips.length === 0 && (",
  },
  {
    name: "JSX empty state guard",
    search: "{!loading && !error && trips.length === 0 ? (",
    replace: "{(!loading || trips.length > 0) && !error && trips.length === 0 ? (",
  },
  {
    name: "JSX table rendered condition",
    search: ") : !loading && !error && (",
    replace: ") : (!loading || trips.length > 0) && !error && (",
  },
]);

// 4. Trips Detail
patchFile("src/app/(dashboard)/trips/[id]/page.tsx", [
  {
    name: "fetchTripDetails signature with isSilent",
    search: "const fetchTripDetails = React.useCallback(async () => {",
    replace: "const fetchTripDetails = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchTripDetails conditional setLoading",
    search: "const fetchTripDetails = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoading(true);",
    replace: "const fetchTripDetails = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchTripDetails conditional setLoading CRLF",
    search: "const fetchTripDetails = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoading(true);",
    replace: "const fetchTripDetails = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchTripDetails finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }\n  }, [id]);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, [id]);",
  },
  {
    name: "fetchTripDetails finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, [id]);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, [id]);",
  },
  {
    name: "loading unmount guard",
    search: "if (loading) {\n    return (\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
    replace: "if (loading && !trip) {\n    return (\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
  },
  {
    name: "loading unmount guard CRLF",
    search: "if (loading) {\r\n    return (\r\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
    replace: "if (loading && !trip) {\r\n    return (\r\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
  },
]);

// Trip Detail post-mutation calls replacement
{
  let tripDetailContent = fs.readFileSync("src/app/(dashboard)/trips/[id]/page.tsx", "utf8");
  // Replace all occurrences of await fetchTripDetails(); with await fetchTripDetails(true);
  const replaced = tripDetailContent.replace(/await\s+fetchTripDetails\(\);/g, "await fetchTripDetails(true);");
  if (replaced !== tripDetailContent) {
    fs.writeFileSync("src/app/(dashboard)/trips/[id]/page.tsx", replaced, "utf8");
    console.log("Replaced all await fetchTripDetails() with await fetchTripDetails(true) in trips/[id]/page.tsx");
  }
}

// 5. Trip Costing
patchFile("src/app/(dashboard)/trips/[id]/costing/page.tsx", [
  {
    name: "fetchCosting signature with isSilent",
    search: "const fetchCosting = React.useCallback(async () => {",
    replace: "const fetchCosting = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchCosting conditional setLoading",
    search: "try {\n      setLoading(true);",
    replace: "try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchCosting conditional setLoading CRLF",
    search: "try {\r\n      setLoading(true);",
    replace: "try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchCosting finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }",
  },
  {
    name: "fetchCosting finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }",
  },
  {
    name: "loading unmount guard",
    search: "if (loading) {\n    return (\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
    replace: "if (loading && !costing) {\n    return (\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
  },
  {
    name: "loading unmount guard CRLF",
    search: "if (loading) {\r\n    return (\r\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
    replace: "if (loading && !costing) {\r\n    return (\r\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
  },
]);

// 6. Trip Quotation Workspace
patchFile("src/app/(dashboard)/trips/[id]/quotation/page.tsx", [
  {
    name: "fetchTripQuotationData signature with isSilent",
    search: "const fetchTripQuotationData = React.useCallback(async () => {",
    replace: "const fetchTripQuotationData = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchTripQuotationData conditional setLoading",
    search: "try {\n      setLoading(true);",
    replace: "try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchTripQuotationData conditional setLoading CRLF",
    search: "try {\r\n      setLoading(true);",
    replace: "try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchTripQuotationData finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }",
  },
  {
    name: "fetchTripQuotationData finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }",
  },
  {
    name: "loading unmount guard",
    search: "if (loading) {\n    return (\n      <div className=\"min-h-screen bg-slate-50 flex items-center justify-center p-6\">",
    replace: "if (loading && !costing && quotations.length === 0) {\n    return (\n      <div className=\"min-h-screen bg-slate-50 flex items-center justify-center p-6\">",
  },
  {
    name: "loading unmount guard CRLF",
    search: "if (loading) {\r\n    return (\r\n      <div className=\"min-h-screen bg-slate-50 flex items-center justify-center p-6\">",
    replace: "if (loading && !costing && quotations.length === 0) {\r\n    return (\r\n      <div className=\"min-h-screen bg-slate-50 flex items-center justify-center p-6\">",
  },
]);

{
  let tripQuoteContent = fs.readFileSync("src/app/(dashboard)/trips/[id]/quotation/page.tsx", "utf8");
  const replaced = tripQuoteContent.replace(/await\s+fetchTripQuotationData\(\);/g, "await fetchTripQuotationData(true);");
  if (replaced !== tripQuoteContent) {
    fs.writeFileSync("src/app/(dashboard)/trips/[id]/quotation/page.tsx", replaced, "utf8");
    console.log("Replaced all await fetchTripQuotationData() with await fetchTripQuotationData(true) in trips/[id]/quotation/page.tsx");
  }
}

// 7. Quotations List
patchFile("src/app/(dashboard)/quotations/page.tsx", [
  {
    name: "fetchQuotations signature with isSilent",
    search: "const fetchQuotations = React.useCallback(async () => {",
    replace: "const fetchQuotations = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchQuotations conditional setLoading",
    search: "const fetchQuotations = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoading(true);",
    replace: "const fetchQuotations = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchQuotations conditional setLoading CRLF",
    search: "const fetchQuotations = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoading(true);",
    replace: "const fetchQuotations = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchQuotations finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }\n  }, [search, statusFilter, page]);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, [search, statusFilter, page]);",
  },
  {
    name: "fetchQuotations finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, [search, statusFilter, page]);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, [search, statusFilter, page]);",
  },
  {
    name: "handleStatusChange silent refetch",
    search: "await fetchQuotations();",
    replace: "await fetchQuotations(true);",
  },
  {
    name: "JSX table skeleton guard",
    search: "{loading && (",
    replace: "{loading && quotations.length === 0 && (",
  },
  {
    name: "JSX error guard",
    search: "{!loading && error && (",
    replace: "{!loading && error && quotations.length === 0 && (",
  },
  {
    name: "JSX empty state guard",
    search: "{!loading && !error && quotations.length === 0 ? (",
    replace: "{(!loading || quotations.length > 0) && !error && quotations.length === 0 ? (",
  },
  {
    name: "JSX table rendered condition",
    search: ") : !loading && !error && (",
    replace: ") : (!loading || quotations.length > 0) && !error && (",
  },
]);

// 8. Bookings List
patchFile("src/app/(dashboard)/bookings/page.tsx", [
  {
    name: "fetchBookings signature with isSilent",
    search: "const fetchBookings = React.useCallback(async () => {",
    replace: "const fetchBookings = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchBookings conditional setLoading",
    search: "const fetchBookings = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoading(true);",
    replace: "const fetchBookings = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchBookings conditional setLoading CRLF",
    search: "const fetchBookings = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoading(true);",
    replace: "const fetchBookings = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchBookings finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }\n  }, [search, statusFilter, paymentFilter, page]);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, [search, statusFilter, paymentFilter, page]);",
  },
  {
    name: "fetchBookings finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, [search, statusFilter, paymentFilter, page]);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, [search, statusFilter, paymentFilter, page]);",
  },
  {
    name: "handleCancelBooking silent refetch",
    search: "await fetchBookings();",
    replace: "await fetchBookings(true);",
  },
  {
    name: "JSX table skeleton guard",
    search: "{loading && (",
    replace: "{loading && bookings.length === 0 && (",
  },
  {
    name: "JSX error guard",
    search: "{!loading && error && (",
    replace: "{!loading && error && bookings.length === 0 && (",
  },
  {
    name: "JSX empty state guard",
    search: "{!loading && !error && bookings.length === 0 ? (",
    replace: "{(!loading || bookings.length > 0) && !error && bookings.length === 0 ? (",
  },
  {
    name: "JSX table rendered condition",
    search: ") : !loading && !error && (",
    replace: ") : (!loading || bookings.length > 0) && !error && (",
  },
]);

// 9. Bookings Detail
patchFile("src/app/(dashboard)/bookings/[id]/page.tsx", [
  {
    name: "fetchBooking signature with isSilent",
    search: "const fetchBooking = React.useCallback(async () => {",
    replace: "const fetchBooking = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchBooking conditional setLoading",
    search: "const fetchBooking = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoading(true);",
    replace: "const fetchBooking = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchBooking conditional setLoading CRLF",
    search: "const fetchBooking = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoading(true);",
    replace: "const fetchBooking = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchBooking finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }\n  }, [bookingId]);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, [bookingId]);",
  },
  {
    name: "fetchBooking finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, [bookingId]);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, [bookingId]);",
  },
  {
    name: "loading unmount guard",
    search: "if (loading) {\n    return (\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
    replace: "if (loading && !booking) {\n    return (\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
  },
  {
    name: "loading unmount guard CRLF",
    search: "if (loading) {\r\n    return (\r\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
    replace: "if (loading && !booking) {\r\n    return (\r\n      <div className=\"flex flex-col items-center justify-center min-h-[400px]",
  },
]);

{
  let bookingDetailContent = fs.readFileSync("src/app/(dashboard)/bookings/[id]/page.tsx", "utf8");
  const replaced = bookingDetailContent.replace(/await\s+fetchBooking\(\);/g, "await fetchBooking(true);");
  if (replaced !== bookingDetailContent) {
    fs.writeFileSync("src/app/(dashboard)/bookings/[id]/page.tsx", replaced, "utf8");
    console.log("Replaced all await fetchBooking() with await fetchBooking(true) in bookings/[id]/page.tsx");
  }
}

// 10. Payments List
patchFile("src/app/(dashboard)/payments/page.tsx", [
  {
    name: "fetchAllPayments signature with isSilent",
    search: "const fetchAllPayments = React.useCallback(async () => {",
    replace: "const fetchAllPayments = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchAllPayments conditional setLoading",
    search: "const fetchAllPayments = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoading(true);",
    replace: "const fetchAllPayments = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchAllPayments conditional setLoading CRLF",
    search: "const fetchAllPayments = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoading(true);",
    replace: "const fetchAllPayments = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchAllPayments finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }\n  }, [statusFilter, paymentMethodFilter, typeFilter]);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, [statusFilter, paymentMethodFilter, typeFilter]);",
  },
  {
    name: "fetchAllPayments finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, [statusFilter, paymentMethodFilter, typeFilter]);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, [statusFilter, paymentMethodFilter, typeFilter]);",
  },
  {
    name: "JSX table skeleton guard",
    search: "{loading && (",
    replace: "{loading && payments.length === 0 && (",
  },
  {
    name: "JSX error guard",
    search: "{!loading && error && (",
    replace: "{!loading && error && payments.length === 0 && (",
  },
  {
    name: "JSX empty state guard",
    search: "{!loading && !error && filteredItems.length === 0 && (",
    replace: "{(!loading || payments.length > 0) && !error && filteredItems.length === 0 && (",
  },
  {
    name: "JSX table rendered condition",
    search: "{!loading && !error && filteredItems.length > 0 && (",
    replace: "{(!loading || payments.length > 0) && !error && filteredItems.length > 0 && (",
  },
]);

{
  let paymentsContent = fs.readFileSync("src/app/(dashboard)/payments/page.tsx", "utf8");
  const replaced = paymentsContent.replace(/await\s+fetchAllPayments\(\);/g, "await fetchAllPayments(true);").replace(/fetchAllPayments\(\);/g, (match, offset) => {
    // Only replace non-hook calls
    const preceding = paymentsContent.slice(Math.max(0, offset - 50), offset);
    if (preceding.includes("useEffect") || preceding.includes("useCallback")) return match;
    return "fetchAllPayments(true);";
  });
  if (replaced !== paymentsContent) {
    fs.writeFileSync("src/app/(dashboard)/payments/page.tsx", replaced, "utf8");
    console.log("Replaced post-mutation fetchAllPayments calls in payments/page.tsx");
  }
}

// 11. Invoice Detail
patchFile("src/app/(dashboard)/invoices/[id]/page.tsx", [
  {
    name: "fetchInvoice signature with isSilent",
    search: "const fetchInvoice = React.useCallback(async () => {",
    replace: "const fetchInvoice = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchInvoice conditional setLoading",
    search: "const fetchInvoice = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoading(true);",
    replace: "const fetchInvoice = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchInvoice conditional setLoading CRLF",
    search: "const fetchInvoice = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoading(true);",
    replace: "const fetchInvoice = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchInvoice finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }\n  }, [invoiceId]);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, [invoiceId]);",
  },
  {
    name: "fetchInvoice finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, [invoiceId]);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, [invoiceId]);",
  },
  {
    name: "loading unmount guard",
    search: "if (loading) {\n    return (\n      <div className=\"min-h-screen bg-slate-50 flex items-center justify-center\">",
    replace: "if (loading && !invoice) {\n    return (\n      <div className=\"min-h-screen bg-slate-50 flex items-center justify-center\">",
  },
  {
    name: "loading unmount guard CRLF",
    search: "if (loading) {\r\n    return (\r\n      <div className=\"min-h-screen bg-slate-50 flex items-center justify-center\">",
    replace: "if (loading && !invoice) {\r\n    return (\r\n      <div className=\"min-h-screen bg-slate-50 flex items-center justify-center\">",
  },
  {
    name: "post-mutation fetchInvoice call",
    search: "onPaymentRecorded={() => {\n            fetchInvoice();\n          }}",
    replace: "onPaymentRecorded={() => {\n            fetchInvoice(true);\n          }}",
  },
  {
    name: "post-mutation fetchInvoice call CRLF",
    search: "onPaymentRecorded={() => {\r\n            fetchInvoice();\r\n          }}",
    replace: "onPaymentRecorded={() => {\r\n            fetchInvoice(true);\r\n          }}",
  },
]);

// 12. Follow-ups
patchFile("src/app/(dashboard)/follow-ups/page.tsx", [
  {
    name: "fetchData signature with isSilent",
    search: "const fetchData = React.useCallback(async () => {",
    replace: "const fetchData = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchData conditional setLoading",
    search: "const fetchData = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoading(true);",
    replace: "const fetchData = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchData conditional setLoading CRLF",
    search: "const fetchData = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoading(true);",
    replace: "const fetchData = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchData finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }\n  }, [statusFilter, typeFilter, urgencyFilter, overdueOnly, dateRange, search, isAgencyOwner, isAgencyStaff, hasStaffPermission]);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, [statusFilter, typeFilter, urgencyFilter, overdueOnly, dateRange, search, isAgencyOwner, isAgencyStaff, hasStaffPermission]);",
  },
  {
    name: "fetchData finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, [statusFilter, typeFilter, urgencyFilter, overdueOnly, dateRange, search, isAgencyOwner, isAgencyStaff, hasStaffPermission]);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, [statusFilter, typeFilter, urgencyFilter, overdueOnly, dateRange, search, isAgencyOwner, isAgencyStaff, hasStaffPermission]);",
  },
  {
    name: "follow-ups loading unmount guard",
    search: "{loading ? (\n            <div className=\"flex flex-col items-center justify-center py-20 text-slate-500\">",
    replace: "{loading && followUps.length === 0 ? (\n            <div className=\"flex flex-col items-center justify-center py-20 text-slate-500\">",
  },
  {
    name: "follow-ups loading unmount guard CRLF",
    search: "{loading ? (\r\n            <div className=\"flex flex-col items-center justify-center py-20 text-slate-500\">",
    replace: "{loading && followUps.length === 0 ? (\r\n            <div className=\"flex flex-col items-center justify-center py-20 text-slate-500\">",
  },
  {
    name: "follow-ups error guard",
    search: ") : error ? (",
    replace: ") : error && followUps.length === 0 ? (",
  },
]);

{
  let followUpsContent = fs.readFileSync("src/app/(dashboard)/follow-ups/page.tsx", "utf8");
  // Replace mutation refetches with fetchData(true)
  const replaced = followUpsContent
    .replace(/await\s+fetchData\(\);/g, "await fetchData(true);")
    .replace(/(toast\.success\([^\)]+\);\s*)fetchData\(\);/g, "$1fetchData(true);")
    .replace(/(handleCloseModal\(\);\s*)fetchData\(\);/g, "$1fetchData(true);")
    .replace(/(setIsRescheduleOpen\(false\);\s*)fetchData\(\);/g, "$1fetchData(true);")
    .replace(/(setIsCancelOpen\(false\);\s*)fetchData\(\);/g, "$1fetchData(true);");
  if (replaced !== followUpsContent) {
    fs.writeFileSync("src/app/(dashboard)/follow-ups/page.tsx", replaced, "utf8");
    console.log("Replaced post-mutation fetchData() with fetchData(true) in follow-ups/page.tsx");
  }
}

// 13. Customer Insights
patchFile("src/app/(dashboard)/customer-insights/page.tsx", [
  {
    name: "fetchInsights signature with isSilent",
    search: "const fetchInsights = React.useCallback(async () => {\n    setLoading(true);",
    replace: "const fetchInsights = React.useCallback(async (isSilent = false) => {\n    if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchInsights signature with isSilent CRLF",
    search: "const fetchInsights = React.useCallback(async () => {\r\n    setLoading(true);",
    replace: "const fetchInsights = React.useCallback(async (isSilent = false) => {\r\n    if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchInsights finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }\n  }, []);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, []);",
  },
  {
    name: "fetchInsights finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, []);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, []);",
  },
  {
    name: "loading destinations guard",
    search: "{loading ? (\n              <div className=\"p-8 text-center text-xs text-slate-400\">Loading destinations...</div>",
    replace: "{loading && !data ? (\n              <div className=\"p-8 text-center text-xs text-slate-400\">Loading destinations...</div>",
  },
  {
    name: "loading destinations guard CRLF",
    search: "{loading ? (\r\n              <div className=\"p-8 text-center text-xs text-slate-400\">Loading destinations...</div>",
    replace: "{loading && !data ? (\r\n              <div className=\"p-8 text-center text-xs text-slate-400\">Loading destinations...</div>",
  },
  {
    name: "loading VIP guests guard",
    search: "{loading ? (\n              <div className=\"p-8 text-center text-xs text-slate-400\">Loading VIP accounts...</div>",
    replace: "{loading && !data ? (\n              <div className=\"p-8 text-center text-xs text-slate-400\">Loading VIP accounts...</div>",
  },
  {
    name: "loading VIP guests guard CRLF",
    search: "{loading ? (\r\n              <div className=\"p-8 text-center text-xs text-slate-400\">Loading VIP accounts...</div>",
    replace: "{loading && !data ? (\r\n              <div className=\"p-8 text-center text-xs text-slate-400\">Loading VIP accounts...</div>",
  },
]);

// 14. Settings
patchFile("src/app/(dashboard)/settings/page.tsx", [
  {
    name: "fetchSettings signature with isSilent",
    search: "const fetchSettings = React.useCallback(async () => {",
    replace: "const fetchSettings = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchSettings conditional setLoading",
    search: "const fetchSettings = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoading(true);",
    replace: "const fetchSettings = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchSettings conditional setLoading CRLF",
    search: "const fetchSettings = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoading(true);",
    replace: "const fetchSettings = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);",
  },
  {
    name: "fetchSettings finally conditional setLoading",
    search: "} finally {\n      setLoading(false);\n    }\n  }, []);",
    replace: "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, []);",
  },
  {
    name: "fetchSettings finally conditional setLoading CRLF",
    search: "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, []);",
    replace: "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, []);",
  },
  {
    name: "fetchLogs signature with isSilent",
    search: "const fetchLogs = React.useCallback(async () => {",
    replace: "const fetchLogs = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchLogs conditional setLoadingLogs",
    search: "const fetchLogs = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoadingLogs(true);",
    replace: "const fetchLogs = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoadingLogs(true);",
  },
  {
    name: "fetchLogs conditional setLoadingLogs CRLF",
    search: "const fetchLogs = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoadingLogs(true);",
    replace: "const fetchLogs = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoadingLogs(true);",
  },
  {
    name: "fetchLogs finally conditional setLoadingLogs",
    search: "} finally {\n      setLoadingLogs(false);\n    }\n  }, []);",
    replace: "} finally {\n      if (!isSilent) setLoadingLogs(false);\n    }\n  }, []);",
  },
  {
    name: "fetchLogs finally conditional setLoadingLogs CRLF",
    search: "} finally {\r\n      setLoadingLogs(false);\r\n    }\r\n  }, []);",
    replace: "} finally {\r\n      if (!isSilent) setLoadingLogs(false);\r\n    }\r\n  }, []);",
  },
  {
    name: "fetchTaxData signature with isSilent",
    search: "const fetchTaxData = React.useCallback(async () => {",
    replace: "const fetchTaxData = React.useCallback(async (isSilent = false) => {",
  },
  {
    name: "fetchTaxData conditional setTaxLoading",
    search: "const fetchTaxData = React.useCallback(async (isSilent = false) => {\n    try {\n      setTaxLoading(true);",
    replace: "const fetchTaxData = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setTaxLoading(true);",
  },
  {
    name: "fetchTaxData conditional setTaxLoading CRLF",
    search: "const fetchTaxData = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setTaxLoading(true);",
    replace: "const fetchTaxData = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setTaxLoading(true);",
  },
  {
    name: "fetchTaxData finally conditional setTaxLoading",
    search: "} finally {\n      setTaxLoading(false);\n    }\n  }, []);",
    replace: "} finally {\n      if (!isSilent) setTaxLoading(false);\n    }\n  }, []);",
  },
  {
    name: "fetchTaxData finally conditional setTaxLoading CRLF",
    search: "} finally {\r\n      setTaxLoading(false);\r\n    }\r\n  }, []);",
    replace: "} finally {\r\n      if (!isSilent) setTaxLoading(false);\r\n    }\r\n  }, []);",
  },
  {
    name: "settings loading unmount guard",
    search: "{activeTab === \"communication\" ? (\n          loading ? (",
    replace: "{activeTab === \"communication\" ? (\n          loading && !settings ? (",
  },
  {
    name: "settings loading unmount guard CRLF",
    search: "{activeTab === \"communication\" ? (\r\n          loading ? (",
    replace: "{activeTab === \"communication\" ? (\r\n          loading && !settings ? (",
  },
]);

// 15-20. Inventory Pages (Activities, Hotels, Vehicles, Destinations, Suppliers, Rate Sheets)
const inventoryConfigs = [
  { file: "src/app/(dashboard)/activities/page.tsx", fn: "fetchActivities", arr: "activities" },
  { file: "src/app/(dashboard)/hotels/page.tsx", fn: "fetchHotels", arr: "hotels" },
  { file: "src/app/(dashboard)/vehicles/page.tsx", fn: "fetchVehicles", arr: "vehicles" },
  { file: "src/app/(dashboard)/destinations/page.tsx", fn: "fetchDestinations", arr: "destinations" },
  { file: "src/app/(dashboard)/suppliers/page.tsx", fn: "fetchSuppliers", arr: "suppliers" },
  { file: "src/app/(dashboard)/rate-sheets/page.tsx", fn: "fetchRateSheets", arr: "rateSheets" },
];

inventoryConfigs.forEach(({ file, fn, arr }) => {
  patchFile(file, [
    {
      name: `${fn} signature with isSilent`,
      search: `const ${fn} = React.useCallback(async () => {`,
      replace: `const ${fn} = React.useCallback(async (isSilent = false) => {`,
    },
    {
      name: `${fn} conditional setLoading`,
      search: `const ${fn} = React.useCallback(async (isSilent = false) => {\n    try {\n      setLoading(true);`,
      replace: `const ${fn} = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);`,
    },
    {
      name: `${fn} conditional setLoading CRLF`,
      search: `const ${fn} = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      setLoading(true);`,
      replace: `const ${fn} = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);`,
    },
    {
      name: `${fn} finally conditional setLoading`,
      search: `} finally {\n      setLoading(false);`,
      replace: `} finally {\n      if (!isSilent) setLoading(false);`,
    },
    {
      name: `${fn} finally conditional setLoading CRLF`,
      search: `} finally {\r\n      setLoading(false);`,
      replace: `} finally {\r\n      if (!isSilent) setLoading(false);`,
    },
    {
      name: `${file} JSX table skeleton guard`,
      search: "{loading && (",
      replace: `{loading && ${arr}.length === 0 && (`,
    },
    {
      name: `${file} JSX error guard`,
      search: "{!loading && error && (",
      replace: `{!loading && error && ${arr}.length === 0 && (`,
    },
    {
      name: `${file} JSX empty state guard`,
      search: `{!loading && !error && ${arr}.length === 0 ? (`,
      replace: `{(!loading || ${arr}.length > 0) && !error && ${arr}.length === 0 ? (`,
    },
    {
      name: `${file} JSX table rendered condition`,
      search: ") : !loading && !error && (",
      replace: `) : (!loading || ${arr}.length > 0) && !error && (`,
    },
  ]);

  // Replace post-mutation calls
  let invContent = fs.readFileSync(file, "utf8");
  const callRegex = new RegExp(`await\\s+${fn}\\(\\);`, "g");
  const replaced = invContent.replace(callRegex, `await ${fn}(true);`);
  if (replaced !== invContent) {
    fs.writeFileSync(file, replaced, "utf8");
    console.log(`Replaced await ${fn}() with await ${fn}(true) in ${file}`);
  }
});

console.log("\nApp-wide loading remediation script completed.");

