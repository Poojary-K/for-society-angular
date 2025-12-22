# For Society - Angular Frontend

A modern, mobile-first Angular application for managing funds, causes, contributions, and members. Built with Angular 20 and TypeScript, featuring a smooth vertical scroll-based interface inspired by modern social media apps.

## 🚀 Features

- **Authentication**: JWT-based login/register with admin support
- **Causes Management**: View and create fundraising causes
- **Contributions Tracking**: Track member contributions (admin can add contributions)
- **Fund Status**: Real-time fund status dashboard
- **Members Management**: View all members (admin access)
- **Modern UI/UX**: Vertical scroll-based feed, smooth animations, mobile-first design

## 🛠️ Tech Stack

- **Framework**: Angular 20 (Standalone Components)
- **Language**: TypeScript
- **Styling**: SCSS
- **State Management**: Angular Signals
- **HTTP Client**: Angular HttpClient with interceptors
- **Animations**: Angular Animations

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Angular CLI (optional, but recommended)

## 🏃 Getting Started

### Installation

```bash
npm install
```

### Development Server

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Build

```bash
npm run build
# or
ng build
```

The build artifacts will be stored in the `dist/` directory.

## 🔧 Configuration

### Environment Variables

Update `src/environments/environment.ts` with your backend API URL:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000/api', // Update with your backend URL
};
```

### Backend Setup

Make sure your backend is running at the configured API URL. See the [backend repository](../backend/) for setup instructions.

## 📁 Project Structure

```
src/
├── app/
│   ├── core/              # Core services, guards, interceptors, models
│   ├── shared/            # Shared components, directives, pipes
│   ├── features/          # Feature modules
│   │   ├── auth/          # Authentication (login/register)
│   │   ├── causes/        # Causes management
│   │   ├── contributions/ # Contributions tracking
│   │   ├── feed/          # Main feed (landing & authenticated)
│   │   ├── funds/         # Fund status
│   │   └── members/       # Members management
│   └── layouts/           # Layout components
├── environments/          # Environment configurations
└── styles.scss            # Global styles
```

## 🎨 Design System

### Color Palette
- **Primary**: `#2563EB` (Blue 600)
- **Success**: `#10B981` (Green 500)
- **Danger**: `#EF4444` (Red 500)
- **Info**: `#06B6D4` (Cyan 500)
- **Admin Badge**: `#7C3AED` (Violet 600)

See `plan.md` for complete UI/UX specifications.

## 🔐 Authentication

The app uses JWT tokens stored in localStorage. Protected routes require authentication via `authGuard`.

### User Roles

- **Admin**: Can create causes, add contributions, view all members
- **Normal User**: Can create causes, view own contributions
- **Public**: Can view causes and fund status

## 📱 Mobile-First Design

The app is designed mobile-first with:
- Touch-friendly targets (44px minimum)
- Smooth scrolling and animations
- Responsive breakpoints
- Bottom sheets for forms (mobile)
- FAB (Floating Action Button) for quick actions

## 🧪 Testing

```bash
# Unit tests (when implemented)
npm test

# E2E tests (when implemented)
npm run e2e
```

## 📝 API Integration

The app connects to a RESTful backend API. See the backend repository for API documentation.

**Base URL**: `http://localhost:4000/api`

**Endpoints**:
- `/auth/login` - User login
- `/auth/register` - User registration
- `/auth/upgrade-to-admin` - Upgrade to admin (with secret code)
- `/causes` - Get/create causes
- `/contributions` - Get/create contributions
- `/members` - Get members (authenticated)
- `/funds/status` - Get fund status

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The `dist/` folder contains the production build. Deploy this folder to your hosting service.

### Environment Configuration

Update `src/environments/environment.prod.ts` with production API URL before building.

## 📚 Documentation

- [UI/UX Plan](./plan.md) - Complete design specifications
- [Next Steps](./NEXT_STEPS.md) - Roadmap and pending features

## 🤝 Contributing

1. Follow Angular best practices
2. Use TypeScript strict mode
3. Follow the existing code structure
4. Write meaningful commit messages

## 📄 License

ISC

---

**Built with ❤️ using Angular**
