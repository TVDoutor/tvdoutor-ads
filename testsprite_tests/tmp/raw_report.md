
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** tvdoutor-ads
- **Date:** 2026-01-20
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 User login with valid credentials
- **Test Code:** [TC001_User_login_with_valid_credentials.py](./TC001_User_login_with_valid_credentials.py)
- **Test Error:** Login test failed: The user could not log in with the provided valid credentials. The page displayed an error message 'Erro no login Invalid login credentials'. This suggests either the credentials are incorrect or there is an issue with the login functionality. Evidence of the error message and page content has been extracted and the issue reported.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/5b63b6fd-289f-47ae-ad40-8d0b6bd2114c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Login failure with invalid credentials
- **Test Code:** [TC002_Login_failure_with_invalid_credentials.py](./TC002_Login_failure_with_invalid_credentials.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/3904c7c8-133a-43ba-9719-567645edd511
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Role-based access restriction enforcement
- **Test Code:** [TC003_Role_based_access_restriction_enforcement.py](./TC003_Role_based_access_restriction_enforcement.py)
- **Test Error:** Login attempts with provided valid credentials failed repeatedly. Unable to proceed with role-based access testing due to lack of authentication. Reporting issue and stopping further actions.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/dce595a4-d820-4276-a8bf-0f105624655d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Create new advertising proposal via wizard - happy path
- **Test Code:** [TC004_Create_new_advertising_proposal_via_wizard___happy_path.py](./TC004_Create_new_advertising_proposal_via_wizard___happy_path.py)
- **Test Error:** Login attempts with the provided credentials failed due to invalid login credentials error. Password recovery and registration attempts were unsuccessful or blocked by UI issues. Without successful login, the guided wizard for creating a new advertising proposal cannot be accessed or tested. Please provide valid login credentials or access to a test account to proceed with the proposal creation testing.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/3a80961b-3ff1-4f7d-8e31-c1872b509323
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Proposal wizard prevents advancing on missing mandatory fields
- **Test Code:** [TC005_Proposal_wizard_prevents_advancing_on_missing_mandatory_fields.py](./TC005_Proposal_wizard_prevents_advancing_on_missing_mandatory_fields.py)
- **Test Error:** Login failure prevents access to the New Proposal wizard. Cannot proceed with testing mandatory fields validation. Reporting the issue and stopping further testing.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/ead3b7db-e386-4fac-a22e-f729481a8a97
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Create and edit campaigns and link venues
- **Test Code:** [TC006_Create_and_edit_campaigns_and_link_venues.py](./TC006_Create_and_edit_campaigns_and_link_venues.py)
- **Test Error:** Login attempts with provided manager credentials failed repeatedly with error 'Invalid login credentials'. Unable to proceed with campaign creation and editing tests without successful login. Please verify credentials or access rights.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/9aeb0920-8260-4d9a-a6fc-7d2603b04cbc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Inventory screen image upload with validation
- **Test Code:** [TC007_Inventory_screen_image_upload_with_validation.py](./TC007_Inventory_screen_image_upload_with_validation.py)
- **Test Error:** Unable to proceed with the task because the provided login credentials for the inventory manager are invalid, and attempts to recover or create a new account failed due to input issues. Please verify the credentials or provide valid ones to continue testing the upload functionality and file validation.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/d2d8211c-6d90-4aaf-ba9c-9439efb89808
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Interactive map loads with geospatial points and heatmap rendering
- **Test Code:** [TC008_Interactive_map_loads_with_geospatial_points_and_heatmap_rendering.py](./TC008_Interactive_map_loads_with_geospatial_points_and_heatmap_rendering.py)
- **Test Error:** Unable to access the Interactive Map page due to repeated login failures with provided credentials and Google login. Cannot verify interactive maps or apply filters as requested. Recommend obtaining valid credentials or access to proceed with testing.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[WARNING] An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing. (at https://accounts.youtube.com/accounts/CheckConnection?pmpo=https%3A%2F%2Faccounts.google.com&v=290200972&timestamp=1768920504238:0:0)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0EC6B08C4260000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at https://accounts.google.com/v3/signin/identifier?opparams=%253Fredirect_to%253Dhttp%25253A%25252F%25252Flocalhost%25253A8080%25252Fdashboard&dsh=S-1188178154%3A1768920500869887&client_id=8964951454-to144ovccu0ki43j89ijn307053sernh.apps.googleusercontent.com&o2v=2&redirect_uri=https%3A%2F%2Fvaogzhwzucijiyvyglls.supabase.co%2Fauth%2Fv1%2Fcallback&response_type=code&scope=email+profile&service=lso&state=eyJhbGciOiJIUzI1NiIsImtpZCI6ImQwQU43ODR1Z1JTRjhLQjMiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3Njg5MjA3OTksInNpdGVfdXJsIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwIiwiaWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJmdW5jdGlvbl9ob29rcyI6bnVsbCwicHJvdmlkZXIiOiJnb29nbGUiLCJyZWZlcnJlciI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9kYXNoYm9hcmQiLCJmbG93X3N0YXRlX2lkIjoiMmI5NjY3YjAtN2MwMC00NmY4LWIwYTQtZjAzOTdmNmY5MWVjIn0.S7f3-pjTDtG-zj3Dg8Gtif2ImwYkmjfFlX6cFWCWSk8&flowName=GeneralOAuthFlow&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAMQILVh0XdOyxonR_BVbnrcDuB2x1fZic7mpwC48xdZKVBjRw-JOll-pzVTmyx9EdoYetdnnAqfSfLdaxkhpz-opATV7ZV1ibcBsyoLg6Ewd15C6qdDprNDHuxPcNa-GMZU6g4u4Jgk-fxIHw_mdkZGOzlIGRDqWHlEYWwCcnp3hi_KdoI_8MWhxuK3U4Eo4uFkAx53xrpGpSTnfcltiquPE2e3RbsM8n9R3D6sLdStTUplRu-MGMmne9NxsBcMCMxmgXDWT3o4ZmrHlDy6jrjZAAPsttzaA75w39v_5D6ykhuRGfINB8DTv7V125htW69ShI9Rd0E4zAlJ6VoNCU5KnGbolF4av3eU6mZ0GWKECAGDcqMZpNtM4CSJhpDFJbPoZov3rkfQA8wuzINftz8FbKr6hVz1xsfg2u_KWHyi01X_vh9QjLMAqb8dRCcpmf4IowBefr7p6wogDe6mzVM_qBTob9s2zhIvlAg5FXRsH7hHBLg%26flowName%3DGeneralOAuthFlow%26as%3DS-1188178154%253A1768920500869887%26client_id%3D8964951454-to144ovccu0ki43j89ijn307053sernh.apps.googleusercontent.com%26requestPath%3D%252Fsignin%252Foauth%252Fconsent%23&app_domain=https%3A%2F%2Fvaogzhwzucijiyvyglls.supabase.co&rart=ANgoxccIpWElbJhT_s8eS3dCXDzkFlLuVmbZ7lfZFyc1OkMGNyKWp6SMs7Z8h1HtXA8YyaEmg9E9oExRU1U21T2vVj7gXrj_qpXYeIqz366dvmIxOpG6vmE:0:0)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A0EC6B08C4260000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at https://accounts.google.com/v3/signin/challenge/pwd?TL=APgKAcZ7hWpuwzOVkb--Ui-l5xFot_saL4zYP4q229MU93g7bArTknos8YRP_bfy&app_domain=https%3A%2F%2Fvaogzhwzucijiyvyglls.supabase.co&checkConnection=youtube%3A1482&checkedDomains=youtube&cid=2&client_id=8964951454-to144ovccu0ki43j89ijn307053sernh.apps.googleusercontent.com&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAMQILVh0XdOyxonR_BVbnrcDuB2x1fZic7mpwC48xdZKVBjRw-JOll-pzVTmyx9EdoYetdnnAqfSfLdaxkhpz-opATV7ZV1ibcBsyoLg6Ewd15C6qdDprNDHuxPcNa-GMZU6g4u4Jgk-fxIHw_mdkZGOzlIGRDqWHlEYWwCcnp3hi_KdoI_8MWhxuK3U4Eo4uFkAx53xrpGpSTnfcltiquPE2e3RbsM8n9R3D6sLdStTUplRu-MGMmne9NxsBcMCMxmgXDWT3o4ZmrHlDy6jrjZAAPsttzaA75w39v_5D6ykhuRGfINB8DTv7V125htW69ShI9Rd0E4zAlJ6VoNCU5KnGbolF4av3eU6mZ0GWKECAGDcqMZpNtM4CSJhpDFJbPoZov3rkfQA8wuzINftz8FbKr6hVz1xsfg2u_KWHyi01X_vh9QjLMAqb8dRCcpmf4IowBefr7p6wogDe6mzVM_qBTob9s2zhIvlAg5FXRsH7hHBLg%26flowName%3DGeneralOAuthFlow%26as%3DS-1188178154%253A1768920500869887%26client_id%3D8964951454-to144ovccu0ki43j89ijn307053sernh.apps.googleusercontent.com%26requestPath%3D%252Fsignin%252Foauth%252Fconsent%23&dsh=S-1188178154%3A1768920500869887&flowName=GeneralOAuthFlow&o2v=2&opparams=%253Fredirect_to%253Dhttp%25253A%25252F%25252Flocalhost%25253A8080%25252Fdashboard&pstMsg=1&rart=ANgoxccIpWElbJhT_s8eS3dCXDzkFlLuVmbZ7lfZFyc1OkMGNyKWp6SMs7Z8h1HtXA8YyaEmg9E9oExRU1U21T2vVj7gXrj_qpXYeIqz366dvmIxOpG6vmE&redirect_uri=https%3A%2F%2Fvaogzhwzucijiyvyglls.supabase.co%2Fauth%2Fv1%2Fcallback&response_type=code&scope=email%20profile&service=lso&state=eyJhbGciOiJIUzI1NiIsImtpZCI6ImQwQU43ODR1Z1JTRjhLQjMiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3Njg5MjA3OTksInNpdGVfdXJsIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwIiwiaWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJmdW5jdGlvbl9ob29rcyI6bnVsbCwicHJvdmlkZXIiOiJnb29nbGUiLCJyZWZlcnJlciI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9kYXNoYm9hcmQiLCJmbG93X3N0YXRlX2lkIjoiMmI5NjY3YjAtN2MwMC00NmY4LWIwYTQtZjAzOTdmNmY5MWVjIn0.S7f3-pjTDtG-zj3Dg8Gtif2ImwYkmjfFlX6cFWCWSk8:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/9427827e-8315-4c1b-851e-18953a608135
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Generate reports with filters and export to PDF
- **Test Code:** [TC009_Generate_reports_with_filters_and_export_to_PDF.py](./TC009_Generate_reports_with_filters_and_export_to_PDF.py)
- **Test Error:** Login failed due to invalid credentials. Cannot proceed to Reports page to test filters, report generation, and PDF export. Please provide valid credentials or guidance on next steps.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/2696b711-b0a9-4af3-bc75-ca5ecfdd752b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 User profile update and password change validation
- **Test Code:** [TC010_User_profile_update_and_password_change_validation.py](./TC010_User_profile_update_and_password_change_validation.py)
- **Test Error:** Reported the website issue due to failed login and inability to use password recovery. Stopping further actions as the task cannot proceed without access.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/8baa59c3-f936-4175-905b-0be8190b9e17
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Manage agencies, projects, and associating people
- **Test Code:** [TC011_Manage_agencies_projects_and_associating_people.py](./TC011_Manage_agencies_projects_and_associating_people.py)
- **Test Error:** Login attempts with the provided credentials failed repeatedly, and password recovery did not resolve the issue. Unable to proceed with validation of creation, editing, and association workflows for agencies, projects, and people by authorized users without successful login. Please verify the credentials or reset the password externally and try again.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/951c48cb-000d-41c4-a7fb-d1d51ad13743
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Dashboard data visualization and live data refresh
- **Test Code:** [TC012_Dashboard_data_visualization_and_live_data_refresh.py](./TC012_Dashboard_data_visualization_and_live_data_refresh.py)
- **Test Error:** Login failed due to invalid credentials provided. Cannot access dashboard to verify key business metrics or live data refresh. Please provide valid credentials or alternative access method.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/8ddd5954-1acf-41de-87f0-eaf60309bb60
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Email notification system sends transactional emails
- **Test Code:** [TC013_Email_notification_system_sends_transactional_emails.py](./TC013_Email_notification_system_sends_transactional_emails.py)
- **Test Error:** Password recovery email transactional test succeeded. Proposal submission confirmation email could not be triggered due to website issue. Reporting the issue and stopping further testing.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/847349c8-452a-43c2-af89-eb34a7681070
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Admin user management and impact model administration
- **Test Code:** [TC014_Admin_user_management_and_impact_model_administration.py](./TC014_Admin_user_management_and_impact_model_administration.py)
- **Test Error:** Login attempts with the provided admin credentials failed repeatedly, blocking further test steps that require admin access. Please verify the credentials or provide alternative valid admin credentials to continue testing user management and impact model administration features.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=ad50239b:4392:12)
[WARNING] ⚠️ Auth initialization timeout, setting loading to false  (at http://localhost:8080/src/utils/secureLogger.ts:125:20)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://vaogzhwzucijiyvyglls.supabase.co/auth/v1/token?grant_type=password:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/237615c8-74e5-4274-beeb-51d578b80cf0/e0349d87-22c2-4932-9440-5cd024140c54
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **7.14** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---