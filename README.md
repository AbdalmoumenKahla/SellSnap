# 🛒 SellSnap - نظام إدارة المبيعات المتطور

**SellSnap** is a modern, professional sales management system built with React Native and Expo, designed specifically for Arabic-speaking users with full RTL (Right-to-Left) support.

![SellSnap App](./assets/images/sellsnap_icon.jpeg)

## ✨ Latest Features & Updates

### 🎨 **Modern UI Enhancements**
- ✅ **Modernized Button Design**: Pill-shaped buttons with enhanced shadows and gradients
- ✅ **Professional Color Schemes**: Updated with modern purple gradients and improved visual hierarchy
- ✅ **Responsive Layouts**: 40% width buttons with center alignment for better proportions
- ✅ **Enhanced Filter Buttons**: Modern pill designs with color-matched shadows (25-30px radius)
- ✅ **Optimized Touch Targets**: Improved button sizes and spacing for better mobile experience

### 📊 **Enhanced Sales History**
- ✅ **Detailed Item Breakdown**: Shows individual item prices with format "Item[UnitPrice] x Quantity = Total"
- ✅ **Improved Price Display**: Clear pricing transparency for each transaction
- ✅ **Better Data Parsing**: Enhanced format handling for "Item: X قطعة" storage format
- ✅ **Professional History Cards**: Elevated design with proper spacing and visual hierarchy

### 🖼️ **Image System Improvements**
- ✅ **Dynamic Image Sizing**: AspectRatio-based sizing that fits image content
- ✅ **Image Caching**: Pre-processed image sources to prevent refresh issues
- ✅ **Stable Rendering**: Eliminated image flickering and re-mounting problems
- ✅ **Performance Optimization**: Enhanced memo components with stable keys

### 📱 **Stock Management Redesign**
- ✅ **Repositioned Add Button**: Moved from top-left to bottom-center above back button
- ✅ **Improved Layout Flow**: Better visual hierarchy and user experience
- ✅ **Modern Button Styling**: 70% width with pill shape and green shadows
- ✅ **Consistent Navigation**: Unified button placement across all dashboards

## ✨ Core Features

### � **Customer Management**
- ✅ Professional customer dashboard with modern card-based layouts
- ✅ Add, edit, delete, and search customers with confirmation dialogs
- ✅ Real-time customer search with full Arabic RTL support
- ✅ Modern "Add Customer" button with purple gradient and pill design

### 📦 **Advanced Inventory Management**
- ✅ Complete CRUD operations for items with images, prices, and stock quantities
- ✅ Professional grid layout (2-column) with optimized image containers
- ✅ Image picker integration with validation and error handling
- ✅ Stock quantity tracking and low-stock management
- ✅ Modern add/edit interfaces with improved styling

### 🛍️ **Smart Display Management**
- ✅ Select which items to display to customers
- ✅ Visual selection indicators with checkmarks
- ✅ Toggle-based item management
- ✅ Real-time display updates

### 💰 **Professional Sales Processing**
- ✅ 3-column grid layout for product selection
- ✅ Real-time quantity controls with stock validation
- ✅ Dynamic total calculation with proper formatting
- ✅ Customer-specific sales workflows
- ✅ Complete sales history with timestamps

### 📊 **Enhanced Sales History & Analytics**
- ✅ **Advanced Item Display**: "ItemName[UnitPrice] x Quantity = Total شيكل"
- ✅ **Comprehensive Filtering**:
  - Real-time customer name search
  - Professional scrollable date picker (Year/Month/Day)
  - Combined search and date filtering
- ✅ **Modern Filter Interface**: Pill-shaped buttons with color-coded shadows
- ✅ **Bulk Deletion System**: Delete by year, month, or specific date
- ✅ **Professional Cards**: Enhanced visual design with proper spacing

### 🎨 **User Experience**
- ✅ **Arabic RTL Interface** - Complete right-to-left support
- ✅ **iPad Optimized** - Professional tablet interface
- ✅ **Modern UI Design** - Card-based layouts with shadows
- ✅ **Touch-Friendly** - Large touch targets and smooth interactions
- ✅ **Responsive Design** - Adapts to different screen sizes
- ✅ **Professional Styling** - Consistent color scheme and typography

## 🛠️ **Technology Stack**

- **Frontend**: React Native with TypeScript
- **Framework**: Expo SDK (Latest)
- **Database**: SQLite (expo-sqlite)
- **Image Handling**: expo-image-picker
- **Navigation**: Expo Router
- **Styling**: StyleSheet with professional themes
- **Language Support**: Arabic RTL + English

## 🚀 **Getting Started**

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI
- Expo Go app (for testing)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Start the development server:**
```bash
npx expo start
```

3. **Test the app:**
   - Scan QR code with Expo Go (Android/iOS)
   - Press `w` for web browser
   - Press `i` for iOS Simulator (Mac only)
   - Press `a` for Android Emulator

## 📱 **App Structure**

