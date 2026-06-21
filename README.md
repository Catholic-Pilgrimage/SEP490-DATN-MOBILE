<p align="center">
  <img src="./assets/logo_readme.png" width="160" alt="Catholic Pilgrimage Logo">
</p>

<h1 align="center">Catholic Pilgrim Mobile Application</h1>
<p align="center"><b>Cross-Platform iOS & Android Mobile Application built with React Native & Expo</b></p>

<p align="center">
  <a href="https://reactnative.dev"><img src="https://img.shields.io/badge/React_Native-0.81.5-20232a?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native"></a>
  <a href="https://expo.dev"><img src="https://img.shields.io/badge/Expo-54.0.31-000020?style=for-the-badge&logo=expo&logoColor=ffffff" alt="Expo"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.9.2-3178C6?style=for-the-badge&logo=typescript&logoColor=3178C6" alt="TypeScript"></a>
  <a href="https://www.mapbox.com"><img src="https://img.shields.io/badge/Mapbox-10.2.10-000000?style=for-the-badge&logo=mapbox&logoColor=3bb2d0" alt="Mapbox"></a>
  <a href="https://firebase.google.com"><img src="https://img.shields.io/badge/Firebase-12.10.0-FFCA28?style=for-the-badge&logo=firebase&logoColor=FFA000" alt="Firebase"></a>
</p>

---

