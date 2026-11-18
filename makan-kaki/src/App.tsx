import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { DemoProvider } from './demo/store'
import { LangProvider } from './demo/i18n'
import { PublicShell, RoleShell, Toasts, TourBar, TourProvider, TopBar } from './components/Shell'
import { Landing, Login, SignupCreator, SignupOwner } from './pages/public'
import {
  BookVisit, LiveOrders, OwnerCreatorProfile, OwnerHome, OwnerMenu, OwnerMore, OwnerPayouts, OwnerPlan, OwnerQr, OwnerSettings,
  OwnerStaff, OwnerVisitDetail, OwnerVisits,
} from './pages/owner'
import {
  CheckIn, CreatorCode, CreatorEarnings, CreatorOffers, CreatorPerformance, CreatorProfile, CreatorVisits, OfferDetail, SubmitPost, VisitBrief,
} from './pages/creator'
import { DinerCheckout, DinerShell, DinerStatus } from './pages/diner'
import { AdminCreators, AdminDisputes, AdminHome, AdminMatching, AdminPayouts } from './pages/admin'

function DinerLayout() {
  return <><TopBar /><DinerShell><Outlet /></DinerShell></>
}

export default function App() {
  return (
    <LangProvider>
      <DemoProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
          <TourProvider>
            <Routes>
              <Route element={<PublicShell />}>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup/owner" element={<SignupOwner />} />
                <Route path="/signup/creator" element={<SignupCreator />} />
              </Route>

              <Route element={<DinerLayout />}>
                <Route path="/order/:outletId" element={<DinerCheckout />} />
                <Route path="/order/:outletId/status/:orderId" element={<DinerStatus />} />
              </Route>

              <Route path="/owner" element={<RoleShell role="owner" />}>
                <Route index element={<OwnerHome />} />
                <Route path="orders" element={<LiveOrders />} />
                <Route path="visits" element={<OwnerVisits />} />
                <Route path="visits/new" element={<BookVisit />} />
                <Route path="visits/:id" element={<OwnerVisitDetail />} />
                <Route path="creators/:id" element={<OwnerCreatorProfile />} />
                <Route path="payouts" element={<OwnerPayouts />} />
                <Route path="more" element={<OwnerMore />} />
                <Route path="more/menu" element={<OwnerMenu />} />
                <Route path="more/qr" element={<OwnerQr />} />
                <Route path="more/staff" element={<OwnerStaff />} />
                <Route path="more/plan" element={<OwnerPlan />} />
                <Route path="more/settings" element={<OwnerSettings />} />
              </Route>

              <Route path="/creator" element={<RoleShell role="creator" />}>
                <Route index element={<CreatorOffers />} />
                <Route path="offers/:id" element={<OfferDetail />} />
                <Route path="visits" element={<CreatorVisits />} />
                <Route path="visits/:id" element={<VisitBrief />} />
                <Route path="visits/:id/checkin" element={<CheckIn />} />
                <Route path="visits/:id/post" element={<SubmitPost />} />
                <Route path="code" element={<CreatorCode />} />
                <Route path="performance" element={<CreatorPerformance />} />
                <Route path="earnings" element={<CreatorEarnings />} />
                <Route path="profile" element={<CreatorProfile />} />
              </Route>

              <Route path="/admin" element={<RoleShell role="admin" />}>
                <Route index element={<AdminHome />} />
                <Route path="creators" element={<AdminCreators />} />
                <Route path="matching" element={<AdminMatching />} />
                <Route path="payouts" element={<AdminPayouts />} />
                <Route path="disputes" element={<AdminDisputes />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toasts />
            <TourBar />
          </TourProvider>
        </BrowserRouter>
      </DemoProvider>
    </LangProvider>
  )
}
