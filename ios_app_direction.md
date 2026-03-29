# Notebook iOS App Technical Specification

This document provides a self-contained technical guide for building the **Notebook** iOS application, ensuring full compatibility with the existing AWS backend and parity with the web application features.

## 📱 Mobile Tech Stack Recommendation

* **Language**: Swift 6.0+
* **UI Framework**: SwiftUI
* **Networking**: AWS Amplify for iOS (Auth, API, Storage)
* **Local Cache**: SwiftData (for offline-first metadata storage)
* **Editor Strategy**:
  * Use `WKWebView` to host a specialized `BlockNote` build. This ensures that the complex block-based JSON/HTML structure remains consistent between Web and iOS.
  * Bridge Swift and JavaScript via `UserContentController` for auto-saving and title updates.

---

## 📱 User Journey & Screen Definitions

### 1. The Entry Experience (Splash & Auth)

* **Splash Screen**:
  * **Background**: Soft Stone (`#F8F9FA`).
  * **Logo**: Large centered "Notebook" in bold serif font.
  * **Transition**: 2.5s fade-out triggered ONLY on **Cold Start** or session expiry.
* **Login Screen (Strictly "Login Only")**:
  * **Greeting**: `<h2>Welcome Back.</h2>` (Bold, -1px letter spacing).
  * **Subtext**: "Enter your credentials to continue your story."
  * **Fields**:
    * **Email & Password**: Rounded (12pt corner radius) with subtle gray (`#EBEBEB` or `#1C1C1E`).
    * **Label Styling**: All-caps, small font-size, 600 weight.
  * **Sign-In Button**: Primary action only. Full width, rounded, high-contrast.
  * **Constraints**: **NO** "Sign Up," **NO** "Forgot Password," **NO** "Join Now."

### 2. The Dashboard (Notebook List)

* **Search**: System-style integrated bar at the top with "Search notebooks" placeholder.
* **Priority Hierarchy**: Items must be grouped as follows:
    1. **Pinned (`📌`)**: Absolute top of the list.
    2. **Favorites (`⭐`)**: Secondary section.
    3. **Recent**: All others, chronologically by `lastEditedAt`.
* **CRUD Operations**:
  * **Delete Notebook**: Swipe-to-delete (destructive red) or Long-press context menu.
  * **Rename Notebook**: Long-press context menu option.
* **List Cells**:
  * **Title**: Bold, prominent.
  * **Snippet**: Precisely 2 lines of line-clamped preview text.
  * **Metadata**: Subtle time indicator (e.g., "10:30 AM" or "Oct 12").
* **Navigation Dock**: Floating, translucent pill-shaped dock at the bottom center containing:
  * **Home (Left)**: Reset list view.
  * **Add (+ Center)**: Primary `+` icon for **New Notebook** (triggers creation prompt with title input).
  * **Profile (Right)**: Person icon. Tapping opens menu with **"Sign Out"** (Red destructive text).

### 3. The Notebook (Writing Surface)

* **Editor Architecture**: **WKWebView + BlockNote (HTML)**. This is the single source of truth—no native SwiftUI editing surfaces for V1. The engine supports **Markdown Shortcuts** (e.g., typing `#` for an H1 block), which are instantly converted to HTML as the user types.
* **Page Management**:
  * **Navigation**: Horizontal `TabView` with `PageTabViewStyle` (strict paging).
  * **Add Page**: Header `+` button strictly for adding a blank page to the *current* notebook.
  * **Delete**: Use `DELETE /notebooks/{id}/pages/{pageId}`. This performs an atomic cleanup of both metadata and the S3 HTML file.
  * **Auto-Titling**: The app should automatically update the `title` of a page by detecting the first **Heading 1 (`<h1>`)** inside the content. This keeps the Page list/Sidebar synchronized with the actual content without manual renaming.
