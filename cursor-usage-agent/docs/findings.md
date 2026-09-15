# Cursor Usage Agent Findings

Updated after enabling live plan-usage collection via the signed-in Cursor IDE session.

## Account

Status: **AVAILABLE**

Source: Cursor IDE `state.vscdb` non-secret fields (`cursorAuth/cachedEmail`, membership) + `GetPlanInfo`

Fields: email, membership type, plan name

---

## Plan

Status: **AVAILABLE**

Source: `DashboardService/GetPlanInfo`

Fields: `planName`, `price`, `includedAmountCents`, `billingCycleEnd`

---

## Current Usage

Status: **AVAILABLE**

Source: `POST https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage`

Fields: `totalSpend`, `includedSpend`, `bonusSpend` (cents → USD)

---

## Monthly Usage

Status: **AVAILABLE** (current billing period)

Source: same `GetCurrentPeriodUsage` + cycle timestamps

Fields: included used, limit, cycle start/end

---

## Remaining Usage

Status: **AVAILABLE**

Source: `planUsage.remaining` or computed `limit - includedSpend`

Fields: remaining USD, limit USD

---

## Usage Percentage

Status: **AVAILABLE**

Source: `totalPercentUsed`, `autoPercentUsed`, `apiPercentUsed`

Fields: percentages + display messages

---

## Model Usage

Status: **NOT AVAILABLE** (per-model request/token table)

Source: GetCurrentPeriodUsage does not return per-model counters

---

## Token Usage

Status: **NOT AVAILABLE** (account totals)

---

## Spending

Status: **AVAILABLE** (plan period + on-demand fields when present)

Source: `planUsage` + `spendLimitUsage`

---

## Historical Usage

Status: **NOT AVAILABLE** (not wired yet)

---

## Auth mechanism (security)

- Reads IDE access token **ephemerally** from local SQLite (read-only)
- Token is **never** written to scan/report JSON
- Only usage aggregates are retained
