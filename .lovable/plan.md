

# Transform Settings Icon into Information Bar

## Overview
Replace the Settings gear icon button on the ModeSelection screen with an Info icon that opens a sliding panel (Sheet) containing three menu sections: **How to Play**, **Updates**, and **Report Issues**.

## What Will Change

### 1. Settings Icon becomes Info Icon
- Replace the `Settings` gear icon with an `Info` (or `CircleHelp`) icon from lucide-react
- Clicking it opens a side sheet/drawer

### 2. Info Panel (Sheet) with Three Sections

**How to Play**
- Contains a horizontally scrollable carousel showing the three game modes:
  - **Money Based** - Explains the money-based coin flip mode with entry fees (Rs.10-Rs.100)
  - **Choice Based** - Explains the real-time matchmaking mode where you pick heads/tails
  - **Multiplayer** - Explains the pool-based betting mode with King/Tail sides
- Each card will include a reference screenshot from the app (using existing coin-heads.png and coin-tails.png assets as illustrative images)

**Updates**
- A simple list showing app updates/announcements (initially with placeholder entries like version info)

**Report Issues**
- A form/button that opens the user's email client with a pre-filled "mailto:notifications.projects@gmail.com" link
- Includes subject line pre-filled with "RoyalFlip - Issue Report"

## Technical Details

### Files to Create
- `src/components/InfoPanel.tsx` - New component containing the Sheet with all three sections using Tabs or Accordion for navigation

### Files to Modify
- `src/components/game/ModeSelection.tsx`
  - Replace `Settings` import with `Info` (or `CircleHelp`) from lucide-react
  - Add `Sheet` imports from ui/sheet
  - Add state for sheet open/close
  - Replace the Settings button with an Info button that triggers the sheet
  - Render the `InfoPanel` component inside the Sheet

### How to Play Carousel
- Uses a horizontal scroll container (CSS `overflow-x: auto` with `snap-x`) for the three mode cards
- Each card shows:
  - Mode icon (Wallet, Trophy, Users)
  - Mode name
  - Step-by-step instructions
  - A reference image using existing app assets (coin-heads.png / coin-tails.png)

### Report Issues
- Simple mailto link: `mailto:notifications.projects@gmail.com?subject=RoyalFlip%20-%20Issue%20Report`
- Styled as a button with a Mail icon

### Styling
- Follows the existing premium dark theme with gold accents
- Sheet slides in from the right
- Consistent with the app's design language (gradients, rounded corners, motion animations)

