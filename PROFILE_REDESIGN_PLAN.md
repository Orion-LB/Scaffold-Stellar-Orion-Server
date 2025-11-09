# 🎨 Profile Section Redesign - UX Design Plan

## 📋 Current Issues

**Problems identified:**
1. ❌ Transactions cluttering the profile section (should be in sidebar)
2. ❌ 4 separate cards creating visual clutter
3. ❌ No proper financial portfolio visualization
4. ❌ Yield claiming not vault-specific
5. ❌ No clear risk visualization
6. ❌ Layout doesn't feel like professional finance dashboard

---

## 🎯 Design Goals

**What we want to achieve:**
1. ✅ Clean, professional finance portfolio look (like Bloomberg, Robinhood, or Fidelity)
2. ✅ All information visible without scrolling (fits in dashboard viewport)
3. ✅ Clear visual hierarchy: Overview → Details → Actions
4. ✅ Proper risk visualization with colors and charts
5. ✅ Vault-specific yield claiming
6. ✅ Consistent theme: fade black borders (#e5e7eb), dark text (#111827)
7. ✅ No overflow, perfectly aligned, non-cluttered

---

## 🏗️ Proposed Layout Structure

### **Main Layout: 2-Column Grid**

```
┌─────────────────────────────────────────────────────────────┐
│                    PORTFOLIO OVERVIEW                        │
│                   (Header Section)                           │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                   │
│   LEFT COLUMN (60%)      │   RIGHT COLUMN (40%)             │
│                          │                                   │
│   1. Portfolio Summary   │   1. Risk Dashboard              │
│      - Total Value       │      - Health Factor             │
│      - Asset Allocation  │      - Active Loans              │
│      - Pie Chart         │      - Collateral Status         │
│                          │                                   │
│   2. Asset Breakdown     │   2. Yield Earnings              │
│      - stRWA by vault    │      - Per-vault breakdown       │
│      - RWA balance       │      - Claim buttons             │
│      - USDC balance      │      - Yield history chart       │
│                          │                                   │
│   3. Performance Graph   │   3. Quick Actions               │
│      - Value over time   │      - Auto-repay toggle         │
│      - Yield trend       │      - Export data               │
│                          │                                   │
└──────────────────────────┴──────────────────────────────────┘
```

**Why this layout?**
- Left side = Your portfolio (what you own)
- Right side = Risk & earnings (what's happening)
- Natural reading flow: left to right
- No scrolling needed

---

## 📊 Detailed Component Breakdown

### **1. Header Section** (Full Width, Top)

```
┌─────────────────────────────────────────────────────────┐
│  👤 Portfolio Overview                                  │
│  Your financial snapshot at a glance                    │
│                                                          │
│  Connected: 0x1234...5678                               │
└─────────────────────────────────────────────────────────┘
```

**Specs:**
- Font: Plus Jakarta Sans (regular)
- Title: 18px, semibold, #111827
- Subtitle: 14px, regular, #6b7280
- Padding: 24px
- Border bottom: 1px solid #e5e7eb

---

### **2. LEFT COLUMN - Portfolio Details**

#### **2.1 Portfolio Summary Card**

```
┌──────────────────────────────────────┐
│  📊 Total Portfolio Value            │
│                                      │
│     $12,450.00                       │
│     ━━━━━━━━━━━━━                   │
│     ↑ +2.5% this month               │
│                                      │
│  [Pie Chart - Asset Allocation]      │
│                                      │
│  🔵 Staked (stRWA): $8,500 (68%)    │
│  🟢 Available (RWA): $2,450 (20%)    │
│  🟡 Liquidity (USDC): $1,500 (12%)  │
└──────────────────────────────────────┘
```

**Specs:**
- Border: 1px solid #e5e7eb
- Border radius: 12px
- Padding: 20px
- Background: white
- Shadow: subtle (0 1px 3px rgba(0,0,0,0.1))
- Total value: Antic font, 32px, #111827
- Percentage change: Green (#10b981) if positive, Red (#ef4444) if negative
- Pie chart: Donut style, 200px diameter, 3px gap between segments

---

#### **2.2 Asset Breakdown Table**

```
┌──────────────────────────────────────┐
│  💼 Asset Breakdown                  │
│                                      │
│  Asset Type    Balance    Value      │
│  ────────────────────────────────    │
│  🏢 Invoice    50.00     $5,250.00   │
│  📜 T-Bills    30.00     $3,060.00   │
│  🏠 RealEstate 20.00     $2,160.00   │
│  ────────────────────────────────    │
│  USDC          1,500.00  $1,500.00   │
│                                      │
│  Total                   $11,970.00  │
└──────────────────────────────────────┘
```

**Specs:**
- Table style: Clean, minimal
- Header row: 12px, #6b7280, uppercase, letter-spacing: 0.5px
- Data rows: 14px, #111827
- Separators: 1px solid #f3f4f6
- Hover: Background #f9fafb
- Padding: 12px per row
- Icons: 20px size, emoji or lucide icons

---

#### **2.3 Performance Graph**

```
┌──────────────────────────────────────┐
│  📈 Portfolio Performance (30 days)  │
│                                      │
│  [Area Chart showing value trend]    │
│                                      │
│  Jan  Feb  Mar  Apr  May  Jun        │
└──────────────────────────────────────┘
```

**Specs:**
- Chart type: Area chart with gradient fill
- Height: 180px
- Line color: #774be5 (primary)
- Fill: Linear gradient from primary/20 to transparent
- Grid: Dashed, #f3f4f6
- Axes: 11px, #9ca3af
- Data points: Show on hover

---

### **3. RIGHT COLUMN - Risk & Yield**

#### **3.1 Risk Dashboard**

```
┌──────────────────────────────────────┐
│  🛡️ Risk & Loans                     │
│                                      │
│  ┌────────────┐  ┌────────────┐     │
│  │   1.85     │  │  $1,200    │     │
│  │  Healthy   │  │ Total Debt │     │
│  └────────────┘  └────────────┘     │
│                                      │
│  Health Factor: ━━━━━━━━━━ 85%      │
│  Status: 🟢 Safe                     │
│                                      │
│  Collateral: $2,220                  │
│  Min. Required: $1,680               │
│  Buffer: +$540                       │
│                                      │
│  ⚠️ Liquidation at: 1.10             │
└──────────────────────────────────────┘
```

**Specs:**
- Health factor display: Large, center
  - ≥ 1.5: Green (#10b981)
  - 1.2-1.5: Yellow (#f59e0b)
  - < 1.2: Red (#ef4444)
- Progress bar: Height 8px, rounded
- Metrics: 14px, clear labels
- Warning section: Light red background if health < 1.3

---

#### **3.2 Yield Earnings**

```
┌──────────────────────────────────────┐
│  💰 Yield Earnings                   │
│                                      │
│  Total Available: $245.50            │
│  ━━━━━━━━━━━━━━━━━━━━━━━           │
│                                      │
│  By Vault:                           │
│  ┌────────────────────────────┐     │
│  │ 🏢 Invoice Vault           │     │
│  │ Available: $125.00         │     │
│  │ [Claim $125.00]            │     │
│  └────────────────────────────┘     │
│                                      │
│  ┌────────────────────────────┐     │
│  │ 📜 T-Bills Vault           │     │
│  │ Available: $85.50          │     │
│  │ [Claim $85.50]             │     │
│  └────────────────────────────┘     │
│                                      │
│  ┌────────────────────────────┐     │
│  │ 🏠 RealEstate Vault        │     │
│  │ Available: $35.00          │     │
│  │ [Claim $35.00]             │     │
│  └────────────────────────────┘     │
│                                      │
│  [Claim All Yields]                 │
└──────────────────────────────────────┘
```

**Specs:**
- Only show vaults where user has staked
- Per-vault cards:
  - Border: 1px solid #e5e7eb
  - Padding: 16px
  - Background: #f9fafb on hover
  - Claim button: Full width, primary color
- Total at top: Antic font, 24px, #111827
- Yield chart (mini): 100px height, sparkline style

---

#### **3.3 Quick Actions**

```
┌──────────────────────────────────────┐
│  ⚡ Quick Actions                     │
│                                      │
│  Auto-Repay         [ON  / OFF]      │
│  Use yield to auto-pay loans         │
│                                      │
│  Export Portfolio   [Download]       │
│  CSV or PDF format                   │
└──────────────────────────────────────┘
```

**Specs:**
- Toggle: Custom switch, primary color when on
- Buttons: Outlined style, 14px text
- Icons: 16px, left-aligned
- Description text: 12px, #6b7280

---

## 🗂️ NEW: Transactions Tab in Sidebar

### **Sidebar Update**

Add 4th tab to sidebar:
```
[ Stake ]
[ Borrow ]
[ Profile ]
[ Transactions ]  ← NEW
```

### **Transactions Section Layout**

```
┌─────────────────────────────────────────────────────────┐
│  📝 Transaction History                                  │
│  All your blockchain activity                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Filters: [All] [Stake] [Borrow] [Claim] [Repay]       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Type    │ Asset     │ Amount    │ Date     │ Hash│  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Stake   │ Invoice   │ 50.00     │ 2 hrs ago│ 0x..│  │
│  │ Claim   │ T-Bills   │ $45.00    │ 1 day ago│ 0x..│  │
│  │ Borrow  │ USDC      │ $1,200    │ 3 days   │ 0x..│  │
│  │ Repay   │ USDC      │ $100      │ 5 days   │ 0x..│  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Showing 4 of 127 transactions                           │
│  [Load More]                                             │
└─────────────────────────────────────────────────────────┘
```

**Table Specs:**
- Header: 12px, uppercase, #6b7280, bold
- Rows: 14px, #111827
- Borders: 1px solid #e5e7eb (horizontal only)
- Row height: 48px
- Hover: Background #f9fafb
- Hash: Truncated, click to copy, shows tooltip
- Pagination: Load 20 at a time
- Empty state: Illustrated placeholder

---

## 🎨 Design System

### **Colors**
```
Primary: #774be5 (purple)
Success: #10b981 (green)
Warning: #f59e0b (amber)
Danger: #ef4444 (red)
Text Primary: #111827 (dark black)
Text Secondary: #6b7280 (gray)
Border: #e5e7eb (fade black)
Background: #ffffff (white)
Background Alt: #f9fafb (light gray)
```

### **Typography**
```
Headings: Plus Jakarta Sans
Numbers/Money: Antic
Body: Plus Jakarta Sans

Size Scale:
- h1: 24px, semibold
- h2: 18px, semibold
- h3: 16px, semibold
- Body: 14px, regular
- Small: 12px, regular
- Tiny: 11px, regular
```

### **Spacing**
```
Container padding: 24px
Card padding: 20px
Gap between cards: 16px
Section margin: 24px
```

### **Borders & Shadows**
```
Border radius: 12px (cards), 8px (buttons)
Border width: 1px
Shadow: 0 1px 3px rgba(0,0,0,0.1)
Hover shadow: 0 4px 6px rgba(0,0,0,0.1)
```

---

## 📱 Responsive Behavior

**Desktop (default):**
- 2-column layout (60/40 split)
- All sections visible

**Tablet (< 1280px):**
- 2-column layout (50/50 split)
- Slightly smaller fonts

**Mobile (< 768px):**
- Single column
- Stack left → right
- Collapsible sections

---

## 🔄 Data Flow

### **Data Sources:**
1. **Portfolio Value**: Sum of all balances × prices
2. **Asset Breakdown**: From multi-asset balances (Invoice, T-Bills, RealEstate)
3. **Risk Metrics**: From lending pool (health factor, debt)
4. **Yield Data**: From vault services per asset type
5. **Performance Graph**: Historical data (can be mocked initially)
6. **Transactions**: From contract events (blockchain explorer)

### **Actions:**
1. **Claim Yield**: Call vault.claim_yield(user) for specific vault
2. **Claim All**: Loop through all vaults with yield > 0
3. **Toggle Auto-Repay**: Update state (UI only for now)
4. **Export Portfolio**: Generate CSV/PDF from current data

---

## ✅ Implementation Checklist

### **Phase 1: Profile Section**
- [ ] Create 2-column grid layout
- [ ] Build Portfolio Summary card with pie chart
- [ ] Build Asset Breakdown table
- [ ] Build Performance graph (mock data OK)
- [ ] Build Risk Dashboard with health factor
- [ ] Build Yield Earnings with vault-specific claiming
- [ ] Build Quick Actions section
- [ ] Test responsive behavior

### **Phase 2: Transactions Tab**
- [ ] Add "Transactions" to sidebar
- [ ] Create TransactionsSection component
- [ ] Build transaction table with filters
- [ ] Add pagination/load more
- [ ] Implement hash copy functionality
- [ ] Test empty state

### **Phase 3: Polish**
- [ ] Ensure all borders are #e5e7eb
- [ ] Ensure all text is proper weight/color
- [ ] Test overflow scenarios
- [ ] Test with real data
- [ ] Cross-browser testing

---

## 🎯 Success Metrics

**Visual:**
- ✅ No scrolling needed on 1920×1080 screen
- ✅ All elements aligned to 4px grid
- ✅ Consistent spacing throughout
- ✅ Professional finance dashboard look

**Functional:**
- ✅ Vault-specific yield claiming works
- ✅ Real-time balance updates
- ✅ Health factor accurately calculated
- ✅ Transactions load from blockchain

**UX:**
- ✅ Information hierarchy clear at a glance
- ✅ Actions easily accessible
- ✅ No visual clutter
- ✅ Responsive on all screen sizes

---

## 🖼️ Visual Mockup (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👤 Portfolio Overview                                                       │
│  Your financial snapshot at a glance                                         │
│  Connected: 0x1234...5678                                                    │
├──────────────────────────────────────┬──────────────────────────────────────┤
│                                      │                                       │
│  📊 Total Portfolio Value            │  🛡️ Risk & Loans                     │
│                                      │                                       │
│      $12,450.00                      │  ┌────────┐  ┌──────────┐           │
│      ↑ +2.5% this month              │  │  1.85  │  │ $1,200   │           │
│                                      │  │ Healthy│  │Debt      │           │
│  ┌────────────────────┐              │  └────────┘  └──────────┘           │
│  │                    │              │                                       │
│  │   [Pie Chart]      │              │  Health: ━━━━━━━━━━ 85%             │
│  │                    │              │  Status: 🟢 Safe                     │
│  └────────────────────┘              │  Liquidation at: 1.10                │
│                                      │                                       │
│  🔵 Staked: $8,500 (68%)             ├──────────────────────────────────────┤
│  🟢 Available: $2,450 (20%)          │                                       │
│  🟡 USDC: $1,500 (12%)               │  💰 Yield Earnings                   │
│                                      │                                       │
├──────────────────────────────────────┤  Total: $245.50                      │
│                                      │                                       │
│  💼 Asset Breakdown                  │  🏢 Invoice: $125 [Claim]            │
│  ─────────────────────────────       │  📜 T-Bills: $85  [Claim]            │
│  Invoice   50.00   $5,250            │  🏠 RealEst: $35  [Claim]            │
│  T-Bills   30.00   $3,060            │                                       │
│  RealEst   20.00   $2,160            │  [Claim All Yields]                  │
│  USDC      1500    $1,500            │                                       │
│  Total             $11,970           ├──────────────────────────────────────┤
│                                      │                                       │
├──────────────────────────────────────┤  ⚡ Quick Actions                     │
│                                      │                                       │
│  📈 Performance (30 days)            │  Auto-Repay    [ON]                  │
│  ┌────────────────────────┐          │  Export        [Download]            │
│  │   /\  /\   /\           │          │                                       │
│  │  /  \/  \_/  \__        │          │                                       │
│  └────────────────────────┘          │                                       │
│                                      │                                       │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 💬 Notes for Implementation

1. **Priority**: Start with left column (portfolio), then right column (risk/yield)
2. **Data**: Use real contract data, mock historical data OK for graphs
3. **Performance**: Memoize expensive calculations (health factor, totals)
4. **Accessibility**: All interactive elements keyboard-navigable
5. **Loading states**: Show skeletons while fetching data
6. **Error states**: Graceful fallbacks if contract calls fail

---

**Status:** AWAITING YOUR APPROVAL ✋

Please review this plan and confirm if you'd like me to proceed with implementation!