* **UI Elements**:
  * **Page Indicator**: Center-mounted in header (e.g., "Page 1 of 3").
  * **Paper Textures**: Editor background must support:
    * **Clean**: Pure minimalist surface.
    * **Grid**: 20px x 20px light gray grid.
    * **Lines**: 28px horizontal spacing.

## 🔐 Authentication & Token Management

The Notebook application utilizes **AWS Amplify Auth (Cognito)** as its identity provider.

### 1. Login Flow & Token Acquisition

1. **Credential Submission**: The user enters their email and password.
2. **Amplify SRP**: The app uses the Amplify SDK to perform a Secure Remote Password (SRP) handshake.
3. **Authoritative Token**: Every API request must include the **`idToken`** in the `Authorization` header. This is the canonical source of identity and permissions for the current backend handler.
4. **Refresh**: Use the `refreshToken` to acquire a new `idToken` before expiry.

### 2. Backend Authorization & User Isolation

* **Lambda Authorizer**: Verifies the `idToken` and extracts the `sub` (Subject ID) as the globally unique `userId`.
* **Isolation**: All DynamoDB requests use `userId` for partition-key filtering. All S3 paths are prefixed with `notes/{userId}/`.

## 📦 Data Architecture & Sync

Based on existing backend benchmarks, the following architecture is **FINAL**:

### 1. Content Format & Editor

* **Canonical Format**: **HTML** (BlockNote-compatible).
* **iOS Strategy**: The `WKWebView` will host a lightweight BlockNote instance. To ensure 100% fidelity with the web app, **Markdown editing is NOT required for V1**; the app will strictly manage HTML content.

### 2. Document Hierarchy

* **Metadata (DynamoDB)**: A `Notebook` item contains a `pages` array: `[{ "id": "uuid", "order": 0, "title": "...", "version": "timestamp" }]`.
* **Content (S3)**: Each page is a standalone object at `notes/{userId}/{notebookId}/{pageId}.html`.
* **Preloading**: The app should preload "N ± 2" pages relative to the current view via `GET /notebooks/urls/download`.

### 3. Resilience & Conflict Resolution

* **Offline Queuing**: All edits are first persisted to **SwiftData**. A persistent sync background task manages the S3 upload queue using `URLSessionConfiguration.background`.
* **Conflict Logic**: We follow a **Hybrid Versioning** policy at the **page level**.
  * **Version Check**: Every `PATCH` request must include the current `version`. The server increments this atomically.
  * **Resolution**: If the server returns a `409 Conflict`, it means the remote version is newer than the local base. The UI should prompt: "Remote changes detected. [Keep Local] or [Overwrite with Remote]".
* **Sync State**: The UI must display a subtle "Syncing..." spinner or an "Offline" badge when connectivity is lost.

### 4. Dashboards & Sorting

* **Priority Hierarchy**: Rules are fixed.
    1. **Pinned**: Absolute top priority.
    2. **Favorites**: Secondary.
    3. **Recent**: Tertiary.
* **Overlap**: If an item is both Pinned and Favorite, it remains in the **Pinned** section only.

### 5. Media & Assets

* **Flow**:
    1. Request pre-signed PUT URL via `GET /assets/upload?filename=...`.
    2. Upload raw data to S3.
    3. **Storage**: In the BlockNote HTML, store the asset as a **Stable URI**: `asset://{s3Key}`. **DO NOT** bake the pre-signed URL into the HTML.
* **Resolution**: At render-time, the app must call `GET /assets/urls/download?key=...` to resolve the `asset://` key into a fresh, temporary pre-signed GET URL.

---

## 💾 Core Data Schemas

The following structures define the data model used across the system:

### Notebook Object

```swift
struct Notebook: Codable, Identifiable {
    let id: String
    var title: String
    var snippet: String?
    var isFavorite: Bool
    var isPinned: Bool
    var pages: [Page]
    var tags: [String]
    var version: Int           // Atomic sequence number for conflict checks
    var paperStyle: String     // "clean", "dots", "grid", "lines"
    var lastEditedAt: Double   // Timestamp (ms)
    var createdAt: Double      // Timestamp (ms)
}
```

