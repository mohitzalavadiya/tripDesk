import fs from "fs";

let s = fs.readFileSync("src/app/(dashboard)/settings/page.tsx", "utf8");
s = s.replace(/fetchLogs\(\);\s*} catch \(err: any\) {\s*toast\.error\("Automation sweep/g, 'fetchLogs(true);\n    } catch (err: any) {\n      toast.error("Automation sweep');
s = s.replace(/fetchLogs\(\);\s*} catch \(err: any\) {\s*toast\.error\("Failed to resend/g, 'fetchLogs(true);\n    } catch (err: any) {\n      toast.error("Failed to resend');
fs.writeFileSync("src/app/(dashboard)/settings/page.tsx", s, "utf8");
console.log("Updated settings page post-sweep/resend fetchLogs");

