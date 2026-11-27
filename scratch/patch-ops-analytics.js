const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/operations/analytics/page.tsx', 'utf8');

code = code.replace(
  '<OperationsFinancialAnalyticsCard financialData={data?.financial} loading={loading} />',
  `{isAgencyOwner ? (
            <OperationsFinancialAnalyticsCard financialData={data?.financial} loading={loading} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-center items-center text-center space-y-2">
              <h4 className="text-sm font-bold text-slate-800">Financial Variance Analysis</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Financial variance audits and supplier margins are reserved for Agency Owners.
              </p>
            </div>
          )}`
);

fs.writeFileSync('src/app/(dashboard)/operations/analytics/page.tsx', code);
console.log('Successfully updated operations analytics page');

