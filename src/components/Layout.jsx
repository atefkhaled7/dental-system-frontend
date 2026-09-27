import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    // dir="rtl" عشان السيستم يبقى موجه عربي من اليمين للشمال بشكل مريح للعيادات
    <div className="min-h-screen bg-slate-950 flex" dir="rtl">
      
      {/* 1. القائمة الجانبية الثابتة */}
      <Sidebar />

      {/* 2. شباك المحتوى المتغير */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>

    </div>
  );
}