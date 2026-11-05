
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Topbar />

      <main className="ml-[76px] pt-[72px]">
        <div className="mx-auto w-full max-w-[1800px] p-5 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