```
SellSnap/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Main application logic
│   │   ├── explore.tsx        # Secondary tab
│   │   └── _layout.tsx        # Tab layout
│   ├── _layout.tsx            # Root layout
│   └── +not-found.tsx         # 404 page
├── assets/
│   ├── images/                # App icons and images
│   └── fonts/                 # Custom fonts
├── components/                # Reusable components
├── constants/                 # App constants and colors
└── hooks/                     # Custom React hooks
```

## 🗄️ **Database Schema**

### Customers Table
```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);
```

### Items Table
```sql
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  image TEXT,
  pieces INTEGER DEFAULT 1
);
```

### Sales History Table
```sql
CREATE TABLE sales_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  items TEXT NOT NULL,
  total REAL NOT NULL,
  date TEXT NOT NULL
);
```

## 🎯 **Key Features Explained**

### 📅 **Advanced Date Filtering**
The app features a professional scrollable date picker system:
- **Three-column layout**: Year, Month, Day
- **Smart filtering**: Filter by any combination
- **Visual selection**: Highlighted selected items
- **Arabic interface**: Full RTL support

### 🔍 **Search Functionality**
- **Real-time filtering**: Instant search results
- **Case-insensitive**: Works with Arabic and English
- **Clear buttons**: Easy to reset searches
- **Combined filtering**: Search + date filtering together

### 💾 **Data Management**
- **SQLite database**: Local storage for offline functionality
- **CRUD operations**: Complete Create, Read, Update, Delete
- **Data validation**: Input validation and error handling
- **Backup ready**: Easy to export/import data

## 🎨 **UI/UX Highlights**

- **Professional Cards**: Elevated design with shadows
- **Color Coding**: Consistent color scheme throughout
- **Touch Optimization**: Large buttons and touch areas
- **Loading States**: Proper loading and empty states
- **Error Handling**: User-friendly error messages
- **Confirmation Dialogs**: Safe deletion with confirmations

## 📐 **Arabic RTL Support**

- **Text Alignment**: Right-to-left text alignment
- **Layout Direction**: RTL layout structure
- **Number Formatting**: Arabic number display
- **Date Formatting**: Localized date formats
- **UI Elements**: RTL-optimized buttons and inputs

## 🔧 **Development**

### Available Scripts
```bash
# Start development server
npx expo start

# Start with specific platform
npx expo start --android
npx expo start --ios
npx expo start --web

# Clear cache and restart
npx expo start -c

# Update dependencies
npm update
```

### Code Structure
- **TypeScript**: Full type safety
- **Modular Design**: Reusable components
- **Clean Code**: Well-commented and organized
- **Error Handling**: Comprehensive try-catch blocks

## 📦 **Deployment**

### Expo Go (Development)
```bash
npx expo start
# Scan QR code with Expo Go app
```

### Production Build (EAS)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS/Android
eas build --platform ios
eas build --platform android
```

### App Store Deployment
1. Apple Developer Account required ($99/year)
2. Configure app.json with bundle identifier
3. Build with EAS Build
4. Submit through EAS Submit or App Store Connect

## 🐛 **Troubleshooting**

### Common Issues
- **Metro bundler issues**: Clear cache with `npx expo start -c`
- **Database issues**: Check SQLite table creation
- **Image picker**: Ensure camera/photo permissions are granted
- **RTL issues**: Verify Arabic text rendering
- **Package compatibility**: Run `npm update` for latest versions

### Debug Mode
```bash
# Enable debug mode
npx expo start --dev-client
```

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📱 **Screenshots**

### Main Dashboard
- Clean, professional interface with Arabic RTL support
- Large touch-friendly buttons with icons
- Consistent color scheme and typography

### Customer Management
- Card-based customer listings
- Real-time search functionality
- Easy add/edit/delete operations

### Sales Processing
- Grid layout for product selection
- Quantity controls with +/- buttons
- Real-time total calculation

### Sales History
- Detailed history with filtering
- Scrollable date picker
- Professional card layouts

## 🔮 **Roadmap**

### Future Enhancements
- [ ] Export sales reports to PDF/Excel
- [ ] Barcode scanner integration
- [ ] Multi-currency support
- [ ] Inventory low-stock alerts
- [ ] Cloud backup and sync
- [ ] Multi-language support (beyond Arabic/English)
- [ ] Dark mode theme
- [ ] Advanced analytics and charts

## 📄 **License**

This project is licensed under the MIT License.

## 👨‍💻 **Author**

**SellSnap Development Team**
- Built with ❤️ for Arabic-speaking businesses
- Specialized in RTL mobile applications
- Expert in React Native and Expo development

## 🙏 **Acknowledgments**

- Expo team for the amazing framework
- React Native community
- SQLite for robust local storage
- Arabic language support contributors
- Open source community

## 📞 **Support**

For support and questions:
- 🐛 Issues: Create GitHub issues for bugs and feature requests
- 📧 Email: Contact for commercial support
- 📱 Mobile: Optimized for tablets and phones

---

**SellSnap** - Making sales management simple and professional 🚀

*Built with React Native, TypeScript, and Expo for modern Arabic businesses*
