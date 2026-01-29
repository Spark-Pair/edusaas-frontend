# EduSaaS - Frontend

**A School Management System by SparkPair**

---

## About EduSaaS

EduSaaS is a premium SaaS-based school management system designed to help schools efficiently manage their student data, attendance, examinations, and more.

### Key Feature: QR-Based Student Verification

Each student receives a unique QR code that can be printed on their ID Card. Parents and authorized personnel can scan this QR code to instantly view the student's:
- Basic Information
- Current Class
- Enrollment Status
- Guardian Details
- **Exam Progress** (marks, percentage, subjects)
- **Attendance Summary** (present days, absent days, percentage)

This feature is exclusively available to schools partnering with **MR Studio** for ID Card printing services.

---

## Partnership

| Company | Role |
|---------|------|
| **SparkPair** | Software Development & Service Provider |
| **MR Studio** | ID Card Printing & School Partnerships |

> EduSaaS is exclusively provided to schools that contract with MR Studio for ID Card services.

---

## Tech Stack

- **Framework**: React 18 with Vite
- **Routing**: React Router DOM v6
- **Styling**: TailwindCSS
- **HTTP Client**: Axios
- **QR Codes**: qrcode.react
- **Notifications**: react-hot-toast

---

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── common/
│   │       ├── Sidebar.jsx       # Navigation sidebar
│   │       ├── Modal.jsx         # Reusable modal
│   │       ├── Button.jsx        # Button component
│   │       ├── Input.jsx         # Form input
│   │       ├── Select.jsx        # Dropdown select
│   │       ├── Badge.jsx         # Status badges
│   │       ├── Card.jsx          # Card container
│   │       ├── StatCard.jsx      # Dashboard stat cards
│   │       ├── Table.jsx         # Data table
│   │       ├── LoadingSpinner.jsx # Loading indicator
│   │       └── index.js          # Component exports
│   ├── context/
│   │   └── AuthContext.jsx       # Authentication state
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminLayout.jsx   # Admin layout wrapper
│   │   │   ├── Dashboard.jsx     # Admin dashboard
│   │   │   └── Tenants.jsx       # Tenant management
│   │   ├── tenant/
│   │   │   ├── TenantLayout.jsx  # School layout wrapper
│   │   │   ├── Dashboard.jsx     # School dashboard
│   │   │   ├── Classes.jsx       # Class management
│   │   │   ├── Students.jsx      # Student management
│   │   │   ├── Attendance.jsx    # Attendance system
│   │   │   ├── Exams.jsx         # Exam management
│   │   │   └── QRCodes.jsx       # QR code generation
│   │   ├── LoginPage.jsx         # Unified login
│   │   └── PublicStudentPage.jsx # QR scan result page
│   ├── services/
│   │   └── api.js                # API service layer
│   ├── App.jsx                   # Main app with routing
│   ├── main.jsx                  # React entry point
│   └── index.css                 # TailwindCSS + custom styles
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend server running on port 5000

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### Environment Variables

```env
VITE_BACKEND_URL=<your-backend-url>
```

### Running the App

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

App will start on `http://localhost:5173`

---

## Features

### Super Admin Panel
- Dashboard with system-wide statistics
- Tenant (school) management
  - Create new schools with credentials
  - Edit school details and validity
  - Activate/deactivate schools
- View expiring subscriptions

### School Admin Panel
- Dashboard with school statistics
- **Class Management**
  - Create and manage classes
  - Assign sections
- **Student Management**
  - Add/edit students
  - Search and filter by class
  - Soft delete (status: active/inactive/left)
  - Generate QR codes
- **Attendance System**
  - Mark daily attendance
  - Present/Absent/Leave options
  - Mark all present/absent
  - Day off with reason
  - View and update existing attendance
- **Examination System**
  - Create exams with subjects
  - Enter marks for students
  - Auto-calculate totals and percentages
- **QR Code Management**
  - View all student QR codes
  - Filter by class

### Public Student View
- Accessible via QR code scan
- No login required
- Shows only safe information
- Verified student badge

---

## Design System

The UI follows a clean, minimal design with:

- **Color Palette**: Slate-based neutral colors
- **No Gradients**: Clean solid colors
- **Light Mode**: Easy on the eyes
- **Consistent Spacing**: Uniform padding and margins
- **Smooth Animations**: Fade-in, slide-in effects
- **Responsive Layout**: Works on all screen sizes

---

## Pages & Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/login` | Public | Unified login page |
| `/admin` | Admin | Admin dashboard |
| `/admin/tenants` | Admin | Tenant management |
| `/dashboard` | Tenant | School dashboard |
| `/dashboard/classes` | Tenant | Class management |
| `/dashboard/students` | Tenant | Student management |
| `/dashboard/attendance` | Tenant | Attendance system |
| `/dashboard/exams` | Tenant | Exam management |
| `/dashboard/qrcodes` | Tenant | QR code generation |
| `/student/:id` | Public | QR scan result |

---

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `admin` | `admin123` |
| Demo School | `demo` | `demo123` |

---

## Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## License

Proprietary software. All rights reserved.

© 2026 SparkPair | In partnership with MR Studio