### 🗺️ Navigation / Điều hướng nhanh
* [🇬🇧 English Version](#english-version)
* [🇻🇳 Bản Tiếng Việt](#tiếng-việt-version)

---

## English Version

> [!NOTE]
> ### 📖 Introduction & Overview
> This is the mobile client application of the **Catholic Pilgrimage System** (SEP490 Graduation Thesis - DATN, FPT University). Built using React Native and Expo (with the new Expo Router), this application provides a native, high-performance experience for **Pilgrims** and **Local Guides** exploring Catholic sanctuaries across Vietnam.

> [!IMPORTANT]
> ### 🛡️ Dual Feature Modules
> The application adapts dynamically based on the authenticated user's role:
> * **Pilgrim View**: Focused on discovering sacred locations, co-planning journeys, tracking itineraries, validating location-based check-ins, posting diaries, and receiving audio guide narrations.
> * **Local Guide View**: Focused on managing daily assignments (shifts), posting localized parish events, and receiving immediate push notifications to handle emergencies.

---

### 🚀 Key Core Features

> [!TIP]
> ### 🧭 1. Interactive Pilgrimage Maps & Audio Guides
> * **Vietmap & Mapbox Navigation**: Integrates high-performance native maps using `@rnmapbox/maps` and custom tiles. Shows parish markers, mass times, facilities, and dynamic routing directions.
> * **VBee Audio Tour Narrations**: Play high-quality text-to-speech audio files explaining parish histories directly from the built-in media controls powered by `expo-av` and `expo-video`.
> * **Dynamic 3D Site Models**: Render interactive 3D replicas of church architectures directly inside the mobile app screens using GLB/GLTF.

> [!CAUTION]
> ### 🔒 2. Co-Planning & Escrow Deposit Verification
> * **Real-Time Planning Chat**: Create custom itineraries with multiple stops, invite companions, and chat in real time inside the planner powered by WebSockets.
> * **PayOS Commitment Deposits**: Securely pay commitment deposits directly inside the app using PayOS deep-linking. Balances are held securely in the escrow system.
> * **Anti-Fraud Location Check-In**: Check-in at holy sites using GPS coordinates proximity (validated via **Haversine formula**) or scanning dynamic secure QR codes on-site.

> [!WARNING]
> ### 📶 3. Offline-First Capability & SOS Support
> * **Offline Spiritual Journals**: NetInfo (`@react-native-community/netinfo`) detects connectivity loss. Users can continue writing journals/diaries offline. The system queues logs and synchronizes them to the Postgres DB automatically once reconnected.
> * **SOS Emergency Broadcast**: In case of distress, pilgrims can trigger a one-tap SOS. It transmits real-time GPS coordinates to site guides and managers instantly.

---

### 📦 Technology Stack & Directory Structure

* **Framework**: Expo v54, React Native (0.81.5), Expo Router (file-based navigation).
* **State Management**: TanStack React Query v5 (cached endpoints and mutations).
* **User Interface**: React Native Reanimated (micro-animations), Expo Linear Gradient, and Toast notifications.

* [src/features/auth/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-MOBILE/src/features/auth): Google Sign-in integration and OTP screens.
* [src/features/pilgrim/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-MOBILE/src/features/pilgrim): Itineraries, PayOS escrow wallets, QR/GPS check-ins, journal diaries, and audio guides.
* [src/features/guide/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-MOBILE/src/features/guide): Guide shift rosters, event updates, reviews, and SOS response panels.
* [src/services/](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-MOBILE/src/services): API connectors, offline queues, and WebSocket handlers.

---

### ⚙️ Getting Started & Builds

#### Prerequisites
* Node.js v18 or v20
* Expo Go app installed on your test device (for standard code) OR a built Development Client (required for Mapbox native modules).

#### 1. Setup Environment Configurations
Create a `.env` file in the root of the mobile folder:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.137:3000
EXPO_PUBLIC_API_TIMEOUT=60000
EXPO_PUBLIC_VIETMAP_SERVICES_KEY=your_vietmap_services_key
EXPO_PUBLIC_VIETMAP_TILEMAP_KEY=your_vietmap_tilemap_key
EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

#### 2. Start Expo Development Server
```bash
# Install dependencies
npm install

# Start the Expo Metro bundler
npm run start
```
Press `a` to run on Android emulator, `i` to run on iOS simulator, or scan the QR code using your Expo Go / development client app.

#### 3. Build APK with EAS Cloud
This project uses Expo Application Services (EAS) configured in [eas.json](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-MOBILE/eas.json) to bundle standalone binaries:
```bash
# Log in to Expo account
npx eas login

# Run Android build (outputs APK)
npx eas build --platform android --profile production
```

---

## Tiếng Việt Version

> [!NOTE]
> ### 📖 Giới thiệu Dự án
> Đây là ứng dụng di động dành cho khách hành hương (Mobile Client App) của hệ thống **Hành hương Công giáo** (Đồ án Tốt nghiệp SEP490 - DATN, Đại học FPT). Được xây dựng bằng React Native và Expo (Sử dụng Expo Router mới), ứng dụng mang lại trải nghiệm mượt mà, tối ưu hiệu năng cho cả **Pilgrim (Giáo dân)** và **Local Guide (Hướng dẫn viên)**.

> [!IMPORTANT]
> ### 🛡️ Hai Phân hệ Trải nghiệm Giáo dân & Hướng dẫn viên
> Ứng dụng tự động điều chỉnh giao diện tùy thuộc vào vai trò của người dùng đăng nhập:
> * **Giao diện Pilgrim (Giáo dân)**: Khám phá địa điểm thánh, lập kế hoạch hành trình cùng bạn bè, ký quỹ đảm bảo hành trình, thực hiện điểm danh tọa độ GPS/QR để xác thực, viết nhật ký hành hương và nghe thuyết minh tự động.
> * **Giao diện Local Guide (Hướng dẫn viên)**: Đăng ký lịch trực ca, đăng tải sự kiện địa điểm, kiểm tra báo cáo phản hồi và tiếp nhận điều phối SOS khẩn cấp tức thời.

---

### 🚀 Tính năng Cốt lõi & Công nghệ nổi bật

> [!TIP]
> ### 🧭 1. Bản đồ Hành hương Tương tác & Audio Guide
> * **Định vị Vietmap & Mapbox**: Bản đồ tương tác sử dụng `@rnmapbox/maps` hiển thị rõ ràng vị trí nhà thờ, lịch giờ lễ, tiện ích xung quanh và chỉ đường lộ trình thông minh.
> * **Thuyết minh Audio Guide (VBee TTS)**: Tích hợp trình phát âm thanh bằng `expo-av` và `expo-video` tự động phát giọng đọc thuyết minh lịch sử nhà thờ bằng tiếng Việt truyền cảm.
> * **Hiển thị mô hình 3D**: Render trực quan mô hình 3D kiến trúc giáo xứ ngay trên màn hình điện thoại giúp người dùng quan sát sống động.

> [!CAUTION]
> ### 🔒 2. Lập Kế hoạch Nhóm & Điểm danh Ký quỹ Chống gian lận
> * **Lập kế hoạch đa hành trình**: Tạo lịch trình du ngoạn, mời bạn bè cùng đồng hành, trò chuyện chat nhóm thời gian thực qua WebSockets kết nối.
> * **Ký quỹ trực tiếp PayOS**: Nạp tiền cọc đảm bảo chuyến đi trực tiếp qua liên kết sâu (deep-linking) PayOS của app di động.
> * **Sát hạch điểm danh**: Giáo dân thực hiện điểm danh tại địa điểm hành hương qua tọa độ GPS (thuật toán Haversine) hoặc quét mã QR bảo mật để quyết toán hoàn tiền cọc tự động.

> [!WARNING]
> ### 📶 3. Chế độ Ngoại tuyến (Offline-First) & Trợ giúp SOS khẩn cấp
> * **Nhật ký Ngoại tuyến (Offline Journal)**: Tự động phát hiện mất mạng (`NetInfo`), cho phép giáo dân tiếp tục ghi nhật ký hành trình ngoại tuyến. Hệ thống sẽ lưu hàng đợi và đồng bộ hóa tự động lên máy chủ ngay khi có kết nối mạng trở lại.
> * **Cứu hộ Khẩn cấp SOS**: Nhấn giữ nút SOS để phát tín hiệu khẩn cấp kèm định vị thời gian thực gửi trực tiếp cho ban quản trị và hướng dẫn viên trực tại chỗ cứu hộ.

---

### ⚙️ Cài đặt & Vận hành Cục bộ

#### Yêu cầu chuẩn bị
* Máy tính đã cài Node.js v18 hoặc v20.
* Điện thoại đã cài sẵn app **Expo Go** (đối với code cơ bản) hoặc bản build **Development Client** (do dự án chứa thư viện Mapbox native).

#### 1. Cấu hình Biến môi trường
Tạo file `.env` tại thư mục gốc của dự án mobile:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.137:3000
EXPO_PUBLIC_API_TIMEOUT=60000
EXPO_PUBLIC_VIETMAP_SERVICES_KEY=khoa_dich_vu_vietmap_cua_ban
EXPO_PUBLIC_VIETMAP_TILEMAP_KEY=khoa_ban_do_vietmap_cua_ban
EXPO_PUBLIC_MAPBOX_TOKEN=khoa_mapbox_cua_ban
```

#### 2. Chạy ứng dụng Development
```bash
# Cài đặt thư viện
npm install

# Khởi chạy bundler Metro của Expo
npm run start
```
Quét mã QR hiển thị trên màn hình bằng ứng dụng Expo Go hoặc client để chạy trực tiếp trên thiết bị của bạn.

#### 3. Đóng gói file APK bằng EAS Cloud
Hệ thống sử dụng dịch vụ EAS Cloud cấu hình tại [eas.json](file:///d:/FPT/Ki%209/SEP490/SEP490-DATN-MOBILE/eas.json) để build file cài đặt Android APK tự động:
```bash
# Đăng nhập tài khoản Expo
npx eas login

# Khởi chạy build file APK cho Android
npx eas build --platform android --profile production
```

---
*Developed with ❤️ by Catholic Pilgrimage DATN Team @ FPT University.*
