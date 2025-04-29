import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReactDOM from "react-dom/client";
import "./index.css";
import ProtectedRoute from "./ProtectedRoute.jsx";

// Pages & Components
import Home from "./Home";
import Items from "./pages/admin/AdminItems.jsx";
import AdminHelpSupport from "./pages/admin/AdminHelpSupport.jsx";
import ManageAdmins from "./pages/admin/ManageAdmins.jsx";
import Profile from "./pages/admin/AdminProfile.jsx";
import AddAdmin from "./components/admin/AddAdmin.jsx";
import AddFound from "./components/admin/AddFound.jsx";
import AddLost from "./components/admin/AddLost.jsx";
import StudentProfile from "./pages/student/StudentProfile.jsx";
import StudentItems from "./pages/student/StudentItems.jsx";
import StudentSearch from "./pages/student/StudentSearch.jsx";
import StudentHelpSupport from "./pages/student/StudentHelpSupport.jsx";
import StudentSetup from "./pages/student/StudentSetup.jsx";
import ReportLost from "./pages/student/ReportLost.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
        {/* Public Route (Login Page) */}
        <Route path="/" element={<Home />} />

        {/* Protected Routes (Only accessible if logged in) */}
        <Route path="/admin-help" element={<ProtectedRoute><AdminHelpSupport /></ProtectedRoute>} />
        <Route path="/items" element={<ProtectedRoute><Items /></ProtectedRoute>} />
        <Route path="/manage-admins" element={<ProtectedRoute><ManageAdmins /></ProtectedRoute>} />
        <Route path="/add-admin" element={<ProtectedRoute><AddAdmin /></ProtectedRoute>} />
        <Route path="/admin-profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/add-found" element={<ProtectedRoute><AddFound /></ProtectedRoute>} />
        <Route path="/add-lost" element={<ProtectedRoute><AddLost /></ProtectedRoute>} />
        <Route path="/student-profile" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
        <Route path="/student-search" element={<ProtectedRoute><StudentSearch /></ProtectedRoute>} />
        <Route path="/student-help" element={<ProtectedRoute><StudentHelpSupport /></ProtectedRoute>} />
        <Route path="/student-setup" element={<ProtectedRoute><StudentSetup /></ProtectedRoute>} />
        <Route path="/report-lost" element={<ProtectedRoute><ReportLost /></ProtectedRoute>} />
        <Route path="/student-items" element={<ProtectedRoute><StudentItems /></ProtectedRoute>} />
      </Routes>
    </Router>
  </React.StrictMode>
);