### Page Object

```swift
struct Page: Codable, Identifiable {
    let id: String
    var title: String?
    let contentKey: String // S3 path: "notes/{userId}/{notebookId}/{pageId}.html"
    var order: Int
    var version: Double    // Timestamp (ms) for conflict checks
}
```

---

---

## 📝 HTML Only Strategy

The Notebook application uses **HTML (BlockNote-compatible)** as its canonical content format. **V1 does not include any Markdown conversion layers** to ensure absolute parity with the web platform.

* **Identical Twins**: Both the web and mobile apps read and write the exact same HTML "building blocks" (BlockNote).
* **Fidelity**: Avoiding conversion ensures that complex blocks (images, tables, lists) remain 100% consistent.
* **Editor**: The `WKWebView` on iOS hosts the BlockNote editor, so the experience is identical on both devices.

---

## 💾 Autosave & Sync Logic

* **Offline First**: All changes are first committed to the local **SwiftData** store and a persistent **Upload Queue**.
* **Idle Debounce**: Save to the cloud after **2 seconds of user inactivity** (the timer restarts with every keystroke). This prevents battery and data drain by avoiding constant uploads while you are in the middle of a sentence.
* **Background Sync**: Once the 2-second idle timer hits, the app uses `URLSessionConfiguration.background` to send the new version to S3. This ensures the save finishes even if you suddenly close the app or answer a call.
* **Conflict Resolution**: Use the `version` (timestamp) property in the page metadata. If the server version is newer, prompt the user to "Keep Local" or "Overwrite with Remote."

---

## ⚡ Page Preloading UI (Performance)

To ensure the "Paper" feel is responsive, implement an intelligent preloading queue:

### The "N ± 2" Rule

* **Initial Load**: When a notebook is opened at Page `n`, immediately fetch content for `n`, `n+1`, and `n+2`.
* **Directional Preloading**:
  * If the user swipes to `n+1`, fetch `n+3`.
  * If the user swipes back to `n-1`, ensure `n-2` and `n-3` are fetched.
* **Cleanup**: Keep a maximum of 5 pages in memory (Active, 2 Next, 2 Previous). Purge others to save RAM.

---

## 🎨 Creative Direction: Modern Minimalism

The following color palettes were meticulously selected to ensure the application feels premium on mobile screens. They avoid "pure" colors (like deep blue or pitch black) in favor of nuanced neutrals that provide a high-end, architectural look.

The developer (Codex Agent) should use these as semantic foundations, applying them to surfaces, text, and interactive elements where they best fit the layout.

### Light Mode: "Soft Stone"

A clean, modern palette that mimics architectural minimalism. It avoids the yellow undertones of traditional ivory for a crisper, more modern "Apple-style" experience.

* **Background**: `#F8F9FA` (Clean Off-White)
* **Primary Text**: `#1C1C1E` (Rich Dark Grey)
* **Secondary Text**: `#636366` (Medium Navigation Grey)
* **Accent Color**: `#79747E` (Muted Graphite - for non-critical hits)
* **Dividers/Grid**: `#E5E5EA` (Faint Structural Grey)
* **Paper Lines**: `#EBEBF5` (Ultra-subtle Grid/Line Separator)

### Dark Mode: "Deep Slate"

A neutral, low-strain dark theme that avoids high-contrast obsidian for a "matte" physical feel.

* **Background**: `#121212` (Ebonized Wood / Matte Black)
* **Primary Text**: `#E5E3DF` (Soft Eggshell White)
* **Secondary Text**: `#96918E` (Muted Stone Grey)
* **Accent Color**: `#85756B` (Dull Copper / Bronze)
* **Dividers/Grid**: `#2A2A2A` (Structural Charcoal)
* **Paper Lines**: `#33312E` (Deep Oxide for subtle textures)

### Implementation Note

The intent is for these to be stored as semantic `Color` extensions in SwiftUI. Apply a very subtle grain or noise overlay (`opacity: 0.03`) in both modes to add a physical, tangible quality to the surfaces.

