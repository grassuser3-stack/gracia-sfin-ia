import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { PublicShell, RoleShell } from './components/Shell'
import { Landing, Login, SignupChoose, SignupCreator, SignupOwner, SignupStaff } from './pages/public'
import { ManageSlots, OwnerBookingDetail, OwnerDashboard, OwnerRedeem, OwnerStaff } from './pages/owner'
import { BookingConfirmed, FindVisits, MyBookings, SlotDetail, SubmitPost } from './pages/creator'
import { StaffHome } from './pages/staff'
import { AdminBilling, AdminBookings, AdminCreators, AdminHome, AdminOutlets } from './pages/admin'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <Routes>
          <Route element={<PublicShell />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignupChoose />} />
          </Route>
          <Route element={<PublicShell redirectIfLoggedIn={false} />}>
            <Route path="/signup/owner" element={<SignupOwner />} />
            <Route path="/signup/creator" element={<SignupCreator />} />
            <Route path="/signup/staff" element={<SignupStaff />} />
          </Route>

          <Route path="/owner" element={<RoleShell role="owner" />}>
            <Route index element={<OwnerDashboard />} />
            <Route path="slots" element={<ManageSlots />} />
            <Route path="redeem" element={<OwnerRedeem />} />
            <Route path="staff" element={<OwnerStaff />} />
            <Route path="bookings/:id" element={<OwnerBookingDetail />} />
          </Route>

          <Route path="/staff" element={<RoleShell role="staff" />}>
            <Route index element={<StaffHome />} />
          </Route>

          <Route path="/creator" element={<RoleShell role="creator" />}>
            <Route index element={<FindVisits />} />
            <Route path="slots/:id" element={<SlotDetail />} />
            <Route path="booked/:id" element={<BookingConfirmed />} />
            <Route path="bookings" element={<MyBookings />} />
            <Route path="bookings/:id/post" element={<SubmitPost />} />
          </Route>

          <Route path="/admin" element={<RoleShell role="admin" />}>
            <Route index element={<AdminHome />} />
            <Route path="creators" element={<AdminCreators />} />
            <Route path="outlets" element={<AdminOutlets />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="billing" element={<AdminBilling />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