---

## 🏗️ Backend Architecture & "Source of Truth"

The system uses a high-performance "Dual-Layer" storage strategy:

### 1. Authentication (Cognito + Lambda Authorizer)

* The app logs in via **AWS Cognito**.
* Every API request sends an `idToken` (JWT) in the `Authorization` header.
* A **Lambda Authorizer** validates this token and extracts the `userId`, which is used to firewall all database and storage requests.

### 2. Metadata Layer (DynamoDB)

* **What it stores**: Notebook titles, tags, page lists, and timestamps.
* **Purpose**: Optimized for fast list searching, filtering by "Favorite", and providing a quick dashboard view without fetching large content files.

### 3. Content Layer (S3 Bucket)

* **What it stores**: The actual "Story" or "Body" of every page (**HTML files only**).
* **The "Source of Truth"**: While DynamoDB knows a page *exists*, the S3 file contains what the user *wrote*.
* **Path Structure**: `notes/{userId}/{notebookId}/{pageId}.html`

---

## 🔗 The S3 Pre-signed URL Mechanism

Since the S3 bucket is private for security, the app cannot access it directly.

1. **The Handshake**:
   * To **Download**: Call `GET /notebooks/urls/download?id=...&pageId=...`.
   * To **Upload**: Call `GET /notebooks/urls/upload?id=...&pageId=...`.
2. **The Result**: The API returns a temporary, secure "Pre-signed URL" (expires in 5 minutes).
3. **The Transfer**:
   * Use a standard `HTTP GET` or `PUT` request directly to that URL.
   * This bypasses the Lambda function for heavy data transfers, ensuring the app remains fast and lightweight.

---

## 🌐 API Interaction Strategy

The app communicates with a REST API Gateway. All requests require an **idToken** in the `Authorization` header.

### 1. Fetching Notebooks

* **Endpoint**: `GET /notebooks`
* **Response**: Array of `Notebook` metadata objects (excluding full page content).

### 2. Synchronization Flow (Offline-First)

1. **Metadata Sync**: On launch, fetch `/notebooks` and update the local SwiftData store.
2. **Pull Content**: If a user opens a page not in cache (or `lastEditedAt` is newer):
   * Call the **API** to get a download URL.
   * Fetch the content from **S3**.
3. **Push Content (Auto-save)**:
   * Every 2 seconds (debounced), call the **API** to get an upload URL.
   * `PUT` the modified content to **S3**.

### 3. Metadata Updates

* **Endpoint**: `PATCH /notebooks/{id}`
* **Payload**: `{ "title": "New Title", "tags": ["work", "idea"], "isFavorite": true }`

### 4. Page Deletion (Hard Delete)

* **Endpoint**: `DELETE /notebooks/{id}/pages/{pageId}`
* **Response**: `204 No Content`
* **Effect**: Backend removes the page from the DynamoDB `pages` array AND deletes the `.html` file from S3 instantly.

---

## 🚀 Implementation Priority for Codex Agent

1. **Auth & Navigation**: Set up Amplify Auth and the Dashboard (Notebook list).
2. **SwiftData Integration**: Implement the local persistence layer for notebook metadata.
3. **WebView Editor Bridge**: Create a robust `WKWebView` component that loads the `BlockNote` editor and communicates content changes back to Swift.
4. **S3 Sync Engine**: Build the background task manager for uploading/downloading HTML content.
5. **Offline Polish**: Ensure the app functions seamlessly without an internet connection, queuing metadata updates for later sync.

## ✅ Handoff Confirmation

This specification is now **HARDENED** and resolves all previous developer concerns regarding:
* **Fidelity**: HTML/BlockNote is the canonical format.
* **Sync**: Versioned Last-Writer-Wins model defined.
* **Scope**: Granular CRUD (Delete/Rename) and Image-only assets confirmed for V1.
* **Performance**: N±2 preloading and cold-start splash confirmed.
